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


def render(svg, px, name):
    tmp = f'/tmp/_favicon_{px}_{name}.svg'
    open(tmp, 'w').write(svg)
    subprocess.run(
        ['rsvg-convert', '-w', str(px), '-h', str(px), tmp, '-o', os.path.join(OUT, name)],
        check=True, capture_output=True,
    )
    os.unlink(tmp)


def main(product='design'):
    view_box, light = read(product, None)
    _, dark = read(product, 'on-dark')

    # The adaptive SVG favicon. Both cuts ship; the media query picks one.
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" width="512" height="512" '
        f'role="img" aria-label="Nockerl Design">\n'
        f'  <title>Nockerl Design</title>\n'
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
    open(os.path.join(OUT, 'favicon.svg'), 'w').write(svg)

    # The raster fallbacks, from the light cut so they read on a light surface.
    bare = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" '
        f'role="img" aria-label="Nockerl Design">{light}</svg>'
    )
    for px in (16, 32):
        render(bare, px, f'favicon-{px}.png')

    # The home screen tile, on the plate, with the app icon geometry.
    px = 180
    pad = px * 0.10
    plate = px - 2 * pad
    radius = plate * RADIUS_RATIO
    art = plate * ART_IN_PLATE
    off = pad + (plate - art) / 2
    tile = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{px}" height="{px}" viewBox="0 0 {px} {px}">'
        f'<rect width="{px}" height="{px}" fill="{PLATE_DARK}"/>'
        f'<rect x="{pad}" y="{pad}" width="{plate}" height="{plate}" rx="{radius}" fill="{PLATE_DARK}"/>'
        f'<svg x="{off}" y="{off}" width="{art}" height="{art}" viewBox="{view_box}">{dark}</svg></svg>'
    )
    render(tile, px, 'apple-touch-icon.png')

    print(f'favicons rebuilt from {product}: favicon.svg, favicon-16.png, favicon-32.png, apple-touch-icon.png')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'design')
