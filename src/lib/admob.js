// ── AdMob 브릿지 (네이티브 전용)
// 웹 빌드에서는 모두 no-op으로 처리됨
import { IS_NATIVE } from './capacitor'

const BANNER_AD_ID = 'ca-app-pub-1719848049915600/1218270984'

// 탭바를 배너 위로 올리는 높이.
// 배너(50dp) + 시스템 내비게이션 바(~48dp) 합산 고려 → 100px 여유 확보.
// (배너가 시스템 바 위에 그려지는 기기에서 60px로는 탭바 침범 발생)
export const BANNER_HEIGHT_PX = 100

// ── 광고 숨김 여부 판단 (단일 지점) ─────────────────────────────
// 로그인 사용자는 광고 제거. 비로그인 사용자만 배너 표시.
// TODO(premium): RevenueCat 연동 후 isPremium 을 실제 유료 구독 상태로 교체
export function isAdFree(isPremium) {
  return !!isPremium   // 현재: 로그인(=isPremium) 시 광고 제거
}

// ── 초기화 (앱 시작 시 1회) ─────────────────────────────────────
export async function initAdMob() {
  if (!IS_NATIVE) return
  try {
    const { AdMob } = await import('@capacitor-community/admob')
    await AdMob.initialize({
      initializeForTesting: false,
    })
    console.log('[AdMob] 초기화 완료')
  } catch (e) {
    console.warn('[AdMob] 초기화 실패:', e)
  }
}

// ── 배너 표시 (onLoaded: 광고 실제 로드 시 호출되는 콜백) ────────
export async function showBanner(onLoaded) {
  if (!IS_NATIVE) return
  try {
    const { AdMob, BannerAdSize, BannerAdPosition, AdMobBannerSize } = await import('@capacitor-community/admob')

    // 배너 실제 로드 완료 이벤트 수신
    await AdMob.addListener('bannerAdLoaded', () => {
      console.log('[AdMob] 배너 로드 완료')
      if (onLoaded) onLoaded()
    })

    await AdMob.showBanner({
      adId:      BANNER_AD_ID,
      adSize:    BannerAdSize.BANNER,       // 고정 320×50
      position:  BannerAdPosition.BOTTOM_CENTER,
      margin:    0,
      isTesting: false,  // 실서비스 광고 (테스트 시 true로 변경)
    })
  } catch (e) {
    console.warn('[AdMob] 배너 표시 실패:', e)
  }
}

// ── 배너 숨김 (팝업/모달이 뜰 때 — 광고가 그 위에 겹치지 않도록) ──
export async function hideBanner() {
  if (!IS_NATIVE) return
  try {
    const { AdMob } = await import('@capacitor-community/admob')
    await AdMob.hideBanner()
  } catch (e) {
    console.warn('[AdMob] 배너 숨김 실패:', e)
  }
}

// ── 배너 다시 표시 (팝업/모달이 닫힌 후 — hideBanner 의 짝) ───────
export async function resumeBanner() {
  if (!IS_NATIVE) return
  try {
    const { AdMob } = await import('@capacitor-community/admob')
    await AdMob.resumeBanner()
  } catch (e) {
    console.warn('[AdMob] 배너 재표시 실패:', e)
  }
}
