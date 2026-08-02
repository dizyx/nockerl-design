#!/usr/bin/env python3
"""
Build a macOS .appiconset from a product's icon SVG.

macOS does not mask app icons the way iOS does, so the rounded plate has to be
drawn into the artwork itself, with Apple's margin. Each size is rendered from
the vector rather than resampled from one big PNG, so small sizes stay crisp.
"""
import json, os, subprocess, sys

REPO = '/home/mclenithan/dizyx/projects/nockerl-design/repos/nockerl-design'
PLATE_DARK = '#15171a'

# macOS wants both scales of each point size.
SIZES = [(16,1),(16,2),(32,1),(32,2),(128,1),(128,2),(256,1),(256,2),(512,1),(512,2)]

def build(product, out_dir, plate=PLATE_DARK, variant='on-dark'):
    src = os.path.join(REPO, 'logos', 'app-icons',
                       f'{product}-{variant}.svg' if variant else f'{product}.svg')
    if not os.path.exists(src):
        sys.exit(f'missing {src}')
    art = open(src).read()
    inner = art.split('>', 1)[1].rsplit('</svg>', 1)[0]      # strip the outer svg tag
    os.makedirs(out_dir, exist_ok=True)

    images = []
    for pt, scale in SIZES:
        px = pt * scale
        # Apple's macOS grid: art sits inside ~80% of the canvas, plate corner
        # radius is about 22% of the plate edge.
        pad = px * 0.10
        plate_px = px - 2 * pad
        radius = plate_px * 0.2237
        # the source art uses a -6 -6 108 108 viewBox
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{px}" height="{px}" '
               f'viewBox="0 0 {px} {px}">'
               f'<rect x="{pad}" y="{pad}" width="{plate_px}" height="{plate_px}" '
               f'rx="{radius}" fill="{plate}"/>'
               f'<svg x="{pad}" y="{pad}" width="{plate_px}" height="{plate_px}" '
               f'viewBox="-6 -6 108 108">{inner}</svg></svg>')
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
