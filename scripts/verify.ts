/**
 * Round-trip guard for the token build. Asserts that the GENERATED outputs
 * (build/) still match the authoritative hexes/dimensions extracted from the
 * canonical apps. Run after `bun run build`:  `bun run verify`.
 *
 * Drift protection: if a token edit or a build change silently shifts one of
 * these load-bearing values, this fails loudly instead of shipping a wrong
 * color to web + Android + Swift.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dir, '..');
const kt = readFileSync(resolve(root, 'build/android/NockerlTokens.kt'), 'utf8');
const css = readFileSync(resolve(root, 'build/web/tokens.css'), 'utf8');
const swift = readFileSync(resolve(root, 'build/swift/NockerlTokens.swift'), 'utf8');

let pass = 0, fail = 0;
function check(label: string, got: string | undefined, exp: string) {
  const ok = got === exp;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(34)} got=${String(got)}  exp=${exp}`);
  ok ? pass++ : fail++;
}
// Pull "val NAME = Color(0x....)" within a named object block.
function ktColor(objName: string, member: string): string | undefined {
  const block = kt.split(`object ${objName} {`)[1]?.split('\n}')[0] ?? '';
  return block.match(new RegExp(`\\bval ${member} = (Color\\(0x[0-9A-Fa-f]+\\))`))?.[1];
}
function ktDim(objName: string, member: string): string | undefined {
  const block = kt.split(`object ${objName} {`)[1]?.split('\n}')[0] ?? '';
  return block.match(new RegExp(`\\bval ${member} = ([0-9.]+\\.(?:dp|sp))`))?.[1];
}
function cssVar(scope: ':root' | '.dark', name: string): string | undefined {
  // Grab the scope block. The selector may head a comma-grouped list before the brace
  // (build emits `.dark,\n:root[data-theme='dark'] {` for the docs-site theme toggle), so
  // match any non-`{` selector text up to the opening brace rather than just whitespace.
  // `:root {` (light) still matches first, so the `:root` scope keeps resolving to light.
  const re = new RegExp(`${scope.replace('.', '\\.')}[^{]*\\{([\\s\\S]*?)\\}`);
  const block = css.match(re)?.[1] ?? '';
  return block.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim();
}
function swiftColor(enumName: string, member: string): string | undefined {
  const block = swift.split(`enum ${enumName} {`)[1]?.split('\n}')[0] ?? '';
  return block.match(new RegExp(`\\bstatic let ${member} = (Color\\([^)]*\\))`))?.[1];
}

console.log('--- Compose DARK ---');
check('dark canvas', ktColor('NockerlDarkColors','canvas'), 'Color(0xFF0A0B0D)');
check('dark chatBg', ktColor('NockerlDarkColors','chatBg'), 'Color(0xFF181B20)');
check('dark cardSurface1', ktColor('NockerlDarkColors','cardSurface1'), 'Color(0xFF2C313A)');
check('dark cardAlt2', ktColor('NockerlDarkColors','cardAlt2'), 'Color(0xFF363C45)');
check('dark chromeSurface', ktColor('NockerlDarkColors','chromeSurface'), 'Color(0xFF15171A)');
check('dark accentPrimary', ktColor('NockerlDarkColors','accentPrimary'), 'Color(0xFF0CC0DF)');
check('dark statusError', ktColor('NockerlDarkColors','statusError'), 'Color(0xFFEF5350)');
check('dark cardHairline', ktColor('NockerlDarkColors','cardHairline'), 'Color(0x14FFFFFF)');

console.log('--- Compose LIGHT ---');
check('light canvas', ktColor('NockerlLightColors','canvas'), 'Color(0xFFF3F4F6)');
check('light accentPrimary', ktColor('NockerlLightColors','accentPrimary'), 'Color(0xFF0891B2)');
check('light cardSurface1', ktColor('NockerlLightColors','cardSurface1'), 'Color(0xFFFFFFFF)');

console.log('--- Compose dims ---');
check('Radius.card', ktDim('Radius','card'), '16.dp');
check('Radius.control', ktDim('Radius','control'), '12.dp');
check('FontSize.size16', ktDim('FontSize','size16'), '16.sp');

console.log('--- Web DARK (.dark) ---');
check('.dark --color-canvas', cssVar('.dark','--color-canvas'), '#0a0b0d');
check('.dark --color-accent-primary', cssVar('.dark','--color-accent-primary'), '#0cc0df');
check('.dark --color-card-hairline', cssVar('.dark','--color-card-hairline'), '#ffffff14');

console.log('--- Web LIGHT (:root) ---');
check(':root --color-canvas', cssVar(':root','--color-canvas'), '#f3f4f6');
check(':root --color-accent-primary', cssVar(':root','--color-accent-primary'), '#0891b2');

console.log('--- Elevation lift-shadow opacity ladder (shadowTintAlpha) ---');
// Blur ladder is unchanged; the NEW opacity ladder emits as raw numbers (web),
// Float (Compose), Double (Swift); NOT dimensions (no px / .dp / CGFloat).
check('css --elevation-shadow-tint-alpha-level1',
  cssVar(':root', '--elevation-shadow-tint-alpha-level1'), '0.28');
check('css --elevation-shadow-tint-alpha-sheet',
  cssVar(':root', '--elevation-shadow-tint-alpha-sheet'), '0.35');
check('kt NockerlShadowTintAlpha.level1',
  kt.split('object NockerlShadowTintAlpha {')[1]?.split('\n}')[0]?.match(/val level1 = ([0-9.]+f)/)?.[1], '0.28f');
check('kt NockerlShadowTintAlpha.sheet',
  kt.split('object NockerlShadowTintAlpha {')[1]?.split('\n}')[0]?.match(/val sheet = ([0-9.]+f)/)?.[1], '0.35f');
check('swift NockerlShadowTintAlpha.level1',
  swift.split('enum NockerlShadowTintAlpha {')[1]?.split('\n}')[0]?.match(/static let level1: Double = ([0-9.]+)/)?.[1], '0.28');
check('swift NockerlShadowTintAlpha.sheet',
  swift.split('enum NockerlShadowTintAlpha {')[1]?.split('\n}')[0]?.match(/static let sheet: Double = ([0-9.]+)/)?.[1], '0.35');

console.log('--- Elevation HARD-OFFSET model (v1.17.0): y-offset ladder + constant 0 blur ---');
// The rung value is the downward Y-OFFSET; v1.17.1 halved the ladder
// (2.5/5/9/14 -> 1.5/3/5/8), then v1.17.2 stepped it DOWN one rung
// (1.5/3/5/8 -> 1/1.5/3/5): each upper rung takes the value below it, level1 gets a
// new 1px floor. elevation.blur pins the hard-edge blur to a constant 0 on every platform.
check('css --elevation-level1 (offset)', cssVar(':root', '--elevation-level1'), '1px');
check('css --elevation-sheet (offset)', cssVar(':root', '--elevation-sheet'), '5px');
check('css --elevation-blur (const 0)', cssVar(':root', '--elevation-blur'), '0px');
check('kt Elevation.level1 (offset)', ktDim('Elevation', 'level1'), '1.dp');
check('kt Elevation.blur (const 0)', ktDim('Elevation', 'blur'), '0.dp');
check('swift NockerlElevation.level1 (offset)',
  swift.split('enum NockerlElevation {')[1]?.split('\n}')[0]?.match(/static let level1: CGFloat = ([0-9.]+)/)?.[1], '1');
check('swift NockerlElevation.blur (const 0)',
  swift.split('enum NockerlElevation {')[1]?.split('\n}')[0]?.match(/static let blur: CGFloat = ([0-9.]+)/)?.[1], '0');

console.log('--- Radius (unified across platforms) ---');
check('web --radius-card (unified 16)', cssVar(':root','--radius-card'), '16px');
check('web --radius-control', cssVar(':root','--radius-control'), '12px');

console.log('--- Border (design-laws §2: cyan-stroke weight is SEMANTIC) ---');
// The three weights must stay DISTINCT and must agree across all three platforms: collapsing
// selection onto floating is exactly the drift  normalized away.
check('web --border-width-floating', cssVar(':root','--border-width-floating'), '1.5px');
check('web --border-width-selection', cssVar(':root','--border-width-selection'), '1px');
check('web --border-width-indicator', cssVar(':root','--border-width-indicator'), '1px');
check('web --border-opacity-selection', cssVar(':root','--border-opacity-selection'), '0.45');
check('kt NockerlBorder.widthSelection',
  kt.split('object NockerlBorder {')[1]?.split('\n}')[0]?.match(/val widthSelection = ([0-9.]+)\.dp/)?.[1], '1');
check('kt NockerlBorder.widthIndicator',
  kt.split('object NockerlBorder {')[1]?.split('\n}')[0]?.match(/val widthIndicator = ([0-9.]+)\.dp/)?.[1], '1');
check('kt NockerlBorderOpacity.selection',
  kt.split('object NockerlBorderOpacity {')[1]?.split('\n}')[0]?.match(/val selection = ([0-9.]+)f/)?.[1], '0.45');
check('swift NockerlBorder.widthSelection',
  swift.split('enum NockerlBorder {')[1]?.split('\n}')[0]?.match(/static let widthSelection: CGFloat = ([0-9.]+)/)?.[1], '1');
check('swift NockerlBorder.widthIndicator',
  swift.split('enum NockerlBorder {')[1]?.split('\n}')[0]?.match(/static let widthIndicator: CGFloat = ([0-9.]+)/)?.[1], '1');
check('swift NockerlBorderOpacity.selection',
  swift.split('enum NockerlBorderOpacity {')[1]?.split('\n}')[0]?.match(/static let selection: Double = ([0-9.]+)/)?.[1], '0.45');

console.log('--- Swift colors (RGBA round-trip) ---');
check('swift dark accentPrimary', swiftColor('NockerlDarkColors','accentPrimary'),
  'Color(red: 0.047, green: 0.753, blue: 0.875, opacity: 1)');
check('swift light accentPrimary', swiftColor('NockerlLightColors','accentPrimary'),
  'Color(red: 0.031, green: 0.569, blue: 0.698, opacity: 1)');
check('swift dark cardHairline (alpha)', swiftColor('NockerlDarkColors','cardHairline'),
  'Color(red: 1.000, green: 1.000, blue: 1.000, opacity: 0.0784313725490196)');

console.log('--- Motion (round-trips on all three targets) ---');
check('kt duration.base', kt.match(/val baseMs = (\d+)/)?.[1], '200');
check('kt duration.pulse', kt.match(/val pulseMs = (\d+)/)?.[1], '800');
check('kt easing.standard', kt.includes('val standard = CubicBezierEasing(0.2f, 0f, 0f, 1f)') ? 'ok' : 'missing', 'ok');
check('swift duration.fast', swift.match(/static let fast: TimeInterval = ([0-9.]+)/)?.[1], '0.12');
check('swift duration.sheet', swift.match(/static let sheet: TimeInterval = ([0-9.]+)/)?.[1], '0.4');
check('swift easing.standard', swift.includes('NockerlBezier(x1: 0.2, y1: 0, x2: 0, y2: 1)') ? 'ok' : 'missing', 'ok');
check('css --motion-duration-base', cssVar(':root', '--motion-duration-base'), '200ms');
check('css --motion-easing-standard', cssVar(':root', '--motion-easing-standard'), 'cubic-bezier(0.2, 0, 0, 1)');

console.log('--- Layout grid + density (status: review) ---');
check('css --grid-container-lg', cssVar(':root', '--grid-container-lg'), '1024px');
check('css --grid-gutter (alias {space.5})', cssVar(':root', '--grid-gutter'), '20px');
check('css --density-row-height-compact', cssVar(':root', '--density-row-height-compact'), '32px');
check('kt grid.containerLg', kt.match(/val containerLg = ([0-9.]+)\.dp/)?.[1], '1024');
check('kt density.padYComfortable', kt.match(/val padYComfortable = ([0-9.]+)\.dp/)?.[1], '12');
check('swift density.rowHeightComfortable', swift.match(/static let rowHeightComfortable: CGFloat = ([0-9.]+)/)?.[1], '48');

console.log('--- Typography: eyebrow role (v1.18.0; ONE shared section-overline @ 500) ---');
// The unified section-eyebrow role must round-trip as Outfit / weight 500 / 12 / 16 on every
// target (GroupHeader + FormSection + StatCard route through it; 500 is the whole point: a
// silent drop back to labelMedium's 300 would re-open the drift this change closed).
const swiftEyebrow = swift.match(
  /static let eyebrow = NockerlTextStyle\(fontFamily: "([^"]+)", fontWeight: (\d+), fontSize: ([0-9.]+), lineHeight: ([0-9.]+)\)/,
);
check('swift eyebrow family', swiftEyebrow?.[1], 'Outfit');
check('swift eyebrow weight (500)', swiftEyebrow?.[2], '500');
check('swift eyebrow size', swiftEyebrow?.[3], '12');
check('swift eyebrow lineHeight', swiftEyebrow?.[4], '16');
const ktEyebrow = kt.match(/val eyebrow = NockerlTextStyle\("([^"]+)", (\d+), ([0-9.]+)\.sp, ([0-9.]+)\.sp\)/);
check('kt eyebrow family', ktEyebrow?.[1], 'Outfit');
check('kt eyebrow weight (500)', ktEyebrow?.[2], '500');
check('kt eyebrow size', ktEyebrow?.[3], '12');
check('kt eyebrow lineHeight', ktEyebrow?.[4], '16');
check('css --type-eyebrow-font-weight (500)', cssVar(':root', '--type-eyebrow-font-weight'), '500');
check('css --type-eyebrow-font-size', cssVar(':root', '--type-eyebrow-font-size'), '12px');
check('css --type-eyebrow-line-height', cssVar(':root', '--type-eyebrow-line-height'), '16px');

console.log(`\n${fail === 0 ? 'ALL PASS' : 'HAS FAILURES'}: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
