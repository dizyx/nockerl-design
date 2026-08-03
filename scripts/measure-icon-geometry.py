#!/usr/bin/env python3
"""
Measure how much of its own canvas each app icon actually fills, and how centred it is.

    python3 scripts/measure-icon-geometry.py                 # every icon
    python3 scripts/measure-icon-geometry.py logos/app-icons/voice.svg

WHY THIS EXISTS
The icons once under-filled their declared viewBox by 30 to 38 percent, each by a
different amount, so the same nominal icon rendered at visibly different sizes depending
on the product. Two consumers had to hand-correct the geometry before they could ship it.
Nothing catches that automatically, because it is a question about art rather than code,
so this makes the answer one command instead of an afternoon.

WHY IT RASTERISES INSTEAD OF READING COORDINATES
A stroked path paints half its stroke width beyond its own geometry, round caps extend
further still, and these files carry strokes, caps and elliptical arcs. A bound taken from
path coordinates is therefore wrong, and wrong in the direction that silently clips art.
Rendering and measuring painted pixels is the only reading that matches what a user sees.

The render deliberately uses a viewBox larger than the declared one, so anything painted
outside the declared box is visible to the measurement rather than being cropped away by
the very box under test.

Reads clean output: fill near 100 on the long axis, and L matching R and T matching B.

Requires rsvg-convert and Pillow. Not wired into the harness for that reason; run it when
touching icon geometry.
"""
import re
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit('needs Pillow: pip install --user Pillow')

REPO = Path(__file__).resolve().parent.parent
RENDER = 1600


def read_viewbox(text):
    m = re.search(r'viewBox="([-\d.eE]+)\s+([-\d.eE]+)\s+([-\d.eE]+)\s+([-\d.eE]+)"', text)
    if not m:
        raise SystemExit('no viewBox')
    return [float(g) for g in m.groups()]


def ink_bounds(path):
    """(minx, miny, maxx, maxy) of painted pixels, in the file's own user units."""
    text = Path(path).read_text()
    vx, vy, vw, vh = read_viewbox(text)
    bx, by, bw, bh = vx - vw * 0.5, vy - vh * 0.5, vw * 2, vh * 2
    padded = re.sub(r'viewBox="[^"]*"', f'viewBox="{bx} {by} {bw} {bh}"', text, count=1)
    padded = re.sub(r'\s(width|height)="[^"]*"', '', padded, count=2)

    with tempfile.TemporaryDirectory() as td:
        src, out = Path(td) / 'in.svg', Path(td) / 'out.png'
        src.write_text(padded)
        subprocess.run(
            ['rsvg-convert', '-w', str(RENDER), '-h', str(RENDER), '-o', str(out), str(src)],
            check=True, capture_output=True,
        )
        im = Image.open(out).convert('RGBA')
        box = im.getchannel('A').getbbox()
        if box is None:
            raise SystemExit(f'{path}: nothing painted')
        w, h = im.size

    left, upper, right, lower = box
    return (bx + left * bw / w, by + upper * bh / h, bx + right * bw / w, by + lower * bh / h)


def main(paths):
    print(f"{'icon':<20} {'fill%':>7}  {'L%':>6} {'R%':>6} {'T%':>6} {'B%':>6}   content")
    worst_off = 0.0
    for p in paths:
        text = Path(p).read_text()
        vx, vy, vw, vh = read_viewbox(text)
        minx, miny, maxx, maxy = ink_bounds(p)
        cw, ch = maxx - minx, maxy - miny
        fill = max(cw / vw, ch / vh) * 100
        l, r = (minx - vx) / vw * 100, (vx + vw - maxx) / vw * 100
        t, b = (miny - vy) / vh * 100, (vy + vh - maxy) / vh * 100
        worst_off = max(worst_off, abs(l - r), abs(t - b))
        print(f'{Path(p).stem:<20} {fill:>7.1f}  {l:>6.1f} {r:>6.1f} {t:>6.1f} {b:>6.1f}   {cw:.2f} x {ch:.2f}')
    print(f'\nworst centring error: {worst_off:.2f} percent')


if __name__ == '__main__':
    args = sys.argv[1:]
    main(args if args else sorted(str(p) for p in (REPO / 'logos' / 'app-icons').glob('*.svg')))
