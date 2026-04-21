import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CATEGORIES: Record<string, { color: string; icon: string; keywords: string[] }> = {
  경제:   { color: '#34d399', icon: '💰', keywords: ['금리', '환율', '인플레이션', '무역수지', '원자재'] },
  AI:     { color: '#818cf8', icon: '🤖', keywords: ['생성AI', 'AI규제', 'AI반도체', '자율주행', 'AI에이전트'] },
  사회:   { color: '#f59e0b', icon: '🏙️', keywords: ['저출산', '부동산', '청년실업', '의료개혁', '관세전쟁'] },
  글로벌: { color: '#ef4444', icon: '🌍', keywords: ['미중갈등', '반도체전쟁', '달러', '원유', '금값'] },
}

function fmt(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getDateRange(days: number) {
  const end = new Date()
  end.setDate(end.getDate() - 1) // yesterday (latest available)
  const start = new Date(end)
  start.setDate(start.getDate() - days + 1)
  return { startDate: fmt(start), endDate: fmt(end) }
}

function avg(arr: { ratio: number }[]): number {
  if (!arr.length) return 0
  return arr.reduce((s, d) => s + d.ratio, 0) / arr.length
}

async function fetchCategory(
  clientId: string,
  clientSecret: string,
  keywords: string[],
  days: number, // 14 for weekly, 60 for monthly
): Promise<{ curr: number; prev: number }[]> {
  const dates = getDateRange(days)
  const keywordGroups = keywords.map(kw => ({ groupName: kw, keywords: [kw] }))

  const res = await fetch('https://openapi.naver.com/v1/datalab/search', {
    method: 'POST',
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...dates, timeUnit: 'date', keywordGroups }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`Datalab ${res.status}:`, text.slice(0, 200))
    return keywords.map(() => ({ curr: 0, prev: 0 }))
  }

  const data = await res.json()
  console.log(`Datalab OK (${days}d, ${keywords[0]}...):`, JSON.stringify(data).slice(0, 100))

  return keywords.map((_, i) => {
    const items: { ratio: number }[] = data.results?.[i]?.data ?? []
    const half = Math.floor(items.length / 2)
    const prevItems = items.slice(0, half)
    const currItems = items.slice(half)
    return { curr: avg(currItems), prev: avg(prevItems) }
  })
}

function buildPeriodData(
  entries: { catName: string; cat: typeof CATEGORIES[string]; ratios: { curr: number; prev: number }[] }[]
) {
  const result: Record<string, unknown> = {}
  for (const { catName, cat, ratios } of entries) {
    const items = cat.keywords.map((kw, i) => {
      const { curr, prev } = ratios[i]
      const trend = prev > 0 ? Math.round((curr - prev) / prev * 100) : 0
      return { kw, count: Math.round(curr * 10), trend, hot: trend >= 10 }
    }).sort((a, b) => b.count - a.count)
    result[catName] = { color: cat.color, icon: cat.icon, items }
  }
  return result
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const clientId     = Deno.env.get('NAVER_CLIENT_ID')
  const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET')
  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: 'credentials not configured' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  try {
    // 4 categories × 2 periods = 8 parallel requests
    const catEntries = Object.entries(CATEGORIES)

    const [weeklyRatios, monthlyRatios] = await Promise.all([
      Promise.all(catEntries.map(([, cat]) => fetchCategory(clientId, clientSecret, cat.keywords, 14))),
      Promise.all(catEntries.map(([, cat]) => fetchCategory(clientId, clientSecret, cat.keywords, 60))),
    ])

    const weeklyEntries  = catEntries.map(([catName, cat], i) => ({ catName, cat, ratios: weeklyRatios[i] }))
    const monthlyEntries = catEntries.map(([catName, cat], i) => ({ catName, cat, ratios: monthlyRatios[i] }))

    return new Response(JSON.stringify({
      weekly:    buildPeriodData(weeklyEntries),
      monthly:   buildPeriodData(monthlyEntries),
      updatedAt: new Date().toISOString(),
    }), { headers: { ...CORS, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('Unexpected error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
