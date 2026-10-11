package com.ogutalk.app;

import android.Manifest;
import android.content.ContentUris;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CalendarContract;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;
import java.util.List;

/**
 * 기기 캘린더(구글·삼성 등) 일정 읽기 — 읽기 전용.
 *
 * 오구톡의 할일에는 시각과 장소가 없다. 캘린더를 읽어야
 * "15:00 강남 미팅" 처럼 다음 1시간을 알려줄 수 있다.
 *
 * CalendarContract.Instances 를 쓰는 이유: Events 는 반복 일정의 원본 한 건만 주지만
 * Instances 는 지정한 구간에 실제로 열리는 회차를 펼쳐서 준다.
 * 일정 내용은 기기 안에서만 쓰고 서버로 보내지 않는다.
 */
@CapacitorPlugin(
    name = "OguCalendar",
    permissions = { @Permission(alias = "calendar", strings = { Manifest.permission.READ_CALENDAR }) }
)
public class CalendarPlugin extends Plugin {

    private static final String[] COLS = {
        CalendarContract.Instances.EVENT_ID,
        CalendarContract.Instances.TITLE,
        CalendarContract.Instances.BEGIN,
        CalendarContract.Instances.END,
        CalendarContract.Instances.EVENT_LOCATION,
        CalendarContract.Instances.ALL_DAY,
        CalendarContract.Instances.CALENDAR_DISPLAY_NAME,
        CalendarContract.Instances.STATUS,
        CalendarContract.Instances.CALENDAR_ID,
    };

    private static final String[] CAL_COLS = {
        CalendarContract.Calendars._ID,
        CalendarContract.Calendars.CALENDAR_DISPLAY_NAME,
        CalendarContract.Calendars.ACCOUNT_NAME,
        CalendarContract.Calendars.ACCOUNT_TYPE,
        CalendarContract.Calendars.CALENDAR_COLOR,
        CalendarContract.Calendars.VISIBLE,
    };

    private boolean granted() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_CALENDAR)
            == PackageManager.PERMISSION_GRANTED;
    }

    @PluginMethod
    public void hasPermission(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", granted());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (granted()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias("calendar", call, "permissionCallback");
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("calendar") == PermissionState.GRANTED);
        call.resolve(ret);
    }

    /** [startMs, endMs] 구간에 열리는 일정, 시작 시각 오름차순으로 최대 limit개 */
    @PluginMethod
    public void getEvents(PluginCall call) {
        if (!granted()) { call.reject("NO_PERMISSION"); return; }

        Long startArg = call.getLong("startMs");
        Long endArg   = call.getLong("endMs");
        if (startArg == null || endArg == null || endArg <= startArg) {
            call.reject("BAD_RANGE");
            return;
        }
        int limit = call.getInt("limit", 5);

        // 캘린더 골라 보기 — 계정이 여럿이면 같은 일정이 여러 번 들어온다.
        // limit 가 스캔 중에 걸리므로 걸러내기는 JS 가 아니라 여기(SQL)에서 해야 한다.
        // 비거나 없으면 전체 (고르지 않은 사용자는 지금까지와 똑같이 동작한다)
        String selection = null;
        String[] selectionArgs = null;
        JSArray idsArg = call.getArray("calendarIds", null);
        if (idsArg != null && idsArg.length() > 0) {
            try {
                List<String> ids = new ArrayList<>();
                for (int i = 0; i < idsArg.length(); i++) ids.add(String.valueOf(idsArg.get(i)));
                StringBuilder ph = new StringBuilder();
                for (int i = 0; i < ids.size(); i++) ph.append(i == 0 ? "?" : ",?");
                selection = CalendarContract.Instances.CALENDAR_ID + " IN (" + ph + ")";
                selectionArgs = ids.toArray(new String[0]);
            } catch (Exception ignored) { /* 형식이 이상하면 전체 조회로 둔다 */ }
        }

        Uri.Builder b = CalendarContract.Instances.CONTENT_URI.buildUpon();
        ContentUris.appendId(b, startArg);
        ContentUris.appendId(b, endArg);

        JSArray events = new JSArray();
        Context ctx = getContext();
        try (Cursor c = ctx.getContentResolver().query(
                b.build(), COLS, selection, selectionArgs, CalendarContract.Instances.BEGIN + " ASC")) {
            if (c != null) {
                int shown = 0;
                while (c.moveToNext() && shown < limit) {
                    // 취소된 일정은 건너뛴다 (STATUS_CANCELED = 2)
                    if (!c.isNull(7) && c.getInt(7) == CalendarContract.Events.STATUS_CANCELED) continue;
                    String title = c.isNull(1) ? "" : c.getString(1);
                    if (title.trim().isEmpty()) title = "(제목 없음)";

                    JSObject o = new JSObject();
                    o.put("id",       c.getLong(0));
                    o.put("title",    title);
                    o.put("startMs",  c.getLong(2));
                    o.put("endMs",    c.getLong(3));
                    o.put("location", c.isNull(4) ? "" : c.getString(4));
                    o.put("allDay",   c.getInt(5) == 1);
                    o.put("calendar",   c.isNull(6) ? "" : c.getString(6));
                    o.put("calendarId", c.getLong(8));
                    events.put(o);
                    shown++;
                }
            }
        } catch (Exception e) {
            call.reject("QUERY_FAILED", e);
            return;
        }

        JSObject ret = new JSObject();
        ret.put("events", events);
        call.resolve(ret);
    }

    /** 기기에 등록된 캘린더 목록 — 사용자가 쓸 것만 고를 수 있게 한다 */
    @PluginMethod
    public void getCalendars(PluginCall call) {
        if (!granted()) { call.reject("NO_PERMISSION"); return; }

        JSArray calendars = new JSArray();
        try (Cursor c = getContext().getContentResolver().query(
                CalendarContract.Calendars.CONTENT_URI, CAL_COLS, null, null,
                CalendarContract.Calendars.ACCOUNT_NAME + " ASC")) {
            if (c != null) {
                while (c.moveToNext()) {
                    JSObject o = new JSObject();
                    o.put("id",          c.getLong(0));
                    o.put("name",        c.isNull(1) ? "" : c.getString(1));
                    o.put("account",     c.isNull(2) ? "" : c.getString(2));
                    o.put("accountType", c.isNull(3) ? "" : c.getString(3));
                    o.put("color",       c.isNull(4) ? 0 : c.getInt(4));
                    o.put("visible",     !c.isNull(5) && c.getInt(5) == 1);
                    calendars.put(o);
                }
            }
        } catch (Exception e) {
            call.reject("QUERY_FAILED", e);
            return;
        }

        JSObject ret = new JSObject();
        ret.put("calendars", calendars);
        call.resolve(ret);
    }
}
