// ── 활동 분류 (2단계) ──────────────────────────────────────────
// 그룹 4개  : 수동 체크인 팝업이 고르는 값 + 리포트 헤드라인
// 세부 11개 : 자동 기록(앱 사용시간)이 판정하는 값
//
// 체크인 레코드의 activity_type 한 칸에 그룹 ID든 세부 ID든 그대로 들어간다.
// 리포트는 groupOf() 로 묶는다 → DB 스키마 변경 없음.
//
// 그룹을 나눈 기준은 이 앱의 목적(과몰입 방지)이다 —
// "이 시간이 의도적이었나(생산), 순삭이었나(소비)"가 한눈에 보여야 한다.

export const GROUPS = {
  produce: { label: '⚡ 생산', emoji: '⚡', color: '#6366f1' },
  connect: { label: '💬 소통', emoji: '💬', color: '#10b981' },
  consume: { label: '🍿 소비', emoji: '🍿', color: '#f59e0b' },
  living:  { label: '🧭 생활', emoji: '🧭', color: '#94a3b8' },
}

export const CATEGORIES = {
  work:      { label: '💼 업무',          emoji: '💼', group: 'produce' },
  learning:  { label: '📚 학습·자기계발', emoji: '📚', group: 'produce' },
  ai:        { label: '🤖 AI 도구',       emoji: '🤖', group: 'produce' },
  search:    { label: '🔍 검색·정보',     emoji: '🔍', group: 'produce' },
  messenger: { label: '💬 메신저',        emoji: '💬', group: 'connect' },
  sns:       { label: '📱 SNS',           emoji: '📱', group: 'connect' },
  video:     { label: '📺 동영상',        emoji: '📺', group: 'consume' },
  game:      { label: '🎮 게임',          emoji: '🎮', group: 'consume' },
  shopping:  { label: '🛒 쇼핑',          emoji: '🛒', group: 'consume' },
  finance:   { label: '💰 금융·투자',     emoji: '💰', group: 'living' },
  daily:     { label: '🗺️ 생활·이동',     emoji: '🗺️', group: 'living' },
}

// 이전(v1.7.0 이하) 4분류 — 옛 체크인이 리포트에서 사라지지 않도록 라벨과 그룹을 유지한다.
// 'sns' 는 새 분류와 ID가 같아 CATEGORIES.sns(소통)로 합쳐진다.
// ponytail: 옛 'sns' 는 "SNS/유튜브"였어서 과거 유튜브 시간이 소통으로 잡힌다.
//           로컬 기록은 30일마다 교체되므로 자연히 사라짐 — 재분류 마이그레이션은 하지 않음.
const LEGACY = {
  goal_work: { label: '🎯 목표 할일', emoji: '🎯', group: 'produce' },
  study:     { label: '📚 공부/업무', emoji: '📚', group: 'produce' },
  rest:      { label: '😴 휴식/식사', emoji: '😴', group: 'living'  },
}

function info(activityType) {
  return GROUPS[activityType] ?? CATEGORIES[activityType] ?? LEGACY[activityType] ?? null
}

/** 활동 값(그룹·세부·옛 값) → 그룹 ID. 모르는 값이면 null */
export function groupOf(activityType) {
  if (GROUPS[activityType]) return activityType
  return (CATEGORIES[activityType] ?? LEGACY[activityType])?.group ?? null
}

export const labelOf = t => info(t)?.label ?? t
export const emojiOf = t => info(t)?.emoji ?? '?'
export const colorOf = t => GROUPS[groupOf(t)]?.color ?? '#6366f1'

