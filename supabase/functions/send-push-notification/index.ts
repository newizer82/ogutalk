import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── VAPID 설정 ────────────────────────────────────
    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT')!,
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!
    )

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── 현재 KST 시각 계산 ────────────────────────────
    const now     = new Date()
    const kstHour = (now.getUTCHours() + 9) % 24

    // ── 모든 푸시 구독 조회 ───────────────────────────
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')

    if (subError) throw subError

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, skipped: 0, failed: 0, message: 'No subscribers' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 랜덤 경제 상식 조회 ───────────────────────────
    const { data: tip } = await supabase
      .from('economic_tips')
      .select('title, content')
      .limit(1)
      .single()

    // ── 병렬 발송 ─────────────────────────────────────
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        // 해당 유저의 알람 시간대 설정 확인 (trigger_hour + is_enabled 방식)
        const { data: alarmRows } = await supabase
          .from('alarm_settings')
          .select('trigger_hour, is_enabled')
          .eq('user_id', sub.user_id)

        // alarm_settings 데이터가 있는 경우 → 해당 시간 is_enabled 확인
        // 데이터가 없는 경우 → 기본 7~23시 허용 (초기 유저 대비)
        if (alarmRows && alarmRows.length > 0) {
          const thisHour = alarmRows.find(r => r.trigger_hour === kstHour)
          if (thisHour && !thisHour.is_enabled) {
            return { skipped: true, userId: sub.user_id, reason: 'hour disabled' }
          }
          // thisHour가 없으면 (해당 시간 행 자체가 없으면) 기본 허용
        }
        // alarmRows가 없거나 비어있으면 기본 허용

        // 알림 페이로드 구성
        const payload = JSON.stringify({
          title: `⏱️ ${kstHour}시 오구!`,
          body: tip
            ? `📈 ${tip.title}: ${tip.content.slice(0, 55)}...`
            : `벌써 ${kstHour}시 59분이에요! 잠깐 쉬어가세요.`,
          hour: kstHour,
          url: '/',
        })

        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 60, urgency: 'high' }
          )

          // last_used_at 갱신
          await supabase
            .from('push_subscriptions')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', sub.id)

          // 알림 발송 로그
          await supabase
            .from('notification_log')
            .insert({
              user_id:         sub.user_id,
              alarm_hour:      kstHour,
              activity_type:   null,
              created_at:      new Date().toISOString(),
            })

          return { success: true, userId: sub.user_id }

        } catch (err: any) {
          // 만료/삭제된 구독은 DB에서 제거
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id)
            return { failed: true, userId: sub.user_id, reason: 'subscription expired' }
          }
          throw err
        }
      })
    )

    // ── 결과 집계 ─────────────────────────────────────
    const sent    = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length
    const skipped = results.filter(r => r.status === 'fulfilled' && (r.value as any).skipped).length
    const failed  = results.filter(r => r.status === 'rejected'  || (r.status === 'fulfilled' && (r.value as any).failed)).length

    console.log(`[Push] hour=${kstHour} total=${subscriptions.length} sent=${sent} skipped=${skipped} failed=${failed}`)

    return new Response(
      JSON.stringify({ hour: kstHour, total: subscriptions.length, sent, skipped, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[Push] 발송 에러:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
