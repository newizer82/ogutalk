import { useState, useMemo } from 'react'
import GlassCard from '../components/common/GlassCard'
import { useWeeklyReport } from '../hooks/useWeeklyReport'
import { useCheckinReport } from '../hooks/useCheckinReport'
import { S, gradients } from '../styles/theme'
import { GROUPS, CATEGORIES, groupOf, labelOf, emojiOf, colorOf } from '../data/appCategories'
import OguScoreCard from '../components/report/OguScoreCard'
import { oguScore, AXES, AXIS_LABEL } from '../lib/oguScore'
import { axisMinutesByDay, formatMinutes } from '../lib/alarmContext'
import ScoreBasisModal from '../components/report/ScoreBasisModal'
import { todayLog, yesterdayScore, yesterdayIncomparable, streakDays, saveDayScore } from '../lib/dayLog'
import { todayMissions } from '../lib/missionStore'

const pad = n => String(n).padStart(2, '0')

export default function ReportsPage({ userId, autoCheckin = false, goals, lifeStage = null }) {
  const { reports, loading, error, generateReport } = useWeeklyReport(userId)
  const { checkins, todayCheckins, activityCount, hourCount, loading: checkinLoading } = useCheckinReport(userId)
  const [selectedIdx, setSelectedIdx] = useState(0)

  const report = reports[selectedIdx] ?? null

  // 오구 지수 — 오늘 기록 + 앱이 관찰한 행동으로 계산 (측정한 것만 점수로 쓴다)
  const [basisOpen, setBasisOpen] = useState(false)
  const score = useMemo(() => {
    const log = todayLog()
    const m = todayMissions(lifeStage)
    const r = oguScore({
      checkins, goals, measured: autoCheckin,
      missionDone:  m.done.length,
      missionTotal: m.missions.length,
      todoDone:     log.doneCount,
      actedOnAlarm: log.actedOnAlarm,
    })
    // 하루가 거의 끝난 뒤의 점수만 저장한다 — 오전 점수를 그날 점수로 남기면
    // 내일의 "어제보다" 비교가 늘 과소평가된다.
    if (new Date().getHours() >= 21) saveDayScore(r.score)
    return r
  }, [checkins, autoCheckin, goals, lifeStage])
  const prevScore = useMemo(() => yesterdayScore(), [])
  // 어제 점수는 있는데 공식이 바뀌어 비교할 수 없는 경우 — 이유를 알려준다
  const formulaChanged = useMemo(() => yesterdayIncomparable(), [])
  const streak    = useMemo(() => streakDays(), [score.score])

  const handleGenerate = async () => {
    if (!userId) return
    const result = await generateReport()
    if (result) setSelectedIdx(0)
  }

  // ── 비로그인: 체크인 리포트만 표시 ──
  if (!userId) {
    return (
      <div>
        <OguScoreCard result={score} yesterday={prevScore} formulaChanged={formulaChanged} streak={streak} onOpenApps={() => setBasisOpen(true)} />
        <CheckinReport
          checkins={checkins}
          todayCheckins={todayCheckins}
          activityCount={activityCount}
          hourCount={hourCount}
          loading={checkinLoading}
        />
        <div style={{
          marginTop: 8, padding: '14px 18px', borderRadius: 14, textAlign: 'center',
          background: 'rgba(255,107,44,0.06)', border: '1px solid rgba(255,107,44,0.12)',
        }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
          <div style={{ color: '#8E8E93', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>주간 리포트</div>
          <div style={{ color: '#9A9AA0', fontSize: 12, lineHeight: 1.7, marginBottom: 12 }}>
            로그인하면 할일·활동 패턴을<br />자동 분석한 주간 리포트를 받을 수 있어요.
          </div>
          <div style={{ color: '#D9531B', fontSize: 12, fontWeight: 700 }}>
            🔐 설정 탭에서 로그인해주세요
          </div>
        </div>
        {basisOpen && (
          <ScoreBasisModal checkins={checkins} userId={userId} onClose={() => setBasisOpen(false)} />
        )}
      </div>
    )
  }

  return (
    <div>
      {/* ── 오구 체크인 리포트 ── */}
      <OguScoreCard result={score} yesterday={prevScore} formulaChanged={formulaChanged} streak={streak} onOpenApps={() => setBasisOpen(true)} />
      <CheckinReport
        checkins={checkins}
        todayCheckins={todayCheckins}
        activityCount={activityCount}
        hourCount={hourCount}
        loading={checkinLoading}
      />

      {/* ── 주간 리포트 헤더 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#3A3A3E' }}>📊 주간 리포트</div>
          <div style={{ fontSize: 11, color: '#B0B0B6', marginTop: 2 }}>나의 한 주를 자동 분석합니다</div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            ...S.primaryBtn,
            padding: '8px 14px',
            fontSize: 12,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? '⏳ 생성 중...' : '✨ 리포트 생성'}
        </button>
      </div>

      {/* ── 에러 메시지 ── */}
      {error && (
        <div style={{
          marginBottom: 12, padding: '14px 16px', borderRadius: 14,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
        }}>
          <div style={{ color: '#D23B2E', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>⚠️ 리포트 생성 실패</div>
          <div style={{ color: '#fca5a5', fontSize: 12, lineHeight: 1.6 }}>{error}</div>
          <div style={{ color: '#9A9AA0', fontSize: 11, marginTop: 8, lineHeight: 1.6 }}>
            💡 Supabase 대시보드 → SQL Editor에서<br />
            <code style={{ color: '#D9531B', fontSize: 10 }}>v0.7.0_weekly_reports.sql</code> 마이그레이션이 실행됐는지 확인하세요.
          </div>
        </div>
      )}

      {/* ── 리포트 없을 때 ── */}
      {!loading && reports.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>📊</div>
          <div style={{ color: '#9A9AA0', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
            아직 리포트가 없어요.<br />
            버튼을 눌러 이번 주 리포트를 생성해보세요!
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{ ...S.primaryBtn, fontSize: 14 }}
          >
            ✨ 첫 리포트 생성하기
          </button>
        </div>
      )}

      {/* ── 리포트 목록 탭 (2개 이상일 때) ── */}
      {reports.length > 1 && (
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto',
          marginBottom: 14, paddingBottom: 4,
        }}>
          {reports.map((r, i) => (
            <button
              key={r.id}
              onClick={() => setSelectedIdx(i)}
              style={{
                flexShrink: 0,
                padding: '5px 12px', borderRadius: 20, border: 'none',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: selectedIdx === i
                  ? 'linear-gradient(135deg,#FF6B2C,#E8762C)'
                  : 'rgba(0,0,0,0.035)',
                color: selectedIdx === i ? 'white' : '#9A9AA0',
              }}
            >
              {r.year}년 {r.week_number}주차
            </button>
          ))}
        </div>
      )}

      {/* ── 리포트 상세 ── */}
      {report && (
        <>
          {/* 주차 헤더 */}
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{
              fontSize: 13, fontWeight: 700,
              background: gradients.logo,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {report.year}년 {report.week_number}주차
            </div>
            <div style={{ color: '#B0B0B6', fontSize: 11, marginTop: 2 }}>
              {report.start_date} ~ {report.end_date}
            </div>
          </div>

          {/* 완료율 요약 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <StatBox label="할일 완료율" value={`${report.completion_rate}%`} color="#FFA05C" />
            <StatBox
              label="완료 / 전체"
              value={`${report.todos_completed} / ${report.todos_total}`}
              color="#1E7A58"
            />
          </div>

          {/* 활동 시간 분석 */}
          {report.activity_minutes && Object.keys(report.activity_minutes).length > 0 && (
            <GlassCard style={{ marginBottom: 12, padding: 18 }}>
              <div style={{ color: '#60a5fa', fontSize: 11, fontWeight: 700, marginBottom: 12 }}>
                📈 시간 활용 분석
              </div>
              {Object.entries(report.activity_minutes).map(([key, mins]) => {
                const hours = Math.floor(Number(mins) / 60)
                const m     = Number(mins) % 60
                const total = Object.values(report.activity_minutes).reduce(
                  (s, v) => s + Number(v), 0
                )
                const pct = total > 0 ? Math.round(Number(mins) / total * 100) : 0
                return (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#3A3A3E', fontSize: 12 }}>
                        {labelOf(key)}
                      </span>
                      <span style={{ color: '#9A9AA0', fontSize: 11 }}>
                        {hours > 0 ? `${hours}시간 ` : ''}{m}분
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.035)' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: 3,
                        background: colorOf(key),
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </GlassCard>
          )}

          {/* 하이라이트 */}
          {report.highlights && (
            <GlassCard style={{ marginBottom: 12, padding: 20 }}>
              <div style={{ color: '#FFA05C', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                ✨ 이번 주 하이라이트
              </div>
              <div style={{ color: '#111111', fontSize: 14, lineHeight: 1.7 }}>
                {report.highlights}
              </div>
            </GlassCard>
          )}

          {/* 스토리 */}
          {report.story && (
            <GlassCard style={{ marginBottom: 12, padding: 20 }}>
              <div style={{ color: '#B4740F', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                📖 이번 주 이야기
              </div>
              <div style={{ color: '#111111', fontSize: 14, lineHeight: 1.7 }}>
                {report.story}
              </div>
            </GlassCard>
          )}

          {/* 제안 */}
          {report.suggestions && (
            <GlassCard style={{
              marginBottom: 20,
              padding: 20,
              background: 'rgba(251,191,36,0.06)',
              border: '1px solid rgba(251,191,36,0.18)',
            }}>
              <div style={{ color: '#B4740F', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                💡 다음 주 제안
              </div>
              <div style={{ color: '#111111', fontSize: 14, lineHeight: 1.7 }}>
                {report.suggestions}
              </div>
            </GlassCard>
          )}
        </>
      )}
        {basisOpen && (
          <ScoreBasisModal checkins={checkins} userId={userId} onClose={() => setBasisOpen(false)} />
        )}
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <GlassCard style={{ textAlign: 'center', padding: 14 }}>
      <div style={{ color: '#B0B0B6', fontSize: 10, marginBottom: 6 }}>{label}</div>
      <div style={{ color, fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{value}</div>
    </GlassCard>
  )
}

// ── 분포 막대 한 줄 (그룹·세부 공용) ─────────────────────────────
function DistributionBar({ item, total, height }) {
  const pct = total > 0 ? Math.round(item.count / total * 100) : 0
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        {/* 라벨 앞 이모지는 따로 붙이므로 떼어낸다 */}
        <span style={{ color: '#3A3A3E', fontSize: 11 }}>{item.emoji} {item.label.replace(/^[^\s]+ /, '')}</span>
        <span style={{ color: '#9A9AA0', fontSize: 10 }}>{item.count}회 ({pct}%)</span>
      </div>
      <div style={{ height, borderRadius: 3, background: 'rgba(0,0,0,0.035)' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 3,
          background: item.color,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}

// ── 오구 체크인 리포트 컴포넌트 ──────────────────────────────────
function CheckinReport({ checkins, todayCheckins, activityCount, hourCount, loading }) {
  const total = checkins.length
  const todayTotal = todayCheckins.length

  // 그룹 분포 (헤드라인) — 수동(그룹)·자동(세부)·옛 기록을 모두 그룹으로 묶는다.
  // 이전엔 라벨 목록을 순회해서 목록에 없는 값은 차트에서 조용히 사라졌다.
  const groupCount = {}
  for (const [type, n] of Object.entries(activityCount)) {
    const g = groupOf(type)
    if (g) groupCount[g] = (groupCount[g] || 0) + n
  }
  const groupedTotal = Object.values(groupCount).reduce((s, n) => s + n, 0)
  const groups = Object.entries(GROUPS).map(([key, g]) => ({
    key, label: g.label, emoji: g.emoji, color: g.color, count: groupCount[key] || 0,
  })).sort((a, b) => b.count - a.count)

  // 세부 분포 — 자동 기록만 세부 분류를 갖는다(수동은 그룹 단위라 여기 안 나옴)
  const details = Object.entries(activityCount)
    .filter(([type, n]) => CATEGORIES[type] && n > 0)
    .map(([type, n]) => ({ key: type, label: labelOf(type), emoji: emojiOf(type), color: colorOf(type), count: n }))
    .sort((a, b) => b.count - a.count)

  // 24시간 시간대 활동 맵
  const maxHourCount = Math.max(...Object.values(hourCount), 1)

  // 최근 7일 축별 추이 — 리포트의 고유 가치는 "흐름" 이다
  const week = axisMinutesByDay(checkins, 7)
  const weekMax = Math.max(...week.map(d => d.produce + d.consume + d.connect), 0)

  return (
    <GlassCard style={{ marginBottom: 14, padding: 18 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#3A3A3E' }}>📈 최근 7일 추세</div>
          <div style={{ fontSize: 10, color: '#B0B0B6', marginTop: 2 }}>오늘 하루는 홈에서, 흐름은 여기서</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#D9531B', lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 9, color: '#B0B0B6', marginTop: 2 }}>총 체크인</div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', color: '#B0B0B6', fontSize: 12, padding: '20px 0' }}>⏳ 불러오는 중...</div>
      )}

      {!loading && total === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏱️</div>
          <div style={{ color: '#B0B0B6', fontSize: 12 }}>
            아직 체크인 기록이 없어요.<br />
            알람이 울릴 때 활동을 선택해보세요!
          </div>
        </div>
      )}

      {!loading && total > 0 && (
        <>
          {/* 주간 3축 추이 — 홈은 오늘, 리포트는 흐름 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              {AXES.map(a => (
                <span key={a} style={{ fontSize: 10.5, fontWeight: 700, color: GROUPS[a].color }}>
                  {AXIS_LABEL[a]}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', height: 72 }}>
              {week.map(d => {
                const h = m => (weekMax ? Math.round((m / weekMax) * 64) : 0)
                return (
                  <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{
                      width: '100%', display: 'flex', flexDirection: 'column-reverse',
                      justifyContent: 'flex-start', height: 64, gap: 1,
                    }}>
                      {AXES.map(a => d[a] > 0 && (
                        <div key={a} title={`${AXIS_LABEL[a]} ${formatMinutes(d[a])}`} style={{
                          height: Math.max(2, h(d[a])), borderRadius: 2, background: GROUPS[a].color,
                        }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 9.5, color: '#B0B0B6', fontVariantNumeric: 'tabular-nums' }}>
                      {d.label}
                    </span>
                  </div>
                )
              })}
            </div>
            {weekMax === 0 && (
              <div style={{ color: '#B0B0B6', fontSize: 11, marginTop: 6 }}>
                아직 쌓인 기록이 없어요. 자동 활동 기록을 켜면 저절로 채워져요.
              </div>
            )}
          </div>

          {/* 세부 분포 — 자동 기록이 있을 때만 */}
          {details.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: '#8E8E93', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>🔎 세부 (앱 사용 기준)</div>
              {details.map(a => <DistributionBar key={a.key} item={a} total={groupedTotal} height={4} />)}
            </div>
          )}

          {/* 시간대별 히트맵 (6~23시) */}
          {Object.keys(hourCount).length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: '#8E8E93', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>🕐 시간대별 알람 활동</div>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 28 }}>
                {Array.from({ length: 24 }, (_, h) => {
                  const cnt = hourCount[h] || 0
                  const heightPct = cnt > 0 ? Math.max(0.25, cnt / maxHourCount) : 0
                  return (
                    <div key={h} title={`${pad(h)}시 ${cnt}회`} style={{
                      flex: 1, borderRadius: 2,
                      height: cnt > 0 ? `${Math.round(heightPct * 24)}px` : '4px',
                      background: cnt > 0
                        ? `rgba(129,140,248,${0.3 + heightPct * 0.7})`
                        : 'rgba(0,0,0,0.025)',
                      transition: 'height 0.3s ease',
                    }} />
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9A9AA0', fontSize: 8, marginTop: 3 }}>
                <span>00시</span><span>12시</span><span>23시</span>
              </div>
            </div>
          )}

        </>
      )}
    </GlassCard>
  )
}
