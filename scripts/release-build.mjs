// ── 릴리즈 빌드 (순서 강제) ─────────────────────────────────────
// node scripts/release-build.mjs [--apk]
//
// 왜 스크립트인가: vite.config.js 가 build.gradle 의 versionName 을 "웹 빌드 시점에"
// 읽어 __APP_VERSION__ 으로 박는다. 손으로 하다 보면 vite build 를 먼저 하고 버전을
// 나중에 올려서, 앱에 표시되는 버전만 한 단계 뒤처진 빌드가 나간다 (v1.16.x 에서 실제로 겪음).
// 순서는 항상: build.gradle 버전 수정 → 이 스크립트.
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const GRADLE = 'android/app/build.gradle'
const gradle = fs.readFileSync(GRADLE, 'utf8')
const versionName = gradle.match(/versionName\s+"([^"]+)"/)?.[1]
const versionCode = gradle.match(/versionCode\s+(\d+)/)?.[1]
if (!versionName || !versionCode) throw new Error('build.gradle 에서 버전을 못 읽었다')

// Gradle 8.14.3 은 JDK 25 에서 못 돈다 (CLAUDE.md 참고)
if (!process.env.JAVA_HOME) {
  const jdk21 = path.join(os.homedir(), '.jdks', 'jbr-21.0.11')
  if (fs.existsSync(jdk21)) process.env.JAVA_HOME = jdk21
  else console.warn('⚠ JAVA_HOME 이 없다 — JDK 21 이 아니면 Gradle 이 실패한다')
}

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts })

console.log(`\n▶ 오구톡 ${versionName} (${versionCode}) 빌드\n`)
run('npx vite build')

// 웹 번들에 박힌 버전이 gradle 과 같은지 확인 — 이게 어긋나면 빌드할 이유가 없다
const bundles = fs.readdirSync('dist/assets').filter(f => f.endsWith('.js'))
const stamped = bundles.some(f => fs.readFileSync(`dist/assets/${f}`, 'utf8').includes(`"${versionName}"`))
if (!stamped) throw new Error(`웹 번들에 ${versionName} 이 안 박혔다 — vite.config.js 확인`)
console.log(`✓ 웹 번들 버전 ${versionName} 확인`)

run('npx cap sync android')

// 윈도우 cmd 는 현재 폴더를 PATH 로 안 본다 → '.\' 를 붙여야 한다
const gradlew = process.platform === 'win32' ? String.raw`.\gradlew.bat` : './gradlew'
const tasks = process.argv.includes('--apk') ? 'assembleRelease bundleRelease' : 'bundleRelease'
run(`${gradlew} ${tasks}`, { cwd: 'android' })

const aab = 'android/app/build/outputs/bundle/release/app-release.aab'
const mb = (fs.statSync(aab).size / 1048576).toFixed(2)
console.log(`\n✓ ${aab}  (${mb}MB, ${versionName} / ${versionCode})\n`)
