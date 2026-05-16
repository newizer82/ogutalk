# 오구톡 개발 노트 (DEVELOPMENT_GUIDE)

> 이 문서는 오구톡(OguTalk) 프로젝트의 **현재 상태**, **시행착오 교훈**, **향후 작업 시 주의사항**을 한 곳에 모아놓은 지침서입니다.
> 새 기능을 추가하거나 버그를 수정한 뒤에는 **변경 이력 섹션을 업데이트**해 주세요.

> 마지막 업데이트: **2026-05-16**

---

## 📌 빠른 참조

| 작업 | 명령어 / 파일 |
|---|---|
| 웹 개발 서버 (로컬) | `npm run dev` → http://localhost:5173 |
| 웹 배포 (Vercel) | `git push` (Vercel이 자동 빌드) |
| 안드로이드 빌드 & 설치 | 아래 [빌드 명령어](#-빌드--배포-명령어) 참고 |
| 진단 도구 | 앱 → 설정 → "🔍 오구 알람 진단" / "💾 체크인 저장 진단" |
| 프로젝트 문서 | `CLAUDE.md` (개요) · `PRD.md` (요구사항) · `STACK.md` (스택) · `DEVELOPMENT_GUIDE.md` (이 파일) |

---

## 🎯 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 앱 이름 | 오구톡 (OguTalk) |
| 핵심 가치 | 매시 **59분**에 짧은 알람으로 시간 감각을 되찾게 해주는 앱 |
| 타겟 | 휴대폰 사용 시 시간 가는 줄 모르는 사람들 |
| 수익 모델 | AdMob 배너 (비로그인) + 프리미엄(로그인) = 광고 제거 |
| 배포 형태 | PWA (Vercel) + 네이티브 앱 (Capacitor → Android APK/AAB) |

---

## 🛠️ 기술 스택

```
프런트:    React 19 + Vite 5 (PWA)
네이티브:  Capacitor 8 (Android)
백엔드:    Supabase (PostgreSQL + Auth + RLS)
인증:      이메일/비밀번호 + 카카오 OAuth
광고:      Google AdMob (@capacitor-community/admob v8)
스타일:    인라인 CSS + `src/styles/theme.js` 디자인 토큰
사운드:    Web Audio API (웹) + mp3 파일 (네이티브)
알림:      브라우저 Notification API (웹) + Capacitor LocalNotifications (네이티브)
```

---

## 📁 핵심 파일 구조

```
ogutalk/
├── CLAUDE.md, PRD.md, STACK.md, CHANGELOG.md, DEVELOPMENT_GUIDE.md
├── capacitor.config.ts        ← Capacitor 설정
├── vite.config.js             ← PWA 설정
├── android/
│   ├── app/build.gradle       ← Android 빌드 설정 (서명 포함)
│   └── app/src/main/
│       ├── AndroidManifest.xml         ← 권한 + AdMob App ID
│       ├── java/com/ogutalk/app/MainActivity.java  ← 채널 생성 + 배터리 면제
│       └── res/raw/
│           ├── ogu.mp3        ← 오구 알람 사운드
│           └── ogu_custom.mp3 ← 커스텀 알람 사운드
├── src/
│   ├── App.jsx                ← 메인 컴포넌트 + 전역 상태
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── capacitor.js       ← 네이티브 알림 브리지 + 진단 함수
│   │   ├── admob.js           ← AdMob 초기화/배너
│   │   └── settings.js        ← localStorage 통합 설정
│   ├── hooks/
│   │   ├── useAlarm.js        ← 59분 알람 + 오구 사운드
│   │   ├── useCustomAlarms.js ← 커스텀 알람 (Supabase 동기화)
│   │   ├── useCheckinReport.js ← 체크인 데이터 집계
│   │   ├── useUserPresets.js  ← 사용자 빠른 추가 프리셋
│   │   └── ...
│   ├── pages/
│   │   ├── HomePage.jsx, AlarmsPage.jsx, TodosPage.jsx
│   │   ├── ReportsPage.jsx, SettingsPage.jsx, GoalsPage.jsx
│   ├── components/
│   │   ├── alarm/AlarmPopup.jsx
│   │   ├── layout/Layout.jsx, Header.jsx, TabBar.jsx
│   │   └── ...
│   └── data/
│       ├── oguData.js              ← 오구/커스텀 사운드 톤 정의
│       └── quickAddPresets.js      ← 빠른 추가 프리셋 (3 카테고리 × 4)
└── supabase/
    └── migrations/            ← SQL 마이그레이션
```

---

## ⚙️ 핵심 시스템 동작 원리

### 1. 오구 알람 (매시 59분)

```
[휴대폰 앱]                          [웹 브라우저]
앱 시작 시:                          앱 시작 시:
  ↓                                   ↓
Capacitor LocalNotifications에       Service Worker 등록 +
7일치 알람 예약                       JS 타이머 :59:00 예약
(채널: ogu-hourly-v4)                  ↓
  ↓                                  :59 정각:
:59 정각:                             JS 타이머 발동 → Web Audio API
시스템이 알림 표시 + 사운드             재생 + 팝업 표시
  ↓
앱이 켜져있으면 인앱 팝업도 표시
(JS 핸들러는 silent: true로 사운드 중복 방지)
```

**핵심 설계 결정:**
- 휴대폰: **시스템 알림에 사운드/진동 위임** (USAGE_ALARM 채널)
- 웹: **JS 타이머가 직접 사운드 재생** (Web Audio API 오실레이터)
- 휴대폰 포그라운드에서 알림 핸들러는 **팝업만** 표시 (시스템이 이미 사운드 재생함)

### 2. 사운드 분리 (웹 vs 네이티브)

| 환경 | 사운드 방식 | 이유 |
|---|---|---|
| 웹 브라우저 | Web Audio API (오실레이터로 직접 음 생성) | 다양한 톤 선택 가능 |
| 휴대폰 앱 (포그라운드 테스트) | `new Audio('/sounds/ogu.mp3')` | WebView가 Web Audio 차단할 때가 많음 |
| 휴대폰 앱 (백그라운드/시스템) | 알림 채널 사운드 (`res/raw/ogu.mp3`) | OS가 처리, 사용자 모드(진동/무음) 자동 대응 |

### 3. AdMob 광고

```
앱 시작 → AdMob.initialize()
  ↓
isPremium === false 이면 배너 표시 (BOTTOM_CENTER)
isPremium === true 이면 배너 숨김 (로그인 시 자동)
```

- 앱 ID: AndroidManifest.xml의 `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID">`
- 배너 단위 ID: `src/lib/admob.js`의 `BANNER_AD_ID`
- 출시 전 `isTesting: false`로 변경 필요

### 4. 체크인 흐름

```
알람 팝업에서 활동 선택
  ↓
saveCheckin(activityId) 호출
  ↓
1) localStorage 즉시 저장 (동기, 항상 성공)
2) CustomEvent 'ogu:checkin' 발사 (detail에 entry 포함)
3) 로그인 시: Supabase notification_log INSERT (async)
  ↓
useCheckinReport가 이벤트 받음 → 상태에 직접 prepend (낙관적 갱신)
  ↓
ReportsPage 다음 마운트 시: reload() → Supabase/localStorage 최신 데이터
```

---

## 🧠 결정적 시행착오 (반드시 기억)

### 시행착오 1: 환경이 3개라는 사실
- **로컬 PC** (코드 작성 중) / **Vercel 인터넷** (배포본) / **휴대폰 앱** (APK)
- 코드를 수정해도 **각 환경에 따로 반영해야** 변경이 보임
- 빌드 명령어 빼먹지 말기

### 시행착오 2: Android WebView의 Web Audio API 제한
- WebView 내부에서 `new AudioContext()`는 종종 막힘
- **해결**: 네이티브에서는 `new Audio('/sounds/ogu.mp3')` 사용

### 시행착오 3: 알림 채널은 ID를 바꿔야 새 설정이 적용됨
- Android 8+는 채널 생성 후 사운드 변경 불가
- 사용자가 한 번 무음 처리하면 OS가 영원히 기억
- **해결**: `CHANNEL_OGU`, `CHANNEL_CUSTOM` ID에 `v2 → v3 → v4` 식으로 버전 붙임
- 변경 후 `LEGACY_CHANNELS`에 옛 ID 추가하면 자동 삭제됨
- `MainActivity.java`의 `CHAN_VERSION`도 함께 올려야 재생성됨

### 시행착오 4: AdMob ID 누락 → 앱 크래시
- AdMob 플러그인을 설치하면 **AndroidManifest.xml에 App ID 등록 필수**
- 없으면 `IllegalStateException`으로 앱 시작 즉시 종료
- 등록 위치: `<application>` 태그 안의 `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID">`

### 시행착오 5: `forEach` + `return` 함정
```js
[a, b, c].forEach(item => {
  for (let i = 0; i < 7; i++) {
    if (condition) return  // ← forEach 콜백 전체 종료! (break처럼 동작)
  }
})
```
- `return`은 forEach 콜백을 종료시킴 → 나머지 for 루프 스킵
- **해결**: `for...of` 또는 `if (!condition) { ... }` 패턴

### 시행착오 6: 시스템 사운드 + JS 사운드 이중 재생
- 시스템 알림이 사운드 재생하는데 JS에서 또 재생 → 이중 사운드
- **해결**: `_fire(hour, { silent: IS_NATIVE })` 패턴
  - 네이티브에서 알람 핸들러는 silent=true (팝업만)
  - 테스트 버튼은 silent=false (full 효과)

### 시행착오 7: 사용자 설정 마이그레이션
- UI에서 옵션 제거해도 사용자 localStorage엔 옛 값이 남아있음
- **해결**: `loadSettings()`에서 무효 값 검증 + 기본값으로 강제 덮어쓰기

### 시행착오 8: 빠른 추가 시간 편집
- 처음엔 프리셋 탭 = 즉시 등록 → 시간 수정 불가
- **해결**: 프리셋 탭 → 바텀시트 모달 → 시·분 편집 → 추가

---

## 🚀 빌드 & 배포 명령어

### 웹 (Vercel)
```powershell
git add -A
git commit -m "변경 내용 설명"
git push    # Vercel이 1~3분 안에 자동 빌드/배포
```

### 휴대폰 앱 (Android APK)
```powershell
cd C:\Users\newizer\siapp\ogutalk

# 1. 웹 자산 빌드
npm run build

# 2. 네이티브로 자산 복사 + 플러그인 동기화
npx cap sync android

# 3. APK 빌드 (clean 빌드로 캐시 문제 회피)
cd android
./gradlew clean assembleDebug

# 4. USB 연결된 기기에 자동 설치
./gradlew installDebug

# 또는 수동 설치:
# android/app/build/outputs/apk/debug/app-debug.apk 파일을 휴대폰으로 전송
```

### 출시용 AAB 빌드 (Play Store)
```powershell
cd android
./gradlew bundleRelease
# 결과: android/app/build/outputs/bundle/release/app-release.aab
```

> 출시용은 `signingConfigs` 설정 + 키스토어 필요. 자세한 절차는 별도 출시 가이드 참조.

---

## 🔧 자주 하는 작업 가이드

### A. 새 빠른 추가 프리셋 항목 추가
1. `src/data/quickAddPresets.js` 열기
2. 해당 카테고리의 `items` 배열에 새 항목 추가:
   ```js
   { icon: '🏃', title: '산책', message: '잠깐 걸어봐요', hour: 16, minute: 0 }
   ```
3. 빌드 → 배포

### B. 오구 알람 사운드 변경
1. 새 mp3 파일을 `android/app/src/main/res/raw/`에 저장 (파일명은 lowercase, 특수문자 X)
2. **동일 파일을 `public/sounds/`에도 복사** (포그라운드 재생용)
3. `MainActivity.java`의 `CHAN_VERSION` +1
4. `CHANNEL_OGU` ID 한 자리 올림 (예: `ogu-hourly-v4` → `ogu-hourly-v5`)
5. 옛 ID를 `LEGACY_CHANNELS` 배열에 추가
6. `src/lib/capacitor.js`의 `channelId`도 새 ID로 변경
7. `src/hooks/useAlarm.js`의 mp3 경로(`/sounds/ogu.mp3`)도 새 이름으로 변경
8. 빌드 → 설치

### C. 진동 패턴 변경
1. `MainActivity.java`의 `strongPattern` 배열 수정
   - 형식: `{대기, 진동, 쉼, 진동, 쉼, ...}` (밀리초)
2. `CHAN_VERSION` +1
3. 채널 ID 한 자리 올림 (위 B와 동일 절차)
4. 빌드 → 설치

### D. 새 카테고리/항목 정의 추가
- 빠른 추가: `src/data/quickAddPresets.js` 수정
- 활동 종류 (체크인): `src/components/alarm/AlarmPopup.jsx`의 `ACTIVITIES` 배열 + `src/pages/ReportsPage.jsx`의 `ACTIVITY_LABEL/COLOR/EMOJI`

### E. AdMob 광고 ID 변경
- `src/lib/admob.js`의 `BANNER_AD_ID`
- `AndroidManifest.xml`의 `APPLICATION_ID`
- 두 곳 모두 수정해야 함

### F. 실서비스 광고 활성화 (출시 전)
- `src/lib/admob.js`의 `isTesting: true` → `isTesting: false`
- 새로 만든 광고 단위는 24시간 후 광고 인벤토리 채워짐

### G. Supabase 스키마 변경
1. Supabase Dashboard에서 SQL Editor 사용 (또는 마이그레이션 파일 작성)
2. RLS 정책도 함께 설정해야 INSERT/SELECT 가능
3. 변경한 SQL을 `supabase/migrations/v0.x.y_설명.sql`로 저장 (버전 관리)

---

## 🐛 진단 도구 사용법

### 1. 🔍 오구 알람 진단 (설정 페이지)
- 현재 알림 권한 상태
- 활성화된 알람 시간대
- 대기중 알람 개수 (오구/커스텀 분리)
- 다음 3개 알람의 정확한 시각
- **언제 사용?** 정시에 알람이 안 울릴 때

### 2. 💾 체크인 저장 진단 (설정 페이지)
- 로컬과 Supabase 양쪽의 체크인 개수
- 최근 3개 entry 시각/유형
- 자동 진단 메시지 (RLS 문제 등)
- **언제 사용?** 리포트에 체크인이 안 보일 때

### 3. 🧪 30초 뒤 테스트 알림 (설정 페이지)
- 30초 후 시스템 알림 강제 발사
- 채널 작동 확인 (사운드/진동/heads-up)
- **언제 사용?** 정시까지 기다리기 싫을 때

---

## ⚠️ 알려진 한계

| 한계 | 이유 | 회피 방법 |
|---|---|---|
| 백그라운드 알람 반복 횟수 1회 | OS가 채널 사운드를 1번만 재생 | 음원 자체를 길게 만들거나 N개 알림 예약 (UX 나쁨) |
| YouTube/Reels 일시정지 안 됨 | 해당 앱들이 transient audio focus 신호 무시 | 사용자가 직접 영상 멈추도록 유도 |
| 일부 제조사 폰의 알람 누락 | 배터리 최적화로 백그라운드 작업 차단 | 사용자가 "최적화 안 함" 설정 필요 |
| Vercel 갱신 지연 | 푸시 후 1~3분 빌드 대기 | 급할 때 Vercel Dashboard에서 수동 트리거 |
| 카카오 OAuth 콜백 | 딥링크 설정 필요 (AndroidManifest) | `com.ogutalk.app://login-callback` 등록됨 |

---

## 🆘 트러블슈팅

### 앱이 실행 즉시 종료됨
- AdMob `APPLICATION_ID` 누락 → AndroidManifest.xml 확인
- 새 플러그인 추가 후 `npx cap sync` 빠뜨림

### 알람이 안 울림
1. 설정에서 알람 시간대 활성화 여부 확인
2. 휴대폰 설정 → 앱 → 오구톡 → 알림 / 권한 확인
3. **알람 및 리마인더** 권한 (Android 12+) 허용
4. 배터리 최적화 "예외" 또는 "최적화 안 함"
5. 🧪 30초 테스트로 채널 작동 확인

### 체크인이 리포트에 안 보임
1. 💾 체크인 저장 진단 → 로컬/Supabase 개수 비교
2. 로컬엔 있고 Supabase 0 → RLS 정책 누락
   ```sql
   CREATE POLICY "Users can insert own notification_log"
     ON notification_log FOR INSERT TO authenticated
     WITH CHECK (auth.uid() = user_id);
   ```
3. 둘 다 있는데 리포트 비어보임 → 리포트 탭 들어갔다 나오기 (재로드)

### 빌드 캐시 문제
```powershell
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
cd android
./gradlew clean
```

### Git lock 에러
```powershell
Remove-Item .git\refs\heads\master.lock -ErrorAction SilentlyContinue
```

---

## 📜 변경 이력 (Changelog)

> 새 작업 후 여기에 한 줄 추가하세요. 최신이 위로.

### 2026-05-16
- `DEVELOPMENT_GUIDE.md` 작성 (이 파일) — 프로젝트 지침서 추가
- `SettingsPage.jsx` 진단 버튼 강화: 최근 3개 entry 표시 + 자동 진단 메시지

### 2026-05-15
- 빠른 추가 기능 확장: 3개 카테고리(긴장 완화 & 건강 / 업무 & 자기계발 / 취미 & 관계) × 4개 항목
- 프리셋 탭 시 시간 편집 바텀시트 모달
- 사용자 정의 프리셋 (localStorage `ogu_user_presets`)
- 직접 추가 폼에 "⭐ 빠른 추가에도 저장" 체크박스
- 새 파일: `src/data/quickAddPresets.js`, `src/hooks/useUserPresets.js`

### 2026-05-12 ~ 14
- 오구/커스텀 알람 채널 v4/v3로 갱신 (vibration 강화 + USAGE_ALARM 재적용)
- 진동 패턴 강화: `{0,1200,300,1200,300,1500}` (총 ~4.5초)
- 알람 팝업 안내 문구 강조 (19px, 주황색)
- 활동 선택 시 200ms 후 즉시 닫기 + 홈 이동
- `useCheckinReport`에 `ogu:checkin` 이벤트 리스너 추가 (실시간 갱신)
- 알람 핸들러 `silent: true` 적용 (이중 사운드 방지)
- 진단 도구 추가: 🔍 오구 알람 진단 / 💾 체크인 저장 진단 / 🧪 30초 테스트

### 2026-05-10 ~ 11
- AdMob 통합: 배너 광고 (BANNER_CENTER) + 로그인 시 자동 숨김
- AndroidManifest.xml에 APPLICATION_ID 추가 (필수)
- 채널 v3 도입 (무음 캐시 우회)
- 30초 테스트 알림 함수 추가

### 2026-05 이전
- 핵심 기능 완성: 오구 알람, 커스텀 알람, 할일, 리포트, 인증
- Capacitor 8 안드로이드 빌드 환경 구축
- 카카오 로그인 OAuth
- 주간 리포트 (템플릿 기반)
- 백그라운드 알림 (Capacitor LocalNotifications)
- 코드 정리 (몰입시간/키워드 탭/voice 잔재 제거)

---

## 📋 향후 작업 후보 (TODO)

> 우선순위 순. 작업 완료하면 위 [변경 이력]에 옮기고 여기서 삭제.

### 출시 준비 (High)
- [ ] AdMob `isTesting: false` 전환
- [ ] 진단 버튼 코드 정식 출시 직전 제거 (또는 개발자 모드 안에만)
- [ ] RECORD_AUDIO 권한 제거 (음성 인식 미사용)
- [ ] 알림 아이콘 추가 (`res/drawable/ic_stat_ogu.xml`)
- [ ] 릴리즈 키스토어 생성 + 백업 (3곳: USB, 클라우드, 종이)
- [ ] AAB 빌드 → Play Console 비공개 테스트 트랙
- [ ] 개인정보 처리방침 GitHub Pages 호스팅
- [ ] 앱 아이콘 재디자인 (모던/트렌디)

### 기능 개선 (Medium)
- [ ] 사용자 빠른 추가 편집 기능 (현재는 추가/삭제만)
- [ ] 체크인 활동 종류 사용자 커스터마이징
- [ ] 주간 리포트에 빠른 추가 통계 포함
- [ ] 푸시 알림 (FCM) — 백그라운드 안정성 향상

### 결제/수익 (Low)
- [ ] RevenueCat 연동 (월간/연간 구독)
- [ ] 프리미엄 혜택 명확화 UI
- [ ] 보상형 광고 (광고 시청 → 임시 프리미엄)

---

## 🧭 새 Claude 세션에서 이어작업할 때

1. 이 문서(`DEVELOPMENT_GUIDE.md`)를 먼저 읽어달라고 요청
2. `CLAUDE.md`도 함께 확인 (프로젝트 개요)
3. [변경 이력] 섹션으로 최근 작업 파악
4. [시행착오] 섹션을 꼭 읽어서 같은 실수 안 하도록
5. 작업 후 [변경 이력]에 한 줄 추가

> 💡 이 문서가 길지만, 새 세션에서 매번 같은 함정에 빠지는 시간 비용을 막아줍니다.

---

## 📞 참고 링크

- Supabase Dashboard: https://supabase.com/dashboard (본인 프로젝트)
- AdMob Console: https://apps.admob.com
- Vercel Dashboard: https://vercel.com/dashboard
- Play Console: https://play.google.com/console
- Capacitor 공식 문서: https://capacitorjs.com/docs
