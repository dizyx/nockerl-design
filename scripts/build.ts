/**
 * Nockerl design-token build: layered DTCG -> web (CSS), Android (Compose Kotlin),
 * and Swift (SwiftUI).
 *
 * Style Dictionary is used purely as a transform + reference-resolution engine.
 * For each (theme, platform) we stack the sources lowest-priority first:
 *
 *   core/**  +  semantic/{categorical,radius,size,elevation,typography}.json
 *            +  semantic/color.<THEME>.json  +  platform/<PLATFORM>/**
 *
 * A later layer only OVERRIDES the tokens it names; everything else falls through.
 * We then pull the transformed token list out of each dictionary and assemble the
 * final files ourselves, because two themes have to be merged into one output file
 * (web: :root + .dark; Android/Swift: Dark* + Light* objects), something the stock
 * single-file formats don't do.
 *
 * Run: `bun run build`
 */
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import StyleDictionary from 'style-dictionary';
import { transforms } from 'style-dictionary/enums';
import { registerNockerlTransforms } from './transforms.ts';
import {
  ktColorObject,
  ktDimObject,
  ktMotionObjects,
  ktNumberObject,
  ktPathDimObject,
  ktTypeObject,
  swiftColorEnum,
  swiftDimEnum,
  swiftMotionEnums,
  swiftNumberEnum,
  swiftPathDimEnum,
  swiftTypeEnum,
} from './emitters.ts';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const tokens = (p: string) => resolve(repoRoot, 'tokens', p);
const out = (p: string) => resolve(repoRoot, 'build', p);
const sources = (p: string) => resolve(repoRoot, 'Sources', p);
// The generated Kotlin tokens are mirrored into the Compose library's committed source
// set (packages/compose), mirroring the Swift Sources/ sync, so the module is a
// resolvable Maven dependency in lockstep on every `bun run build`.
const composeTokens = (p: string) =>
  resolve(repoRoot, 'packages/compose/nockerl-design-tokens/src/main/kotlin/com/dizyx/nockerl/design/tokens', p);

type Theme = 'dark' | 'light';
type Platform = 'web' | 'android' | 'swift';

/** A transformed token as it appears in dictionary.allTokens. */
interface TToken {
  path: string[];
  value?: unknown;
  $value?: unknown;
  $type?: string;
  type?: string;
  original?: { $value?: unknown; value?: unknown };
  comment?: string;
  $description?: string;
}

registerNockerlTransforms(StyleDictionary);

/** Build the layered source glob list for a (theme, platform) pair. */
function sourcesFor(theme: Theme, platform: Platform): string[] {
  return [
    tokens('core/**/*.json'),
    tokens('semantic/categorical.json'),
    tokens('semantic/radius.json'),
    tokens('semantic/border.json'),
    tokens('semantic/size.json'),
    tokens('semantic/grid.json'),
    tokens('semantic/density.json'),
    tokens('semantic/elevation.json'),
    tokens('semantic/typography.json'),
    tokens(`semantic/color.${theme}.json`),
    // platform deltas (none authored for `swift` -> falls through to semantic)
    tokens(`platform/${platform}/**/*.json`),
  ];
}

const TRANSFORMS: Record<Platform, string[]> = {
  web: [transforms.attributeCti, transforms.nameKebab, 'color/css-hex8'],
  android: [transforms.attributeCti, 'color/composeColor', 'size/px-dp', 'size/px-sp'],
  swift: [transforms.attributeCti, transforms.colorColorSwiftUI, 'size/px-cgfloat'],
};

/** Resolve + transform one (theme, platform) layer-stack into a flat token list. */
async function transformedTokens(theme: Theme, platform: Platform): Promise<TToken[]> {
  const sd = new StyleDictionary({
    source: sourcesFor(theme, platform),
    log: { verbosity: 'silent', warnings: 'disabled' },
    platforms: {
      target: {
        transforms: TRANSFORMS[platform],
        buildPath: 'build/',
      },
    },
  });
  const dictionary = await sd.getPlatformTokens('target');
  return dictionary.allTokens as unknown as TToken[];
}

const isColor = (t: TToken): boolean => (t.$type ?? t.type) === 'color';
const firstSeg = (t: TToken): string => t.path[0] ?? '';

