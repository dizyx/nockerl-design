#!/usr/bin/env python3
"""
Build a macOS .appiconset from a product's icon SVG.

macOS does not mask app icons the way iOS does, so the rounded plate has to be
drawn into the artwork itself, with Apple's margin. Each size is rendered from
the vector rather than resampled from one big PNG, so small sizes stay crisp.
"""
import json, os, re, subprocess, sys

# Derived from this file's location rather than hardcoded, so the script always reads the
# icons of the checkout it is run from. A fixed path silently regenerated from a different
# working copy, which is the worst kind of wrong: it succeeds and produces stale art.
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLATE_DARK = '#15171a'

# Plate corner radius as a fraction of the plate edge, matching Apple's macOS plate.
RADIUS_RATIO = 0.2237
# Largest centred square that fits inside that rounded plate without its corners crossing
# the corner arcs: side = S - 2R(1 - 1/sqrt(2)). Worked out once here rather than guessed,
# because the art is full bleed and therefore genuinely reaches its own corners.
ART_IN_PLATE = 1 - 2 * RADIUS_RATIO * (1 - 2 ** -0.5)

# macOS wants both scales of each point size.
SIZES = [(16,1),(16,2),(32,1),(32,2),(128,1),(128,2),(256,1),(256,2),(512,1),(512,2)]

def build(product, out_dir, plate=PLATE_DARK, variant='on-dark'):
    src = os.path.join(REPO, 'logos', 'app-icons',
                       f'{product}-{variant}.svg' if variant else f'{product}.svg')
    if not os.path.exists(src):
        sys.exit(f'missing {src}')
    art = open(src).read()
    inner = art.split('>', 1)[1].rsplit('</svg>', 1)[0]      # strip the outer svg tag

    # Carry the source's OWN viewBox through. This used to be hardcoded to one product's
    # box, which meant any icon authored on a different box was cropped to the wrong window
    # without anything reporting it.
    vb = re.search(r'viewBox="([^"]+)"', art)
    if not vb:
        sys.exit(f'{src}: no viewBox to place the art with')
    view_box = vb.group(1)

    os.makedirs(out_dir, exist_ok=True)

    images = []
    for pt, scale in SIZES:
        px = pt * scale
        # Apple's macOS grid: art sits inside ~80% of the canvas, plate corner
        # radius is about 22% of the plate edge. That 10% margin is a platform
        # requirement and stays. It is correct ONLY because the source art is now
        # full bleed; when the art carried its own 20 to 25% inset the two stacked
        # and the icon rendered far too small inside its plate.
        pad = px * 0.10
        plate_px = px - 2 * pad
        radius = plate_px * RADIUS_RATIO

        # The plate is a ROUNDED square but the art arrives as a full-bleed SQUARE, so art
        # sized to the plate exactly would push its corners out through the corner arcs.
        # Largest centred square that stays inside a rounded square: its corner must reach
        # no further than the corner arc, which gives side = S - 2R(1 - 1/sqrt(2)).
        art_px = plate_px * ART_IN_PLATE
        art_off = pad + (plate_px - art_px) / 2

        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{px}" height="{px}" '
               f'viewBox="0 0 {px} {px}">'
               f'<rect x="{pad}" y="{pad}" width="{plate_px}" height="{plate_px}" '
               f'rx="{radius}" fill="{plate}"/>'
               f'<svg x="{art_off}" y="{art_off}" width="{art_px}" height="{art_px}" '
               f'viewBox="{view_box}">{inner}</svg></svg>')
        tmp = f'/tmp/_icon_{product}_{px}.svg'
        open(tmp, 'w').write(svg)
        name = f'icon_{pt}x{pt}{"" if scale==1 else "@2x"}.png'
        subprocess.run(['rsvg-convert', '-w', str(px), '-h', str(px), tmp,
                        '-o', os.path.join(out_dir, name)], check=True, capture_output=True)
        os.unlink(tmp)
        images.append({'size': f'{pt}x{pt}', 'idiom': 'mac',
                       'filename': name, 'scale': f'{scale}x'})

    json.dump({'images': images, 'info': {'version': 1, 'author': 'nockerl-design'}},
              open(os.path.join(out_dir, 'Contents.json'), 'w'), indent=2)
    return images

if __name__ == '__main__':
    product = sys.argv[1] if len(sys.argv) > 1 else 'voice'
    out = sys.argv[2] if len(sys.argv) > 2 else f'/home/mclenithan/{product}-AppIcon.appiconset'
    imgs = build(product, out)
    print(f'{product}: {len(imgs)} images + Contents.json -> {out}')
    for f in sorted(os.listdir(out)):
        p = os.path.join(out, f)
        print(f'   {f:26} {os.path.getsize(p):>7} bytes')
