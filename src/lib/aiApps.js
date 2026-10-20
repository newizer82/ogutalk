// ── AI 앱 브릿지 (오구 브리지) ──────────────────────────────────
// calendar.js · usageStats.js 와 같은 규칙:
// registerPlugin() 의 Proxy 를 async 함수 밖으로 내보내지 않는다.
// (내보내면 Promise 이행 절차가 Proxy.then 을 건드려 네이티브 호출이 항상 실패한다)
import { IS_NATIVE, openUrl } from './capacitor'
import { loadSettings, saveSettings } from './settings'

let _plugin = null
async function ensurePlugin() {
  if (!IS_NATIVE) return false
  if (!_plugin) {
    const { registerPlugin } = await import('@capacitor/core')
    _plugin = registerPlugin('OguAiApps')
  }
  return true
}

/**
 * 웹 대체 경로 — PC 브라우저에서도 다리가 끊기지 않게.
 * q 가 있는 곳은 프롬프트가 주소에 실려 바로 입력되고, 없는 곳은 앱만 열린다.
 */
export const WEB_TARGETS = {
  'com.openai.chatgpt':        { label: 'ChatGPT',    url: t => `https://chatgpt.com/?q=${encodeURIComponent(t)}` },
  'ai.perplexity.app.android': { label: 'Perplexity', url: t => `https://www.perplexity.ai/search?q=${encodeURIComponent(t)}` },
  'com.anthropic.claude':      { label: 'Claude',     url: () => 'https://claude.ai/new' },
  'com.google.android.apps.bard': { label: 'Gemini',  url: () => 'https://gemini.google.com/app' },
}

const WEB_DEFAULT = 'com.openai.chatgpt'

/**
 * 설치된 AI 앱 목록. 네이티브가 아니면 웹에서 열 수 있는 것들을 돌려준다.
 * @returns [{ pkg, label, canSend }]
 */
export async function detectAiApps() {
  try {
    if (!(await ensurePlugin())) {
      return Object.entries(WEB_TARGETS).map(([pkg, v]) => ({ pkg, label: v.label, canSend: true }))
    }
    const { apps } = await _plugin.detect()
    return Array.isArray(apps) ? apps : []
  } catch (e) {
    console.warn('[AI 앱] 감지 실패:', e)
    return []
  }
}

/**
 * 지금 쓸 AI 앱 하나.
 * 사용자가 설정에서 고른 것이 1순위, 없으면 감지 순서의 첫 번째(= Gemini 쪽).
 * 고른 앱이 지워졌으면 조용히 자동 선택으로 돌아간다.
 */
export async function activeAiApp() {
  const apps = await detectAiApps()
  if (!apps.length) return null
  const picked = loadSettings().aiApp
  return apps.find(a => a.pkg === picked) ?? apps[0]
}

export function setAiApp(pkg) {
  saveSettings({ ...loadSettings(), aiApp: pkg || null })   // null = 자동
}

/**
 * 프롬프트를 들고 AI 앱으로 건넌다.
 *
 * 네이티브는 언제나 클립보드에 먼저 넣는다 — 프리필이 실패해도 붙여넣기는 된다.
 * 빈손으로 보내지 않는 것이 이 함수의 유일한 약속이다.
 *
 * @returns { ok, mode, label }  mode = 'send' | 'launch' | 'web' | 'copy'
 */
export async function sendToAi(text, app = null) {
  const target = app ?? (await activeAiApp())

  if (!(await ensurePlugin())) {
    const pkg = target?.pkg && WEB_TARGETS[target.pkg] ? target.pkg : WEB_DEFAULT
    const web = WEB_TARGETS[pkg]
    try { await navigator.clipboard?.writeText(text) } catch {}
    await openUrl(web.url(text))
    return { ok: true, mode: 'web', label: web.label }
  }

  if (!target) return copyOnly(text)

  try {
    const { mode } = await _plugin.send({ pkg: target.pkg, text })
    return { ok: true, mode: mode || 'launch', label: target.label }
  } catch (e) {
    console.warn('[AI 앱] 열기 실패:', e)
    return copyOnly(text)
  }
}

/** AI 앱이 하나도 없을 때 — 적어도 복사는 된다 */
async function copyOnly(text) {
  try {
    if (await ensurePlugin()) await _plugin.copy({ text })
    else await navigator.clipboard?.writeText(text)
    return { ok: true, mode: 'copy', label: null }
  } catch (e) {
    console.warn('[AI 앱] 복사 실패:', e)
    return { ok: false, mode: 'copy', label: null }
  }
}

/**
 * 돌아올 다리 — 공유 시트로 들어온 텍스트를 가져온다 (가져가면 비워진다).
 * 건너가기만 되고 돌아올 길이 없으면, AI 가 준 답이 매시간 증발한다.
 * @returns string  없으면 ''
 */
export async function takeSharedText() {
  try {
    if (!(await ensurePlugin())) return ''
    const { text } = await _plugin.takeShared()
    return typeof text === 'string' ? text.trim() : ''
  } catch (e) {
    console.warn('[공유 수신] 실패:', e)
    return ''
  }
}

/** 건넨 뒤 보여줄 한 줄 */
export function resultMessage({ ok, mode, label }) {
  if (!ok) return '복사하지 못했어요'
  if (mode === 'send' || mode === 'web') return `${label} 로 보냈어요`
  if (mode === 'launch') return `${label} 를 열었어요 · 길게 눌러 붙여넣기`
  return '프롬프트를 복사했어요 · AI 앱에 붙여넣으세요'
}
