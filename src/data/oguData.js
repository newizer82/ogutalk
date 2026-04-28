// ── 오구 사운드 톤 설정
export const OGU_TONES = {
  오구: { label: '오구',  emoji: '⏱️', desc: '벌써 이 시간이!',  color: '#c084fc' },
  여유: { label: '여유',  emoji: '😌', desc: '느리고 부드럽게',  color: '#34d399' },
  바쁨: { label: '바쁨',  emoji: '⚡', desc: '빠르고 긴박하게',  color: '#f59e0b' },
  화남: { label: '화남',  emoji: '😤', desc: '강하고 거칠게',    color: '#ef4444' },
  유쾌: { label: '유쾌',  emoji: '😄', desc: '밝고 경쾌하게',    color: '#818cf8' },
}

// ── 톤별 재생 길이 (반복 간격용)
export const TONE_DURATION = { 오구: 0.80, 여유: 1.5, 바쁨: 0.55, 화남: 0.70, 유쾌: 1.05 }

// ── 톤별 사운드 파라미터 (모던 리디자인 v2)
// 실제 음계 사용: C5=523, D5=587, E5=659, G5=784, A5=880, C6=1047
export const TONE_CONFIGS = {

  // 오구: G5→E5 두 번 반복 "오-구 오-구" — 벌써 이 시간! 앱 시그니처
  오구: [
    { freq: 783.99, start: 0.00, dur: 0.10, type: 'sine',     gain: 0.26 }, // 오 (G5)
    { freq: 659.25, start: 0.12, dur: 0.14, type: 'sine',     gain: 0.22 }, // 구 (E5)
    { freq: 783.99, start: 0.32, dur: 0.10, type: 'sine',     gain: 0.24 }, // 오 (G5)
    { freq: 659.25, start: 0.44, dur: 0.22, type: 'sine',     gain: 0.20 }, // 구 (E5) 여운
    { freq: 660.50, start: 0.44, dur: 0.22, type: 'triangle', gain: 0.07 }, // E5 레이어 (풍성함)
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

  // 화남: 강한 하강 (G5→D5→G4) — 단호하지만 음악적
  화남: [
    { freq: 783.99, start: 0,    dur: 0.16, type: 'square', gain: 0.28 }, // G5
    { freq: 783.99, start: 0,    dur: 0.16, type: 'sine',   gain: 0.12 }, // G5 sine 레이어 (부드럽게)
    { freq: 587.33, start: 0.18, dur: 0.18, type: 'square', gain: 0.24 }, // D5
    { freq: 392.00, start: 0.38, dur: 0.22, type: 'sine',   gain: 0.18 }, // G4 낮은 여운
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

// ── 음성 캐릭터
export const VOICE_CHARACTERS = [
  { id: 'boy',         name: '남자아이', emoji: '👦', rate: 1.3,  pitch: 1.6,  premium: false },
  { id: 'girl',        name: '여자아이', emoji: '👧', rate: 1.2,  pitch: 1.8,  premium: false },
  { id: 'girlfriend',  name: '여친',    emoji: '💕', rate: 1.0,  pitch: 1.4,  premium: true  },
  { id: 'boyfriend',   name: '남친',    emoji: '💙', rate: 0.9,  pitch: 0.8,  premium: true  },
  { id: 'mom',         name: '엄마',    emoji: '👩', rate: 0.85, pitch: 1.1,  premium: true  },
  { id: 'grandma',     name: '할머니',  emoji: '👵', rate: 0.75, pitch: 0.9,  premium: true  },
  { id: 'gyeongsan',   name: '경상도',  emoji: '🗣️', rate: 1.0,  pitch: 1.0,  premium: true  },
  { id: 'jeolla',      name: '전라도',  emoji: '🗣️', rate: 0.9,  pitch: 1.1,  premium: true  },
  { id: 'chungcheong', name: '충청도',  emoji: '🗣️', rate: 0.8,  pitch: 0.95, premium: true  },
]

// ── 캐릭터별 음성 텍스트 (nextHour: 다음 정시, repeat: 오구 반복 횟수)
export const VOICE_TEXTS = {
  boy:         (h, n) => `오구! 벌써 ${h}시 59분이에요. 잠깐 쉬고 가요.`,
  girl:        (h, n) => `오구~ ${h}시 59분! 눈 한번 감고 숨 크게 쉬어요.`,
  girlfriend:  (h, n) => `있잖아, 벌써 ${h}시 59분이야. 잠깐 나 좀 봐줘.`,
  boyfriend:   (h, n) => `야, ${h}시 59분이다. 스트레칭 한 번 하고 가자.`,
  mom:         (h, n) => `${h}시 59분 됐어. 허리 펴고 물 한 잔 마셔.`,
  grandma:     (h, n) => `아이고, 벌써 ${h}시 59분이구먼. 눈 좀 쉬어야지.`,
  gyeongsan:   (h, n) => `${h}시 59분 됐다 아이가! 잠깐 쉬어라 카이.`,
  jeolla:      (h, n) => `아이고메, ${h}시 59분이여! 쉬어부러 얼른.`,
  chungcheong: (h, n) => `${h}시 59분이 됐유. 쉬어야 쓰것어유~`,
}

// ── 경제 상식
export const ECONOMIC_TIPS = [
  { title: '복리의 마법',    content: '매년 7% 수익이면 약 10년 후 원금이 2배. 워런 버핏은 "복리는 세계 8번째 불가사의"라고 했습니다.', category: '투자기초' },
  { title: '72의 법칙',     content: '투자 원금이 2배 되는 기간: 72 ÷ 수익률(%). 연 8%면 9년만에 2배!',                          category: '투자기초' },
  { title: 'ETF란?',        content: '주식처럼 거래되는 펀드. 개별 주식보다 위험 분산, 펀드보다 수수료 저렴.',                     category: '투자기초' },
  { title: 'PER 이해하기',  content: 'PER = 주가 ÷ 주당순이익. 동일 업종 내 PER 낮으면 저평가 가능성.',                           category: '주식용어' },
  { title: '분산투자 원칙',  content: '달걀을 한 바구니에 담지 마라. 주식·채권·부동산 나눠 투자하면 전체 손실 줄어듭니다.',         category: '투자기초' },
]

// ── 명언
export const QUOTES = [
  { text: '시간은 금이다.',             author: '벤자민 프랭클린' },
  { text: '시작이 반이다.',             author: '아리스토텔레스' },
  { text: '천 리 길도 한 걸음부터.',    author: '노자' },
  { text: '오늘 할 일을 내일로 미루지 마라.', author: '벤자민 프랭클린' },
  { text: '실패는 성공의 어머니다.',     author: '토마스 에디슨' },
]

