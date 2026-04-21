import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    // 요청 바디 파싱
    let query = '', display = 10
    try {
      const body = await req.json()
      query = body.query ?? ''
      display = body.display ?? 10
    } catch (e) {
      console.error('Body parse error:', e.message)
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    console.log('Query:', query, '| Display:', display)

    if (!query.trim()) {
      return new Response(JSON.stringify({ error: 'query is required' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const clientId     = Deno.env.get('NAVER_CLIENT_ID')
    const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET')

    console.log('ClientId present:', !!clientId, '| Secret present:', !!clientSecret)

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: 'Naver API credentials not configured' }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${display}&sort=date`
    console.log('Calling Naver API:', url)

    const naverRes = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    })

    const responseText = await naverRes.text()
    console.log('Naver status:', naverRes.status, '| Body:', responseText.slice(0, 200))

    if (!naverRes.ok) {
      return new Response(JSON.stringify({
        error: `Naver API ${naverRes.status}`,
        detail: responseText,
      }), {
        status: naverRes.status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    return new Response(responseText, {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Unexpected error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
