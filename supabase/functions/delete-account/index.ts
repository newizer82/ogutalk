// 사용자 계정 + 데이터 완전 삭제 Edge Function
// 클라이언트 호출: supabase.functions.invoke('delete-account')
// 동작:
//   1) 호출자 JWT로 본인 확인
//   2) service_role 클라이언트로 사용자 데이터 + auth 계정 삭제
//
// 배포: supabase functions deploy delete-account --no-verify-jwt
//      (또는 Supabase Dashboard → Edge Functions → "delete-account" 생성 후 본 코드 붙여넣고 deploy)
//
// 필요한 환경변수 (Supabase 자동 주입):
//   - SUPABASE_URL
//   - SUPABASE_ANON_KEY
//   - SUPABASE_SERVICE_ROLE_KEY  ← 자동 주입됨 (별도 설정 불필요)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1) 호출자 JWT 검증 → user.id 확보
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization 헤더 누락' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: '인증 실패 (만료 또는 잘못된 토큰)' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2) service_role 클라이언트로 데이터 + auth 삭제
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 사용자 관련 모든 테이블 정리 (RLS 우회)
    // 새 테이블 추가 시 여기에도 추가해야 함
    const tables = [
      'todos',
      'goals',
      'custom_alarms',
      'notification_log',
      'alarm_settings',
      'user_preferences',
      'weekly_reports',
      'push_subscriptions',
      'profiles',
    ]

    for (const table of tables) {
      // profiles는 id 컬럼 사용, 나머지는 user_id
      const column = table === 'profiles' ? 'id' : 'user_id'
      const { error } = await adminClient.from(table).delete().eq(column, user.id)
      if (error && error.code !== '42P01') {
        // 42P01 = relation does not exist — 무시 (테이블이 없을 수도)
        console.warn(`[delete-account] ${table} 삭제 경고:`, error.message)
      }
    }

    // 3) auth 계정 삭제
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
    if (deleteError) {
      return new Response(JSON.stringify({ error: 'auth 계정 삭제 실패: ' + deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, deleted_user_id: user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
