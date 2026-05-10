// ── 오구 사운드 톤 설정
export const OGU_TONES = {
  오구: { label: '오구',  emoji: '⏱️', desc: '벌써 이 시간이!',  color: '#c084fc' },
  여유: { label: '여유',  emoji: '😌', desc: '느리고 부드럽게',  color: '#34d399' },
  바쁨: { label: '바쁨',  emoji: '⚡', desc: '빠르고 긴박하게',  color: '#f59e0b' },
  유쾌: { label: '유쾌',  emoji: '😄', desc: '밝고 경쾌하게',    color: '#818cf8' },
}

// ── 톤별 재생 길이 (반복 간격용)
export const TONE_DURATION = { 오구: 0.72, 여유: 1.5, 바쁨: 0.55, 유쾌: 1.05 }

// ── 톤별 사운드 파라미터 (모던 리디자인 v2)
// 실제 음계 사용: C5=523, D5=587, E5=659, F5=698, G5=784, A5=880, C6=1047
export const TONE_CONFIGS = {

  // 오구: A5→E5 "오-구" — 귀엽고 따뜻한 시간 알림 (repeat으로 "오구 오구" 구현)
  // A5(880)→E5(659) 완전4도 하강: 친근하고 귀여운 두 음절 느낌
  오구: [
    { freq: 880.00, start: 0.00, dur: 0.13, type: 'sine',     gain: 0.27 }, // 오 (A5)
    { freq: 880.00, start: 0.00, dur: 0.13, type: 'triangle', gain: 0.09 }, // A5 layer (따뜻함)
    { freq: 1174.7, start: 0.00, dur: 0.06, type: 'sine',     gain: 0.07 }, // D6 sparkle (귀여움)
    { freq: 659.25, start: 0.18, dur: 0.46, type: 'sine',     gain: 0.24 }, // 구 (E5)
    { freq: 659.25, start: 0.18, dur: 0.46, type: 'triangle', gain: 0.08 }, // E5 layer (풍성함)
    { freq: 987.77, start: 0.18, dur: 0.22, type: 'sine',     gain: 0.05 }, // B5 배음 (자연스러움)
  ],

  // 여유: C장조 부드러운 종소리 (C5→G5→E5) — 명상·마음챙김 스타일
  여유: [
    { freq: 523.25, start: 0,    dur: 0.70, type: 'sine', gain: 0.20 }, // C5 메인
    { freq: 524.80, start: 0,    dur: 0.70, type: 'sine', gain: 0.07 }, // C5 미세 디튠 (풍성함)
    { freq: 783.99, start: 0.40, dur: 0.75, type: 'sine', gain: 0.15 }, // G5
    { freq: 659.25, start: 0.85, dur: 0.90, type: 'sine', gain: 0.12 }, // E5 여운
  ],

  // 바쁨: 두 번 핑 (E5→A5) — 현대적 슬랙·앱 알림 스타일
  바쁨: [
    { freq: 659.25, start: 0,    dur: 0.14, type: 'triangle', gain: 0.28 }, // E5
    { freq: 660.50, start: 0,    dur: 0.14, type: 'sine',     gain: 0.10 }, // E5 레이어
    { freq: 880.00, start: 0.20, dur: 0.18, type: 'triangle', gain: 0.25 }, // A5
    { freq: 881.50, start: 0.20, dur: 0.18, type: 'sine',     gain: 0.09 }, // A5 레이어
  ],

  // 유쾌: C장조 상승 아르페지오 (C5→E5→G5→C6) — 밝고 긍정적
  유쾌: [
    { freq: 523.25, start: 0,    dur: 0.16, type: 'triangle', gain: 0.24 }, // C5
    { freq: 659.25, start: 0.16, dur: 0.16, type: 'triangle', gain: 0.24 }, // E5
    { freq: 783.99, start: 0.32, dur: 0.18, type: 'triangle', gain: 0.22 }, // G5
    { freq: 1046.5, start: 0.50, dur: 0.38, type: 'sine',     gain: 0.18 }, // C6 클리어
    { freq: 1048.0, start: 0.50, dur: 0.38, type: 'triangle', gain: 0.08 }, // C6 레이어
  ],
}

