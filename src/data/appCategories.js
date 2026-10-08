// ── 활동 분류 (2단계) ──────────────────────────────────────────
// 그룹 4개  : 수동 체크인 팝업이 고르는 값 + 리포트 헤드라인
// 세부 13개 : 자동 기록(앱 사용시간)이 판정하는 값
//
// 체크인 레코드의 activity_type 한 칸에 그룹 ID든 세부 ID든 그대로 들어간다.
// 리포트는 groupOf() 로 묶는다 → DB 스키마 변경 없음.
//
// 그룹을 나눈 기준은 이 앱의 목적(과몰입 방지)이다 —
// "이 시간이 의도적이었나(생산), 순삭이었나(소비)"가 한눈에 보여야 한다.
// 생산 = 무언가를 만들거나 끝낸 행위(문서·메일·촬영·구매·주문·예약), 소비 = 보고 읽기만 한 시간(검색 포함).

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
  create:    { label: '📸 촬영·제작',     emoji: '📸', group: 'produce' },
  shopping:  { label: '🛒 구매·주문·예약', emoji: '🛒', group: 'produce' },
  messenger: { label: '💬 메신저',        emoji: '💬', group: 'connect' },
  sns:       { label: '📱 SNS',           emoji: '📱', group: 'connect' },
  video:     { label: '📺 동영상',        emoji: '📺', group: 'consume' },
  game:      { label: '🎮 게임',          emoji: '🎮', group: 'consume' },
  search:    { label: '🔍 검색·정보',     emoji: '🔍', group: 'consume' },
  finance:   { label: '💰 금융·투자',     emoji: '💰', group: 'living' },
  health:    { label: '🏃 건강·운동',     emoji: '🏃', group: 'living' },
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

  // 🔍 검색·정보 (소비)
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

  // 🛒 구매·주문·예약 (생산)
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
  'com.sampleapp':                              'shopping',   // 배달의민족
  'com.fineapp.yogiyo':                         'shopping',
  'com.iloen.melon':                            'daily',   // 멜론
  'com.spotify.music':                          'daily',
  'com.google.android.apps.youtube.music':      'daily',
  'com.sec.android.gallery3d':                  'daily',   // 삼성 갤러리
  'com.google.android.apps.photos':             'daily',

  // ── 실기기(2026-09-21) 설치 앱 기준 추가 ──
  'notion.id':                                  'work',   // 노션 실제 패키지
  'com.trello':                                 'work',
  'com.evernote':                               'work',
  'us.zoom.videomeetings':                      'work',
  'com.formagrid.airtable':                     'work',
  'kr.co.rememberapp':                          'work',
  'com.gworks.oneapp.works':                    'work',   // 네이버웍스
  'com.tosslab.jandi.app':                      'work',
  'com.microsoft.office.officehubrow':          'work',
  'com.google.android.apps.docs.editors.sheets':'work',
  'com.samsung.android.app.notes':              'work',
  'com.samsung.android.email.provider':         'work',
  'com.nhn.android.mail':                       'work',
  'com.dho.mobilefax':                          'work',
  'com.canva.editor':                           'create',
  'ai.x.grok':                                  'ai',
  'classcard.net':                              'learning',
  'com.naver.labs.translator':                  'learning', // 파파고
  'com.samsung.android.messaging':              'messenger',
  'com.samsung.android.dialer':                 'messenger', // 전화도 소통
  'com.samsung.android.incallui':               'messenger',
  'com.facebook.orca':                          'messenger',
  'com.discord':                                'messenger',
  'com.tencent.mm':                             'messenger', // 위챗
  'com.nhn.android.band':                       'sns',
  'com.nhn.android.blog':                       'sns',
  'com.nhn.android.navercafe':                  'sns',
  'com.kmplayer':                               'video',
  'com.nhn.android.naverplayer':                'video',
  'com.google.android.videos':                  'video',
  'com.roblox.client':                          'game',
  'com.nianticlabs.pokemongo':                  'game',
  'com.devsisters.CookieRunForKakao':           'game',
  'com.ChillyRoom.DungeonShooter':              'game',
  'com.alibaba.aliexpresshd':                   'shopping',
  'com.einnovation.temu':                       'shopping',
  'com.amazon.mShop.android.shopping':          'shopping',
  'com.taobao.taobao':                          'shopping',
  'com.navercorp.navershopping':                'shopping',
  'com.tmon':                                   'shopping',
  'net.bucketplace':                            'shopping', // 오늘의집
  'com.miraeasset.trade':                       'finance',
  'com.miraeasset.global':                      'finance',
  'com.kiwoom.heromts':                         'finance',  // 영웅문S#
  'com.kakaopay.app':                           'finance',
  'com.kbstar.kbbank':                          'finance',
  'nh.smart.banking':                           'finance',
  'com.woori.android.iweb':                     'finance',
  'com.wooribank.smart.biz':                    'finance',
  'kr.co.dgb.dgbb':                             'finance',
  'kr.co.samsungcard.mpocket':                  'finance',
  'com.ktmusic.geniemusic':                     'daily',
  'com.naver.vibe':                             'daily',
  'com.kakao.taxi':                             'daily',
  'com.kakao.wheel':                            'daily',
  'com.korail.talk':                            'shopping', // 승차권 예매
  'kt.navi':                                    'daily',
  'socar.Socar':                                'daily',

  // ── 생산적 활용 앱 보강 (2026-10-09) ──
  // 독서·강의·어학 — 읽고 듣는 시간도 생산이다 (미분류면 리포트에서 사라진다)
  'kr.co.millie.millieshelf':                   'learning', // 밀리의 서재
  'kr.co.influential.youngkangapp':             'learning', // 윌라
  'com.initialcoms.ridi':                       'learning', // 리디북스
  'com.inflab.inflearn':                        'learning', // 인프런
  'net.pedaling.class101':                      'learning', // 클래스101
  'com.udemy.android':                          'learning',
  'org.coursera.android':                       'learning',
  'com.google.android.apps.classroom':          'learning',

  // 기록·제작 — 음성 메모, 문서 스캔, 영상 편집
  'com.naver.clova.minute':                     'create',   // 클로바노트
  'com.transcribe.audio.to.text':               'create',
  'com.psma.videospeedchanger':                 'create',   // 편집 도구 (기존 video → create 로 교정)
  'imagetopdf.pdfconverter.jpgtopdf.pdfeditor': 'create',
  'pdf.converter.imagetopdf.jpgtopdf':          'create',
  'com.adobe.scan.android':                     'create',
  'com.google.android.apps.docs.editors.slides':'create',

  // 업무·정리 도구
  'com.todoist':                                'work',
  'com.ticktick.task':                          'work',
  'com.alt.goodmorning':                        'work',     // 루티너리 (습관 루틴)
  'com.workflowy.android':                      'work',
  'com.infraware.office.reader.team':           'work',     // 폴라리스 오피스
  'com.microsoft.skydrive':                     'work',     // OneDrive
  'com.dropbox.android':                        'work',
  'com.estmob.android.sendanywhere':            'work',
  'com.nbpcorp.ncp.workplace':                  'work',
  'com.logmein.gotowebinar':                    'work',

  // 금융
  'com.rainist.banksalad2':                     'finance',  // 뱅크샐러드
  'com.kbcard.kbbusinesscard':                  'finance',
  'com.wooricard.wpay':                         'finance',
  'com.lotte.lpay':                             'finance',
  'com.naverfin.payapp':                        'finance',  // 네이버페이
  'nh.smart.nhallonepay':                       'finance',
  'kr.or.nps.smart':                            'finance',  // 국민연금
  'com.fusionmedia.investing':                  'finance',
  'com.miso':                                   'finance',

  // 🏃 건강·운동 (신설) — 운동 시간은 소비가 아니다
  'com.sec.android.app.shealth':                'health',   // 삼성 헬스
  'com.samsung.android.shealthmonitor':         'health',
  'com.google.android.apps.fitness':            'health',
  'com.strava':                                 'health',
  'com.nike.plusgps':                           'health',
  'com.fitbit.FitbitMobile':                    'health',
  'com.golfzon.android':                        'health',   // 골프 (기존 daily → 운동으로 교정)
  'com.golfzon.booking':                        'shopping', // 예약은 구매·주문·예약 그대로
  'com.golfbuddy.smartcaddie':                  'health',
  'com.smellab.kimcaddie':                      'health',

  // 생활·행정
  'kr.go.minwon.m':                             'daily',    // 정부24
  'kr.go.nts.android':                          'daily',    // 홈택스
  'kr.or.nhic':                                 'daily',    // 건강보험
  'com.ktcs.whowho':                            'daily',
  'com.alphainventor.filemanager':              'daily',

  // 소비 — 분류가 없으면 소비 시간이 과소평가된다
  'com.kakao.story':                            'sns',
  'com.linkedin.android':                       'sns',
  'com.google.android.apps.youtube.kids':       'video',
  'com.disney.disneyplus':                      'video',
  'com.wavve.pooq':                             'video',    // 웨이브
  'com.frograms.wplay':                         'video',    // 왓챠
  'com.cjenm.tving':                            'video',    // 티빙
  'com.nhn.android.webtoon':                    'video',    // 네이버 웹툰 (읽는 소비)
  'com.kakao.page':                             'video',    // 카카오페이지
  'me.zepeto.main':                             'game',
  'com.supersolid.penguin':                     'game',
  'com.cjin.pokegenie.standard':                'game',
  'com.kt.esports':                             'game',
  'com.android.vending':                        'daily',    // OS 분류는 생산성(7)이라 업무로 새던 것 교정
  'com.sec.android.app.camera':                 'create',
  'com.google.android.projection.gearhead':     'daily',    // Android Auto
  // 📸 촬영·제작 / 🛒 구매·주문·예약 (생산)
  'com.lemon.lvoverseas':                       'create',   // CapCut
  'com.nexstreaming.app.kinemasterfree':        'create',
  'com.darinsoft.vimo':                         'create',
  'com.coffeebeanventures.easyvoicerecorder':   'create',
  'com.sec.android.app.voicenote':              'create',   // 삼성 음성 녹음
  'com.coupang.mobile.eats':                    'shopping',
  'com.cultsotry.yanolja.nativeapp':            'shopping', // 야놀자
  'com.klook':                                  'shopping',
  'com.titicacacorp.triple':                    'shopping', // 트리플
  'com.hanatour.dotcom':                        'shopping',
  'com.twayair.m.app':                          'shopping',
  'com.paytalab.mkseo.passorder':               'shopping', // 패스오더
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
  // 옛 4분류 팝업에서 저장된 수정값(goal_work·study·rest)은 무시한다 — 분류 기준이 바뀌어
  // "NAVER=목표 할일" 같은 옛 수정이 새 기준(검색=소비)을 계속 덮어쓰는 것을 막기 위함.
  const o = overrides?.[pkg]
  const override = (GROUPS[o] || CATEGORIES[o]) ? o : undefined
  return override ?? BUILTIN_CATEGORY[pkg] ?? OS_CATEGORY[osCategory] ?? null
}
