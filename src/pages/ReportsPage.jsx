import { useState } from 'react'
import GlassCard from '../components/common/GlassCard'
import { useWeeklyReport } from '../hooks/useWeeklyReport'
import { S, gradients } from '../styles/theme'

const ACTIVITY_LABEL = {
  goal_work: '🎯 목표 할일',
  study:     '📚 공부/업무',
  sns:       '📱 SNS/유튜브',
  rest:      '😴 휴식/식사',
}

const ACTIVITY_COLOR = {
  goal_work: '#8b5cf6',
  study:     '#6366f1',
  sns:       '#f59e0b',
  rest:      '#10b981',
}

export default function ReportsPage({ userId }) {
  const { reports, loading, error, generateReport } = useWeeklyReport(userId)
  const [selectedIdx, setSelectedIdx] = useState(0)

  const report = reports[selectedIdx] ?? null

  const handleGenerate = async () => {
    const result = await generateReport()
    if (result) setSelectedIdx(0)
  }

  return (
    <div>
      {/* ── 헤더 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#cbd5e1' }}>📊 주간 리포트</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Claude AI가 분석한 나의 한 주</div>
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
        <GlassCard style={{
          marginBottom: 12,
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}>
          <div style={{ color: '#f87171', fontSize: 13 }}>⚠️ {error}</div>
        </GlassCard>
      )}

      {/* ── 리포트 없을 때 ── */}
      {!loading && reports.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>📊</div>
          <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
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
                  ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                  : 'rgba(255,255,255,0.06)',
                color: selectedIdx === i ? 'white' : '#64748b',
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
            <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>
              {report.start_date} ~ {report.end_date}
            </div>
          </div>

          {/* 완료율 요약 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <StatBox label="할일 완료율" value={`${report.completion_rate}%`} color="#a78bfa" />
            <StatBox
              label="완료 / 전체"
              value={`${report.todos_completed} / ${report.todos_total}`}
              color="#34d399"
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
                      <span style={{ color: '#cbd5e1', fontSize: 12 }}>
                        {ACTIVITY_LABEL[key] ?? key}
                      </span>
                      <span style={{ color: '#64748b', fontSize: 11 }}>
                        {hours > 0 ? `${hours}시간 ` : ''}{m}분
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: 3,
                        background: ACTIVITY_COLOR[key] ?? '#6366f1',
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
              <div style={{ color: '#a78bfa', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                ✨ 이번 주 하이라이트
              </div>
              <div style={{ color: '#e2e8f0', fontSize: 14, lineHeight: 1.7 }}>
                {report.highlights}
              </div>
            </GlassCard>
          )}

          {/* 스토리 */}
          {report.story && (
            <GlassCard style={{ marginBottom: 12, padding: 20 }}>
              <div style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                📖 이번 주 이야기
              </div>
              <div style={{ color: '#e2e8f0', fontSize: 14, lineHeight: 1.7 }}>
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
              <div style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                💡 다음 주 제안
              </div>
              <div style={{ color: '#fef3c7', fontSize: 14, lineHeight: 1.7 }}>
                {report.suggestions}
              </div>
            </GlassCard>
          )}
        </>
      )}
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <GlassCard style={{ textAlign: 'center', padding: 14 }}>
      <div style={{ color: '#475569', fontSize: 10, marginBottom: 6 }}>{label}</div>
      <div style={{ color, fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{value}</div>
    </GlassCard>
  )
}
