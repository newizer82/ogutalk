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

/** 순서가 곧 스토어 노출 순서다. 앞 세 장이 설치를 좌우한다 */
export const SHOTS = [
  { file: 's1-alarm.png',    title: '매시 59분, 오구!',        sub: '시간 가는 줄 모를 때 깨워드려요' },
  { file: 's2-home.png',     title: '안 적어도 알아요',          sub: '폰 쓴 시간을 자동으로 재드려요' },
  { file: 's3-alarm-ai.png', title: '알람에서 바로 AI에게',      sub: '지금 물어볼 것 한 장을 드려요' },
  { file: 's4-report.png',   title: '오늘 하루를 100점으로',     sub: '성장·균형·실행 세 가지로' },
  { file: 's5-calendar.png', title: '약속도 일정도 한 화면에',   sub: '기기 캘린더와 함께 봅니다' },
  { file: 's6-trend.png',    title: '어제의 나와만 비교해요',    sub: '남과 줄 세우지 않습니다' },
  { file: 's7-mission.png',  title: '5분이면 되는 일 세 가지',   sub: '뭘 할지 고민하지 않게' },
  { file: 's8-settings.png', title: '기기 밖으로 나가지 않아요', sub: '사용시간은 폰 안에서만' },
]

const PY = path.join(process.cwd(), 'scripts', 'store_compose.py')
fs.mkdirSync(OUT, { recursive: true })

let n = 0
for (const [i, s] of SHOTS.entries()) {
  const src = path.join(SRC, s.file)
  if (!fs.existsSync(src)) { console.log(`  건너뜀 (없음)  ${s.file}`); continue }
  const out = path.join(OUT, `${String(i + 1).padStart(2, '0')}-${s.file}`)
  execFileSync('python', [PY, src, out, s.title, s.sub], { stdio: 'inherit' })
  console.log(`  ✓ ${out}  ${s.title}`)
  n++
}
console.log(`\n${n}장 생성. Play Console > 스토어 설정 > 그래픽 > 휴대전화 스크린샷`)
