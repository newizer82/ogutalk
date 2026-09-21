// SNS 공유 유틸 (v1.6.0)
// - shareApp(): 링크만 공유 → 안드로이드 시트 (인스타·X·Threads·복사 등)
// - sharePromoImage(): 홍보 이미지 첨부 공유 → 인스타 스토리에 이미지 자동 로드
import { IS_NATIVE } from './capacitor'
import { logEvent } from './firebase'
import { INSTALL_LINK, SHARE_TEXT as APP_TEXT, SHARE_TITLE } from './shareCopy'

const PROMO_IMG    = '/promo.png'   // public/promo.png (없으면 icon-512.png 폴백)

// ── 링크 공유 (안드로이드 공유 시트) ────────────────────────────
export async function shareApp() {
  logEvent('share_click', { channel: 'link' })
  try {
    if (IS_NATIVE) {
      const { Share } = await import('@capacitor/share')
      await Share.share({
        title:       SHARE_TITLE,
        text:        APP_TEXT,
        url:         INSTALL_LINK,
        dialogTitle: '앱 공유',
      })
    } else if (navigator.share) {
      await navigator.share({ title: SHARE_TITLE, text: APP_TEXT, url: INSTALL_LINK })
    } else {
      // 웹 fallback — 링크 복사
      await navigator.clipboard.writeText(`${APP_TEXT}\n${INSTALL_LINK}`)
      alert('링크가 복사됐어요')
    }
  } catch (e) {
    if (!String(e?.message || e).toLowerCase().includes('canceled')) {
      console.warn('[shareApp] 실패:', e)
    }
  }
}

// ── 홍보 이미지 공유 (인스타 스토리 등) ────────────────────────
// public/promo.png 를 device 임시 파일로 복사 후 Share.files 로 첨부
export async function sharePromoImage() {
  logEvent('share_click', { channel: 'image' })
  try {
    // 이미지 fetch → base64
    const res = await fetch(PROMO_IMG).catch(() => fetch('/icon-512.png'))   // 폴백
    if (!res.ok) throw new Error('이미지 로드 실패')
    const blob = await res.blob()
    const base64 = await blobToBase64(blob)

    if (IS_NATIVE) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      const { Share } = await import('@capacitor/share')

      const file = await Filesystem.writeFile({
        path: 'promo-share.png',
        data: base64,
        directory: Directory.Cache,
      })

      await Share.share({
        title:       SHARE_TITLE,
        text:        APP_TEXT,
        url:         INSTALL_LINK,
        files:       [file.uri],
        dialogTitle: '이미지 공유 (인스타 스토리)',
      })
    } else if (navigator.share && navigator.canShare) {
      const file = new File([blob], 'ogutalk-promo.png', { type: 'image/png' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ title: SHARE_TITLE, text: APP_TEXT, files: [file] })
      } else {
        downloadBlob(blob, 'ogutalk-promo.png')
      }
    } else {
      downloadBlob(blob, 'ogutalk-promo.png')
    }
  } catch (e) {
    if (!String(e?.message || e).toLowerCase().includes('canceled')) {
      console.warn('[sharePromoImage] 실패:', e)
    }
  }
}

// ── helpers ────────────────────────────────────────────────────
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onloadend = () => resolve(String(r.result).split(',')[1])
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
