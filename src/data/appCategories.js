// ── 앱 패키지 → 활동 카테고리 내장 매핑 ─────────────────────────
// 카테고리 ID 는 기존 체크인과 동일: goal_work / study / sns / rest
//
// 원칙: 애매한 앱은 넣지 않는다. 틀린 분류를 지어내면 리포트 신뢰도가 무너진다.
//  - 카카오톡/문자: 업무인지 잡담인지 알 수 없음 → 미분류
//  - goal_work(목표 할일): 앱만으로 판정 불가 → 자동 매핑 대상 아님

export const BUILTIN_CATEGORY = {
  // 📱 SNS/유튜브
  'com.google.android.youtube':      'sns',
  'com.instagram.android':           'sns',
  'com.zhiliaoapp.musically':        'sns',   // TikTok
  'com.ss.android.ugc.trill':        'sns',   // TikTok (일부 지역)
  'com.facebook.katana':             'sns',
  'com.twitter.android':             'sns',
  'com.netflix.mediaclient':         'sns',
  'tv.twitch.android.app':           'sns',
  'com.reddit.frontpage':            'sns',

  // 📚 공부/업무
  'com.notion.id':                   'study',
  'com.google.android.apps.docs':    'study',
  'com.google.android.apps.docs.editors.docs': 'study',
  'com.google.android.gm':           'study',   // Gmail
  'com.google.android.calendar':     'study',
  'com.Slack':                       'study',
  'com.microsoft.teams':             'study',
  'com.microsoft.office.outlook':    'study',
  'com.android.chrome':              'study',   // 검색·문서 열람이 주용도
  'com.google.android.keep':         'study',

  // 😴 휴식/식사
  'com.sec.android.gallery3d':       'rest',    // 삼성 갤러리
  'com.google.android.apps.photos':  'rest',
  'com.google.android.apps.youtube.music': 'rest',
  'com.spotify.music':               'rest',
  'com.melon.melonplayer':           'rest',
  'com.sampleapp':                   'rest',    // 배달의민족
  'com.coupang.mobile':              'rest',
  'com.nhn.android.nmap':            'rest',    // 네이버 지도
  'com.locnall.KimGiSa':             'rest',    // 카카오내비
}

/**
 * 패키지명을 활동 카테고리로 변환한다.
 * @returns 카테고리 ID 또는 null(미분류 — 기록하지 않음)
 */
export function categoryForApp(pkg, overrides = {}) {
  if (!pkg) return null
  return overrides[pkg] ?? BUILTIN_CATEGORY[pkg] ?? null
}
