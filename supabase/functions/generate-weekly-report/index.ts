import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // ── 5. 템플릿 기반 리포트 자동 생성 ───────────────────
    const activityLabel: Record<string, string> = {
      goal_work: '목표 할일', study: '공부/업무', sns: 'SNS/유튜브', rest: '휴식/식사',
    }

    // 주요 활동 찾기
    const topActivity = Object.entries(activityMinutes)
      .sort(([,a],[,b]) => b - a)[0]
    const topActivityName = topActivity ? activityLabel[topActivity[0]] ?? topActivity[0] : null
    const topActivityHours = topActivity ? Math.round(topActivity[1] / 60) : 0
    const snsMinutes = (activityMinutes['sns'] ?? 0)
    const goalMinutes = (activityMinutes['goal_work'] ?? 0)
    const totalCheckins = checkins?.length ?? 0

    // 완료율별 하이라이트
    const highlights =
      completionRate >= 90 ? `이번 주 할일 완료율 ${completionRate}%! 거의 완벽한 한 주였습니다. ${todosCompleted}개의 할일을 해낸 집중력과 실행력이 돋보입니다. 이 흐름을 다음 주에도 이어가세요.` :
      completionRate >= 70 ? `할일 ${todosCompleted}개 완료, 완료율 ${completionRate}%로 꽤 알찬 한 주였습니다. 미완료 ${todosTotal - todosCompleted}개는 부담이 아니라 다음 주의 출발점입니다.` :
      completionRate >= 40 ? `${todosCompleted}개를 완료했습니다. 완료율 ${completionRate}%는 아직 성장 여지가 있다는 신호예요. 할일을 조금 더 작게 쪼개보면 완료율이 확 올라갈 거예요.` :
      todosTotal === 0 ? `이번 주는 할일 기록이 없었습니다. 다음 주부터 작은 할일 3개만 먼저 등록해보세요. 기록이 쌓이면 성취감도 커집니다.` :
      `시작이 반입니다! ${todosCompleted}개를 완료했고, 오구톡으로 시간을 인식하기 시작했다는 것 자체가 이번 주의 가장 큰 성과입니다.`

    // 활동 패턴별 스토리
    const story =
      totalCheckins === 0 ? `이번 주 ${startDate.toLocaleDateString('ko-KR')} ~ ${endDate.toLocaleDateString('ko-KR')}, 할일 ${todosTotal}개 중 ${todosCompleted}개를 완료했습니다. 체크인 기록은 없었지만, 꾸준히 앱을 열었다는 것 자체로 시간 인식 습관이 조금씩 자리잡고 있습니다.` :
      goalMinutes > snsMinutes ? `이번 주는 목표 중심으로 움직인 한 주였습니다. 오구 알람에 ${totalCheckins}번 체크인했고, 그 중 목표 할일에 집중한 시간이 가장 길었습니다. 할일 ${todosCompleted}/${todosTotal}개 완료, 완료율 ${completionRate}%. 방향이 맞습니다.` :
      snsMinutes > 120 ? `이번 주 ${totalCheckins}번 체크인 중 SNS/유튜브 시간이 ${Math.round(snsMinutes/60)}시간으로 가장 많았습니다. 할일 완료율은 ${completionRate}%. 스크린 타임을 줄이면 완료율이 자연스럽게 올라갈 거예요.` :
      `${startDate.toLocaleDateString('ko-KR')} ~ ${endDate.toLocaleDateString('ko-KR')}, 총 ${totalCheckins}번 체크인했습니다. ${topActivityName ? `주로 ${topActivityName}(${topActivityHours}시간)에 시간을 썼고, ` : ''}할일 ${todosCompleted}/${todosTotal}개(${completionRate}%)를 마무리했습니다.`

    // 완료율 + 활동 패턴별 제안
    const suggestions =
      snsMinutes > goalMinutes && snsMinutes > 60 ? `다음 주에는 오구 알람이 울릴 때 SNS 대신 할일 1개를 먼저 처리해보세요. 59분마다 딱 하나씩만 해도 일주일에 ${7 * 3}개 이상 완료됩니다.` :
      completionRate < 50 && todosTotal > 5 ? `다음 주 할일은 5개 이하로 줄여보세요. 적게 잡고 전부 완료하는 경험이 완료율 80% 이상의 지름길입니다.` :
      completionRate >= 80 ? `이번 주처럼 잘 하고 있어요! 다음 주에는 조금 더 도전적인 할일을 1개 추가해서 성장의 폭을 넓혀보세요.` :
      totalCheckins < 5 ? `오구 알람이 울릴 때 체크인 버튼을 눌러보세요. 내가 무엇을 하고 있는지 기록하는 것만으로도 시간 낭비를 줄일 수 있습니다.` :
      `매일 아침 할일 목록을 한 번만 확인하는 습관을 추가해보세요. 3분이면 하루 방향이 잡힙니다.`

    const aiContent = { highlights, story, suggestions }

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