// ── 앱 패키지 → 세부 분류 (내장) ────────────────────────────────
// 한국 앱은 OS 분류(아래)를 선언하지 않는 경우가 많아 직접 둔다.
// 원칙: 패키지명이 확실한 것만. 틀린 이름은 조용히 미분류가 되지만,
//       빠진 앱은 사용자가 알람 팝업에서 한 번 고르면 학습되므로 누락이 오류보다 낫다.
export const BUILTIN_CATEGORY = {
  // 💼 업무
  'com.notion.id':                              'work',
  'com.Slack':                                  'work',
  'com.microsoft.teams':                        'work',
  'com.google.android.gm':                      'work',
  'com.microsoft.office.outlook':               'work',
  'com.google.android.calendar':                'work',
  'com.google.android.apps.docs':               'work',
  'com.google.android.apps.docs.editors.docs':  'work',
  'com.google.android.keep':                    'work',

  // 📚 학습·자기계발
  'com.duolingo':                               'learning',

  // 🤖 AI 도구
  'com.openai.chatgpt':                         'ai',
  'com.anthropic.claude':                       'ai',
  'com.google.android.apps.bard':               'ai',   // Gemini
  'ai.perplexity.app.android':                  'ai',

  // 🔍 검색·정보
  'com.android.chrome':                         'search',
  'com.sec.android.app.sbrowser':               'search', // 삼성 인터넷
  'com.nhn.android.search':                     'search', // 네이버
  'com.google.android.googlequicksearchbox':    'search', // 구글 앱
  'net.daum.android.daum':                      'search', // 다음

  // 💬 메신저 — 이전엔 "업무인지 잡담인지 모른다"며 뺐지만, 메신저라는 칸이 생겨 분류 가능해졌다
  'com.kakao.talk':                             'messenger',
  'org.telegram.messenger':                     'messenger',
  'com.whatsapp':                               'messenger',
  'jp.naver.line.android':                      'messenger',

  // 📱 SNS
  'com.instagram.android':                      'sns',
  'com.instagram.barcelona':                    'sns',  // Threads
  'com.facebook.katana':                        'sns',
  'com.twitter.android':                        'sns',
  'com.reddit.frontpage':                       'sns',

  // 📺 동영상
  'com.google.android.youtube':                 'video',
  'com.netflix.mediaclient':                    'video',
  'com.zhiliaoapp.musically':                   'video',  // TikTok
  'com.ss.android.ugc.trill':                   'video',  // TikTok (일부 지역)
  'tv.twitch.android.app':                      'video',

  // 🛒 쇼핑
  'com.coupang.mobile':                         'shopping',
  'com.musinsa.store':                          'shopping',
  'com.towneers.www':                           'shopping', // 당근
  'com.elevenst':                               'shopping', // 11번가
  'com.ebay.kr.gmarket':                        'shopping',

  // 💰 금융·투자
  'viva.republica.toss':                        'finance',
  'com.kakaobank.channel':                      'finance',
  'com.dunamu.exchange':                        'finance', // 업비트
  'com.btckorea.bithumb':                       'finance', // 빗썸
  'com.samsung.android.spay':                   'finance', // 삼성 월렛

  // 🗺️ 생활·이동
  'com.nhn.android.nmap':                       'daily',   // 네이버 지도
  'net.daum.android.map':                       'daily',   // 카카오맵
  'com.locnall.KimGiSa':                        'daily',   // 카카오내비
  'com.skt.tmap.ku':                            'daily',   // T맵
  'com.sampleapp':                              'daily',   // 배달의민족
  'com.fineapp.yogiyo':                         'daily',
  'com.iloen.melon':                            'daily',   // 멜론
  'com.spotify.music':                          'daily',
  'com.google.android.apps.youtube.music':      'daily',
  'com.sec.android.gallery3d':                  'daily',   // 삼성 갤러리
  'com.google.android.apps.photos':             'daily',
}

// ── 안드로이드 OS 분류 → 세부 분류 (내장 목록에 없을 때의 폴백) ───
// ApplicationInfo.category (API 26+) — 앱 개발자가 매니페스트에 선언하는 값.
// 게임은 수천 개라 목록으로 막을 수 없어 이게 사실상 유일한 수단이다.
// 금융 분류는 OS에 없으므로 금융 앱은 내장 목록에만 의존한다.
const OS_CATEGORY = {
  0: 'game',     // CATEGORY_GAME (구형 FLAG_IS_GAME 도 네이티브에서 여기로 합친다)
  1: 'daily',    // CATEGORY_AUDIO
  2: 'video',    // CATEGORY_VIDEO
  3: 'daily',    // CATEGORY_IMAGE
  4: 'sns',      // CATEGORY_SOCIAL
  5: 'search',   // CATEGORY_NEWS
  6: 'daily',    // CATEGORY_MAPS
  7: 'work',     // CATEGORY_PRODUCTIVITY
}

/**
 * 패키지명을 활동 분류로 변환한다.
 * 우선순위: 사용자 지정 > 내장 목록 > OS 분류 > null(미분류 — 기록하지 않음)
 * @param osCategory ApplicationInfo.category 값 (없으면 undefined / -1)
 * @returns 세부·그룹 ID 또는 null. 사용자 지정은 그룹 ID일 수 있다(팝업이 그룹만 보여주므로).
 */
export function categoryForApp(pkg, overrides = {}, osCategory) {
  if (!pkg) return null
  return overrides?.[pkg] ?? BUILTIN_CATEGORY[pkg] ?? OS_CATEGORY[osCategory] ?? null
}
