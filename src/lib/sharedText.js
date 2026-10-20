// ── 돌아올 다리로 들어온 글 다루기 (순수 로직) ─────────────────
// aiApps.js 에 두지 않는 이유: 거기는 네이티브를 import 하므로 node 로 못 돌린다.
// 이 프로젝트에서 순수 로직을 따로 떼는 이유와 같다 (monthGrid·promptPick·timeBanner).

/**
 * 공유로 받은 글의 첫 줄 — 할일 제목으로 쓴다.
 * AI 답은 여러 줄이다. 통째로 제목에 넣으면 할일 목록이 망가진다.
 * 자를 때는 말줄임표를 남긴다 — 자른 티를 안 내면 잘린 걸 모른다.
 */
export function firstLine(text = '', max = 60) {
  const line = String(text).split('\n').map(s => s.trim()).find(Boolean) ?? ''
  return line.length > max ? `${line.slice(0, max - 1)}…` : line
}
