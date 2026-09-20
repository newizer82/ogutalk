package com.ogutalk.app;

import android.app.AppOpsManager;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * 구간별 앱 포그라운드 사용시간 조회.
 *
 * 모델: "포그라운드 앱은 항상 1개" — RESUMED 가 오면 이전 세션을 닫고 새로 연다.
 * 조회창 이전부터 이어지던 세션을 잡기 위해 LOOKBACK_MS 만큼 앞에서부터 스캔한 뒤
 * 각 구간을 [start, end] 로 잘라서(clamp) 누적한다.
 *
 * 실기기 검증에서 고친 문제들:
 *  - 조회창 전체를 덮는 연속 세션이 0초로 집계되던 문제 → lookback + clamp
 *  - 화면이 꺼질 때 PAUSED 가 오지 않아 시간이 무한 누적되던 문제 → 화면 꺼짐 이벤트에서 세션 종료
 *  - 자기 패키지를 스캔에서 건너뛰어 직전 앱 시간이 부풀던 문제 → 출력 시에만 제외
 */
@CapacitorPlugin(name = "UsageStats")
public class UsageStatsPlugin extends Plugin {

    private static final long LOOKBACK_MS = 12L * 60 * 60 * 1000;

    private static final int EV_SCREEN_NON_INTERACTIVE = 16;
    private static final int EV_KEYGUARD_SHOWN         = 17;
    private static final int EV_DEVICE_SHUTDOWN        = 26;

    private boolean checkAccess() {
        Context ctx = getContext();
        AppOpsManager ops = (AppOpsManager) ctx.getSystemService(Context.APP_OPS_SERVICE);
        if (ops == null) return false;
        int mode;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            mode = ops.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), ctx.getPackageName());
        } else {
            mode = ops.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), ctx.getPackageName());
        }
        if (mode == AppOpsManager.MODE_DEFAULT) {
            return ctx.checkCallingOrSelfPermission(
                android.Manifest.permission.PACKAGE_USAGE_STATS) == PackageManager.PERMISSION_GRANTED;
        }
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    @PluginMethod
    public void hasAccess(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", checkAccess());
        call.resolve(ret);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Context ctx = getContext();
        Intent i = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        i.setData(Uri.parse("package:" + ctx.getPackageName()));
        try {
            ctx.startActivity(i);
        } catch (Exception ex) {
            Intent fallback = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try { ctx.startActivity(fallback); } catch (Exception ignore) { }
        }
        call.resolve();
    }

    /** [startMs, endMs] 구간의 패키지별 포그라운드 시간(초), 상위 limit개 */
    @PluginMethod
    public void getUsage(PluginCall call) {
        if (!checkAccess()) { call.reject("NO_ACCESS"); return; }

        Long startArg = call.getLong("startMs");
        Long endArg   = call.getLong("endMs");
        if (startArg == null || endArg == null || endArg <= startArg) {
            call.reject("BAD_RANGE");
            return;
        }
        long begin = startArg;
        long end   = endArg;
        int  limit = call.getInt("limit", 5);

        Context ctx = getContext();
        UsageStatsManager usm = (UsageStatsManager) ctx.getSystemService(Context.USAGE_STATS_SERVICE);
        if (usm == null) { call.reject("NO_SERVICE"); return; }

        UsageEvents events = usm.queryEvents(begin - LOOKBACK_MS, end);
        UsageEvents.Event e = new UsageEvents.Event();

        Map<String, Long> totalMs = new HashMap<>();
        String curPkg   = null;
        long   curStart = 0;

        while (events.hasNextEvent()) {
            events.getNextEvent(e);
            int  type = e.getEventType();
            long t    = e.getTimeStamp();
            String pkg = e.getPackageName();

            if (type == UsageEvents.Event.MOVE_TO_FOREGROUND) {          // ACTIVITY_RESUMED
                if (pkg == null) continue;
                if (curPkg != null) addClamped(totalMs, curPkg, curStart, t, begin, end);
                curPkg = pkg;
                curStart = t;
            } else if (type == UsageEvents.Event.MOVE_TO_BACKGROUND) {   // ACTIVITY_PAUSED
                if (curPkg != null && curPkg.equals(pkg)) {
                    addClamped(totalMs, curPkg, curStart, t, begin, end);
                    curPkg = null;
                }
            } else if (type == EV_SCREEN_NON_INTERACTIVE
                    || type == EV_KEYGUARD_SHOWN
                    || type == EV_DEVICE_SHUTDOWN) {
                if (curPkg != null) {
                    addClamped(totalMs, curPkg, curStart, t, begin, end);
                    curPkg = null;
                }
            }
        }
        if (curPkg != null) addClamped(totalMs, curPkg, curStart, end, begin, end);

        ArrayList<Map.Entry<String, Long>> sorted = new ArrayList<>(totalMs.entrySet());
        Collections.sort(sorted, (a, b) -> Long.compare(b.getValue(), a.getValue()));

        PackageManager pm = ctx.getPackageManager();
        String self = ctx.getPackageName();
        JSArray apps = new JSArray();
        int shown = 0;
        for (Map.Entry<String, Long> en : sorted) {
            if (shown >= limit) break;
            String pkg = en.getKey();
            if (pkg.equals(self)) continue;      // 오구톡 자신은 제외
            if (en.getValue() < 1000) continue;  // 1초 미만 노이즈 컷
            String label = pkg;
            try {
                label = pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString();
            } catch (Exception ignore) { /* 패키지 가시성 제한 시 패키지명 그대로 */ }
            JSObject o = new JSObject();
            o.put("pkg", pkg);
            o.put("label", label);
            o.put("seconds", en.getValue() / 1000);
            apps.put(o);
            shown++;
        }

        JSObject ret = new JSObject();
        ret.put("apps", apps);
        call.resolve(ret);
    }

    /** [s, t] 구간을 [begin, end] 로 잘라 누적 */
    private static void addClamped(Map<String, Long> acc, String pkg, long s, long t, long begin, long end) {
        long from = Math.max(s, begin);
        long to   = Math.min(t, end);
        if (to <= from) return;
        Long prev = acc.get(pkg);
        acc.put(pkg, (prev == null ? 0L : prev) + (to - from));
    }
}
