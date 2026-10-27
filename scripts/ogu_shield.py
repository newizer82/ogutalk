# -*- coding: utf-8 -*-
"""오구 방패 심볼 — SVG 생성기.

python scripts/ogu_shield.py <출력폴더> [안]

방패는 그림이 아니라 기하학이다. 눈금 60개 중 59번째 하나를 정확히 짚는 일이라
이미지 모델에 맡기면 매번 다른 것이 나온다. 여기서 좌표로 그린다.

설계 제약 (바꾸기 전에 읽을 것):
  · 안드로이드 적응형 아이콘은 108dp 중 바깥 18dp 가 잘린다 → 본체는 지름 64% 안에
  · 런처 마스크가 원·둥근네모·스퀴클로 바뀌어도 잘린 곳이 없어야 한다 → 원형
  · 16px 에서 눈금 60개는 뭉갠다. 그때 남아야 하는 것은 "원 + 한 군데가 다르다" 뿐이다
  · 방패 안에 바늘·문자판을 넣지 않는다 — 넣는 순간 시계가 된다
"""
import math
import os
import sys

W = 1024
C = W / 2
R = 330                      # 본체 반지름 (지름 660 = 64%, 적응형 아이콘 안전 영역)

ORANGE = '#FF6B2C'
DEEP   = '#D9531B'
INK    = '#111111'
WHITE  = '#FFFFFF'

MARK = 59                    # 짚는 눈금. 정각 1분 전


def pol(a_deg, r):
    a = math.radians(a_deg - 90)          # -90: 0분을 12시 방향으로
    return C + r * math.cos(a), C + r * math.sin(a)


def tick(m, r0, r1, w, color, cap='round'):
    x0, y0 = pol(m * 6, r0)
    x1, y1 = pol(m * 6, r1)
    return (f'<line x1="{x0:.2f}" y1="{y0:.2f}" x2="{x1:.2f}" y2="{y1:.2f}" '
            f'stroke="{color}" stroke-width="{w}" stroke-linecap="{cap}"/>')


def wrap(body, bg=None):
    rect = f'<rect width="{W}" height="{W}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {W}" '
            f'width="{W}" height="{W}">{rect}{body}</svg>')


# ── 원형 방패 ──────────────────────────────────────────────────
# 동심원 = 과녁·로델의 형식이다. 흔한 형식 자체는 문제가 없고,
# 피해야 하는 것은 "빨강-흰-파랑 띠 + 별" 이라는 특정 배색이다.
# 우리는 주황 계열 + 59.
#
# 입체감은 그라데이션이 아니라 띠의 명암 단계로 만든다 —
# 아이콘이 작아지면 그라데이션은 뭉개지고 단계는 남는다.
LIGHT = '#FFA470'                      # 하이라이트용 밝은 주황
SHADE = '#B8420F'                      # 그늘용 짙은 주황

R1, R2, R3, R4 = 330, 266, 206, 146    # 바깥 → 중앙. 마지막이 59 가 들어가는 원


def rings(colors):
    return ''.join(f'<circle cx="{C}" cy="{C}" r="{r}" fill="{c}"/>'
                   for r, c in zip((R1, R2, R3, R4), colors))


def num(size, color, dy=0.0):
    """59 — 지금은 시스템 폰트. 확정되면 패스로 떠서 정본에 넣는다"""
    return (f'<text x="{C}" y="{C + size * 0.345 + dy:.1f}" '
            f'font-family="Segoe UI Black, Arial Black, sans-serif" '
            f'font-size="{size:.0f}" font-weight="900" text-anchor="middle" '
            f'letter-spacing="-8" fill="{color}">59</text>')


# A 안을 다듬는다. 세 가지가 걸렸다:
#   ① 동심원만으로는 "과녁" 으로 읽힌다 — 방패로 보이려면 테가 솟아야 한다
#   ② 중앙 원이 작아 59 가 32px 에서 먼저 죽는다 — 원을 키운다
#   ③ 앱이 플랫인데 혼자 입체면 튄다 — 그라데이션 대신 명암 단계로만

R1, R2, R3, R4 = 330, 272, 212, 168    # 중앙 원을 146 → 168 로 키웠다


# ── A · 명암 4단 (기본) ────────────────────────────────────────
def variant_a():
    return rings((SHADE, ORANGE, LIGHT, WHITE)) + num(176, DEEP, -4)


