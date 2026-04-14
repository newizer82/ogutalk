import { theme } from '../../styles/theme'

// MVP: Naver 검색 API는 CORS 이슈로 Edge Function 필요 → Day 7 이후 연동
// 현재는 키워드별 네이버 뉴스 링크로 안내

const styles = {
  section: {
    marginTop: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: theme.text.muted,
    marginBottom: 10,
  },
  card: {
    background: theme.bg.secondary,
    borderRadius: 14,
    padding: '14px 16px',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  keyword: {
    fontSize: 15,
    fontWeight: 600,
    color: theme.text.primary,
  },
  linkBtn: {
    padding: '5px 12px',
    background: 'transparent',
    border: `1px solid ${theme.accent.primary}`,
    borderRadius: 8,
    color: theme.accent.secondary,
    fontSize: 12,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  empty: {
    textAlign: 'center',
    color: theme.text.muted,
    fontSize: 13,
    padding: '16px 0',
  },
}

export default function KeywordNews({ keywords }) {
  if (keywords.length === 0) {
    return null
  }

  return (
    <div style={styles.section}>
      <p style={styles.label}>📰 키워드 뉴스 바로가기</p>
      {keywords.map(k => (
        <div key={k.id} style={styles.card}>
          <span style={styles.keyword}>{k.keyword}</span>
          <a
            style={styles.linkBtn}
            href={`https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(k.keyword)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            뉴스 보기
          </a>
        </div>
      ))}
    </div>
  )
}
