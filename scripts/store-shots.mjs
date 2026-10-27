// ── 스토어 스크린샷 합성 ────────────────────────────────────────
// node scripts/store-shots.mjs <캡처폴더> <출력폴더>
//
// 기기 캡처(1080×2340)를 받아 스토어용 1080×1920 으로 만든다.
//   · 상태바(통신사·배터리)와 내비게이션 바를 잘라낸다 — 내 폰 사정은 홍보물이 아니다
//   · 하단 AdMob 배너를 잘라낸다 — 남의 상품 사진이 우리 스토어에 올라가면 안 된다
//   · 위쪽에 문구를 얹는다 — 스크린샷만 있으면 무엇이 좋은지 읽히지 않는다
//
// 파이썬(Pillow)이 실제 그리기를 한다. node 는 목록과 순서만 쥔다
// (프로젝트에 이미지 의존성을 추가하지 않기 위해 — 빌드와 무관한 일회성 도구다).
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const SRC = process.argv[2]
const OUT = process.argv[3] ?? 'store'
if (!SRC) throw new Error('사용법: node scripts/store-shots.mjs <캡처폴더> [출력폴더]')

/**
 * 순서가 곧 스토어 노출 순서다. 앞 세 장이 설치를 좌우한다.
 *
 * `cut` 은 그 캡처에서만 더 잘라낼 양이다 (px, 1080x2340 기준).
 *   bottom — 개인정보가 보이는 카드를 쳐낼 때. 없으면 내비바만(165) 잘라낸다
 *   top    — 스크롤이 끝까지 가서 맨 위가 카드 중간에 걸릴 때
 */
export const SHOTS = [
  { file: 's1-alarm.png',    title: '매시 59분, 오구!',        sub: '울릴 시간대는 내가 고릅니다' },
  { file: 's2-home.png',     title: '안 적어도 알아요',          sub: '폰 쓴 시간을 자동으로 재드려요' },
  { file: 's3-alarm-ai.png', title: '알람에서 바로 AI에게',      sub: '지금 물어볼 것 한 장을 드려요' },
  { file: 's4-report.png',   title: '오늘 하루를 100점으로',     sub: '성장·균형·실행 세 가지로' },
  // 달력 아래 약속·일정 목록에는 내 할일 제목이 그대로 나온다 → 카드에서 끊는다
  { file: 's5-calendar.png', title: '약속도 일정도 한 화면에',   sub: '기기 캘린더와 함께 봅니다', cut: { bottom: 1020 } },
  { file: 's6-trend.png',    title: '어제의 나와만 비교해요',    sub: '남과 줄 세우지 않습니다' },
  { file: 's7-mission.png',  title: '5분이면 되는 일 세 가지',   sub: '뭘 할지 고민하지 않게' },
  // 위: 페이지 끝이라 더 못 내린다 — 잘린 미션 칩 줄을 걷어낸다
  // 아래: "위험 영역"(계정 삭제) 빨간 상자를 홍보물에 넣지 않는다
  { file: 's8-settings.png', title: '답은 폰 안의 AI가',        sub: '보낸 내용은 서버에 남지 않아요', cut: { top: 255, bottom: 550 } },
]

const PY = path.join(process.cwd(), 'scripts', 'store_compose.py')
fs.mkdirSync(OUT, { recursive: true })

let n = 0
for (const [i, s] of SHOTS.entries()) {
  const src = path.join(SRC, s.file)
  if (!fs.existsSync(src)) { console.log(`  건너뜀 (없음)  ${s.file}`); continue }
  const out = path.join(OUT, `${String(i + 1).padStart(2, '0')}-${s.file}`)
  // 광고가 섞인 캡처(로그아웃 상태)면 --ad 를 붙여 더 많이 잘라낸다
  const nav = s.cut?.bottom ?? (process.argv.includes('--ad') ? 560 : 165)
  execFileSync('python', [PY, src, out, s.title, s.sub, String(nav), String(s.cut?.top ?? 0)],
    { stdio: 'inherit' })
  console.log(`  ✓ ${out}  ${s.title}`)
  n++
}
console.log(`\n${n}장 생성. Play Console > 스토어 설정 > 그래픽 > 휴대전화 스크린샷`)
