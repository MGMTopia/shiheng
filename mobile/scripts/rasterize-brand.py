"""Rasterize the Shiheng SVG mark into Expo PNG icons."""
from __future__ import annotations

import re
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "assets" / "brand"
IMAGES = ROOT / "assets" / "images"

BOWL = "M18 70 C18 58 32 55 46 55 C56 55 60 64 64 69 C68 64 72 55 82 55 C96 55 110 58 110 70 C110 96 86 112 64 113 C42 112 18 96 18 70 Z"
INNER = "M61.809 66.872 C66.345 74.131 62.049 84.999 52.214 91.145 C42.378 97.291 30.727 96.388 26.191 89.128 C21.655 81.869 25.951 71.001 35.786 64.855 C45.622 58.709 57.273 59.612 61.809 66.872 Z"
LEAF = "M83.25 21.979 C83.809 32.555 78.231 44.288 64.75 54.021 C66.439 37.48 73.811 26.783 83.25 21.979 Z"
VEIN = "M80.273 27.534 Q73.946 38.893 68.1 48.219"

PALETTES = {
    "color": {"bowl": "#2E7D5B", "inner": "#A7C4A0", "leaf": "#2E7D5B", "vein": "#EBF3EA"},
    "inverse": {"bowl": "#FFFFFF", "inner": "#E8F0EA", "leaf": "#FFFFFF", "vein": "#2E7D5B"},
    "mono": {"bowl": "#1F2D26", "inner": "#1F2D26", "leaf": "#1F2D26", "vein": None},
}


def path_points(d: str, steps: int = 72) -> list[tuple[float, float]]:
    tokens = re.findall(r"[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?", d)
    i = 0
    cmd = None
    x = y = 0.0
    start = (0.0, 0.0)
    pts: list[tuple[float, float]] = []

    def take(n: int) -> list[float]:
        nonlocal i
        vals = [float(tokens[i + k]) for k in range(n)]
        i += n
        return vals

    while i < len(tokens):
        token = tokens[i]
        if token.isalpha():
            cmd = token.upper()
            i += 1
            if cmd == "Z":
                pts.append(start)
            continue
        if cmd == "M":
            x, y = take(2)
            start = (x, y)
            pts.append((x, y))
            cmd = "L"
        elif cmd == "L":
            x, y = take(2)
            pts.append((x, y))
        elif cmd == "C":
            x1, y1, x2, y2, x3, y3 = take(6)
            for step in range(1, steps + 1):
                t = step / steps
                u = 1 - t
                pts.append((
                    u**3 * x + 3 * u**2 * t * x1 + 3 * u * t**2 * x2 + t**3 * x3,
                    u**3 * y + 3 * u**2 * t * y1 + 3 * u * t**2 * y2 + t**3 * y3,
                ))
            x, y = x3, y3
        elif cmd == "Q":
            x1, y1, x2, y2 = take(4)
            for step in range(1, steps + 1):
                t = step / steps
                u = 1 - t
                pts.append((
                    u**2 * x + 2 * u * t * x1 + t**2 * x2,
                    u**2 * y + 2 * u * t * y1 + t**2 * y2,
                ))
            x, y = x2, y2
        else:
            raise ValueError(f"unsupported SVG command {cmd}")
    return pts


def transform(pts: list[tuple[float, float]], size: int, pad: float) -> list[tuple[float, float]]:
    inner = size * (1 - pad * 2)
    origin = (size - inner) / 2
    scale = inner / 128
    return [(origin + x * scale, origin + y * scale) for x, y in pts]


def draw_mark(size: int, pad: float, variant: str, background: str | None) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if background:
        image.paste(Image.new("RGBA", (size, size), background), (0, 0))
    draw = ImageDraw.Draw(image, "RGBA")
    palette = PALETTES[variant]
    scale = (size * (1 - pad * 2)) / 128
    for key, path in (("bowl", BOWL), ("inner", INNER), ("leaf", LEAF)):
        draw.polygon(transform(path_points(path), size, pad), fill=palette[key])
    if palette["vein"]:
        draw.line(
            transform(path_points(VEIN, steps=48), size, pad),
            fill=palette["vein"],
            width=max(2, round(1.7 * scale)),
            joint="curve",
        )
    return image


def save(image: Image.Image, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    image.save(dest, "PNG")
    print(dest.relative_to(ROOT).as_posix())


def main() -> None:
    save(draw_mark(1024, 0.16, "color", "#F5EEDC"), IMAGES / "icon.png")
    save(draw_mark(1024, 0.22, "color", None), IMAGES / "android-icon-foreground.png")
    save(Image.new("RGBA", (1024, 1024), "#F5EEDC"), IMAGES / "android-icon-background.png")
    save(draw_mark(1024, 0.22, "mono", None), IMAGES / "android-icon-monochrome.png")
    save(draw_mark(1024, 0.12, "color", None), IMAGES / "splash-icon.png")
    save(draw_mark(64, 0.14, "color", "#F5EEDC"), IMAGES / "favicon.png")
    save(draw_mark(1024, 0.16, "inverse", "#2E7D5B"), BRAND / "shiheng-icon-primary.png")
    save(draw_mark(1024, 0.16, "color", "#F5EEDC"), BRAND / "shiheng-icon-light.png")


if __name__ == "__main__":
    main()
