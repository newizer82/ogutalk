import { useKeywords } from '../hooks/useKeywords'
import KeywordList from '../components/keywords/KeywordList'
import KeywordNews from '../components/keywords/KeywordNews'
import { theme } from '../styles/theme'

const styles = {
  wrapper: { padding: '20px 16px' },
  title: {
    fontSize: 17,
    fontWeight: 700,
    color: theme.text.primary,
    marginBottom: 14,
  },
}

export default function KeywordsPage({ userId }) {
  const { keywords, loading, addKeyword, deleteKeyword } = useKeywords(userId)

  return (
    <div style={styles.wrapper}>
      <p style={styles.title}>관심 키워드</p>
      <KeywordList
        keywords={keywords}
        loading={loading}
        onAdd={addKeyword}
        onDelete={deleteKeyword}
      />
      <KeywordNews keywords={keywords} />
    </div>
  )
}
