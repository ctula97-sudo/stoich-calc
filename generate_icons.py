"""Generate PWA icons (192/512) for the stoich calculator."""
import pathlib
import subprocess

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).parent
font_path = subprocess.check_output(["fc-match", "-f", "%{file}", "NanumGothic:style=Bold"]).decode().strip()

for size in (192, 512):
    img = Image.new("RGBA", (size, size), "#101827")
    draw = ImageDraw.Draw(img)
    pad = int(size * 0.08)
    draw.rounded_rectangle([pad, pad, size - pad, size - pad], radius=int(size * 0.18),
                           outline="#2f80ed", width=max(3, size // 32))
    font = ImageFont.truetype(font_path, int(size * 0.44))
    text = "화"
    box = draw.multiline_textbbox((0, 0), text, font=font, spacing=0)
    draw.multiline_text(((size - box[2]) / 2 - box[0], (size - box[3]) / 2 - box[1] - size * 0.06),
                        text, font=font, fill="#e8eef8", align="center")
    small = ImageFont.truetype(font_path, int(size * 0.13))
    label = "0.0001 g"
    lb = draw.textbbox((0, 0), label, font=small)
    draw.text(((size - lb[2]) / 2, size * 0.72), label, font=small, fill="#9be2a8")
    out = ROOT / f"icon-{size}.png"
    img.convert("RGB").save(out, "PNG")
    print(f"wrote {out}")