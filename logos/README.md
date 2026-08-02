# Brand marks and app icons

SVG is the canonical source for everything here. Raster exports are generated at build
time, never hand-kept.

## The parent mark

| File | Use on |
|------|--------|
| `nockerl-mark.svg` | light surfaces |
| `nockerl-mark-on-dark.svg` | dark surfaces |

The mark is three overlapping peaks painted in three distinct grayscale shades. That shade
difference is what gives it its layered read, so a single flat fill is incorrect. The mark
is never tinted with the brand accent: cyan belongs to the wordmark, not to the peaks.

Pick the file that matches the surface underneath rather than recolouring either one. Keep
clear space of at least half the mark's height on every side, and avoid rendering below
16px, where the three shades stop resolving.

## App icons

Each product has an icon in `app-icons/`, in a light and a dark variant.

| Product | Light | Dark |
|---------|-------|------|
| Nockerl (parent) | `app-icons/nockerl.svg` | `app-icons/nockerl-on-dark.svg` |
| Voice | `app-icons/voice.svg` | `app-icons/voice-on-dark.svg` |
| Design | `app-icons/design.svg` | `app-icons/design-on-dark.svg` |
| CtxMS | `app-icons/ctxms.svg` | `app-icons/ctxms-on-dark.svg` |
| Security | `app-icons/security.svg` | `app-icons/security-on-dark.svg` |

### How the system works

Every app icon is one object drawn in the centre, then wrapped by two borders that trace
the whole assembled shape as continuous lines. The borders are true geometric offsets
computed from a distance field, not scaled copies, so they behave the way a real border
does: convex corners push outward, concave notches fill in, and detail is lost as the
border moves away. The near border is cyan. The outer border is full ink.

The three layers carry the same ink ladder the parent mark uses. The centre glyph sits at
the `mid` tone so the detail recedes, and the outer border sits at `hi` so the silhouette
stays crisp against a busy background. Contrast is spent on the outside edge, which is the
part still doing work at 16px.

The parent mark deliberately does not use this treatment. It keeps its solid three-shade
peaks and takes cyan only as the ground the peaks stand on, so it reads as the brand rather
than as another product in the tray.

### Adding an icon for a new product

The glyph has to be a single connected silhouette, or parts far enough apart that they
never collide once the border wraps them. Shapes built from several stacked pieces swell
into each other at the outer ring and turn into an unreadable blob.

Ring spacing and glyph detail have to be chosen together. A notch deeper than the offset
survives; a shallower one fills in. That means a new icon needs tuning rather than dropping
a shape into a template.
