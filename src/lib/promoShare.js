// SNS 공유 유틸 (v1.6.0)
// - shareApp(): 링크만 공유 → 안드로이드 시트 (인스타·X·Threads·복사 등)
// - sharePromoImage(): 홍보 이미지 첨부 공유 → 인스타 스토리에 이미지 자동 로드
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
export async function sharePromoImage() {
  logEvent('share_click', { channel: 'image' })
  try {
    const blob = await makePromoBlob()
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

// ── 홍보 이미지 그리기 ─────────────────────────────────────────
// 정적 promo.png 를 들고 다니지 않는다 — 문구가 바뀌면 이미지도 같이 바뀌어야 하고,
// 1080×1920 PNG 를 번들에 넣으면 앱 용량만 커진다.
export async function makePromoBlob() {
  const { w, h } = PROMO_SIZE
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')

  // 바탕: 흰색 + 아래쪽 주황 번짐 (앱과 같은 화이트 테마)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, w, h)
  const glow = ctx.createLinearGradient(0, h * 0.55, 0, h)
  glow.addColorStop(0, 'rgba(255,107,44,0)')
  glow.addColorStop(1, 'rgba(255,107,44,0.16)')
  ctx.fillStyle = glow
  ctx.fillRect(0, h * 0.55, w, h * 0.45)

  const textW = t => ctx.measureText(t).width

  // 아이콘 (번들된 것 사용, 실패하면 그냥 건너뛴다)
  const icon = await loadImage('/icon-512.png').catch(() => null)
  if (icon) {
    const s = 190
    ctx.save()
    roundRect(ctx, (w - s) / 2, 250, s, s, 48)
    ctx.clip()
    ctx.drawImage(icon, (w - s) / 2, 250, s, s)
    ctx.restore()
  }

  ctx.textAlign = 'center'

  // 뱃지: 매시 59분
  ctx.font = '700 40px sans-serif'
  const badge = '매시 59분, 오구!'
  const bw = textW(badge) + 72
  ctx.fillStyle = '#FF6B2C'
  roundRect(ctx, (w - bw) / 2, 500, bw, 86, 43)
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(badge, w / 2, 557)

  // 본문
  ctx.fillStyle = '#111111'
  ctx.font = '800 86px sans-serif'
  ;['내 하루의', '성장과 힐링을', '재주는 앱'].forEach((line, i) => {
    ctx.fillText(line, w / 2, 760 + i * 118)
  })

  ctx.fillStyle = '#8E8E93'
  ctx.font = '500 42px sans-serif'
  ctx.fillText('오늘 내 시간은 어디에 있었을까?', w / 2, 1180)

  // 성장 / 힐링 칩
  const chips = [['🌱 성장', '#D9531B', '#FFF0E6'], ['🌿 힐링', '#1E7A58', '#E8F6F0']]
  ctx.font = '700 46px sans-serif'
  const cw = 330, gap = 36
  chips.forEach(([label, fg, bg], i) => {
    const x = (w - (cw * 2 + gap)) / 2 + i * (cw + gap)
    ctx.fillStyle = bg
    roundRect(ctx, x, 1290, cw, 120, 32)
    ctx.fill()
    ctx.fillStyle = fg
    ctx.fillText(label, x + cw / 2, 1365)
  })

  // 하단: 앱 이름 + 설치 안내
  ctx.fillStyle = '#FF6B2C'
  ctx.font = '800 100px sans-serif'
  ctx.fillText('오구톡', w / 2, 1680)
  ctx.fillStyle = '#9A9AA0'
  ctx.font = '600 38px sans-serif'
  ctx.fillText('Play 스토어에서 "오구톡" 검색', w / 2, 1755)

  return new Promise((resolve, reject) => {
    c.toBlob(b => (b ? resolve(b) : reject(new Error('이미지 생성 실패'))), 'image/png')
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
