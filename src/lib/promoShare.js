// SNS 공유 유틸 (v1.6.0)
// - shareApp(): 링크만 공유 → 안드로이드 시트 (인스타·X·Threads·복사 등)
// - sharePromoImage({ score, grade }): 홍보 이미지 첨부 공유 → 인스타 스토리에 이미지 자동 로드
//   점수를 주면 "오늘 내 점수" 가 그려진다. 자랑할 것이 있어야 누르지,
//   남의 광고를 대신 올려주는 버튼은 아무도 안 누른다.
import { IS_NATIVE } from './capacitor'
import { logEvent } from './firebase'
import { INSTALL_LINK, SHARE_TEXT as APP_TEXT, SHARE_TITLE } from './shareCopy'

const PROMO_SIZE = { w: 1080, h: 1920 }   // 인스타 스토리 비율

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
export async function sharePromoImage(opts = {}) {
  logEvent('share_click', { channel: 'image', with_score: typeof opts.score === 'number' })
  try {
    const blob = await makePromoBlob(opts)
    const base64 = await blobToBase64(blob)

    if (IS_NATIVE) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      const { Share } = await import('@capacitor/share')

      const file = await Filesystem.writeFile({
        path: 'promo-share.jpg',
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
      const file = new File([blob], 'ogutalk-promo.jpg', { type: 'image/jpeg' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ title: SHARE_TITLE, text: APP_TEXT, files: [file] })
      } else {
        downloadBlob(blob, 'ogutalk-promo.jpg')
      }
    } else {
      downloadBlob(blob, 'ogutalk-promo.jpg')
    }
  } catch (e) {
    if (!String(e?.message || e).toLowerCase().includes('canceled')) {
      console.warn('[sharePromoImage] 실패:', e)
    }
  }
}

// ── 홍보 이미지 그리기 ─────────────────────────────────────────
// 그림(promo-bg.png)은 고정, 글자는 캔버스로 올린다.
// 문구가 바뀔 때마다 이미지를 다시 그리지 않아도 되고, 오타가 박히지도 않는다.
export async function makePromoBlob({ score = null, grade = '', color = '#FF6B2C' } = {}) {
  const { w, h } = PROMO_SIZE
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')

  // 배경 그림 — 없으면 흰 바탕 + 아래쪽 주황 번짐으로 대체한다
  const bg = await loadImage('/promo-bg.png').catch(() => null)
  if (bg) {
    ctx.drawImage(bg, 0, 0, w, h)
  } else {
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, w, h)
    const glow = ctx.createLinearGradient(0, h * 0.55, 0, h)
    glow.addColorStop(0, 'rgba(255,107,44,0)')
    glow.addColorStop(1, 'rgba(255,107,44,0.35)')
    ctx.fillStyle = glow
    ctx.fillRect(0, h * 0.55, w, h * 0.45)
  }

  const textW = t => ctx.measureText(t).width
  ctx.textAlign = 'center'

  // 뱃지: 매시 59분 (그림 위 여백에 올린다)
  ctx.font = '700 40px sans-serif'
  const badge = '매시 59분, 오구!'
  const bw = textW(badge) + 72
  ctx.fillStyle = '#FF6B2C'
  roundRect(ctx, (w - bw) / 2, 230, bw, 86, 43)
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(badge, w / 2, 287)

  // 본문 — 점수가 있으면 내 숫자를, 없으면 앱 소개를
  if (typeof score === 'number') {
    ctx.fillStyle = '#8A6A55'
    ctx.font = '600 44px sans-serif'
    ctx.fillText('오늘의 오구 지수', w / 2, 440)

    ctx.fillStyle = color
    ctx.font = '900 260px sans-serif'
    ctx.fillText(String(score), w / 2, 690)

    ctx.fillStyle = '#1A1208'
    ctx.font = '800 62px sans-serif'
    ctx.fillText(grade || '오늘도 기록했어요', w / 2, 800)
  } else {
    ctx.fillStyle = '#1A1208'
    ctx.font = '800 86px sans-serif'
    ;['내 하루의', '성장과 힐링을', '재주는 앱'].forEach((line, i) => {
      ctx.fillText(line, w / 2, 450 + i * 118)
    })

    ctx.fillStyle = '#8A6A55'
    ctx.font = '500 42px sans-serif'
    ctx.fillText('오늘 내 시간은 어디에 있었을까?', w / 2, 830)
  }

  // 하단: 앱 이름 + 설치 안내 (주황 바탕 위 → 흰 글씨 + 옅은 그림자로 대비 확보)
  ctx.shadowColor = 'rgba(150,60,10,0.35)'
  ctx.shadowBlur = 20
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '800 100px sans-serif'
  ctx.fillText('오구톡', w / 2, 1690)
  ctx.font = '600 38px sans-serif'
  ctx.fillText('Play 스토어에서 "오구톡" 검색', w / 2, 1765)
  ctx.shadowBlur = 0

  return new Promise((resolve, reject) => {
    c.toBlob(b => (b ? resolve(b) : reject(new Error('이미지 생성 실패'))), 'image/jpeg', 0.92)
  })
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r)
  else ctx.rect(x, y, w, h)   // 구형 WebView — 모서리만 각지게 나온다
  return ctx
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
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
