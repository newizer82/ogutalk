// 빠른 추가용 프리셋 데이터 — 4 카테고리 × 22 항목
// 항목 추가/수정은 이 파일만 고치면 됩니다.
//
// freq: '매일' | '평일' | '주말' | '주1회' | '주2회'
//   ⚠️ 표시 전용 라벨입니다. 알람 발동 로직과 무관.
//      진짜 요일별 알람은 향후 B안에서 별도 구현 예정.

export const PRESET_CATEGORIES = [
  {
    key:   'health',
    label: '🌿 건강',
    icon:  '🌿',
    color: '#10b981',
    items: [
      { icon: '💧',  title: '수분 섭취',   message: '물 한 잔 마실 시간이에요',  hour: 11, minute: 30, freq: '매일' },
      { icon: '🧘',  title: '스트레칭',    message: '굳은 몸을 잠깐 풀어줘요',   hour: 14, minute: 30, freq: '매일' },
      { icon: '🌬️', title: '복식호흡',    message: '깊게 숨 한 번 쉬어볼까요',  hour: 16, minute: 30, freq: '매일' },
      { icon: '🚶',  title: '산책',        message: '잠깐 걸으며 머리를 식혀요', hour: 17, minute: 30, freq: '매일' },
      { icon: '🏋️', title: '홈트레이닝',  message: '오늘의 운동, 시작해볼까요', hour: 19, minute: 30, freq: '평일' },
    ],
  },
  {
    key:   'growth',
    label: '🌱 자기계발',
    icon:  '🌱',
    color: '#6366f1',
    items: [
      { icon: '🧘‍♂️', title: '3분 명상',    message: '3분만 마음을 비워봐요',   hour: 7,  minute: 30, freq: '매일' },
      { icon: '☀️',   title: '5분 확언',    message: '오늘의 다짐을 떠올려요',  hour: 8,  minute: 30, freq: '매일' },
      { icon: '💡',   title: '5분 아이디어', message: '떠오른 생각을 메모해요',  hour: 10, minute: 30, freq: '평일' },
      { icon: '💬',   title: '5분 회화',    message: '외국어 한 문장 연습해요', hour: 12, minute: 30, freq: '평일' },
      { icon: '📖',   title: '5분 독서',    message: '책 몇 페이지 읽어봐요',   hour: 21, minute: 30, freq: '매일' },
      { icon: '📝',   title: '하루 회고',   message: '오늘 하루를 돌아봐요',    hour: 22, minute: 30, freq: '매일' },
    ],
  },
  {
    key:   'life',
    label: '🏡 생활',
    icon:  '🏡',
    color: '#f59e0b',
    items: [
      { icon: '💊', title: '약 먹기',      message: '약 챙겨 드실 시간이에요',   hour: 9,  minute: 30, freq: '매일' },
      { icon: '🪴', title: '화분 물주기',  message: '식물에 물을 줄 시간이에요', hour: 8,  minute: 30, freq: '주2회' },
      { icon: '🧺', title: '빨래',         message: '빨래를 돌려볼까요',         hour: 10, minute: 30, freq: '주2회' },
      { icon: '🧹', title: '청소하기',     message: '잠깐 주변을 정리해요',      hour: 10, minute: 30, freq: '주말' },
      { icon: '🛒', title: '장보기',       message: '필요한 걸 챙겨 장 봐요',    hour: 11, minute: 30, freq: '주1회' },
      { icon: '💛', title: '안부 전하기',  message: '소중한 사람에게 연락해요',  hour: 19, minute: 30, freq: '주1회' },
    ],
  },
  {
    key:   'plan',
    label: '💼 계획 & 일',
    icon:  '💼',
    color: '#8b5cf6',
    items: [
      { icon: '📅', title: '오늘 일정 확인', message: '오늘 할 일을 점검해요',     hour: 8,  minute: 30, freq: '매일' },
      { icon: '🎯', title: '프로젝트 점검',  message: '프로젝트 진행 상황을 봐요', hour: 9,  minute: 30, freq: '평일' },
      { icon: '📋', title: '주간 계획',      message: '이번 주 계획을 세워요',     hour: 9,  minute: 30, freq: '주1회' },
      { icon: '🔁', title: '주간 회고',      message: '한 주를 돌아봐요',          hour: 18, minute: 30, freq: '주1회' },
      { icon: '👥', title: '모임 챙기기',    message: '모임 일정을 챙겨요',        hour: 19, minute: 30, freq: '주1회' },
    ],
  },
]

// 카테고리 key 검증용 (마이그레이션, 폼 옵션 등에서 재사용)
export const CATEGORY_KEYS = PRESET_CATEGORIES.map(c => c.key)
export const DEFAULT_CATEGORY = 'life'   // 기존 사용자 프리셋 마이그레이션 시 기본값

// freq 선택지 (UI 드롭다운/칩에서 재사용)
// ⚠️ 현재는 표시 전용 라벨. 실제 요일별 알람 동작은 향후 B안에서 구현 예정.
export const FREQ_OPTIONS = ['매일', '평일', '주말', '주1회', '주2회']
export const DEFAULT_FREQ = '매일'
