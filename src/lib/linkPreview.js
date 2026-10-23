// ── 링크 미리보기 ───────────────────────────────────────────────
// 메모에 링크를 붙여넣으면 주소가 아니라 그 글의 제목이 보이게 한다.
// "https://smartstore.naver.com/wincleany?NaPm=ct%3D..." 는 아무것도 알려주지 않는다.
//
// 두 단으로 내려간다. 윗단이 실패해도 아랫단은 항상 동작한다.
//   1차 (항상)      주소를 호스트로 줄여 보여준다 — 네트워크도 권한도 필요 없다
//   2차 (네이티브)  실제 페이지 제목으로 교체한다
//
// 웹에서는 2차가 안 된다. 브라우저 CORS 가 남의 페이지를 읽지 못하게 막기 때문이고,
// 이건 우회할 수 없다(우회하려면 서버를 하나 세워야 한다). 그래서 웹은 1차로 산다.
//
// 가져온 제목은 남의 페이지에서 온 글자다 — 텍스트로만 쓴다.
// (React 가 기본으로 이스케이프하지만, 길이·제어문자는 여기서 직접 자른다)
//
// capacitor 를 위에서 import 하지 않는다 — 그러면 node 검증 스크립트가 이 파일을 못 읽는다.
// 순수 함수(parseTitle·hostOf·isFresh)만 검증 대상이고, 네이티브는 부를 때 끌어온다.

const CACHE_KEY = 'ogu_link_title'
const MAX_CACHE = 60
const OK_TTL    = 30 * 24 * 3600 * 1000   // 제목은 잘 안 바뀐다
const FAIL_TTL  = 6 * 3600 * 1000         // 실패는 짧게 — 잠깐 죽은 사이트일 수 있다
const MAX_TITLE = 60
const MAX_HTML  = 200_000                 // <head> 만 필요하다. 통째로 들고 있을 이유가 없다

/** 주소에서 보여줄 이름 — 2차가 실패해도 이게 남는다 */
export function hostOf(url = '') {
  const m = String(url).match(/^(?:https?:\/\/)?(?:www\.)?([^/?#\s]+)/i)
  return m ? m[1] : ''
}

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#x27': "'",
}

export function decodeEntities(s = '') {
  return String(s).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    const k = e.toLowerCase()
    if (ENTITIES[k]) return ENTITIES[k]
    if (k[0] === '#') {
      const n = k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10)
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m
    }
    return m
  })
}

/**
 * HTML 에서 제목 하나 (순수).
 * og:title 을 먼저 본다 — <title> 은 "글 제목 - 사이트명 - 카테고리" 처럼 꼬리가 붙는 일이 많다.
 * @returns 제목 | null
 */
export function parseTitle(html = '') {
  const head = String(html).slice(0, MAX_HTML)
  const meta = (prop) => {
    // content 가 property 앞에 오는 경우도 있어 양쪽을 다 본다
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']` +
      `|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, 'i')
    const m = head.match(re)
    return m ? (m[1] ?? m[2]) : null
  }
  const raw =
    meta('og:title') ??
    meta('twitter:title') ??
    (head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null)

  return raw === null ? null : clean(raw)
}

/** 화면에 올려도 되는 모양으로 — 남의 페이지에서 온 글자다 */
function clean(s) {
  const t = decodeEntities(String(s))
    .replace(/[\u0000-\u001f\u007f]/g, ' ')   // 제어문자 (줄바꿈 포함)
    .replace(/\s+/g, ' ')
    .trim()
  if (!t) return null
  return t.length > MAX_TITLE ? `${t.slice(0, MAX_TITLE - 1)}…` : t
}

// ── 캐시 ────────────────────────────────────────────────────────
function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') } catch { return {} }
}

function writeCache(map) {
  try {
    // 오래된 것부터 버린다
    const entries = Object.entries(map).sort((a, b) => (b[1].at ?? 0) - (a[1].at ?? 0))
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries.slice(0, MAX_CACHE))))
  } catch {}
}

/** 캐시가 아직 쓸 만한가 (순수) */
export function isFresh(entry, now = Date.now()) {
  if (!entry) return false
  const ttl = entry.title ? OK_TTL : FAIL_TTL
  return now - (entry.at ?? 0) < ttl
}

/**
 * 링크 제목. 못 가져오면 null — 그러면 화면은 hostOf() 로 산다.
 * 같은 주소를 두 번 조회하지 않는다 (실패도 기억한다).
 */
export async function linkTitle(url) {
  if (!url) return null
  const cache = readCache()
  const hit = cache[url]
  if (isFresh(hit)) return hit.title ?? null

  let title = null
  const { IS_NATIVE } = await import('./capacitor')
  if (IS_NATIVE) {
    try {
      const { CapacitorHttp } = await import('@capacitor/core')
      const res = await CapacitorHttp.get({
        url,
        responseType: 'text',
        connectTimeout: 6000,
        readTimeout: 6000,
      })
      if (typeof res?.data === 'string') title = parseTitle(res.data)
    } catch {
      // 네트워크·차단·로그인 벽 — 조용히 1차로 내려간다
    }
  }

  cache[url] = { title, at: Date.now() }
  writeCache(cache)
  return title
}
