# -*- coding: utf-8 -*-
"""Play 그래픽 이미지(1024x500) — 스토어 상단에 걸리는 한 장.

python scripts/store_feature.py <출력png>

마스코트는 public/promo-bg.png 에서 오려 쓴다.
icon-512.png(보라·분홍 PWA 아이콘)는 앱 런처 아이콘과도, 앱 안 로고와도 달라서 쓰지 않는다.

오려낸 조각에는 크림색 배경이 함께 딸려온다 → 캔버스도 같은 크림으로 깔고
가장자리를 흐려서 이어 붙인다. 투명 배경을 억지로 따내면 테두리에 후광이 남는다.
"""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1024, 500
CREAM = (255, 252, 248)      # promo-bg 위쪽과 같은 색 — 이어 붙이려면 같아야 한다
INK      = (26, 18, 8)
INK_SUB  = (150, 92, 48)
ORANGE   = (216, 83, 27)

MASCOT_BOX = (150, 575, 605, 1125)   # promo-bg(752x1344) 안의 마스코트 자리

FONT_BD = r'C:\Windows\Fonts\malgunbd.ttf'
FONT_RG = r'C:\Windows\Fonts\malgun.ttf'


def mascot(height):
    """크림 배경째 오려서 가장자리를 흐린 조각"""
    src = Image.open('public/promo-bg.png').convert('RGB').crop(MASCOT_BOX)
    w = round(src.width * height / src.height)
    src = src.resize((w, height), Image.LANCZOS)

    pad = 26
    mask = Image.new('L', src.size, 0)
    ImageDraw.Draw(mask).rectangle([pad, pad, src.width - pad, src.height - pad], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(pad * 0.7))

    out = src.convert('RGBA')
    out.putalpha(mask)
    return out


def glow(size, center, radius, color, strength=70):
    """오른쪽 아래 은은한 주황 — 평평한 크림만 있으면 심심하다"""
    layer = Image.new('L', size, 0)
    d = ImageDraw.Draw(layer)
    d.ellipse([center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius],
              fill=strength)
    layer = layer.filter(ImageFilter.GaussianBlur(radius * 0.5))
    tint = Image.new('RGB', size, color)
    return layer, tint


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else 'store/feature-1024x500.png'

    canvas = Image.new('RGB', (W, H), CREAM)
    a, tint = glow((W, H), (900, 470), 420, (255, 150, 80))
    canvas = Image.composite(tint, canvas, a)

    m = mascot(392)
    canvas.paste(m, (W - m.width - 40, (H - m.height) // 2), m)

    draw = ImageDraw.Draw(canvas)
    draw.text((72, 146), '매시 59분, 오구!', font=ImageFont.truetype(FONT_BD, 82), fill=INK)
    draw.text((74, 258), '시간 가는 줄 모르는 당신에게', font=ImageFont.truetype(FONT_RG, 38), fill=INK_SUB)

    # 무엇으로 그걸 하는지 — 세 단어면 충분하다
    f = ImageFont.truetype(FONT_BD, 25)
    x = 74
    for label in ('자동 기록', '오구 지수', 'AI 질문'):
        x0, y0, x1, y1 = draw.textbbox((0, 0), label, font=f)
        w = (x1 - x0) + 34
        draw.rounded_rectangle([x, 330, x + w, 330 + 48], 24, fill=(255, 255, 255))
        draw.text((x + 17 - x0, 330 + 11 - y0), label, font=f, fill=ORANGE)
        x += w + 11

    canvas.save(out, 'PNG', optimize=True)
    print(out, canvas.size)


if __name__ == '__main__':
    main()
