// ── 시간 안내 음성 ("오구오구, ○시!") ─────────────────────────
// 알람은 X시 59분에 울리고 "다음 정각"을 알린다. 음원은 12시간제 12개.
// 채널 ID 형식은 MainActivity.hourChannelId() 와 반드시 같아야 한다.

/** 0~23시 → 1~12 (0시·12시 → 12) */
export function hour12(hour) {
  const h = ((Math.trunc(Number(hour)) % 24) + 24) % 24
  return (h % 12) || 12
}

const pad2 = n => String(n).padStart(2, '0')

/** 알림 채널 ID — 소리는 채널에 고정이라 시각마다 채널이 따로 있다 */
export const hourChannelId = hour => `ogu-hour-v1-${pad2(hour12(hour))}`

/** 앱이 열려 있을 때 재생할 파일 */
export const hourSoundSrc = hour => `/sounds/hours/ogu_h${pad2(hour12(hour))}.mp3`