function byCategory(toks: TToken[]) {
  return {
    colors: toks.filter(isColor),
    radius: toks.filter((t) => firstSeg(t) === 'radius'),
    // Split the elevation category into its two independent sub-systems:
    //  - `elevation`         = the blur ladder (dimensions → dp/CGFloat/px), UNCHANGED.
    //  - `shadowTintAlpha`   = the lift-shadow OPACITY ladder (unitless numbers 0..1),
    //    emitted as raw floats, never dimensions (no .dp / no px suffix).
    elevation: toks.filter((t) => firstSeg(t) === 'elevation' && t.path[1] !== 'shadowTintAlpha'),
    shadowTintAlpha: toks.filter(
      (t) => firstSeg(t) === 'elevation' && t.path[1] === 'shadowTintAlpha',
    ),
    // Same split as `elevation` above, for the same reason:
    //  - `border`        = the stroke-WIDTH scale (dimensions → dp/CGFloat/px).
    //  - `borderOpacity` = the selection-border softening (unitless numbers 0..1).
    border: toks.filter((t) => firstSeg(t) === 'border' && t.path[1] !== 'opacity'),
    borderOpacity: toks.filter((t) => firstSeg(t) === 'border' && t.path[1] === 'opacity'),
    space: toks.filter((t) => firstSeg(t) === 'space'),
    fontSize: toks.filter((t) => firstSeg(t) === 'font' && t.path[1] === 'size'),
    typography: toks.filter((t) => (t.$type ?? t.type) === 'typography'),
    durations: toks.filter((t) => (t.$type ?? t.type) === 'duration'),
    easings: toks.filter((t) => (t.$type ?? t.type) === 'cubicBezier'),
    grid: toks.filter((t) => firstSeg(t) === 'grid'),
    size: toks.filter((t) => firstSeg(t) === 'size'),
    density: toks.filter((t) => firstSeg(t) === 'density'),
  };
}

const HEADER = (lang: 'css' | 'kt' | 'swift'): string => {
  const line = lang === 'css' ? '/*' : lang === 'swift' ? '//' : '//';
  const close = lang === 'css' ? ' */' : '';
  const body = [
    'Nockerl design tokens: GENERATED by Style Dictionary. Do not edit by hand.',
    'Source of truth: tokens/*.json  •  Build: bun run build',
  ];
  if (lang === 'css') {
    return `/*\n * ${body.join('\n * ')}\n */\n`;
  }
  return body.map((b) => `${line} ${b}${close}`).join('\n') + '\n';
};

// ---------------------------------------------------------------------------
// WEB: build/web/tokens.css
// ---------------------------------------------------------------------------
function cssVarName(t: TToken): string {
  // name/kebab already produced this name on the token; recompute from path for
  // determinism (kebab of the full path, no prefix). e.g. color.accentPrimary ->
  // --color-accent-primary, font.size.16 -> --font-size-16, space.4 -> --space-4.
  const kebab = t.path
    .map((p) =>
      p
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .toLowerCase(),
    )
    .join('-')
    .replace(/-+/g, '-');
  return `--${kebab}`;
}

/** Format a CSS font-family list: quote any family containing whitespace. */
function cssFontFamily(value: unknown): string {
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((f) => {
      const s = String(f);
      return /\s/.test(s) ? `"${s}"` : s;
    })
    .join(', ');
}

/** CSS value for a single (non-composite) token. */
function cssValue(t: TToken): string {
  const raw = t.$value ?? t.value;
  if (t.path[0] === 'font' && t.path[1] === 'family') return cssFontFamily(raw);
  // cubicBezier tokens carry a 4-number array -> the CSS timing function.
  if ((t.$type ?? t.type) === 'cubicBezier' && Array.isArray(raw)) {
    return `cubic-bezier(${raw.join(', ')})`;
  }
  return String(raw);
}

/** Which tokens become flat CSS vars: colors + dims + font family/weight + motion. */
function webEmittable(toks: TToken[]): TToken[] {
  return toks.filter(
    (t) =>
      isColor(t) ||
      ['radius', 'border', 'size', 'elevation', 'space', 'icon', 'grid', 'density'].includes(firstSeg(t)) ||
      // Motion durations + easings (RATIFIED r3); springs stay un-emitted.
      ['duration', 'cubicBezier'].includes(String(t.$type ?? t.type)) ||
      (firstSeg(t) === 'font' &&
        ['size', 'lineHeight', 'family', 'weight', 'tracking'].includes(t.path[1] ?? '')),
  );
}

function cssBlock(toks: TToken[], indent = '  '): string {
  const flat = webEmittable(toks)
    .map((t) => `${indent}${cssVarName(t)}: ${cssValue(t)};`)
    .join('\n');
  // Composite type ramp -> per-role sub-vars (best-effort): font/size/weight/line.
  const typo = toks
    .filter((t) => (t.$type ?? t.type) === 'typography')
    .flatMap((t) => cssTypeRole(t, indent))
    .join('\n');
  return `${flat}\n${typo}`;
}

