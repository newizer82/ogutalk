// v1.3.0: 매일 새벽 3시(KST) FCM push로 모든 네이티브 클라이언트에 알람 재등록 요청
// 클라이언트는 data.type === 'reschedule' 수신 시 scheduleOguAlarms 재호출
//
// 배포: supabase functions deploy reschedule-alarms
// 필요 Secrets: FIREBASE_SERVICE_ACCOUNT (Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: rows, error } = await supabase.from('fcm_tokens').select('token')
  if (error) return json({ error: error.message }, 500)
  if (!rows?.length) return json({ sent: 0, message: 'no tokens' })

  const sa = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT')!)
  const accessToken = await getAccessToken(sa)

  let ok = 0, fail = 0
  await Promise.all(rows.map(async ({ token }) => {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            token,
            data: { type: 'reschedule' },
            android: { priority: 'HIGH' },
          },
        }),
      }
    )
    if (res.ok) ok++
    else {
      fail++
      // 만료된 토큰 정리 (404 = 등록 해제됨)
      if (res.status === 404 || res.status === 400) {
        await supabase.from('fcm_tokens').delete().eq('token', token)
      }
    }
  }))

  return json({ sent: ok, failed: fail, total: rows.length })
})

// ── OAuth access token 발급 (Firebase 서비스 계정) ─────────
async function getAccessToken(sa: any): Promise<string> {
  const pem = sa.private_key.replace(/\\n/g, '\n')
  const key = await importPrivateKey(pem)

  const jwt = await create(
    { alg: 'RS256', typ: 'JWT' },
    {
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      exp: getNumericDate(3600),
      iat: getNumericDate(0),
    },
    key
  )

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const { access_token } = await res.json()
  return access_token
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const b64 = pem.replace('-----BEGIN PRIVATE KEY-----', '')
                 .replace('-----END PRIVATE KEY-----', '')
                 .replace(/\s/g, '')
  const der = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
