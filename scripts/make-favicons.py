#!/usr/bin/env python3
"""
Build the docs site's favicon set from the Nockerl Design product icon.

The site is the documentation for one product, so it leads with that product's icon
rather than the parent mark. A favicon has to be a standalone file at a fixed URL, so it
cannot import the source the way a component does. Generating it here instead of copying
it by hand keeps the provenance explicit and makes a refresh one command.

    python3 scripts/make-favicons.py

Outputs, and why each is what it is:

  favicon.svg          Both colour cuts in one file, switched by prefers-color-scheme, so
                       the mark stays legible on a light and a dark tab bar. This is the
                       favicon modern browsers actually use.
  favicon-16.png       The LIGHT cut (dark ink). A raster cannot adapt, and the places a
  favicon-32.png       PNG fallback still shows up (bookmark lists, history, older
                       browsers) are predominantly light.
  apple-touch-icon.png The plate treatment, because iOS composites a home screen icon onto
                       an opaque tile and a transparent one reads as broken. This is the
                       app icon case, so it uses the app icon geometry.
"""
import os
import re
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(REPO, 'logos', 'app-icons')
OUT = os.path.join(REPO, 'site', 'public')
PLATE_DARK = '#15171a'

# Shared with make-appiconset.py: Apple's plate margin and corner radius, and the largest
# centred square that fits inside that rounded plate.
RADIUS_RATIO = 0.2237
ART_IN_PLATE = 1 - 2 * RADIUS_RATIO * (1 - 2 ** -0.5)


def read(product, variant):
    path = os.path.join(ICONS, f'{product}-{variant}.svg' if variant else f'{product}.svg')
    if not os.path.exists(path):
        sys.exit(f'missing {path}')
    text = open(path).read()
    vb = re.search(r'viewBox="([^"]+)"', text)
    if not vb:
        sys.exit(f'{path}: no viewBox')
    return vb.group(1), text.split('>', 1)[1].rsplit('</svg>', 1)[0]


def render(svg, px, name, out_dir):
    tmp = f'/tmp/_favicon_{px}_{name}.svg'
    open(tmp, 'w').write(svg)
    os.makedirs(out_dir, exist_ok=True)
    subprocess.run(
        ['rsvg-convert', '-w', str(px), '-h', str(px), tmp, '-o', os.path.join(out_dir, name)],
        check=True, capture_output=True,
    )
    os.unlink(tmp)


PRODUCTS = ['design', 'ctxms', 'nockerl', 'security', 'voice']
LABEL = {'design': 'Design', 'ctxms': 'CtxMS', 'nockerl': 'Nockerl',
         'security': 'Security', 'voice': 'Voice'}
FAV = os.path.join(REPO, 'logos', 'favicons')
# The sizes the existing set already used. Bare art, no plate, both colour cuts.
RASTER_SIZES = (16, 32, 48, 180)


def adaptive_svg(view_box, light, dark, name):
    """One file that carries both cuts and lets the browser pick. What modern browsers use."""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" width="512" height="512" '
        f'role="img" aria-label="{name}">\n'
        f'  <title>{name}</title>\n'
        f'  <style>\n'
        f'    .nk-fav--dark {{ display: none; }}\n'
        f'    @media (prefers-color-scheme: dark) {{\n'
        f'      .nk-fav--light {{ display: none; }}\n'
        f'      .nk-fav--dark {{ display: inline; }}\n'
        f'    }}\n'
        f'  </style>\n'
        f'  <g class="nk-fav--light">{light}</g>\n'
        f'  <g class="nk-fav--dark">{dark}</g>\n'
        f'</svg>\n'
    )


def bare(view_box, inner, name):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" '
            f'role="img" aria-label="{name}">{inner}</svg>')


def tile(view_box, dark, px=180):
    """The home screen tile: opaque, because iOS composites onto a solid square anyway."""
    pad = px * 0.10
    plate = px - 2 * pad
    art = plate * ART_IN_PLATE
    off = pad + (plate - art) / 2
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{px}" height="{px}" viewBox="0 0 {px} {px}">'
        f'<rect width="{px}" height="{px}" fill="{PLATE_DARK}"/>'
        f'<rect x="{pad}" y="{pad}" width="{plate}" height="{plate}" rx="{plate * RADIUS_RATIO}" '
        f'fill="{PLATE_DARK}"/>'
        f'<svg x="{off}" y="{off}" width="{art}" height="{art}" viewBox="{view_box}">{dark}</svg></svg>'
    )


def main(_=None):
    # Every product gets a set, in the flat naming the directory already used, so nothing
    # has to learn a second layout. The adaptive SVG per product is new.
    for product in PRODUCTS:
        view_box, light = read(product, None)
        _, dark = read(product, 'on-dark')
        name = LABEL[product] if product == 'nockerl' else f'Nockerl {LABEL[product]}'

        open(os.path.join(FAV, f'{product}.svg'), 'w').write(adaptive_svg(view_box, light, dark, name))
        for cut, inner in (('light', light), ('dark', dark)):
            for px in RASTER_SIZES:
                render(bare(view_box, inner, name), px, f'{product}-{cut}-{px}.png', FAV)
        print(f'  {product}')

    # The docs site documents ONE product, so it serves that product's set. The raster
    # fallbacks take the light cut: a raster cannot adapt, and the surfaces that still show
    # one (bookmark lists, history, older browsers) are predominantly light.
    view_box, light = read('design', None)
    _, dark = read('design', 'on-dark')
    open(os.path.join(OUT, 'favicon.svg'), 'w').write(
        adaptive_svg(view_box, light, dark, 'Nockerl Design'))
    for px in (16, 32):
        render(bare(view_box, light, 'Nockerl Design'), px, f'favicon-{px}.png', OUT)
    render(tile(view_box, dark), 180, 'apple-touch-icon.png', OUT)
    print(f'design wired into {os.path.relpath(OUT, REPO)}')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'design')
