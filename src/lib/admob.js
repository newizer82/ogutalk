// ── AdMob 브릿지 (네이티브 전용)
// 웹 빌드에서는 모두 no-op으로 처리됨
import { IS_NATIVE } from './capacitor'

const BANNER_AD_ID = 'ca-app-pub-1719848049915600/1218270984'

export const BANNER_HEIGHT_PX = 60  // 탭바 올림 + 콘텐츠 여백용 (dp 오차 감안)

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
      isTesting: true,   // 테스트 광고 (실제 게시 전엔 true 유지)
    })
  } catch (e) {
    console.warn('[AdMob] 배너 표시 실패:', e)
  }
}

// ── 배너 숨김 (필요 시 사용) ─────────────────────────────────────
export async function hideBanner() {
  if (!IS_NATIVE) return
  try {
    const { AdMob } = await import('@capacitor-community/admob')
    await AdMob.hideBanner()
  } catch (e) {
    console.warn('[AdMob] 배너 숨김 실패:', e)
  }
}