/** Emit the four sub-vars of one composite typography role. */
function cssTypeRole(t: TToken, indent: string): string[] {
  const v = (t.$value ?? t.value) as Record<string, unknown>;
  const base = `--type-${t.path
    .slice(1)
    .map((p) => p.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase())
    .join('-')}`;
  return [
    `${indent}${base}-font-family: ${cssFontFamily(v.fontFamily)};`,
    `${indent}${base}-font-weight: ${String(v.fontWeight)};`,
    `${indent}${base}-font-size: ${String(v.fontSize)};`,
    `${indent}${base}-line-height: ${String(v.lineHeight)};`,
  ];
}

async function buildWeb(): Promise<string> {
  const light = await transformedTokens('light', 'web');
  const dark = await transformedTokens('dark', 'web');
  const css =
    HEADER('css') +
    '\n' +
    ':root {\n' +
    cssBlock(light) +
    '\n}\n\n' +
    // `.dark` for the dashboard's class toggle; `:root[data-theme='dark']` for Starlight's
    // attribute toggle (the docs site), both get the dark values.
    ".dark,\n:root[data-theme='dark'] {\n" +
    cssBlock(dark) +
    '\n}\n';
  await writeFile(out('web/tokens.css'), css, 'utf8');
  return css;
}

// ---------------------------------------------------------------------------
// ANDROID: build/android/NockerlTokens.kt  (package com.dizyx.nockerl.design.tokens)
//           mirrored into packages/compose/nockerl-design-tokens/src/main/kotlin/...
// ---------------------------------------------------------------------------
async function buildAndroid(): Promise<string> {
  const dark = await transformedTokens('dark', 'android');
  const light = await transformedTokens('light', 'android');
  const d = byCategory(dark);
  const l = byCategory(light);

  // Dimensions/font sizes are theme-agnostic, so take them from the dark build.
  const radius = ktDimObject('Radius', '', d.radius);
  const elevation = ktDimObject('Elevation', '', d.elevation);
  // Lift-shadow opacity ladder: unitless numbers → Float (no .dp).
  const shadowTintAlpha = ktNumberObject('NockerlShadowTintAlpha', '', d.shadowTintAlpha);
  const space = ktDimObject('Space', 'space', d.space);
  const fontSize = ktDimObject('FontSize', 'size', d.fontSize);

  const typography = ktTypeObject(d.typography);
  const motion = ktMotionObjects(d.durations, d.easings);

  const kt =
    HEADER('kt') +
    '\npackage com.dizyx.nockerl.design.tokens\n\n' +
    'import androidx.compose.animation.core.CubicBezierEasing\n' +
    'import androidx.compose.ui.graphics.Color\n' +
    'import androidx.compose.ui.unit.TextUnit\n' +
    'import androidx.compose.ui.unit.dp\n' +
    'import androidx.compose.ui.unit.sp\n\n' +
    '/** Dark-theme palette. Color(0xAARRGGBB). */\n' +
    ktColorObject('NockerlDarkColors', d.colors) +
    '\n\n/** Light-theme palette. Color(0xAARRGGBB). */\n' +
    ktColorObject('NockerlLightColors', l.colors) +
    '\n\n/** Corner radii (dp). Theme-agnostic. */\n' +
    radius +
    '\n\n/** Elevation / drop-shadow blur levels (dp). */\n' +
    elevation +
    '\n\n/** Lift-shadow opacity ladder (Float 0..1): pair with Elevation blur; apply as\n' +
    ' *  shadowTint.copy(alpha = NockerlShadowTintAlpha.levelN). NOT a dimension. */\n' +
    shadowTintAlpha +
    '\n\n/** Cyan-stroke weight scale (dp). The weight is SEMANTIC (design-laws §2):\n' +
    ' *  widthFloating = hovering ON TOP of content; widthSelection = a CHOICE state\n' +
    ' *  (pair with NockerlBorderOpacity.selection); widthIndicator = the sliding marker bar. */\n' +
    ktPathDimObject('NockerlBorder', d.border) +
    '\n\n/** Stroke opacities (Float 0..1). Apply as accentPrimary.copy(alpha = …). NOT a dimension. */\n' +
    ktNumberObject('NockerlBorderOpacity', '', d.borderOpacity) +
    '\n\n/** 4px-grid spacing scale (dp). */\n' +
    space +
    '\n\n/** Type ramp font sizes (sp). */\n' +
    fontSize +
    '\n\n/** Page-grid rhythm (dp): gutter, min outer margin, container clamps (). */\n' +
    ktPathDimObject('NockerlGrid', d.grid) +
    '\n\n/** Density tiers (dp): row height + vertical padding per tier (). */\n' +
    ktPathDimObject('NockerlDensity', d.density) +
    "\n\n/** Semantic sizes (dp): touch/divider/panel minimums, container + chat-width caps (). */\n" +
    ktPathDimObject('NockerlSize', d.size) +
    '\n\n' +
    typography +
    '\n\n' +
    motion +
    '\n';
  await writeFile(out('android/NockerlTokens.kt'), kt, 'utf8');
  return kt;
}

