import { useState, useEffect } from 'react'
import { IS_NATIVE } from '../../lib/capacitor'
import { INSTALL_LINK } from '../../lib/shareCopy'
import { logEvent } from '../../lib/firebase'

// 웹에서만 뜬다. 역할이 다르기 때문에 안내도 다르다:
//   PC   → PWA 설치. 창으로 띄워두면 알람이 울리고, 리포트·달력을 넓게 본다
//   폰 웹 → Play 앱. 사용시간은 안드로이드 앱만 잴 수 있다 (웹은 못 잰다)
// beforeinstallprompt 가 안 오는 브라우저(사파리 등)에서는 아무것도 띄우지 않는다 —
// 설치 방법을 글로 설명하는 카드는 대개 안 읽히고 자리만 먹는다.
const HIDDEN_KEY = 'ogu_install_hidden'

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true

const isDesktop = () =>
  window.matchMedia?.('(pointer: fine)')?.matches && window.innerWidth >= 900

export default function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null)
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(HIDDEN_KEY) === '1' } catch { return false }
  })

  useEffect(() => {
    if (IS_NATIVE) return
    const onPrompt = (e) => { e.preventDefault(); setPromptEvent(e) }
    const onInstalled = () => { setPromptEvent(null); setHidden(true) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (IS_NATIVE || hidden || isStandalone()) return null

  const desktop = isDesktop()
  // PC 는 설치 이벤트가 와야 띄운다. 폰 웹은 Play 링크라 이벤트가 필요 없다.
  if (desktop && !promptEvent) return null

  const close = () => {
    try { localStorage.setItem(HIDDEN_KEY, '1') } catch {}
    setHidden(true)
  }

  const install = async () => {
    if (!promptEvent) return
    promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    logEvent('pwa_install_prompt', { outcome })
    setPromptEvent(null)
    if (outcome === 'accepted') setHidden(true)
  }

  const copy = desktop
    ? {
        emoji: '💻',
        title: 'PC에 앱으로 설치',
        desc: '창을 열어두면 PC에서도 59분 알람이 울려요.',
        cta: '설치하기',
        onClick: install,
      }
    : {
        emoji: '📱',
        title: '폰에서는 앱으로',
        desc: '내 시간을 자동으로 재려면 앱이 필요해요. 웹은 기록을 보는 용도예요.',
        cta: '앱 받기',
        onClick: () => { logEvent('play_install_click'); window.open(INSTALL_LINK, '_blank', 'noopener') },
      }

  return (
    <section style={{
      marginBottom: 12, padding: '14px 16px', borderRadius: 20,
      background: '#FFF4EC', border: '1px solid #FFE1CE',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{copy.emoji}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: '#111111' }}>
            {copy.title}
          </span>
          <span style={{ display: 'block', fontSize: 12, color: '#8E8E93', marginTop: 2, lineHeight: 1.45 }}>
            {copy.desc}
          </span>
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={copy.onClick} style={{
          flex: 1, border: 'none', borderRadius: 12, padding: '10px', cursor: 'pointer',
          background: '#FF6B2C', color: '#FFFFFF', fontSize: 13, fontWeight: 800,
        }}>
          {copy.cta}
        </button>
        <button onClick={close} style={{
          border: '1px solid #ECECEF', borderRadius: 12, padding: '10px 14px', cursor: 'pointer',
          background: '#FFFFFF', color: '#9A9AA0', fontSize: 12.5, fontWeight: 700,
        }}>
          안 할래요
        </button>
      </div>
    </section>
  )
}
