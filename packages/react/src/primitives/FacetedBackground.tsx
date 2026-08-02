/**
 * NockerlFacetedBackground: the Tier-1 SIGNATURE SURFACE primitive. ONE home for the
 * canonical low-poly facet mesh, the diagonal tone-wave, the token-only color
 * contract, and the prefers-reduced-motion freeze, so a future signature change
 * is ONE edit, not many. Composes ONLY tokens.
 *
 * The faceted / low-poly geometric field is the Nockerl signature look. It is a
 * single CODIFIED standard, NOT user-configurable: there are no intensity /
 * density / speed knobs and no surface variants. Every visual parameter below is
 * a frozen CONSTANT pulled 1:1 from the two shipped native implementations:
 *   • Android (canonical truth): chat/ui/ChatFeedBackground.kt  (Compose Canvas)
 *   • Voice   (Swift port):      UI/FacetBackground.swift        (SwiftUI Canvas)
 *
 * It is an on-brand TRIANGLE mesh (the Nockerl mark is a triangle): a jittered
 * triangulation whose facet luminance drifts in a slow diagonal tone-wave (~18s)
 * so the field is gently alive ("active, not busy").
 *
 * CHANGING THE LOOK IS A ONE-PLACE DESIGN-SYSTEM CHANGE. The constants here are
 * the web mirror of FACET_CELL_SIZE / WAVE_* / EDGE_* in the native sources. To
 * evolve the signature, you edit the tokens (color) or these native constants in
 * lock-step across all three platforms, never per-instance. No app embeds its
 * own copy of these values; the field looks identical everywhere by construction.
 *
 * Design laws encoded here (do not re-derive in a demo):
 *   • The fill is STATIC. We NEVER tween between two fills/gradients (law 5). The
 *     animation only re-tints existing facets via a cheap per-frame phase
 *     (luminance shift), exactly like Compose drawPath / SwiftUI Canvas.
 *   • Tonal, not glowing: per-channel luminance add keeps facets neutral; no
 *     glow, no colored shadow, no neon (law 1).
 *   • prefers-reduced-motion: auto-freezes to a single composed static frame
 *     (law 6 / a11y). Reduced-motion is observed live; no user toggle.
 *
 * TOKEN-ONLY COLOR (docs/demo-token-contract.md): the canvas reads the LIVE
 * computed values of --color-surface-facet-base (the facet ground) and --color-canvas-edge
 * (hairline) via getComputedStyle, so it themes: light & dark both look right,
 * and a token edit re-renders the surface. No hardcoded hex / px / font anywhere;
 * literals remain only for pure mesh geometry (the native cell/jitter/amplitude
 * constants and the canvas math).
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */
import { forwardRef, useCallback, useEffect, useRef } from 'react';
import type { HTMLAttributes } from 'react';
import type { ComposeContract } from '../compose-contract';

export interface NockerlFacetedBackgroundProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * When true, freezes to a single composed static frame
   * (prefers-reduced-motion). Resolved by the consumer; not a user-facing control.
   */
  reduced?: boolean;
  /**
   * BARE mode: render just the full-bleed facet field with NO surface chrome (no border,
   * radius, shadow, or 16:9 aspect). Use it for a full-bleed app-shell / stage background. The
   * default is the bordered card-radius signature surface. The MESH + tone-wave are identical
   * either way (one implementation); `bare` only drops the chrome. Positioned `absolute inset:0`,
   * so the parent must be positioned.
   */
  bare?: boolean;
  /** Children render ON the surface (proving legibility over the live mesh). */
  children?: React.ReactNode;
}

// ─── CANONICAL native parameters, the ONE true look (frozen, not tunable) ─────
// These are the web mirror of the constants in ChatFeedBackground.kt /
// FacetBackground.swift. They describe the signature field's geometry + motion
// and are identical across all shipped platforms. Editing the look means editing
// these in lock-step everywhere. There is deliberately no runtime control.
const CELL_PX = 128; // FACET_CELL_SIZE = 128.dp (Android canonical; Swift port: 130)
const JITTER_FRACTION = 0.34; // point stray as a fraction of the cell
const AMPLITUDE = 0.05; // WAVE_AMPLITUDE: peak tone-wave luminance swing
const STATIC_JITTER = 0.022; // baked per-facet tonal grain (STATIC_FACET_JITTER)
const PERIOD_MS = 18_000; // WAVE_PERIOD_MILLIS is one full diagonal wave cycle
const EDGE_WIDTH = 0.75; // facet edge hairline width (device px)
const EDGE_ALPHA = 0.05; // barely-there facet hairline (Android canonical)
const TWO_PI = Math.PI * 2;

// ─── Deterministic hash jitter: jitter01(x,y) from the native source ──────────
// A stable per-grid-point pseudo-random in [0,1). Stable so the mesh never
// re-rolls / shimmers (the native code calls this out explicitly).
function jitter01(x: number, y: number): number {
  let h = Math.imul(x, 374_761_393) + Math.imul(y, 668_265_263);
  h = Math.imul(h ^ (h >>> 13), 1_274_126_177);
  h = h ^ (h >>> 16);
  return (h & 0xffffff) / 16_777_216;
}

