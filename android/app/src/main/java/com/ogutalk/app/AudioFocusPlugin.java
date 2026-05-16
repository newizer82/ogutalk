package com.ogutalk.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * AudioFocus 플러그인
 * - 알람 발동 시 AUDIOFOCUS_GAIN_TRANSIENT 요청
 * - YouTube / 음악 앱이 강제로 일시정지됨
 * - 지정한 duration 후 자동 release → 다른 앱 자동 재생 복원
 */
@CapacitorPlugin(name = "AudioFocus")
public class AudioFocusPlugin extends Plugin {

    private AudioFocusRequest focusRequest;
    private final AudioManager.OnAudioFocusChangeListener focusListener = focusChange -> {
        // 다른 앱이 focus 가져가도 우리 작업은 영향 없음 — 그냥 빈 리스너
    };

    @PluginMethod
    public void request(PluginCall call) {
        int duration = call.getInt("duration", 6000);  // 기본 6초
        Context ctx = getContext();
        AudioManager am = (AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);
        if (am == null) {
            call.reject("AudioManager unavailable");
            return;
        }

        int result;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(attrs)
                .setOnAudioFocusChangeListener(focusListener)
                .build();
            result = am.requestAudioFocus(focusRequest);
        } else {
            result = am.requestAudioFocus(
                focusListener,
                AudioManager.STREAM_ALARM,
                AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
            );
        }

        boolean granted = (result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED);

        // duration 후 자동 release
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (focusRequest != null) {
                    am.abandonAudioFocusRequest(focusRequest);
                    focusRequest = null;
                }
            } else {
                am.abandonAudioFocus(focusListener);
            }
        }, duration);

        com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }
}
