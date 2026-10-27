# -*- coding: utf-8 -*-
"""한 장 합성 — store-shots.mjs 가 파일마다 부른다.

python scripts/store_compose.py <입력png> <출력png> <제목> <보조문구> [아래자를px] [위자를px]

기기 캡처 1080x2340 → 스토어용 1080x1920.
  상태바·내비바·AdMob 배너를 잘라내고, 위에 문구를 얹는다.
"""
import sys
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920           # Play 휴대전화 스크린샷 (9:16)
STATUS_BAR = 96             # 통신사·배터리 — 내 폰 사정은 홍보물이 아니다
# 아래에서 잘라낼 높이. 기본은 내비게이션 바만.
# 로그아웃 상태로 찍으면 AdMob 배너가 함께 들어오므로 560 을 넘긴다 —
# 남의 상품 사진이 우리 스토어에 올라가면 안 된다 (isPremium = isLoggedIn).
NAV_DEFAULT = 165
NAV_WITH_AD = 560
TEXT_TOP = 300              # 문구가 차지하는 위쪽 높이
SHOT_W = 912                # 화면 이미지 너비 (좌우 84px 여백)

BG_TOP    = (255, 252, 248)
BG_BOTTOM = (255, 169, 107)
INK       = (26, 18, 8)
INK_SUB   = (138, 106, 85)

FONT_BD = r'C:\Windows\Fonts\malgunbd.ttf'
FONT_RG = r'C:\Windows\Fonts\malgun.ttf'


def gradient(w, h, top, bottom):
    """위에서 아래로 — promo-bg.png 와 같은 결"""
    img = Image.new('RGB', (1, h))
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        px[0, y] = tuple(round(top[i] + (bottom[i] - top[i]) * (t ** 1.6)) for i in range(3))
    return img.resize((w, h), Image.BILINEAR)


def rounded(img, r):
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], r, fill=255)
    out = img.convert('RGBA')
    out.putalpha(mask)
    return out


def center(draw, text, font, y, fill):
    x0, y0, x1, y1 = draw.textbbox((0, 0), text, font=font)
    draw.text(((W - (x1 - x0)) / 2 - x0, y), text, font=font, fill=fill)
    return y1 - y0


def main():
    src, out, title, sub = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
    nav = int(sys.argv[5]) if len(sys.argv) > 5 else NAV_DEFAULT
    # 스크롤이 끝까지 가서 맨 위가 카드 중간에 걸릴 때, 그만큼 더 잘라낸다.
    # 아래는 개인정보가 보이는 카드를 쳐낼 때 nav 를 키워서 쓴다.
    top = STATUS_BAR + (int(sys.argv[6]) if len(sys.argv) > 6 else 0)

    canvas = gradient(W, H, BG_TOP, BG_BOTTOM)
    draw = ImageDraw.Draw(canvas)

    # 문구 — 제목이 주인공, 보조는 한 줄
    h1 = center(draw, title, ImageFont.truetype(FONT_BD, 76), 96, INK)
    center(draw, sub, ImageFont.truetype(FONT_RG, 40), 96 + h1 + 34, INK_SUB)

    # 화면 — 잘라내고 줄여서 올린다
    shot = Image.open(src).convert('RGB')
    shot = shot.crop((0, top, shot.width, shot.height - nav))
    scale = SHOT_W / shot.width
    shot = shot.resize((SHOT_W, round(shot.height * scale)), Image.LANCZOS)

    # 아래로 넘치면 아래를 자른다 (위가 중요하다 — 화면의 주인공은 늘 위에 있다)
    room = H - TEXT_TOP
    if shot.height > room:
        shot = shot.crop((0, 0, SHOT_W, room))

    card = rounded(shot, 36)
    # 짧은 화면은 남는 자리 가운데에 띄운다 — 위에 붙이면 아래가 휑하게 비어 보인다
    y = TEXT_TOP + max(0, (room - shot.height) // 2)
    canvas.paste(card, ((W - SHOT_W) // 2, y), card)

    canvas.save(out, 'PNG', optimize=True)


if __name__ == '__main__':
    main()
