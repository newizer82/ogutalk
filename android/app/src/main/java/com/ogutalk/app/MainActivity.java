package com.ogutalk.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.webkit.CookieManager;
import android.webkit.WebStorage;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // Android는 채널 사운드를 생성 후 변경 불가. 사용자가 채널을 무음으로 오버라이드하면
    // 같은 ID를 삭제 후 재생성해도 OS가 기존 무음 설정을 복원한다.
    // 채널 ID를 바꿔야만 시스템이 새 사운드 설정을 받아들인다 → 필요 시 v3, v4... 로 올릴 것.
    private static final String CHANNEL_OGU    = "ogu-hourly-v4";   // v4: 진동 강화 + 다른 앱 일시정지 강조
    private static final String CHANNEL_CUSTOM = "ogu-custom-v3";   // v3: 진동 강화 + 다른 앱 일시정지 강조
    private static final String[] LEGACY_CHANNELS = {
        "ogu-alarm",        // v1~v3
        "ogu-hourly",       // v4~v6 (사용자 무음 오버라이드 가능성)
        "ogu-hourly-v2",    // v7
        "ogu-hourly-v3",    // v8 (이번에 v4로 갈아탐)
        "ogu-custom",       // v3~v6
        "ogu-custom-v2",    // v7~v8 (이번에 v3로 갈아탐)
    };
    private static final String PREFS_NAME     = "ogu_prefs";
    private static final String KEY_CHAN_VER   = "channel_version";
    // 채널 설정 변경 시 이 숫자를 올리면 자동 재생성됨
    private static final int    CHAN_VERSION   = 9;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // 커스텀 플러그인 등록 (super.onCreate 전에 호출 필수)
        registerPlugin(AudioFocusPlugin.class);
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ensureAlarmChannels();
        }
        requestBatteryOptimizationExemption();
    }

    /**
     * Capacitor JS createChannel() 보다 먼저 실행되어
     * 커스텀 사운드(res/raw/ogu.mp3, ogu_custom.mp3)를 가진 채널을 선점 생성한다.
     * - ogu-hourly  : res/raw/ogu.mp3        (매시 59분 오구 알람)
     * - ogu-custom  : res/raw/ogu_custom.mp3 (사용자 커스텀 알람)
     */
    private void ensureAlarmChannels() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        int savedVer = prefs.getInt(KEY_CHAN_VER, 0);
        if (savedVer >= CHAN_VERSION) return;

        NotificationManager nm =
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        // 기존 채널 삭제 후 재생성 (Android 8+: 채널 사운드는 생성 후 변경 불가)
        // 모든 LEGACY 채널 정리 — 사용자가 무음 오버라이드 했을 가능성 우회
        for (String legacyId : LEGACY_CHANNELS) {
            nm.deleteNotificationChannel(legacyId);
        }
        nm.deleteNotificationChannel(CHANNEL_OGU);
        nm.deleteNotificationChannel(CHANNEL_CUSTOM);

        AudioAttributes audioAttr = new AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .setUsage(AudioAttributes.USAGE_ALARM)
            .build();

        String pkg = getPackageName();

        // 1) 오구 알람 채널 (ogu.mp3)
        NotificationChannel oguCh = new NotificationChannel(
            CHANNEL_OGU,
            "오구 알람",
            NotificationManager.IMPORTANCE_HIGH
        );
        // 매우 강한 진동 패턴 — 사용자 요청으로 v4부터 강화
        // 형식: { delay, vibrate, sleep, vibrate, sleep, ... } (ms)
        // 0ms 대기 → 1.2초 진동 → 300ms 쉼 → 1.2초 진동 → 300ms 쉼 → 1.5초 진동 (총 ~4.5초)
        long[] strongPattern = new long[]{0, 1200, 300, 1200, 300, 1500};

        oguCh.setDescription("매시 59분 오구톡 알람");
        oguCh.enableVibration(true);
        oguCh.setVibrationPattern(strongPattern);
        oguCh.setBypassDnd(true);
        oguCh.setShowBadge(true);
        oguCh.setSound(Uri.parse("android.resource://" + pkg + "/raw/ogu"), audioAttr);
        nm.createNotificationChannel(oguCh);

        // 2) 커스텀 알람 채널 (ogu_custom.mp3)
        NotificationChannel customCh = new NotificationChannel(
            CHANNEL_CUSTOM,
            "커스텀 알람",
            NotificationManager.IMPORTANCE_HIGH
        );
        customCh.setDescription("사용자 정의 시간 알람");
        customCh.enableVibration(true);
        customCh.setVibrationPattern(strongPattern);
        customCh.setBypassDnd(true);
        customCh.setShowBadge(true);
        customCh.setSound(Uri.parse("android.resource://" + pkg + "/raw/ogu_custom"), audioAttr);
        nm.createNotificationChannel(customCh);

        prefs.edit().putInt(KEY_CHAN_VER, CHAN_VERSION).apply();
    }

    /**
     * 배터리 최적화 면제 요청.
     * 면제되면 Doze Mode 에서도 AlarmManager 가 정확히 작동한다.
     *
     * 정책:
     *  - 실제 배터리 상태(pm.isIgnoringBatteryOptimizations)를 source of truth 로 사용
     *  - 이미 면제 → 아무것도 안 함
     *  - 면제 안 됨 → 시스템 dialog 호출 (시스템이 자체적으로 사용자 선택 기억)
     *  - SharedPreferences 플래그 게이트 제거: allowBackup 으로 복원되면 영영 prompt 가 안 뜨던 버그 수정
     *  - try/catch 로 startActivity 실패는 흡수 (일부 제조사 제한)
     */
    private void requestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;

        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm == null) return;

        String pkg = getPackageName();

        // 이미 면제됐으면 끝 — 진짜 source of truth
        if (pm.isIgnoringBatteryOptimizations(pkg)) return;

        try {
            Intent intent = new Intent(
                Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                Uri.parse("package:" + pkg)
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (Exception e) {
            // 일부 제조사에서 인텐트를 막는 경우 무시 — 사용자가 수동으로 설정해야 함
        }
    }
}
