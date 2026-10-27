# -*- coding: utf-8 -*-
"""Play 그래픽 이미지(1024x500) — 스토어 상단에 걸리는 한 장.

python scripts/store_feature.py <출력png> [a|b|c]

마스코트(promo-bg.png 의 시계 캐릭터)는 쓰지 않는다. 귀여운 그림은
"알림 장난감" 으로 읽히고, 이 앱이 파는 것은 능동적 시간 관리다.

오른쪽 자리를 셋 중 하나로 채운다:
  a  큰 59 숫자 — 이름이 곧 기능이다
  b  시계 눈금 — 정각 1분 전이라는 위치를 그림 하나로
  c  실제 앱 화면 — 점수가 쌓인 홈

문구는 능동형으로 쓴다. "시간 가는 줄 모르는 당신에게" 는 사용자를
탓하는 말이고, 설치 버튼을 누를 이유가 되지 못한다.
"""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1024, 500
CREAM    = (255, 252, 248)
INK      = (26, 18, 8)
INK_SUB  = (138, 106, 85)
ORANGE   = (216, 83, 27)
ORANGE_L = (255, 107, 44)
LINE     = (236, 236, 239)

TITLE = '매시 59분, 오구!'
SUB   = '다음 한 시간을 내가 정합니다'
CHIPS = ('59분 알람', '자동 기록', 'AI 질문')

SHOT = 'store/s2-home-src.png'   # 없으면 c 안은 건너뛴다

FONT_BD = r'C:\Windows\Fonts\malgunbd.ttf'
FONT_RG = r'C:\Windows\Fonts\malgun.ttf'


def glow(size, center, radius, color, strength=70):
    """오른쪽 아래 은은한 주황 — 평평한 크림만 있으면 심심하다"""
    layer = Image.new('L', size, 0)
    d = ImageDraw.Draw(layer)
    d.ellipse([center[0] - radius, center[1] - radius,
               center[0] + radius, center[1] + radius], fill=strength)
    layer = layer.filter(ImageFilter.GaussianBlur(radius * 0.5))
    return layer, Image.new('RGB', size, color)


def right_number(canvas):
    """a — 59. 앱 이름이 곧 기능이라 숫자 하나가 제일 많이 말한다.
    제목 뒤로 들어가지 않게 오른쪽 아래로 내린다 (글자와 겹치면 둘 다 안 읽힌다)"""
    f = ImageFont.truetype(FONT_BD, 250)
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = d.textbbox((0, 0), '59', font=f)
    d.text((W - (x1 - x0) - 64 - x0, H - (y1 - y0) - 40 - y0),
           '59', font=f, fill=ORANGE_L + (40,))
    canvas.alpha_composite(layer)


def right_dial(canvas):
    """b — 시계 눈금. 59 자리만 길고 진하게 (정각 1분 전)"""
    import math
    cx, cy, r = W - 196, H // 2, 150
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for m in range(60):
        a = math.radians(m * 6 - 90)
        hit = (m == 59)
        inner = r - (40 if hit else 16)
        wdt = 7 if hit else (3 if m % 5 == 0 else 2)
        col = ORANGE + (255,) if hit else (
            (176, 176, 182, 255) if m % 5 == 0 else (214, 214, 220, 255))
        d.line([cx + inner * math.cos(a), cy + inner * math.sin(a),
                cx + r * math.cos(a), cy + r * math.sin(a)], fill=col, width=wdt)
    # 분침 — 눈금만 있으면 "시계" 고, 바늘이 59 를 가리켜야 "1분 전" 이 된다
    a = math.radians(59 * 6 - 90)
    d.line([cx, cy, cx + (r - 46) * math.cos(a), cy + (r - 46) * math.sin(a)],
           fill=ORANGE + (255,), width=9)
    d.ellipse([cx - 11, cy - 11, cx + 11, cy + 11], fill=ORANGE + (255,))
    canvas.alpha_composite(layer)


def right_screen(canvas):
    """c — 실제 화면. 지어낸 그림보다 쌓인 점수가 설득력이 있다"""
    src = Image.open(SHOT).convert('RGB')
    shot = src.crop((60, 300, src.width - 60, 1440))      # 오구 지수 카드 + 오늘 내 시간
    h = 400
    shot = shot.resize((round(shot.width * h / shot.height), h), Image.LANCZOS)

    mask = Image.new('L', shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, shot.width - 1, shot.height - 1], 22, fill=255)
    card = shot.convert('RGBA')
    card.putalpha(mask)

    x, y = W - shot.width - 48, (H - h) // 2
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [x + 4, y + 10, x + shot.width + 4, y + h + 10], 22, fill=(180, 120, 80, 70))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(14)))
    canvas.alpha_composite(card.convert('RGBA'), (x, y))


RIGHT = {'a': right_number, 'b': right_dial, 'c': right_screen}


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else 'store/feature-1024x500.png'
    variant = (sys.argv[2] if len(sys.argv) > 2 else 'a').lower()

    base = Image.new('RGB', (W, H), CREAM)
    a, tint = glow((W, H), (900, 470), 420, (255, 150, 80))
    canvas = Image.composite(tint, base, a).convert('RGBA')

    RIGHT[variant](canvas)

    draw = ImageDraw.Draw(canvas)
    draw.text((56, 156), TITLE, font=ImageFont.truetype(FONT_BD, 74), fill=INK)
    draw.text((58, 258), SUB, font=ImageFont.truetype(FONT_RG, 36), fill=INK_SUB)

    f = ImageFont.truetype(FONT_BD, 25)
    x = 58
    for label in CHIPS:
        x0, y0, x1, y1 = draw.textbbox((0, 0), label, font=f)
        w = (x1 - x0) + 34
        draw.rounded_rectangle([x, 334, x + w, 334 + 48], 24, fill=(255, 255, 255), outline=LINE)
        draw.text((x + 17 - x0, 334 + 11 - y0), label, font=f, fill=ORANGE)
        x += w + 11

    canvas.convert('RGB').save(out, 'PNG', optimize=True)
    print(out, variant)


if __name__ == '__main__':
    main()
