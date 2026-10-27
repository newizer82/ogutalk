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


# ── 방패 실루엣 ────────────────────────────────────────────────
# 원반에 눈금을 두르면 그게 곧 시계 문자판이다 (1차 시안의 실패).
# 방패는 "위가 넓고 아래로 모이는" 실루엣이라 원과 즉시 구분된다.
SW, TOP, BOT = 620, 230, 850          # 폭 · 윗변 · 아래 꼭지


def shield_path(scale=1.0):
    w, top, bot = SW * scale, C - (C - TOP) * scale, C + (BOT - C) * scale
    l, r = C - w / 2, C + w / 2
    k = top + (bot - top) * 0.52      # 옆구리가 꺾이는 높이
    return (f'M {l:.1f} {top + 34:.1f} '
            f'Q {l:.1f} {top:.1f} {l + 34:.1f} {top:.1f} '
            f'L {r - 34:.1f} {top:.1f} '
            f'Q {r:.1f} {top:.1f} {r:.1f} {top + 34:.1f} '
            f'L {r:.1f} {k:.1f} '
            f'Q {r:.1f} {bot - 60:.1f} {C:.1f} {bot:.1f} '
            f'Q {l:.1f} {bot - 60:.1f} {l:.1f} {k:.1f} Z')


def notch(scale=1.0, color=None):
    """59번째 자리 — 윗변 왼쪽에서 1/60 만큼 안쪽. 16px 에서 유일하게 살아남은 표시"""
    w = SW * scale
    top = C - (C - TOP) * scale
    x = C - w / 2 + w * 0.22
    return (f'<rect x="{x:.1f}" y="{top - 44:.1f}" width="{w * 0.075:.1f}" height="{w * 0.30:.1f}" '
            f'rx="{w * 0.037:.1f}" fill="{color or ORANGE}"/>')


# 문장(紋章) — 방패는 면만으로는 아무 말도 하지 않는다.
# 59 를 넣는다. 런처는 48dp 이상이라 실제 사용 크기에서 또렷하게 읽힌다.
# ※ 지금은 시스템 폰트로 그린다. 방향이 정해지면 패스로 떠서 정본에 넣는다.
def num(scale=1.0, color=None, dy=0.0):
    size = 300 * scale
    y = C + size * 0.34 + dy
    return (f'<text x="{C}" y="{y:.1f}" font-family="Segoe UI Black, Arial Black, sans-serif" '
            f'font-size="{size:.0f}" font-weight="900" text-anchor="middle" '
            f'letter-spacing="-10" fill="{color or WHITE}">59</text>')


# ── A · 방패 + 59 ──────────────────────────────────────────────
def variant_a():
    return f'<path d="{shield_path()}" fill="{ORANGE}"/>' + num(1.0, WHITE, -18)


# ── B · 겹친 방패 + 59 ─────────────────────────────────────────
# 바깥 테두리가 한 겹 더 있어 다른 주황 아이콘과 구분된다.
def variant_b():
    return (f'<path d="{shield_path()}" fill="{ORANGE}"/>'
            f'<path d="{shield_path(0.78)}" fill="{DEEP}"/>'
            + num(0.82, WHITE, -8))


# ── C · 테두리 방패 + 59 ───────────────────────────────────────
def variant_c():
    return (f'<path d="{shield_path()}" fill="{WHITE}" stroke="{ORANGE}" stroke-width="56" '
            f'stroke-linejoin="round"/>' + num(0.92, ORANGE, -14))


# ── D · 방패 + 59 + 노치 ───────────────────────────────────────
# 59 가 안 읽히는 16px 에서도 "윗변에 한 군데가 다른 방패" 는 남는다.
def variant_d():
    return (f'<path d="{shield_path()}" fill="{ORANGE}"/>' + num(0.94, WHITE, -4)
            + notch(1.0, DEEP))


VARIANTS = {'a': variant_a, 'b': variant_b, 'c': variant_c, 'd': variant_d}
TITLE = {'a': 'A  shield + 59', 'b': 'B  double shield + 59',
         'c': 'C  outlined + 59', 'd': 'D  shield + 59 + notch'}
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
