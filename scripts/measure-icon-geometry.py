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

WHAT IT FAILS ON
Overflow. If any painted pixel falls outside the declared viewBox the icon is being clipped
by its own box, and that is a hard error on every edge, not a warning and not bottom only.

This is the check that was missing the first time. The original version measured fill and
centring, which are both questions about where the art sits INSIDE the box, and never asked
whether the art had escaped it. Three icons shipped with their ring cut off along the bottom
and only an eye caught it.

Requires rsvg-convert and Pillow. Missing either one is also a hard error rather than a
skip, because a geometry gate that quietly does nothing is worse than no gate: it reports
success while checking nothing.
"""
import re
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit(
        'icon geometry gate cannot run: Pillow is not installed.\n'
        '  Install it (apt: python3-pil, or pip install --user Pillow).\n'
        '  This is a failure rather than a skip on purpose. A geometry gate that quietly\n'
        '  does nothing reports success while checking nothing, which is how the clipping\n'
        '  it exists to catch reached a review in the first place.'
    )

REPO = Path(__file__).resolve().parent.parent
RENDER = 1600

# The margin every icon's box carries beyond its ink, as a fraction of the box side.
#
# It is NOT slack and it is NOT a magic number. A renderer antialiases the outermost edge of
# a stroke across the final pixel, so art sitting exactly on the boundary loses a sliver of
# that edge and a round shape reads as flattened. This is a hair over one pixel at 256, the
# largest size shipped as a raster, and it is part of the contract: the crop step adds it and
# this gate allows for it. Do not tune it to zero to make a number look rounder.
AA_MARGIN = 0.004

# How far past the viewBox counts as overflow. Expressed in fractions of the box side so it
# is resolution independent, and set just above the measurement's own precision at RENDER.
OVERFLOW_TOLERANCE = 0.0015


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
        try:
            subprocess.run(
                ['rsvg-convert', '-w', str(RENDER), '-h', str(RENDER), '-o', str(out), str(src)],
                check=True, capture_output=True,
            )
        except FileNotFoundError:
            raise SystemExit(
                'icon geometry gate cannot run: rsvg-convert is not installed.\n'
                '  Install it (apt: librsvg2-bin).\n'
                '  This is a failure rather than a skip on purpose. A geometry gate that\n'
                '  quietly does nothing reports success while checking nothing.'
            )
        im = Image.open(out).convert('RGBA')
        box = im.getchannel('A').getbbox()
        if box is None:
            raise SystemExit(f'{path}: nothing painted')
        w, h = im.size

    left, upper, right, lower = box
    return (bx + left * bw / w, by + upper * bh / h, bx + right * bw / w, by + lower * bh / h)


EDGES = ('left', 'right', 'top', 'bottom')


def main(paths):
    print(f"{'icon':<20} {'fill%':>7}  {'L%':>6} {'R%':>6} {'T%':>6} {'B%':>6}   content")
    worst_off = 0.0
    overflows = []

    for p in paths:
        text = Path(p).read_text()
        vx, vy, vw, vh = read_viewbox(text)
        minx, miny, maxx, maxy = ink_bounds(p)
        cw, ch = maxx - minx, maxy - miny
        fill = max(cw / vw, ch / vh) * 100
        l, r = (minx - vx) / vw * 100, (vx + vw - maxx) / vw * 100
        t, b = (miny - vy) / vh * 100, (vy + vh - maxy) / vh * 100
        worst_off = max(worst_off, abs(l - r), abs(t - b))

        # How far the ink escapes the box on each edge, in user units. Positive means the
        # renderer is cutting the art off. Every edge is checked, not just the one that
        # happened to fail last time: a refitted path can bow outward anywhere.
        over = {
            'left': vx - minx,
            'right': maxx - (vx + vw),
            'top': vy - miny,
            'bottom': maxy - (vy + vh),
        }
        limit = max(vw, vh) * OVERFLOW_TOLERANCE
        for edge in EDGES:
            if over[edge] > limit:
                overflows.append((Path(p).name, edge, over[edge]))

        print(f'{Path(p).stem:<20} {fill:>7.1f}  {l:>6.1f} {r:>6.1f} {t:>6.1f} {b:>6.1f}   {cw:.2f} x {ch:.2f}')

    print(f'\nworst centring error: {worst_off:.2f} percent')

    if not overflows:
        print(f'no overflow: every icon sits inside its own viewBox '
              f'(margin allowed for antialiasing: {AA_MARGIN * 100:.1f} percent per side)')
        return

    print(f'\nFAIL: {len(overflows)} edge(s) where the art escapes its own viewBox and is '
          f'being clipped.\n')
    for name, edge, amount in overflows:
        print(f'  {name} overflows the {edge} edge by {amount:.3f} units')

    print("""
The viewBox is the window the renderer draws through, so ink outside it is not merely
untidy: it is cut off. On a stroked outline that reads as a flat chord across a curve, which
is subtle enough to survive review and get noticed later by eye.

THE USUAL CAUSE IS AN ORDERING MISTAKE, NOT A BAD NUMBER.
If the art was refitted after the box was computed, the box is stale. A curve fitted through
a set of points bows outside the straight chords it replaces, so a path converted from
segments to curves grows slightly even though every original point is still on it. Cropping
first and refitting second therefore produces a box that was correct for art that no longer
exists.

  Measure the bounds AFTER every path transform. Crop last.

If the ordering is already right, the bounds themselves are wrong: check that the
measurement accounts for stroke width, line caps and joins, since a stroke paints half its
width beyond its own path and a bound taken from path coordinates will always sit inside the
real ink.

Do not fix this by widening the tolerance. It exists only to absorb the antialiasing margin
the crop deliberately adds (AA_MARGIN, one pixel at the largest raster size), and tuning it
up to pass turns a real clip into a silent one.
""")
    sys.exit(1)


if __name__ == '__main__':
    args = sys.argv[1:]
    main(args if args else sorted(str(p) for p in (REPO / 'logos' / 'app-icons').glob('*.svg')))