// ── 경제 상식
export const ECONOMIC_TIPS = [
  { title: '복리의 마법',    content: '매년 7% 수익이면 약 10년 후 원금이 2배. 워런 버핏은 "복리는 세계 8번째 불가사의"라고 했습니다.', category: '투자기초' },
  { title: '72의 법칙',     content: '투자 원금이 2배 되는 기간: 72 ÷ 수익률(%). 연 8%면 9년만에 2배!',                          category: '투자기초' },
  { title: 'ETF란?',        content: '주식처럼 거래되는 펀드. 개별 주식보다 위험 분산, 펀드보다 수수료 저렴.',                     category: '투자기초' },
  { title: 'PER 이해하기',  content: 'PER = 주가 ÷ 주당순이익. 동일 업종 내 PER 낮으면 저평가 가능성.',                           category: '주식용어' },
  { title: '분산투자 원칙',  content: '달걀을 한 바구니에 담지 마라. 주식·채권·부동산 나눠 투자하면 전체 손실 줄어듭니다.',         category: '투자기초' },
]

// ── 커스텀 알람용 짧은 사운드 (5초 이내)
export const ALARM_TONES = {
  딩동: { label: '딩동', emoji: '🔔', desc: '부드러운 문 종소리 (0.8초)', color: '#34d399' },
  핑:   { label: '핑',   emoji: '✨', desc: '짧고 경쾌한 단음 (0.4초)',   color: '#818cf8' },
  버블: { label: '버블', emoji: '💧', desc: '물방울 통통 소리 (1.0초)',   color: '#38bdf8' },
  알림: { label: '알림', emoji: '📳', desc: '스마트폰 알림음 (0.6초)',    color: '#f59e0b' },
}

// 각 톤의 총 길이(반복 간격용)
export const ALARM_TONE_DURATION = { 딩동: 0.80, 핑: 0.40, 버블: 1.00, 알림: 0.60 }

export const ALARM_TONE_CONFIGS = {
  // 딩동: D5→A4 두 음 내림 (문 종소리)
  딩동: [
    { freq: 587.33, start: 0.00, dur: 0.18, type: 'sine',     gain: 0.30 }, // D5
    { freq: 523.25, start: 0.00, dur: 0.18, type: 'triangle', gain: 0.08 }, // C5 레이어
    { freq: 440.00, start: 0.24, dur: 0.55, type: 'sine',     gain: 0.24 }, // A4 여운
    { freq: 441.50, start: 0.24, dur: 0.55, type: 'triangle', gain: 0.06 }, // A4 detune
  ],
  // 핑: C6 단음 (짧고 날카롭게)
  핑: [
    { freq: 1046.5, start: 0.00, dur: 0.32, type: 'triangle', gain: 0.30 }, // C6
    { freq: 1048.0, start: 0.00, dur: 0.32, type: 'sine',     gain: 0.12 }, // C6 layer
    { freq: 1318.5, start: 0.04, dur: 0.14, type: 'sine',     gain: 0.08 }, // E6 overtone
  ],
  // 버블: G5→C6→D6 상승 (경쾌한 물방울)
  버블: [
    { freq: 783.99, start: 0.00, dur: 0.10, type: 'sine',     gain: 0.24 }, // G5
    { freq: 1046.5, start: 0.12, dur: 0.16, type: 'sine',     gain: 0.28 }, // C6
    { freq: 1174.7, start: 0.30, dur: 0.20, type: 'sine',     gain: 0.26 }, // D6
    { freq: 1046.5, start: 0.52, dur: 0.46, type: 'sine',     gain: 0.12 }, // C6 tail
  ],
  // 알림: E5→A5→C6 빠른 3음 (스마트폰 알림)
  알림: [
    { freq: 659.25, start: 0.00, dur: 0.11, type: 'triangle', gain: 0.28 }, // E5
    { freq: 880.00, start: 0.14, dur: 0.12, type: 'triangle', gain: 0.28 }, // A5
    { freq: 1046.5, start: 0.29, dur: 0.30, type: 'sine',     gain: 0.26 }, // C6
    { freq: 1048.0, start: 0.29, dur: 0.30, type: 'triangle', gain: 0.08 }, // C6 layer
  ],
}

// ── 명언
export const QUOTES = [
  { text: '시간은 금이다.',             author: '벤자민 프랭클린' },
  { text: '시작이 반이다.',             author: '아리스토텔레스' },
  { text: '천 리 길도 한 걸음부터.',    author: '노자' },
  { text: '오늘 할 일을 내일로 미루지 마라.', author: '벤자민 프랭클린' },
  { text: '실패는 성공의 어머니다.',     author: '토마스 에디슨' },
]

