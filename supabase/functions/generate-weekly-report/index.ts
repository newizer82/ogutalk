import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.30.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id } = await req.json()
    if (!user_id) throw new Error('user_id가 필요합니다')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── 지난 주 기간 계산 (월~일) ──────────────────────
    const now = new Date()
    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() - endDate.getDay()) // 직전 일요일
    endDate.setHours(23, 59, 59, 999)
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - 6)           // 직전 월요일
    startDate.setHours(0, 0, 0, 0)

    // ── 1. 할일 데이터 ─────────────────────────────────
    const { data: todos } = await supabase
      .from('todos')
      .select('id, title, completed, is_completed, goal_id, created_at, updated_at')
      .eq('user_id', user_id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // ── 2. 체크인 데이터 ───────────────────────────────
    const { data: checkins } = await supabase
      .from('notification_log')
      .select('activity_type, alarm_hour, created_at')
      .eq('user_id', user_id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .not('activity_type', 'is', null)

    // ── 3. 목표 데이터 ─────────────────────────────────
    const { data: goals } = await supabase
      .from('goals')
      .select('id, title, progress, type')
      .eq('user_id', user_id)

    // ── 4. 통계 계산 ───────────────────────────────────
    const todosCompleted = todos?.filter(t => t.completed || t.is_completed).length ?? 0
    const todosTotal = todos?.length ?? 0
    const completionRate = todosTotal > 0
      ? Math.round((todosCompleted / todosTotal) * 100)
      : 0

    // 활동 시간 집계 (체크인 1회 = 59분으로 계산)
    const activityMinutes: Record<string, number> = {}
    checkins?.forEach(c => {
      if (c.activity_type) {
        activityMinutes[c.activity_type] = (activityMinutes[c.activity_type] ?? 0) + 59
      }
    })

    // ── 5. Claude API 호출 ─────────────────────────────
    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
    })

    const activityLabel: Record<string, string> = {
      goal_work: '목표 할일',
      study: '공부/업무',
      sns: 'SNS/유튜브',
      rest: '휴식/식사',
    }
    const activitySummary = Object.entries(activityMinutes)
      .map(([k, v]) => `${activityLabel[k] ?? k}: ${Math.round(v / 60)}시간 ${v % 60}분`)
      .join(', ') || '기록 없음'

    const goalsSummary = goals?.map(g =>
      `${g.title} (${g.type ?? ''}) ${g.progress ?? 0}%`
    ).join(', ') || '목표 없음'

    const prompt = `당신은 사용자의 주간 활동을 분석해 따뜻하고 동기부여가 되는 한국어 리포트를 작성하는 AI입니다.
데이터가 적더라도 격려 위주로 긍정적으로 작성해 주세요.

# 사용자 주간 데이터
- 기간: ${startDate.toLocaleDateString('ko-KR')} ~ ${endDate.toLocaleDateString('ko-KR')}
- 할일 완료: ${todosCompleted}/${todosTotal}개 (완료율 ${completionRate}%)
- 시간 활용: ${activitySummary}
- 목표 현황: ${goalsSummary}

# 작성 요청
아래 3가지를 각각 2~3줄의 자연스러운 한국어로 작성해 주세요.

1. **하이라이트**: 이번 주 가장 인상적인 성취나 긍정적인 변화
2. **스토리**: 이번 주를 하나의 이야기처럼 요약 (구체적 숫자 포함)
3. **제안**: 다음 주를 위한 구체적이고 실행 가능한 제안 1가지

반드시 아래 JSON 형식으로만 응답하세요. 다른 설명은 절대 쓰지 마세요:
{"highlights":"...","story":"...","suggestions":"..."}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : ''

    // JSON 파싱 (앞뒤 불필요한 텍스트 제거)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Claude 응답 파싱 실패: ' + responseText)
    const aiContent = JSON.parse(jsonMatch[0])

    // ── 6. DB 저장 ─────────────────────────────────────
    const weekNumber = getWeekNumber(startDate)
    const year = startDate.getFullYear()

    const { data, error } = await supabase
      .from('weekly_reports')
      .upsert({
        user_id,
        week_number: weekNumber,
        year,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        todos_completed: todosCompleted,
        todos_total: todosTotal,
        completion_rate: completionRate,
        activity_minutes: activityMinutes,
        goals_progress: goals ?? [],
        highlights: aiContent.highlights,
        story: aiContent.story,
        suggestions: aiContent.suggestions,
      }, { onConflict: 'user_id,year,week_number' })
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, report: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('generate-weekly-report error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ISO 주차 번호 계산
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
