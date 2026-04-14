// 순수 Node.js로 PNG 아이콘 생성 (외부 패키지 없음)
import { createWriteStream } from 'fs'
import { deflateSync } from 'zlib'
import { mkdirSync } from 'fs'

mkdirSync('./public', { recursive: true })

function createPNG(size) {
  // PNG 시그니처
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 2   // color type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  // 픽셀 데이터 생성
  const raw = Buffer.alloc(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0 // filter byte
    for (let x = 0; x < size; x++) {
      const off = y * (1 + size * 3) + 1 + x * 3
      const cx = x / size - 0.5
      const cy = y / size - 0.5
      const dist = Math.sqrt(cx * cx + cy * cy)
      const r = Math.round(x / size * 45 + 50)  // 50~95

      // 원형 배경 클리핑
      if (dist > 0.5) {
        // 외부: 배경색 #0f172a
        raw[off]     = 15
        raw[off + 1] = 23
        raw[off + 2] = 42
      } else {
        // 그라데이션: #6366f1 → #8b5cf6
        const t = (x + y) / (size * 2)
        raw[off]     = Math.round(99  + (139 - 99)  * t)  // R
        raw[off + 1] = Math.round(102 + (92  - 102) * t)  // G
        raw[off + 2] = Math.round(241 + (246 - 241) * t)  // B
      }
    }
  }

  const compressed = deflateSync(raw)

  function chunk(type, data) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const typeB = Buffer.from(type)
    const crcBuf = Buffer.concat([typeB, data])
    const crc = crc32(crcBuf)
    const crcB = Buffer.alloc(4)
    crcB.writeUInt32BE(crc)
    return Buffer.concat([len, typeB, data, crcB])
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// CRC32
function crc32(buf) {
  let crc = 0xFFFFFFFF
  const table = makeCRCTable()
  for (const b of buf) crc = (crc >>> 8) ^ table[(crc ^ b) & 0xFF]
  return (crc ^ 0xFFFFFFFF) >>> 0
}
function makeCRCTable() {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
}

for (const size of [192, 512]) {
  const png = createPNG(size)
  createWriteStream(`./public/icon-${size}.png`).end(png)
  console.log(`✅ icon-${size}.png 생성 완료 (${png.length} bytes)`)
}