# ── B · 금속 테 ────────────────────────────────────────────────
# 바깥에 짙은 선을 한 겹 두르면 면이 아니라 "판" 으로 보인다. 과녁과 갈리는 지점.
def variant_b():
    return (f'<circle cx="{C}" cy="{C}" r="{R1}" fill="{SHADE}"/>'
            f'<circle cx="{C}" cy="{C}" r="{R1 - 16}" fill="{ORANGE}"/>'
            f'<circle cx="{C}" cy="{C}" r="{R2}" fill="{LIGHT}"/>'
            f'<circle cx="{C}" cy="{C}" r="{R3}" fill="{ORANGE}"/>'
            f'<circle cx="{C}" cy="{C}" r="{R4}" fill="{WHITE}"/>'
            + num(176, DEEP, -4))


# ── C · 위쪽 빛 한 줄 ──────────────────────────────────────────
# 그라데이션 없이 입체. 각 띠 위쪽에만 밝은 호를 얹는다 — 플랫을 깨지 않는다.
def variant_c():
    p = [rings((SHADE, ORANGE, LIGHT, WHITE))]
    for r in (R1 - 14, R2 - 14):
        x0, y0 = pol(300, r)
        x1, y1 = pol(60, r)
        p.append(f'<path d="M {x0:.1f} {y0:.1f} A {r} {r} 0 0 1 {x1:.1f} {y1:.1f}" '
                 f'fill="none" stroke="{WHITE}" stroke-opacity="0.34" stroke-width="18" '
                 f'stroke-linecap="round"/>')
    p.append(num(176, DEEP, -4))
    return ''.join(p)


# ── D · 중앙만 짙게 ────────────────────────────────────────────
# 59 를 흰 글자로. 중앙이 어두우면 시선이 거기 멈춘다.
def variant_d():
    return (rings((SHADE, ORANGE, LIGHT, DEEP)) + num(176, WHITE, -4))


VARIANTS = {'a': variant_a, 'b': variant_b, 'c': variant_c, 'd': variant_d}
TITLE = {'a': 'A  4 steps', 'b': 'B  metal rim',
         'c': 'C  top light', 'd': 'D  dark center'}
SIZES = (96, 48, 32, 16)


def sheet(out_dir):
    """흰 배경 / 어두운 배경 / 크기 4종을 한 장에 — 판정은 여기서 난다"""
    rows = []
    for k in VARIANTS:
        body = VARIANTS[k]()
        big = f'<svg viewBox="0 0 {W} {W}" width="190" height="190">{body}</svg>'
        small = ''.join(
            f'<div class="cell"><svg viewBox="0 0 {W} {W}" width="{s}" height="{s}">{body}</svg>'
            f'<b>{s}</b></div>' for s in SIZES)
        rows.append(f'''<tr>
          <th>{TITLE[k]}</th>
          <td>{big}</td>
          <td class="dark">{big}</td>
          <td class="mono">{big}</td>
          <td><div class="row">{small}</div></td>
        </tr>''')
    html = f'''<!doctype html><meta charset="utf-8"><style>
      body{{margin:0;background:#fff;font:600 13px/1.4 system-ui;padding:24px}}
      table{{border-collapse:collapse}} th,td{{padding:14px;border-bottom:1px solid #eee;vertical-align:middle}}
      th{{text-align:left;color:#111;font-size:15px;white-space:nowrap}}
      td.dark{{background:#1A120C}} td.mono svg{{filter:grayscale(1)}}
      .row{{display:flex;align-items:flex-end;gap:22px}}
      .cell{{text-align:center;color:#9A9AA0}} .cell b{{display:block;margin-top:6px;font-weight:600}}
      thead th{{color:#8E8E93;font-size:12px;border-bottom:2px solid #111}}
    </style><table><thead><tr>
      <th></th><th>white</th><th>dark</th><th>mono</th><th>16 ~ 96px</th>
    </tr></thead><tbody>{''.join(rows)}</tbody></table>'''
    open(os.path.join(out_dir, 'sheet.html'), 'w', encoding='utf-8').write(html)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else 'store'
    os.makedirs(out, exist_ok=True)
    only = sys.argv[2].lower() if len(sys.argv) > 2 else None
    for k, fn in VARIANTS.items():
        if only and k != only:
            continue
        open(os.path.join(out, f'shield-{k}.svg'), 'w', encoding='utf-8').write(wrap(fn()))
    sheet(out)
    print(out, 'ok')


if __name__ == '__main__':
    main()
