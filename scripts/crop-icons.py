#!/usr/bin/env python3
"""
Re-crop each app icon to a full bleed, centred, square viewBox.

    python3 scripts/crop-icons.py            # report what would change
    python3 scripts/crop-icons.py --write    # apply it

THE ORDERING RULE, WHICH IS THE WHOLE REASON THIS FILE HAS A DOCSTRING
Run this LAST, after every change to the artwork, including any change that only alters the
shape of a path rather than its extent.

Cropping first and transforming second looks correct and is not. A viewBox is computed from
the ink that exists when it is computed, so any later transform can invalidate it. The way
this actually failed: a ring drawn as straight segments was refitted as curves through the
same points, which sounds like it cannot change the bounds because every original point is
still on the path. It does change them. A curve fitted through a set of points bows outside
the straight chords it replaces, so the shape grew by a fraction of a unit, three of the
four icons ended up with their ring past the bottom of a box that was correct an hour
earlier, and the renderer clipped it. It survived review and was caught by eye.

`bun run check:icons` fails on exactly that, on every edge, so the mistake cannot ship
again. This note is here because a gate tells you that something is wrong, and only the
place where the work happens can tell you why.

THE RULE IT APPLIES
A square box, centred on the content, with the longer content axis filling it. Square
because these render into square plates and favicons, so the art then centres itself
without the consumer doing anything. Full bleed because the app icon generator adds Apple's
plate margin on top, and that margin is only correct when the art underneath is not already
inset.

Bounds come from rasterising and measuring painted pixels rather than reading path
coordinates, because a stroke paints half its width beyond its own path and these files
carry strokes, round caps and elliptical arcs.
"""
import re
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit('needs Pillow (apt: python3-pil, or pip install --user Pillow)')

REPO = Path(__file__).resolve().parent.parent
ICONS = REPO / 'logos' / 'app-icons'
PRODUCTS = ['design', 'ctxms', 'nockerl', 'security', 'voice']
RENDER = 2400

# Kept in step with the same constant in measure-icon-geometry.py, which allows for it.
# A renderer antialiases the outermost edge of a stroke across the final pixel, so art
# sitting exactly on the boundary loses a sliver and a round shape reads as flattened.
AA_MARGIN = 0.004

# Rasterising to find the ink is exact to within a pixel of the render, so two runs of this
# script disagree in the fourth decimal. Without a floor on what counts as a change the tool
# would rewrite the files every time it ran, and the box would wander a little further on
# each pass. A change smaller than this is measurement noise, not a new answer.
NOOP_UNITS = 0.10


def read_viewbox(text):
    m = re.search(r'viewBox="([-\d.eE]+)\s+([-\d.eE]+)\s+([-\d.eE]+)\s+([-\d.eE]+)"', text)
    if not m:
        raise SystemExit('no viewBox')
    return [float(g) for g in m.groups()]


def ink_bounds(text):
    vx, vy, vw, vh = read_viewbox(text)
    bx, by, bw, bh = vx - vw * 0.5, vy - vh * 0.5, vw * 2, vh * 2
    padded = re.sub(r'viewBox="[^"]*"', f'viewBox="{bx} {by} {bw} {bh}"', text, count=1)
    padded = re.sub(r'\s(width|height)="[^"]*"', '', padded, count=2)
    with tempfile.TemporaryDirectory() as td:
        src, out = Path(td) / 'in.svg', Path(td) / 'out.png'
        src.write_text(padded)
        subprocess.run(['rsvg-convert', '-w', str(RENDER), '-h', str(RENDER), '-o', str(out), str(src)],
                       check=True, capture_output=True)
        im = Image.open(out).convert('RGBA')
        box = im.getchannel('A').getbbox()
        if box is None:
            raise SystemExit('nothing painted')
        w, h = im.size
    l, u, r, d = box
    return bx + l * bw / w, by + u * bh / h, bx + r * bw / w, by + d * bh / h


def main(write):
    for p in PRODUCTS:
        light = ICONS / f'{p}.svg'
        minx, miny, maxx, maxy = ink_bounds(light.read_text())
        side = max(maxx - minx, maxy - miny) * (1 + 2 * AA_MARGIN)
        cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
        box = f'{cx - side / 2:.4f} {cy - side / 2:.4f} {side:.4f} {side:.4f}'

        cur = read_viewbox(light.read_text())
        new = [cx - side / 2, cy - side / 2, side, side]
        drift = max(abs(a - b) for a, b in zip(cur, new))
        changed = drift > NOOP_UNITS
        print(f'{p:<10} {"UPDATE" if changed else "same  "}  {box}   (drift {drift:.3f})')

        if write and changed:
            # Both colour cuts share one geometry, so they must share one box.
            for f in (ICONS / f'{p}.svg', ICONS / f'{p}-on-dark.svg'):
                f.write_text(re.sub(r'viewBox="[^"]*"', f'viewBox="{box}"', f.read_text(), count=1))

    if not write:
        print('\nreport only. pass --write to apply, then run: bun run check:icons')


if __name__ == '__main__':
    main('--write' in sys.argv)
