// 텍스트 안의 URL을 자동 감지해 클릭 가능한 링크로 렌더링.
// http(s):// 또는 www. 로 시작하는 토큰을 인식.
// 클릭 시 capacitor.js의 openUrl로 외부 브라우저 열림 (할일 탭과 동일 동작).
import { openUrl } from '../../lib/capacitor'

const URL_RE = /((?:https?:\/\/|www\.)[^\s]+)/gi

export default function TextWithLinks({ text, linkColor = '#818cf8' }) {
  const str = String(text || '')
  const parts = str.split(URL_RE)
  return (
    <>
      {parts.map((part, i) => {
        if (URL_RE.test(part)) {
          URL_RE.lastIndex = 0
          return (
            <span
              key={i}
              onClick={(e) => { e.stopPropagation(); openUrl(part) }}
              style={{
                color: linkColor,
                textDecoration: 'underline',
                cursor: 'pointer',
                wordBreak: 'break-all',
              }}
            >{part}</span>
          )
        }
        URL_RE.lastIndex = 0
        return part
      })}
    </>
  )
}
