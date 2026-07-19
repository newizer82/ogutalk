// ── AdMob 브릿지 (네이티브 전용)
// 웹 빌드에서는 모두 no-op으로 처리됨
import { IS_NATIVE } from './capacitor'

const BANNER_AD_ID = 'ca-app-pub-1719848049915600/1218270984'
export const BANNER_HEIGHT_PX = 100

// ── 광고 숨김 여부 판단 (단일 지점) ─────────────────────────────
// TODO(premium): RevenueCat 연동 후 isPremium 을 실제 유료 구독 상태로 교체
export function isAdFree(isPremium) {
  return !!isPremium
}

// ── 초기화 (싱글턴) ─────────────────────────────────────────────
// 여러 useEffect 병렬 호출해도 실제 initialize는 1회만.
// showBanner/hideBanner/resumeBanner 가 항상 이 Promise 를 await → NPE 방지 (v1.3.1 hotfix)
let _initPromise = null
export function initAdMob() {
  if (!IS_NATIVE) return Promise.resolve()
  if (_initPromise) return _initPromise
  _initPromise = (async () => {
    const { AdMob } = await import('@capacitor-community/admob')
    await AdMob.initialize({ initializeForTesting: false })
  })().catch(e => {
    console.warn('[AdMob] 초기화 실패:', e)
    _initPromise = null   // 실패 시 재시도 가능
    throw e
  })
  return _initPromise
}

// ── 리스너 등록 (한 번만) ───────────────────────────────────────
let _listenerAdded = false
async function ensureBannerLoadedListener(onLoaded) {
  if (_listenerAdded || !onLoaded) { _listenerAdded = true; return }
  _listenerAdded = true
  const { AdMob } = await import('@capacitor-community/admob')
  await AdMob.addListener('bannerAdLoaded', () => onLoaded())
}

// ── 배너 표시 ───────────────────────────────────────────────────
export async function showBanner(onLoaded) {
  if (!IS_NATIVE) return
  try {
    await initAdMob()   // 초기화 완료 보장 (NPE fix)
    await ensureBannerLoadedListener(onLoaded)
    const { AdMob, BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob')
    await AdMob.showBanner({
      adId:      BANNER_AD_ID,
      adSize:    BannerAdSize.BANNER,
      position:  BannerAdPosition.BOTTOM_CENTER,
      margin:    0,
      isTesting: false,
    })
  } catch (e) {
    console.warn('[AdMob] 배너 표시 실패:', e)
  }
}

// ── 배너 숨김 ───────────────────────────────────────────────────
export async function hideBanner() {
  if (!IS_NATIVE) return
  try {
    await initAdMob()
    const { AdMob } = await import('@capacitor-community/admob')
    await AdMob.hideBanner()
  } catch (e) {
    console.warn('[AdMob] 배너 숨김 실패:', e)
  }
}

// ── 배너 재표시 ─────────────────────────────────────────────────
export async function resumeBanner() {
  if (!IS_NATIVE) return
  try {
    await initAdMob()
    const { AdMob } = await import('@capacitor-community/admob')
    await AdMob.resumeBanner()
  } catch (e) {
    console.warn('[AdMob] 배너 재표시 실패:', e)
  }
}
