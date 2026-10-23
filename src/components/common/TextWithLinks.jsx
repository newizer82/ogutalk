// 텍스트 안의 URL을 자동 감지해 클릭 가능한 링크로 렌더링.
// http(s):// 또는 www. 로 시작하는 토큰을 인식.
// 클릭 시 capacitor.js의 openUrl로 외부 브라우저 열림 (할일 탭과 동일 동작).
//
// preview={true} 면 주소 대신 읽을 수 있는 이름을 보여준다 (메모 전용).
// 긴 추적 파라미터가 붙은 주소는 글자만 차지하고 아무것도 알려주지 않는다.
import { useState, useEffect } from 'react'
import { openUrl } from '../../lib/capacitor'
import { hostOf, linkTitle } from '../../lib/linkPreview'

const URL_RE = /((?:https?:\/\/|www\.)[^\s]+)/gi

/** 링크 한 개 — 이름을 찾는 동안에도 호스트는 보인다 (빈칸을 남기지 않는다) */
function LinkChip({ url, color, preview }) {
  const [title, setTitle] = useState(null)

  useEffect(() => {
    if (!preview) return
    let alive = true
    linkTitle(url.startsWith('http') ? url : `https://${url}`)
      .then(t => { if (alive && t) setTitle(t) })
    return () => { alive = false }
  }, [url, preview])

  const label = preview ? (title ?? hostOf(url)) : url

  return (
    <span
      onClick={(e) => { e.stopPropagation(); openUrl(url) }}
      title={url}
      style={{
        color,
        textDecoration: 'underline',
        cursor: 'pointer',
        wordBreak: preview ? 'break-word' : 'break-all',
      }}
    >
      {preview && <span aria-hidden="true" style={{ marginRight: 3 }}>🔗</span>}
      {label}
    </span>
  )
}

export default function TextWithLinks({ text, linkColor = '#D9531B', preview = false }) {
  const str = String(text || '')
  const parts = str.split(URL_RE)
  return (
    <>
      {parts.map((part, i) => {
        if (URL_RE.test(part)) {
          URL_RE.lastIndex = 0
          return <LinkChip key={i} url={part} color={linkColor} preview={preview} />
        }
        URL_RE.lastIndex = 0
        return part
      })}
    </>
  )
}
