// 빠른 추가용 프리셋 데이터 — 카테고리별 그룹
// 항목 추가/수정은 이 파일만 고치면 됩니다.

export const PRESET_CATEGORIES = [
  {
    key:   'health',
    label: '🌿 긴장 완화 & 건강',
    color: '#10b981',
    items: [
      { icon: '💧',  title: '수분 섭취', message: '물 한 잔 마시고 가요',    hour: 10, minute: 30 },
      { icon: '🧘',  title: '스트레칭',  message: '어깨·목 5분 스트레칭',     hour: 14, minute: 30 },
      { icon: '🌬️', title: '심호흡',   message: '깊게 3번 호흡하기',         hour: 16, minute: 0  },
      { icon: '👁️', title: '눈 휴식',   message: '먼 곳 20초 응시',           hour: 11, minute: 30 },
    ],
  },
  {
    key:   'work',
    label: '💼 업무 & 자기계발',
    color: '#6366f1',
    items: [
      { icon: '📰', title: '오늘의 이슈', message: '경제·뉴스 한 번 훑어보기', hour: 7,  minute: 30 },
      { icon: '✅', title: '할일 점검',   message: '오늘 우선순위 확인',        hour: 9,  minute: 0  },
      { icon: '📚', title: '학습 시간',   message: '오늘의 학습 30분',          hour: 21, minute: 0  },
      { icon: '📝', title: '하루 회고',   message: '오늘 잘한 것 3가지',        hour: 22, minute: 30 },
    ],
  },
  {
    key:   'social',
    label: '🎨 취미 & 관계',
    color: '#f59e0b',
    items: [
      { icon: '👨‍👩‍👧', title: '가족 안부', message: '가족에게 한마디 보내기',  hour: 19, minute: 0  },
      { icon: '🎮', title: '취미 시간',   message: '좋아하는 일 잠깐 하기',     hour: 20, minute: 30 },
      { icon: '🍱', title: '점심 시간',   message: '맛있는 점심 드세요',        hour: 12, minute: 0  },
      { icon: '😴', title: '취침 준비',   message: '내일을 위해 일찍 자기',     hour: 23, minute: 0  },
    ],
  },
]
