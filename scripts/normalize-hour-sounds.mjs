// 시간 안내 음원 음량 정규화 — 파일 하나씩: node scripts/normalize-hour-sounds.mjs 3
//
// 쓰기 전에: npm i --no-save mpg123-decoder lamejs
// (상시 의존성으로 두지 않는다 — 음원을 새로 받을 때만 쓴다)
// 파일마다 프로세스를 새로 띄울 것. lamejs 는 한 프로세스에서 반복하면 힙을 다 먹는다.
//
// 시간 안내 음원 12개 음량 정규화
// 기준: 기존 ogu.mp3 의 "말소리 구간 RMS"(-24dB) 에 맞추되 살짝 또렷하게 -23dB,
//       피크는 -3dBFS 를 넘지 않게 (폰 스피커 찌그러짐 방지)
import fs from 'node:fs'
import path from 'node:path'
import { MPEGDecoder } from 'mpg123-decoder'
// lamejs 의 ESM 엔트리는 깨져 있다(MPEGMode is not defined) → UMD 번들을 직접 평가한다
import vm from 'node:vm'
const lameSrc = fs.readFileSync('node_modules/lamejs/lame.min.js', 'utf8')
const sandbox = { window: {}, self: {}, console }
sandbox.global = sandbox
vm.createContext(sandbox)
vm.runInContext(lameSrc, sandbox)
const lamejs = sandbox.lamejs ?? sandbox.window.lamejs
const Mp3Encoder = lamejs.Mp3Encoder
const SRC = 'public/sounds/hours'
const TARGET_VOICE_DB = -25.45   // 측정 편향 보정값 — 실측으로 기존 ogu.mp3(-24.05dB) 와 같아진다
const PEAK_CEIL_DB = -3
const db = v => (v > 0 ? 20 * Math.log10(v) : -99)
const amp = d => Math.pow(10, d / 20)

function measure(pcm) {
  let peak = 0, sum = 0, n = 0
  for (const s of pcm) {
    const a = Math.abs(s)
    if (a > peak) peak = a
    if (a > 0.02) { sum += s * s; n++ }
  }
  return { peak, voice: Math.sqrt(sum / Math.max(n, 1)) }
}

const decoder = new MPEGDecoder()
await decoder.ready

{
  const h = Number(process.argv[2])   // 파일 하나만 처리 — lamejs 가 반복 호출에서 메모리를 먹는다
  const name = `ogu_h${String(h).padStart(2, '0')}.mp3`
  const file = path.join(SRC, name)
  const { channelData, sampleRate } = decoder.decode(new Uint8Array(fs.readFileSync(file)))
  decoder.reset()
  const pcm = channelData[0]

  const before = measure(pcm)
  let gain = amp(TARGET_VOICE_DB - db(before.voice))
  // 피크 천장 — 올릴 일은 없지만 안전장치
  if (db(before.peak * gain) > PEAK_CEIL_DB) gain = amp(PEAK_CEIL_DB) / before.peak

  const out = new Int16Array(pcm.length)
  for (let i = 0; i < pcm.length; i++) {
    out[i] = Math.max(-32768, Math.min(32767, Math.round(pcm[i] * gain * 32767)))
  }

  const enc = new Mp3Encoder(1, sampleRate, 64)
  const chunks = []
  const BLOCK = 1152
  for (let i = 0; i < out.length; i += BLOCK) {
    const buf = enc.encodeBuffer(out.subarray(i, i + BLOCK))
    if (buf.length) chunks.push(Buffer.from(buf))
  }
  const tail = enc.flush()
  if (tail.length) chunks.push(Buffer.from(tail))
  fs.writeFileSync(file, Buffer.concat(chunks))

  const after = measure(Float32Array.from(out, v => v / 32767))
  console.log(
    `${name}  ${db(before.voice).toFixed(1)} → ${db(after.voice).toFixed(1)} dB` +
    `  (피크 ${db(before.peak).toFixed(1)} → ${db(after.peak).toFixed(1)})`)
}
decoder.free()
console.log('\n완료 — public/sounds/hours 의 12개 파일을 덮어썼다')
