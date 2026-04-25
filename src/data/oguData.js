// ── 오구 사운드 톤 설정
export const OGU_TONES = {
  여유: { label: '여유', emoji: '😌', desc: '느리고 부드럽게',  color: '#34d399' },
  바쁨: { label: '바쁨', emoji: '⚡', desc: '빠르고 긴박하게', color: '#f59e0b' },
  화남: { label: '화남', emoji: '😤', desc: '강하고 거칠게',   color: '#ef4444' },
  유쾌: { label: '유쾌', emoji: '😄', desc: '밝고 경쾌하게',   color: '#818cf8' },
}

// ── 톤별 재생 길이 (반복 간격용)
export const TONE_DURATION = { 여유: 1.5, 바쁨: 0.55, 화남: 0.70, 유쾌: 1.05 }

// ── 톤별 사운드 파라미터 (모던 리디자인 v2)
// 실제 음계 사용: C5=523, D5=587, E5=659, G5=784, A5=880, C6=1047
export const TONE_CONFIGS = {

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

// ── 키워드 카테고리 색상
export const CATEGORY_COLOR = {
  주식: '#818cf8', 인물: '#f59e0b', 산업: '#34d399', 기술: '#22d3ee', 자산: '#f87171',
}

// ── 감성 스타일
export const SENTIMENT_STYLE = {
  positive: { bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)',  color: '#34d399', label: '긍정' },
  negative: { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', color: '#f87171', label: '부정' },
  neutral:  { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.2)', color: '#94a3b8', label: '중립' },
}

// ── 키워드 상세 데이터
export const KW_DATA = [
  {
    id: 'samsung', keyword: '삼성전자', ticker: '005930', category: '주식',
    price: '72,400원', chg: '+1.2%', pos: true,
    weekly: { count: 183, trend: +5, importance: 91,
      headlines: [
        { title: '삼성전자, HBM3E 엔비디아 공급 승인 임박',       date: '4/16', sentiment: 'positive', source: '연합뉴스' },
        { title: '갤럭시 AI 기능, 전세계 1억 기기 적용 완료',     date: '4/15', sentiment: 'positive', source: '조선비즈' },
        { title: '1분기 영업이익 6.7조원…전년比 9배 증가',        date: '4/14', sentiment: 'positive', source: '한경' },
        { title: '중국 BOE와의 디스플레이 경쟁 심화 우려',        date: '4/13', sentiment: 'negative', source: '전자신문' },
        { title: '파운드리 2나노 시험생산 성공…TSMC 격차 좁혀',  date: '4/12', sentiment: 'positive', source: '매일경제' },
        { title: '이재용 회장, 미국 AI 파트너십 확대 방문',       date: '4/11', sentiment: 'neutral',  source: '한국경제' },
        { title: '미국 관세 영향…반도체 수출 불확실성 증가',      date: '4/10', sentiment: 'negative', source: '뉴시스' },
      ]},
    monthly: { count: 742, trend: +3, importance: 88,
      headlines: [
        { title: '1분기 실적 어닝서프라이즈…영업이익 6.7조',       date: '4/16', sentiment: 'positive', source: '연합뉴스' },
        { title: 'HBM 공급계약 확대…하반기 수혜 기대',             date: '4/12', sentiment: 'positive', source: '조선비즈' },
        { title: '갤럭시 S25 판매량 전작 대비 15% 증가',           date: '4/8',  sentiment: 'positive', source: '한경' },
        { title: '파운드리 가동률 70%대 회복',                     date: '4/3',  sentiment: 'positive', source: '전자신문' },
        { title: '노조 파업 리스크 재부상',                        date: '3/28', sentiment: 'negative', source: '매일경제' },
        { title: '美 반도체 지원법 수혜 기대감 상승',              date: '3/22', sentiment: 'positive', source: '한국경제' },
        { title: '중국법인 실적 부진 지속',                        date: '3/15', sentiment: 'negative', source: '뉴시스' },
      ]},
  },
  {
    id: 'musk', keyword: '머스크', ticker: 'PERSON', category: '인물',
    price: '—', chg: '—', pos: true,
    weekly: { count: 164, trend: +22, importance: 87,
      headlines: [
        { title: '머스크, xAI 기업가치 500억 달러 돌파 발표',     date: '4/16', sentiment: 'positive', source: '테크크런치' },
        { title: '트럼프 내각에서 머스크 역할 축소 논란',          date: '4/15', sentiment: 'negative', source: '뉴욕타임스' },
        { title: '테슬라 완전자율주행 머스크 직접 데모 시연',      date: '4/14', sentiment: 'positive', source: '연합뉴스' },
        { title: '스페이스X 스타쉽 7번째 시험비행 성공',           date: '4/13', sentiment: 'positive', source: 'CNN' },
        { title: '머스크 \'관세 정책 반대\' 공개 발언 논란',       date: '4/12', sentiment: 'negative', source: '블룸버그' },
        { title: '그록3 AI 모델 출시…ChatGPT에 도전장',           date: '4/11', sentiment: 'positive', source: '와이어드' },
        { title: '트위터(X) 광고 수익 전년比 40% 감소',            date: '4/10', sentiment: 'negative', source: '파이낸셜타임스' },
      ]},
    monthly: { count: 621, trend: +18, importance: 84,
      headlines: [
        { title: '머스크, 4월 순자산 3,000억 달러 재돌파',         date: '4/16', sentiment: 'positive', source: '포브스' },
        { title: 'xAI·테슬라·스페이스X 시너지 전략 공개',          date: '4/10', sentiment: 'positive', source: '테크크런치' },
        { title: '도지코인 재단과 협력 재개 루머',                  date: '4/5',  sentiment: 'neutral',  source: '코인데스크' },
        { title: '테슬라 로보택시 오스틴 6월 출시 확정',            date: '4/1',  sentiment: 'positive', source: 'Reuters' },
        { title: '워싱턴 정치 개입 비판 여론 고조',                 date: '3/25', sentiment: 'negative', source: 'WashPost' },
        { title: '스타링크 가입자 400만 돌파',                      date: '3/20', sentiment: 'positive', source: '연합뉴스' },
        { title: 'X플랫폼 월 이용자 수 감소 추세',                  date: '3/12', sentiment: 'negative', source: '파이낸셜타임스' },
      ]},
  },
  {
    id: 'semiconductor', keyword: '반도체', ticker: 'SECTOR', category: '산업',
    price: '—', chg: '—', pos: true,
    weekly: { count: 156, trend: +14, importance: 85,
      headlines: [
        { title: '글로벌 반도체 매출 2024년 사상 최고…올해도 상승 전망', date: '4/16', sentiment: 'positive', source: 'IDC' },
        { title: '미·중 반도체 전쟁 격화…中 수출 추가 제한 검토',        date: '4/15', sentiment: 'negative', source: '연합뉴스' },
        { title: 'AI 가속기 수요 폭증…HBM 공급 부족 심화',               date: '4/14', sentiment: 'neutral',  source: '한경' },
        { title: 'TSMC 2나노 양산 일정 앞당겨…삼성 긴장',               date: '4/13', sentiment: 'neutral',  source: '매일경제' },
        { title: 'SK하이닉스, HBM3E 공급망 선점으로 실적 개선',          date: '4/12', sentiment: 'positive', source: '조선비즈' },
        { title: '인텔 파운드리 사업 적자 지속…구조조정 가속',           date: '4/11', sentiment: 'negative', source: '뉴시스' },
        { title: '한국 반도체 수출 3개월 연속 증가',                     date: '4/10', sentiment: 'positive', source: '산업부' },
      ]},
    monthly: { count: 589, trend: +11, importance: 82,
      headlines: [
        { title: '2024년 글로벌 반도체 시장 규모 6,000억 달러 돌파', date: '4/16', sentiment: 'positive', source: '가트너' },
        { title: '미국 반도체 지원법 2차 보조금 지급 시작',           date: '4/8',  sentiment: 'positive', source: '연합뉴스' },
        { title: '중국 화웨이 7나노 칩 자체 개발 성공 발표',          date: '4/2',  sentiment: 'negative', source: '블룸버그' },
        { title: 'AI 반도체 시장 2030년 4,000억 달러 전망',           date: '3/28', sentiment: 'positive', source: 'Gartner' },
        { title: '전력 반도체 수요 급증…전기차·데이터센터 견인',      date: '3/20', sentiment: 'positive', source: '전자신문' },
        { title: '반도체 D램 가격 4분기 연속 상승',                   date: '3/15', sentiment: 'positive', source: 'D램익스체인지' },
        { title: '한·미·일 반도체 공급망 협력 강화 MOU',              date: '3/5',  sentiment: 'positive', source: '산업부' },
      ]},
  },
  {
    id: 'tesla', keyword: '테슬라', ticker: 'TSLA', category: '주식',
    price: '$178.23', chg: '+3.45%', pos: true,
    weekly: { count: 147, trend: +12, importance: 83,
      headlines: [
        { title: 'FSD v13 업데이트 출시…사고율 40% 감소 주장', date: '4/16', sentiment: 'positive', source: '일렉트렉' },
        { title: '테슬라, 로보택시 오스틴 상용화 6월 확정',    date: '4/15', sentiment: 'positive', source: 'Reuters' },
        { title: '1분기 인도량 33만대…예상치 소폭 하회',        date: '4/14', sentiment: 'negative', source: '블룸버그' },
        { title: '사이버트럭 누적 판매 10만대 돌파',            date: '4/13', sentiment: 'positive', source: '테슬라라티' },
        { title: '모델2 저가형 출시 2026년으로 연기',           date: '4/12', sentiment: 'negative', source: '로이터' },
        { title: '중국 BYD와 가격전쟁 재점화',                  date: '4/11', sentiment: 'negative', source: '연합뉴스' },
        { title: '에너지 스토리지 사업 분기 최고 실적',          date: '4/10', sentiment: 'positive', source: '테크크런치' },
      ]},
    monthly: { count: 534, trend: +8, importance: 80,
      headlines: [
        { title: '1분기 인도량 33만 6천대 발표',               date: '4/15', sentiment: 'neutral',  source: '테슬라' },
        { title: '완전자율주행 유료 구독자 100만 돌파',          date: '4/8',  sentiment: 'positive', source: '일렉트렉' },
        { title: '4680 배터리 생산량 목표 초과달성',             date: '4/1',  sentiment: 'positive', source: '테슬라라티' },
        { title: '머스크 집중력 분산 우려…주주 서한',            date: '3/25', sentiment: 'negative', source: 'WSJ' },
        { title: '테슬라 인도 진출 공식 확인',                   date: '3/18', sentiment: 'positive', source: 'Reuters' },
        { title: '유럽 EV 시장 점유율 회복세',                   date: '3/10', sentiment: 'positive', source: '연합뉴스' },
        { title: '오토파일럿 사망사고 조사 재개',                date: '3/5',  sentiment: 'negative', source: 'NHTSA' },
      ]},
  },
  {
    id: 'bitcoin', keyword: '비트코인', ticker: 'BTC', category: '자산',
    price: '$67,450', chg: '+2.1%', pos: true,
    weekly: { count: 138, trend: -3, importance: 77,
      headlines: [
        { title: '비트코인 ETF 하루 유입액 5억 달러 돌파',     date: '4/16', sentiment: 'positive', source: '코인데스크' },
        { title: 'SEC, 비트코인 현물 ETF 추가 승인 검토',      date: '4/15', sentiment: 'positive', source: '블룸버그' },
        { title: '채굴 난이도 역대 최고치 경신',               date: '4/14', sentiment: 'neutral',  source: '코인텔레그래프' },
        { title: '미 연준 금리 유지…비트코인 횡보세',          date: '4/13', sentiment: 'neutral',  source: '연합뉴스' },
        { title: '트럼프 \'비트코인 전략 비축 검토\' 발언',    date: '4/12', sentiment: 'positive', source: 'CNBC' },
        { title: '온체인 데이터 \'고래\' 매집 신호 감지',      date: '4/11', sentiment: 'positive', source: '글래스노드' },
        { title: '한국 가상자산 과세 2025년 시행 재확인',      date: '4/10', sentiment: 'negative', source: '뉴시스' },
      ]},
    monthly: { count: 498, trend: +22, importance: 79,
      headlines: [
        { title: '비트코인 반감기 이후 1주일 가격 +8%',        date: '4/16', sentiment: 'positive', source: '코인데스크' },
        { title: '기관 투자자 BTC 보유량 역대 최고',            date: '4/10', sentiment: 'positive', source: '블룸버그' },
        { title: '글로벌 BTC ETF 운용자산 600억 달러 돌파',     date: '4/5',  sentiment: 'positive', source: '코인텔레그래프' },
        { title: '반감기 완료…공급 감소 효과 본격화',           date: '4/1',  sentiment: 'positive', source: '연합뉴스' },
        { title: '러시아 BTC 불법 거래 제재 발표',              date: '3/22', sentiment: 'negative', source: 'Reuters' },
        { title: 'BTC 7만 달러 돌파 후 조정',                  date: '3/15', sentiment: 'neutral',  source: 'CNBC' },
        { title: '마이크로스트래티지 추가 매수 10억 달러',       date: '3/8',  sentiment: 'positive', source: '코인데스크' },
      ]},
  },
  {
    id: 'nvidia', keyword: '엔비디아', ticker: 'NVDA', category: '주식',
    price: '$892.30', chg: '+5.2%', pos: true,
    weekly: { count: 129, trend: +18, importance: 82,
      headlines: [
        { title: '엔비디아 Blackwell GPU 수요 2025년 전량 매진', date: '4/16', sentiment: 'positive', source: '테크크런치' },
        { title: 'CUDA 생태계 AI 개발자 400만 돌파',             date: '4/15', sentiment: 'positive', source: '엔비디아IR' },
        { title: '데이터센터 매출 분기 240억 달러 예상',          date: '4/14', sentiment: 'positive', source: '블룸버그' },
        { title: '중국 수출 제한으로 H20 칩 매출 타격',           date: '4/13', sentiment: 'negative', source: '연합뉴스' },
        { title: 'GB200 NVL72 서버 랙 공급 시작',                date: '4/12', sentiment: 'positive', source: '와이어드' },
        { title: 'AMD·인텔과의 AI 칩 경쟁 심화',                date: '4/11', sentiment: 'neutral',  source: '매일경제' },
        { title: '소프트뱅크와 AI 인프라 100억 달러 투자 협약',  date: '4/10', sentiment: 'positive', source: '로이터' },
      ]},
    monthly: { count: 487, trend: +31, importance: 86,
      headlines: [
        { title: '2025 GTC 기조연설…차세대 Rubin 칩 공개',      date: '4/14', sentiment: 'positive', source: '테크크런치' },
        { title: '1분기 매출 전망 260억 달러…컨센서스 상회',     date: '4/8',  sentiment: 'positive', source: '블룸버그' },
        { title: '엔비디아, 시가총액 2위 탈환',                  date: '4/2',  sentiment: 'positive', source: 'CNBC' },
        { title: 'AI 인프라 투자 사이클 가속화 수혜',             date: '3/28', sentiment: 'positive', source: 'WSJ' },
        { title: '중국 규제로 연 수익 약 80억 달러 손실 추정',   date: '3/20', sentiment: 'negative', source: '파이낸셜타임스' },
        { title: '젠슨 황 CEO, 로봇공학 사업 확대 발표',          date: '3/14', sentiment: 'positive', source: '로이터' },
        { title: 'ARM과의 협력 강화…저전력 AI 칩 공동 개발',    date: '3/7',  sentiment: 'positive', source: '테크크런치' },
      ]},
  },
]

// ── AI 뉴스 요약 (일부)
export const KW_SUMMARIES = {
  'samsung.weekly.0': '삼성전자의 HBM3E가 엔비디아 품질 검증을 통과하면서 대규모 공급 계약 체결이 임박했다는 소식이다. 계약 성사 시 SK하이닉스와의 HBM 점유율 경쟁에서 삼성이 반격 기회를 얻을 것으로 전망된다.',
  'samsung.weekly.1': '삼성전자 갤럭시 AI가 전 세계 1억 대 이상의 기기에 배포 완료됐다고 밝혔다. 특히 온디바이스 번역·요약 기능이 호평받으며 프리미엄 시장에서 애플과의 경쟁력이 높아지고 있다는 분석이다.',
  'samsung.weekly.2': '삼성전자의 1분기 영업이익이 6조 7천억 원으로 전년 동기 대비 약 9배 증가했다. 메모리 반도체 업황 회복과 AI용 고부가 제품 비중 확대가 실적 개선의 주요 원인으로 꼽힌다.',
  'musk.weekly.0': '일론 머스크의 AI 기업 xAI가 최신 자금 조달 라운드에서 기업가치 500억 달러를 돌파했다고 발표했다. 그록3(Grok-3) 모델의 성능 개선과 X 플랫폼과의 통합 전략이 투자자들의 높은 평가를 이끌어낸 것으로 분석된다.',
  'tesla.weekly.0': '테슬라의 FSD v13이 출시됐으며, 테슬라 측은 이전 버전 대비 사고율이 40% 감소했다고 주장했다. 독립 전문가들은 아직 검증이 필요하다는 의견이지만, 실사용자들 사이에서는 확연한 성능 향상을 체감했다는 후기가 쏟아지고 있다.',
  'nvidia.weekly.0': '엔비디아 블랙웰(Blackwell) GPU의 2025년 생산 물량이 이미 전량 매진 상태라고 CEO 젠슨 황이 밝혔다. AI 인프라에 대한 전례 없는 투자 열기가 엔비디아의 공급 부족 상황을 적어도 내년까지 이어지게 할 것이라는 전망이다.',
  'bitcoin.weekly.0': '비트코인 현물 ETF에 하루 5억 달러 이상의 자금이 순유입되며 기관 투자자들의 관심이 지속되고 있다. 블랙록의 IBIT ETF가 출시 이후 가장 많은 자금을 모은 신규 ETF 중 하나로 기록되고 있다.',
}

// ── 분야별 트렌딩 키워드
export const TRENDING_DATA = {
  weekly: {
    경제: { color: '#34d399', icon: '💰', items: [
      { kw: '금리',       count: 342, trend: +8,  hot: true  },
      { kw: '환율',       count: 287, trend: +15, hot: true  },
      { kw: '인플레이션', count: 198, trend: -5,  hot: false },
      { kw: '무역수지',   count: 156, trend: +3,  hot: false },
      { kw: '원자재',     count: 134, trend: -2,  hot: false },
    ]},
    AI: { color: '#22d3ee', icon: '🤖', items: [
      { kw: '생성AI',     count: 428, trend: +22, hot: true  },
      { kw: 'AI규제',     count: 312, trend: +18, hot: true  },
      { kw: 'AI반도체',   count: 256, trend: +35, hot: true  },
      { kw: '자율주행',   count: 245, trend: +12, hot: false },
      { kw: 'AI에이전트', count: 189, trend: +28, hot: true  },
    ]},
    사회: { color: '#a78bfa', icon: '🏙️', items: [
      { kw: '저출산',   count: 298, trend: +5,  hot: false },
      { kw: '부동산',   count: 276, trend: -8,  hot: false },
      { kw: '청년실업', count: 189, trend: +12, hot: true  },
      { kw: '의료개혁', count: 167, trend: -15, hot: false },
      { kw: '고령화',   count: 143, trend: +6,  hot: false },
    ]},
    정치: { color: '#f87171', icon: '🌏', items: [
      { kw: '관세전쟁', count: 398, trend: +28, hot: true  },
      { kw: '미중갈등', count: 287, trend: +15, hot: true  },
      { kw: '한미관계', count: 198, trend: +8,  hot: false },
      { kw: '대선',     count: 176, trend: -5,  hot: false },
      { kw: '탄핵',     count: 154, trend: -12, hot: false },
    ]},
  },
  monthly: {
    경제: { color: '#34d399', icon: '💰', items: [
      { kw: '금리인하',   count: 1243, trend: +12, hot: true  },
      { kw: '환율',       count: 987,  trend: +8,  hot: false },
      { kw: '인플레이션', count: 876,  trend: -8,  hot: false },
      { kw: '무역적자',   count: 654,  trend: -5,  hot: false },
      { kw: '원자재',     count: 543,  trend: +2,  hot: false },
    ]},
    AI: { color: '#22d3ee', icon: '🤖', items: [
      { kw: '생성AI',     count: 1876, trend: +31, hot: true  },
      { kw: 'AI에이전트', count: 987,  trend: +45, hot: true  },
      { kw: 'AI규제',     count: 1243, trend: +22, hot: true  },
      { kw: '자율주행',   count: 876,  trend: +18, hot: false },
      { kw: 'AI반도체',   count: 765,  trend: +28, hot: true  },
    ]},
    사회: { color: '#a78bfa', icon: '🏙️', items: [
      { kw: '저출산',   count: 1098, trend: +8,  hot: false },
      { kw: '부동산',   count: 987,  trend: -5,  hot: false },
      { kw: '청년취업', count: 765,  trend: +15, hot: true  },
      { kw: '의료파업', count: 654,  trend: -22, hot: false },
      { kw: '고령화',   count: 543,  trend: +5,  hot: false },
    ]},
    정치: { color: '#f87171', icon: '🌏', items: [
      { kw: '관세전쟁', count: 1654, trend: +35, hot: true  },
      { kw: '미중갈등', count: 1243, trend: +18, hot: true  },
      { kw: '한미관계', count: 876,  trend: +12, hot: false },
      { kw: '대선',     count: 765,  trend: -8,  hot: false },
      { kw: 'NATO',     count: 543,  trend: +5,  hot: false },
    ]},
  },
}
