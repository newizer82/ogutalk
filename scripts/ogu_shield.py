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


# ── 시계 방패 ──────────────────────────────────────────────────
# 눈금은 "띠 하나" 에만 둔다. 전면에 두르면 그건 방패가 아니라 시계 문자판이다
# (앞선 시안의 실패). 동심원 구조 안에서 눈금 띠는 한 겹일 뿐이다.
#
# 중앙 보스는 주황, 59 는 흰색. 바깥이 어둡고 가운데가 솟은 것처럼 보이게
# 띠마다 위를 밝히고 아래를 어둡게 한다.
LIGHT = '#FFA470'
SHADE = '#B8420F'
DARK  = '#8F300A'

R_RIM, R_TICK, R_RING, R_IN, R_BOSS = 330, 312, 250, 232, 178
MARK = 59                                  # 짚는 눈금 — 정각 1분 전


def grad(gid, top, bottom):
    return (f'<linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1">'
            f'<stop offset="0" stop-color="{top}"/>'
            f'<stop offset="1" stop-color="{bottom}"/></linearGradient>')


def tick_band(mark_color=None):
    out = []
    for m in range(60):
        if m == MARK and mark_color:
            continue
        long_ = (m % 5 == 0)
        out.append(tick(m, R_TICK - (54 if long_ else 34), R_TICK - 10,
                        13 if long_ else 8,
                        'rgba(255,255,255,0.95)' if long_ else 'rgba(255,255,255,0.55)'))
    if mark_color:
        out.append(tick(MARK, R_RING + 6, R_TICK - 6, 18, mark_color))
    return ''.join(out)


def boss(fill, text_fill=WHITE):
    return (f'<circle cx="{C}" cy="{C}" r="{R_BOSS}" fill="{fill}"/>'
            f'<text x="{C}" y="{C + 186 * 0.345:.1f}" '
            f'font-family="Segoe UI Black, Arial Black, sans-serif" font-size="186" '
            f'font-weight="900" text-anchor="middle" letter-spacing="-8" '
            f'fill="{text_fill}">59</text>')


# ── A · 플랫 ───────────────────────────────────────────────────
def variant_a():
    return (f'<circle cx="{C}" cy="{C}" r="{R_RIM}" fill="{SHADE}"/>'
            f'<circle cx="{C}" cy="{C}" r="{R_TICK}" fill="{ORANGE}"/>'
            + tick_band(WHITE)
            + f'<circle cx="{C}" cy="{C}" r="{R_RING}" fill="{WHITE}"/>'
              f'<circle cx="{C}" cy="{C}" r="{R_IN}" fill="{LIGHT}"/>'
            + boss(ORANGE))


# ── B · 띠마다 명암 ────────────────────────────────────────────
# 위가 밝고 아래가 어둡다. 그라데이션 하나로 판이 기울어 보인다.
def variant_b():
    d = ('<defs>' + grad('rim', SHADE, DARK) + grad('face', '#FF854F', '#E85A20')
         + grad('bos', '#FF8A55', '#E25B1E') + '</defs>')
    return (d
            + f'<circle cx="{C}" cy="{C}" r="{R_RIM}" fill="url(#rim)"/>'
              f'<circle cx="{C}" cy="{C}" r="{R_TICK}" fill="url(#face)"/>'
            + tick_band(WHITE)
            + f'<circle cx="{C}" cy="{C}" r="{R_RING}" fill="{WHITE}"/>'
              f'<circle cx="{C}" cy="{C}" r="{R_IN}" fill="{LIGHT}"/>'
            + boss('url(#bos)'))


# ── C · 솟은 보스 ──────────────────────────────────────────────
# B + 테두리 위쪽 빛 한 줄 + 보스 아래 그림자. 가운데가 튀어나와 보인다.
def variant_c():
    d = ('<defs>' + grad('rim2', SHADE, DARK) + grad('face2', '#FF854F', '#E85A20')
         + grad('bos2', '#FF9566', '#DD5418') + '</defs>')
    hi = []
    for r, op, w in ((R_RIM - 10, 0.40, 16), (R_TICK - 8, 0.22, 12)):
        x0, y0 = pol(305, r); x1, y1 = pol(55, r)
        hi.append(f'<path d="M {x0:.1f} {y0:.1f} A {r} {r} 0 0 1 {x1:.1f} {y1:.1f}" '
                  f'fill="none" stroke="{WHITE}" stroke-opacity="{op}" stroke-width="{w}" '
                  f'stroke-linecap="round"/>')
    sx0, sy0 = pol(125, R_BOSS + 9); sx1, sy1 = pol(235, R_BOSS + 9)
    shadow = (f'<path d="M {sx0:.1f} {sy0:.1f} A {R_BOSS + 9} {R_BOSS + 9} 0 0 1 '
              f'{sx1:.1f} {sy1:.1f}" fill="none" stroke="{DARK}" stroke-opacity="0.28" '
              f'stroke-width="20" stroke-linecap="round"/>')
    return (d
            + f'<circle cx="{C}" cy="{C}" r="{R_RIM}" fill="url(#rim2)"/>'
              f'<circle cx="{C}" cy="{C}" r="{R_TICK}" fill="url(#face2)"/>'
            + tick_band(WHITE)
            + f'<circle cx="{C}" cy="{C}" r="{R_RING}" fill="{WHITE}"/>'
              f'<circle cx="{C}" cy="{C}" r="{R_IN}" fill="{LIGHT}"/>'
            + shadow + boss('url(#bos2)') + ''.join(hi))


# ── D · 59번 눈금 강조 ─────────────────────────────────────────
# C + 짚는 눈금 하나만 길게. 정각 1분 전이 어디인지 보인다.
def variant_d():
    base = variant_c()
    long_tick = tick(MARK, R_RING - 4, R_TICK - 4, 24, WHITE)
    return base.replace(f'<circle cx="{C}" cy="{C}" r="{R_RING}" fill="{WHITE}"/>',
                        long_tick + f'<circle cx="{C}" cy="{C}" r="{R_RING}" fill="{WHITE}"/>')


VARIANTS = {'a': variant_a, 'b': variant_b, 'c': variant_c, 'd': variant_d}
TITLE = {'a': 'A  flat', 'b': 'B  shaded bands',
         'c': 'C  raised boss', 'd': 'D  C + 59th tick'}
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