// ---------------------------------------------------------------------------
// SWIFT: build/swift/NockerlTokens.swift
// ---------------------------------------------------------------------------
async function buildSwift(): Promise<string> {
  const dark = await transformedTokens('dark', 'swift');
  const light = await transformedTokens('light', 'swift');
  const d = byCategory(dark);
  const l = byCategory(light);

  const swift =
    HEADER('swift') +
    '\nimport CoreGraphics\nimport Foundation\nimport SwiftUI\n\n' +
    '/// Dark-theme palette.\n' +
    swiftColorEnum('NockerlDarkColors', d.colors) +
    '\n\n/// Light-theme palette.\n' +
    swiftColorEnum('NockerlLightColors', l.colors) +
    '\n\n/// Corner radii (pt). Theme-agnostic.\n' +
    swiftDimEnum('NockerlRadius', '', d.radius) +
    '\n\n/// Elevation / drop-shadow blur levels (pt).\n' +
    swiftDimEnum('NockerlElevation', '', d.elevation) +
    '\n\n/// Lift-shadow opacity ladder (Double 0..1): pair with NockerlElevation blur;\n' +
    '/// apply as shadowTint.opacity(NockerlShadowTintAlpha.levelN). NOT a dimension.\n' +
    swiftNumberEnum('NockerlShadowTintAlpha', '', d.shadowTintAlpha) +
    '\n\n/// Cyan-stroke weight scale (pt). The weight is SEMANTIC (design-laws §2):\n' +
    '/// widthFloating = hovering ON TOP of content; widthSelection = a CHOICE state\n' +
    '/// (pair with NockerlBorderOpacity.selection); widthIndicator = the sliding marker bar.\n' +
    swiftPathDimEnum('NockerlBorder', d.border) +
    '\n\n/// Stroke opacities (Double 0..1). Apply as accentPrimary.opacity(…). NOT dimensions.\n' +
    swiftNumberEnum('NockerlBorderOpacity', '', d.borderOpacity) +
    '\n\n/// 4pt-grid spacing scale (pt).\n' +
    swiftDimEnum('NockerlSpace', 'space', d.space) +
    '\n\n/// Type ramp font sizes (pt).\n' +
    swiftDimEnum('NockerlFontSize', 'size', d.fontSize) +
    '\n\n/// Page-grid rhythm (pt): gutter, min outer margin, container clamps.\n' +
    swiftPathDimEnum('NockerlGrid', d.grid) +
    '\n\n/// Density tiers (pt): row height + vertical padding per tier.\n' +
    swiftPathDimEnum('NockerlDensity', d.density) +
    "\n\n/// Semantic sizes (pt): touch/divider/panel minimums, container + chat-width caps.\n" +
    swiftPathDimEnum('NockerlSize', d.size) +
    '\n\n' +
    swiftTypeEnum(d.typography) +
    '\n\n' +
    swiftMotionEnums(d.durations, d.easings) +
    '\n';
  await writeFile(out('swift/NockerlTokens.swift'), swift, 'utf8');
  return swift;
}

// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  await mkdir(out('web'), { recursive: true });
  await mkdir(out('android'), { recursive: true });
  await mkdir(out('swift'), { recursive: true });
  await mkdir(sources('NockerlDesign'), { recursive: true });
  await mkdir(composeTokens('.'), { recursive: true });

  await buildWeb();
  await buildAndroid();
  await buildSwift();

  // Mirror the generated Swift into the committed SPM package source. `build/` is
  // gitignored (a regenerated artifact); `Sources/NockerlDesign/` is tracked so the
  // repo is itself a resolvable SwiftPM dependency (root Package.swift). This keeps the
  // package in lockstep on every `bun run build`, the Swift analogue of how
  // pack-tokens mirrors build/web/tokens.css into the @dizyx/nockerl-tokens package.
  await copyFile(out('swift/NockerlTokens.swift'), sources('NockerlDesign/NockerlTokens.swift'));

  // Mirror the generated Kotlin into the committed Compose module source (same lockstep
  // pattern). build/android/ stays the round-trip target `verify` reads; the module gets
  // the tracked copy it publishes to GitHub Packages Maven.
  await copyFile(out('android/NockerlTokens.kt'), composeTokens('NockerlTokens.kt'));

  console.log(
    'Built: build/web/tokens.css, build/android/NockerlTokens.kt, build/swift/NockerlTokens.swift\n' +
      'Synced: Sources/NockerlDesign/NockerlTokens.swift (SPM package source)\n' +
      '        packages/compose/nockerl-design-tokens/.../NockerlTokens.kt (Compose module)',
  );
}

await main();