interface Facet {
  ax: number; ay: number; bx: number; by: number; cx: number; cy: number;
  /** baked tonal offset (± a few %). */ staticDelta: number;
  /** centroid position along the screen diagonal, 0..1 (phases the wave). */ diagonalPos: number;
}

// The triangulation, 1:1 with buildFacetField() in the apps:
// a point grid (+ one ring beyond each edge so facets bleed off-screen), interior
// points nudged by jitter01, every cell split into two triangles whose diagonal
// alternates by (col+row) parity so the field never looks like a striped lattice.
function buildFacetField(w: number, h: number): Facet[] {
  if (w <= 0 || h <= 0) return [];
  const cols = Math.floor(w / CELL_PX) + 2;
  const rows = Math.floor(h / CELL_PX) + 2;
  const jitterPx = CELL_PX * JITTER_FRACTION;
  const diagSpan = Math.max(1, w + h);

  const point = (col: number, row: number): [number, number] => {
    const baseX = col * CELL_PX;
    const baseY = row * CELL_PX;
    const edge = col <= 0 || row <= 0 || col >= cols - 1 || row >= rows - 1;
    if (edge) return [baseX, baseY];
    const dx = (jitter01(col, row) - 0.5) * 2 * jitterPx;
    const dy = (jitter01(col + 101, row + 211) - 0.5) * 2 * jitterPx;
    return [baseX + dx, baseY + dy];
  };

  const facets: Facet[] = [];
  const push = (
    p: [number, number], q: [number, number], r: [number, number],
    col: number, row: number, half: number,
  ): void => {
    const cx = (p[0] + q[0] + r[0]) / 3;
    const cy = (p[1] + q[1] + r[1]) / 3;
    const diagonalPos = Math.min(1, Math.max(0, (cx + cy) / diagSpan));
    const staticDelta = (jitter01(col * 2 + half, row) - 0.5) * 2 * STATIC_JITTER;
    facets.push({ ax: p[0], ay: p[1], bx: q[0], by: q[1], cx: r[0], cy: r[1], staticDelta, diagonalPos });
  };

  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < cols - 1; col++) {
      const tl = point(col, row), tr = point(col + 1, row);
      const br = point(col + 1, row + 1), bl = point(col, row + 1);
      if ((col + row) % 2 === 0) {
        push(tl, tr, br, col, row, 0);
        push(tl, br, bl, col, row, 1);
      } else {
        push(tl, tr, bl, col, row, 0);
        push(tr, br, bl, col, row, 1);
      }
    }
  }
  return facets;
}

// Read a CSS custom property off an element and parse it to [r,g,b,a] in 0..1.
// This is what keeps the canvas TOKEN-ONLY: it resolves --color-* live, so the
// surface themes (light/dark) and a token edit moves it. Supports
// #rgb/#rgba/#rrggbb/#rrggbbaa + rgb()/rgba().
function readColor(el: Element, name: string): [number, number, number, number] {
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  if (raw.startsWith('#')) {
    const hex = raw.slice(1);
    const n = hex.length;
    const grab = (i: number, len: number): number =>
      len === 1 ? parseInt(hex[i]! + hex[i]!, 16) : parseInt(hex.slice(i, i + len), 16);
    if (n === 3 || n === 4) return [grab(0, 1) / 255, grab(1, 1) / 255, grab(2, 1) / 255, n === 4 ? grab(3, 1) / 255 : 1];
    if (n === 6 || n === 8) return [grab(0, 2) / 255, grab(2, 2) / 255, grab(4, 2) / 255, n === 8 ? grab(6, 2) / 255 : 1];
  }
  const m = raw.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1]!.split(/[,/\s]+/).filter(Boolean).map(Number);
    return [(p[0] ?? 0) / 255, (p[1] ?? 0) / 255, (p[2] ?? 0) / 255, p[3] ?? 1];
  }
  return [0.094, 0.106, 0.125, 1]; // chat-bg fallback only, never the painted value
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

// All visual values are tokens; literals remain only for pure geometry (canvas
// sizing, dot size, blur radius, transition curves).
export const NOCKERL_FACETED_BACKGROUND_STYLES = `
/* the signature surface, a card-radius window onto the canonical faceted field */
.nk-fb-surface { position: relative; width: 100%; aspect-ratio: 16 / 9; min-height: var(--space-16);
  border-radius: var(--radius-card); overflow: hidden;
  border: var(--space-px) solid var(--color-card-hairline);
  box-shadow: 0 var(--elevation-level2) 16px -8px color-mix(in srgb, var(--color-shadow-tint) calc(var(--elevation-shadow-tint-alpha-level1) * 100%), transparent),
              inset 0 var(--space-px) 0 var(--color-surface-highlight); }
/* BARE: full-bleed field, no surface chrome (a full-bleed app-shell / stage background). Same mesh. */
.nk-fb-surface.nk-fb--bare { position: absolute; inset: 0; width: 100%; height: 100%;
  aspect-ratio: auto; min-height: 0; border: 0; border-radius: 0; box-shadow: none; }
.nk-fb-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
/* content laid ON the field, proving legibility over the live mesh */
.nk-fb-overlay { position: relative; height: 100%; display: flex; flex-direction: column;
  align-items: flex-start; justify-content: flex-end; gap: var(--space-2);
  padding: var(--space-4) var(--space-5); }
`;

