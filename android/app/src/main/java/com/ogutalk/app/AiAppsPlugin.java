package com.ogutalk.app;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;

/**
 * 기기에 설치된 AI 앱을 찾아 프롬프트와 함께 연다.
 *
 * 오구톡은 AI를 품지 않는다. 사용자 폰에 이미 있다.
 * 희소한 건 지능이 아니라 "맞는 순간의 질문" 이고, 그건 매시 59분에 우리가 가지고 있다.
 * 그래서 우리가 하는 일은 질문을 만들어 사용자의 AI에 건네주는 것뿐이다.
 * → 서버 비용 0, API 키 0, "사용시간은 기기 밖으로 안 나간다" 는 약속 그대로.
 *
 * QUERY_ALL_PACKAGES 는 쓰지 않는다 (Play 선언 양식 대상). AndroidManifest 의
 * <queries> 에 MAIN/LAUNCHER 와 SEND 를 선언해 둔 것만으로 아래가 다 된다.
 */
@CapacitorPlugin(name = "OguAiApps")
public class AiAppsPlugin extends Plugin {

    /**
     * 후보 — 앞에 있을수록 먼저 고른다.
     * 안드로이드 기본 탑재인 Gemini 가 1순위다 (도달률).
     * 여기 없는 앱은 감지되지 않을 뿐, 아무것도 깨지지 않는다.
     */
    private static final String[][] CANDIDATES = {
        { "com.google.android.apps.bard",            "Gemini" },
        { "com.openai.chatgpt",                      "ChatGPT" },
        { "com.anthropic.claude",                    "Claude" },
        { "ai.perplexity.app.android",               "Perplexity" },
        { "ai.x.grok",                               "Grok" },
        { "com.microsoft.copilot",                   "Copilot" },
        // 마지막 보루 — Gemini 앱이 없어도 구글 앱이 어시스턴트를 품고 있다
        { "com.google.android.googlequicksearchbox", "Google" },
    };

    /**
     * 공유로 보내면 안 되는 앱.
     * 구글 앱의 text/plain 수신처는 SavesShareReceiver — 질문을 던지는 게 아니라
     * "Google에 저장" 으로 북마크가 된다. 사용자는 보냈다고 믿는데 아무 일도 안 일어난다.
     * (실기기 확인: cmd package query-activities -a SEND -t text/plain)
     */
    private static boolean launchOnly(String pkg) {
        return "com.google.android.googlequicksearchbox".equals(pkg);
    }

    /** 설치된 AI 앱 목록 (후보 순서 그대로) */
    @PluginMethod
    public void detect(PluginCall call) {
        PackageManager pm = getContext().getPackageManager();
        JSArray apps = new JSArray();

        for (String[] c : CANDIDATES) {
            String pkg = c[0];
            if (pm.getLaunchIntentForPackage(pkg) == null) continue;   // 미설치

            JSObject o = new JSObject();
            o.put("pkg", pkg);
            o.put("label", labelOf(pm, pkg, c[1]));
            o.put("canSend", !launchOnly(pkg) && hasSendHandler(pm, pkg));
            apps.put(o);
        }

        JSObject ret = new JSObject();
        ret.put("apps", apps);
        call.resolve(ret);
    }

    /**
     * 프롬프트를 들고 AI 앱으로 건너간다.
     *
     * 프리필은 앱마다 되기도, 안 되기도 한다 (문서화된 인텐트가 없다).
     * 그래서 순서가 중요하다: 클립보드에 먼저 넣고 → 공유로 시도 → 안 되면 그냥 연다.
     * 최악의 경우에도 사용자는 붙여넣기만 하면 된다. 빈손으로 보내지 않는다.
     *
     * @return mode = "send"(프리필 성공) | "launch"(앱만 열림, 붙여넣기 필요)
     */
    @PluginMethod
    public void send(PluginCall call) {
        String pkg = call.getString("pkg");
        String text = call.getString("text", "");
        if (pkg == null || pkg.isEmpty()) {
            call.reject("NO_PACKAGE");
            return;
        }

        PackageManager pm = getContext().getPackageManager();

        // 프리필이 되는 앱이면 클립보드는 건드리지 않는다.
        // 질문이 이미 입력창에 들어갔는데 "복사했어요" 토스트가 뜨면
        // 사용자는 뭐가 일어난 건지 되묻게 된다 (실기기 확인).
        if (!text.isEmpty() && !launchOnly(pkg) && hasSendHandler(pm, pkg)) {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.setPackage(pkg);
            send.putExtra(Intent.EXTRA_TEXT, text);
            send.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                getContext().startActivity(send);
                call.resolve(result(true, "send"));
                return;
            } catch (Exception ignored) {
                // 공유 액티비티가 있다고 해놓고 거절하는 앱이 있다 → 아래로 떨어진다
            }
        }

        // 여기부터는 앱만 열린다 → 붙여넣을 수 있게 복사해 둔다. 빈손으로 보내지 않는다.
        copyToClipboard(text);

        Intent launch = pm.getLaunchIntentForPackage(pkg);
        if (launch == null) {
            call.reject("NOT_INSTALLED");
            return;
        }
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(launch);
            call.resolve(result(true, "launch"));
        } catch (Exception e) {
            call.reject("LAUNCH_FAILED", e);
        }
    }

    /** AI 앱 없이 쓸 때 — 프롬프트만 복사한다 */
    @PluginMethod
    public void copy(PluginCall call) {
        copyToClipboard(call.getString("text", ""));
        call.resolve(result(true, "copy"));
    }

    // ── helpers ──────────────────────────────────────────────────
    private JSObject result(boolean ok, String mode) {
        JSObject o = new JSObject();
        o.put("ok", ok);
        o.put("mode", mode);
        return o;
    }

    private void copyToClipboard(String text) {
        if (text == null || text.isEmpty()) return;
        try {
            ClipboardManager cm = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("오구톡", text));
        } catch (Exception ignored) {}
    }

    /** 설치된 앱의 진짜 표시 이름 — 못 읽으면 우리가 아는 이름을 쓴다 */
    private String labelOf(PackageManager pm, String pkg, String fallback) {
        try {
            CharSequence l = pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0));
            String s = l == null ? "" : l.toString().trim();
            return s.isEmpty() ? fallback : s;
        } catch (Exception e) {
            return fallback;
        }
    }

    private boolean hasSendHandler(PackageManager pm, String pkg) {
        Intent probe = new Intent(Intent.ACTION_SEND);
        probe.setType("text/plain");
        probe.setPackage(pkg);
        try {
            List<ResolveInfo> hits = pm.queryIntentActivities(probe, 0);
            return hits != null && !hits.isEmpty();
        } catch (Exception e) {
            return false;
        }
    }
}