/**
 * NockerlFacetedBackground: the signature surface itself. A token-colored canvas that
 * paints the canonical low-poly field and (unless reduced) drifts a diagonal
 * tone-wave across it. There are no visual props: the look is fixed by the
 * constants above. Children render ON the surface to prove legibility.
 *
 * Injects the recipe CSS as the LAST child (a leading style node would trip a consumer's
 * first-child / adjacent-sibling selectors); identical injected blocks dedupe in effect.
 */
export const NockerlFacetedBackground = forwardRef<HTMLDivElement, NockerlFacetedBackgroundProps>(function NockerlFacetedBackground({
  reduced = false,
  bare = false,
  children,
  className,
  ...rest
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  // Cached triangulation, keyed by size. Only the per-facet tone is animated per frame, so the
  // mesh geometry is STATIC and we build it ONCE per size (like Compose drawWithCache / SwiftUI
  // Canvas). Rebuilding it every frame starves the loop and makes the tone STEP.
  const meshRef = useRef<{ w: number; h: number; facets: Facet[] } | null>(null);

  const paint = useCallback((phase: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // LIVE token reads: the token-only color contract in action.
    // The facet GROUND is its own named intent token, carrying the same value as chat-bg;
    // native clients adopt --color-surface-facet-base / surfaceFacetBase directly.
    const base = readColor(canvas, '--color-surface-facet-base');
    const edge = readColor(canvas, '--color-canvas-edge');
    const [br, bg, bb] = base;
    // build the mesh ONCE per size (cached). The per-frame cost is then just the re-tint fills.
    let mesh = meshRef.current;
    if (!mesh || mesh.w !== w || mesh.h !== h) {
      mesh = { w, h, facets: buildFacetField(w, h) };
      meshRef.current = mesh;
    }
    const facets = mesh.facets;

    // 1) flat ground (the base token).
    ctx.fillStyle = `rgb(${br * 255} ${bg * 255} ${bb * 255})`;
    ctx.fillRect(0, 0, w, h);

    // 2/3) re-tinted facets + barely-there edge hairline (the only per-frame work).
    ctx.lineWidth = EDGE_WIDTH;
    ctx.lineJoin = 'round';
    // hairline = the canvas-edge token at EDGE_ALPHA (native does
    // canvasEdge.copy(alpha = 0.05)). The result is barely-there structure, never a line grid.
    ctx.strokeStyle = `rgb(${edge[0] * 255} ${edge[1] * 255} ${edge[2] * 255} / ${EDGE_ALPHA})`;
    for (const f of facets) {
      const d = f.staticDelta + AMPLITUDE * Math.sin(phase + f.diagonalPos * TWO_PI);
      ctx.beginPath();
      ctx.moveTo(f.ax, f.ay);
      ctx.lineTo(f.bx, f.by);
      ctx.lineTo(f.cx, f.cy);
      ctx.closePath();
      // per-channel luminance add, neutral and hue-preserving (shiftLuminance()).
      ctx.fillStyle = `rgb(${clamp01(br + d) * 255} ${clamp01(bg + d) * 255} ${clamp01(bb + d) * 255})`;
      ctx.fill();
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    if (reduced) {
      // Static composed frame: phase = π/2 (the wave at +amplitude) reads as a
      // pleasant lit diagonal, the "frozen signature frame".
      paint(Math.PI / 2);
      return;
    }
    let start: number | null = null;
    const loop = (now: number): void => {
      if (start === null) start = now;
      const phase = (((now - start) % PERIOD_MS) / PERIOD_MS) * TWO_PI;
      paint(phase);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    const onResize = (): void => paint(((performance.now() % PERIOD_MS) / PERIOD_MS) * TWO_PI);
    window.addEventListener('resize', onResize);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [reduced, paint]);

  return (
    <div {...rest} ref={ref} className={['nk-fb-surface', bare ? 'nk-fb--bare' : null, className].filter(Boolean).join(' ')}>
      <canvas ref={canvasRef} className="nk-fb-canvas" aria-hidden="true" />
      {children && <div className="nk-fb-overlay">{children}</div>}
      <style>{NOCKERL_FACETED_BACKGROUND_STYLES}</style>
    </div>
  );
});

/** CONTAINER: the signature surface itself is drawn to a token-colored <canvas> (no
 *  facsimile elements, so it owns nothing), but its `children` render ON the surface as an
 *  overlay: any design component may sit there (like NockerlSurface). One `default` slot, '*'. */
export const compose = {
  slots: { default: { accepts: '*' } },
} satisfies ComposeContract;

export default NockerlFacetedBackground;
