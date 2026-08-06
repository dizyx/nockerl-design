/**
 * Platform code emitters for the token build: the pure string generators that turn
 * transformed DTCG tokens into Kotlin objects (Compose) and Swift enums (SwiftUI).
 * Extracted from build.ts (file-size budget): build.ts orchestrates layers + CSS,
 * this module owns the Kotlin/Swift shapes.
 */

/** A transformed token as it appears in dictionary.allTokens (structural mirror of build.ts). */
export interface TToken {
  path: string[];
  value?: unknown;
  $value?: unknown;
  $type?: string;
  type?: string;
  original?: { $value?: unknown; value?: unknown };
  comment?: string;
  $description?: string;
}

const val = (t: TToken): string => String(t.$value ?? t.value);

const camel = (parts: string[]): string =>
  parts
    .map((p, i) =>
      i === 0
        ? p.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
        : p.charAt(0).toUpperCase() + p.slice(1),
    )
    .join('')
    .replace(/[^a-zA-Z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ''));

const colorMember = (t: TToken): string => camel(t.path.slice(1)); // drop leading "color"

/**
 * Member name for a dimension token, built from its LAST path segment plus an
 * optional category prefix (camelCased together so capitalisation is correct):
 *  - radius/elevation (no prefix): `card`, `level2`, `bubbleTail`.
 *  - space/fontSize  (prefixed):   `space4`, `space05`, `spacePx`, `size16`
 *    (the bare numeric/dashed leaves wouldn't be valid identifiers alone)
 */
const dimMember = (prefix: string, t: TToken): string => {
  const leaf = t.path[t.path.length - 1] ?? '';
  return camel(prefix ? [prefix, leaf] : [leaf]);
};

/** "120ms" -> 120 (integer milliseconds). */
const durMs = (t: TToken): number => parseInt(String(t.$value ?? t.value), 10) || 0;

/** The four cubic-bezier control points of an easing token. */
const bezierPts = (t: TToken): number[] => (t.$value ?? t.value) as number[];

/** "24px" -> "24.sp" (Compose line-heights are sp); pass through if already .sp. */
const toSp = (raw: unknown): string => {
  const s = String(raw);
  if (s.endsWith('.sp')) return s;
  const m = s.match(/^([0-9.]+)px$/);
  return m ? `${m[1]}.sp` : s;
};

/** Strip a trailing `px`/`.sp` so a composite dimension becomes a bare number. */
const bareNum = (raw: unknown): string => String(raw).replace(/(px|\.sp|\.dp)$/, '');

// ---------------------------------------------------------------------------
// KOTLIN (Compose)
// ---------------------------------------------------------------------------

/** Compose color literal: the built-in `color/composeColor` already emits
 *  `Color(0xAARRGGBB)` (lowercase). Uppercase the hex to match the app format. */
const composeColor = (t: TToken): string =>
  val(t).replace(/0x([0-9a-fA-F]+)/, (_, h: string) => `0x${h.toUpperCase()}`);

export function ktColorObject(name: string, colors: TToken[]): string {
  const lines = colors.map((t) => `    val ${colorMember(t)} = ${composeColor(t)}`);
  return `object ${name} {\n${lines.join('\n')}\n}`;
}

export function ktDimObject(name: string, prefix: string, dims: TToken[]): string {
  // val already carries its `.dp` / `.sp` suffix from the transform.
  const lines = dims.map((t) => `    val ${dimMember(prefix, t)} = ${val(t)}`);
  return `object ${name} {\n${lines.join('\n')}\n}`;
}

/**
 * Emit unitless NUMBER tokens (DTCG `$type: number`) as Kotlin `Float`s, used for
 * the elevation shadow-tint alpha ladder, which is a shadow OPACITY (0..1), never a
 * dp dimension. Members camel the LAST path segment (`level1`, `sheet`); the value
 * is the bare number with an `f` suffix (`0.28f`) so it types as `Float` (Compose
 * `Color.copy(alpha = …)` wants a Float).
 */
export function ktNumberObject(name: string, prefix: string, nums: TToken[]): string {
  const lines = nums.map((t) => `    val ${dimMember(prefix, t)} = ${val(t)}f`);
  return `object ${name} {\n${lines.join('\n')}\n}`;
}

/**
 * Like [ktDimObject] but members camel the FULL path minus the category, for
 * nested semantic sets whose leaves collide across groups (density.rowHeight.compact
 * + density.padY.compact would both be `compact` under [dimMember]).
 */
export function ktPathDimObject(name: string, dims: TToken[]): string {
  const lines = dims.map((t) => `    val ${camel(t.path.slice(1))} = ${val(t)}`);
  return `object ${name} {\n${lines.join('\n')}\n}`;
}

/**
 * Best-effort composite type ramp for Compose. Emits family (primary), size (sp),
 * weight (FontWeight), and line-height (sp) per Material role. Full TextStyle/Font
 * wiring is left to the app (it needs the bundled Font resources).
 */
export function ktTypeObject(roles: TToken[]): string {
  const cls =
    'data class NockerlTextStyle(\n' +
    '    val fontFamily: String,\n' +
    '    val fontWeight: Int,\n' +
    '    val fontSize: TextUnit,\n' +
    '    val lineHeight: TextUnit,\n' +
    ')';
  const lines = roles.map((t) => {
    const v = (t.$value ?? t.value) as Record<string, unknown>;
    const family = Array.isArray(v.fontFamily) ? String(v.fontFamily[0]) : String(v.fontFamily);
    const member = camel(t.path.slice(1));
    return `    val ${member} = NockerlTextStyle("${family}", ${String(v.fontWeight)}, ${toSp(v.fontSize)}, ${toSp(v.lineHeight)})`;
  });
  return `${cls}\n\n/** Material 3 type ramp (best-effort: family/weight/size/line-height). */\nobject NockerlType {\n${lines.join('\n')}\n}`;
}

/** Motion objects for Compose: integer-ms durations + CubicBezierEasing curves. */
export function ktMotionObjects(durations: TToken[], easings: TToken[]): string {
  const dur = durations.map((t) => `    val ${dimMember('', t)}Ms = ${durMs(t)}`);
  const eas = easings.map((t) => {
    const [x1, y1, x2, y2] = bezierPts(t);
    return `    val ${dimMember('', t)} = CubicBezierEasing(${x1}f, ${y1}f, ${x2}f, ${y2}f)`;
  });
  return (
    '/** Motion durations (integer milliseconds). */\n' +
    `object NockerlMotionDuration {\n${dur.join('\n')}\n}` +
    '\n\n/** Motion easing curves. `standard` is THE default transition ease. */\n' +
    `object NockerlMotionEasing {\n${eas.join('\n')}\n}`
  );
}

// ---------------------------------------------------------------------------
// SWIFT (SwiftUI)
// ---------------------------------------------------------------------------

export function swiftColorEnum(name: string, colors: TToken[]): string {
  const lines = colors.map((t) => `    public static let ${colorMember(t)} = ${val(t)}`);
  return `public enum ${name} {\n${lines.join('\n')}\n}`;
}

export function swiftDimEnum(name: string, prefix: string, dims: TToken[]): string {
  const lines = dims.map((t) => `    public static let ${dimMember(prefix, t)}: CGFloat = ${val(t)}`);
  return `public enum ${name} {\n${lines.join('\n')}\n}`;
}

/**
 * Emit unitless NUMBER tokens (DTCG `$type: number`) as Swift `Double`s, the
 * SwiftUI analogue of [ktNumberObject] for the elevation shadow-tint alpha ladder.
 * `Color.opacity(_:)` takes a `Double`, so the members type as `Double` (not
 * `CGFloat`), with the bare number as the literal (`0.28`).
 */
export function swiftNumberEnum(name: string, prefix: string, nums: TToken[]): string {
  const lines = nums.map((t) => `    public static let ${dimMember(prefix, t)}: Double = ${val(t)}`);
  return `public enum ${name} {\n${lines.join('\n')}\n}`;
}

/** Full-path-member variant of [swiftDimEnum] (see [ktPathDimObject]). */
export function swiftPathDimEnum(name: string, dims: TToken[]): string {
  const lines = dims.map(
    (t) => `    public static let ${camel(t.path.slice(1))}: CGFloat = ${val(t)}`,
  );
  return `public enum ${name} {\n${lines.join('\n')}\n}`;
}

/** Best-effort composite type ramp for SwiftUI: family/weight/size/line-height. */
export function swiftTypeEnum(roles: TToken[]): string {
  const struct =
    'public struct NockerlTextStyle {\n' +
    '    public let fontFamily: String\n' +
    '    public let fontWeight: Int\n' +
    '    public let fontSize: CGFloat\n' +
    '    public let lineHeight: CGFloat\n' +
    '}';
  const lines = roles.map((t) => {
    const v = (t.$value ?? t.value) as Record<string, unknown>;
    const family = Array.isArray(v.fontFamily) ? String(v.fontFamily[0]) : String(v.fontFamily);
    return `    public static let ${camel(t.path.slice(1))} = NockerlTextStyle(fontFamily: "${family}", fontWeight: ${String(v.fontWeight)}, fontSize: ${bareNum(v.fontSize)}, lineHeight: ${bareNum(v.lineHeight)})`;
  });
  return `${struct}\n\n/// Type ramp (best-effort: family/weight/size/line-height).\npublic enum NockerlType {\n${lines.join('\n')}\n}`;
}

/** Motion for SwiftUI: TimeInterval durations + bezier control-point structs. */
export function swiftMotionEnums(durations: TToken[], easings: TToken[]): string {
  const dur = durations.map(
    (t) => `    public static let ${dimMember('', t)}: TimeInterval = ${durMs(t) / 1000}`,
  );
  const eas = easings.map((t) => {
    const [x1, y1, x2, y2] = bezierPts(t);
    return `    public static let ${dimMember('', t)} = NockerlBezier(x1: ${x1}, y1: ${y1}, x2: ${x2}, y2: ${y2})`;
  });
  return (
    '/// Motion durations (seconds).\npublic enum NockerlMotionDuration {\n' +
    dur.join('\n') +
    '\n}\n\n/// A cubic-bezier easing (control points). Feed `Animation.timingCurve`.\n' +
    'public struct NockerlBezier {\n    public let x1: Double\n    public let y1: Double\n    public let x2: Double\n    public let y2: Double\n}\n\n' +
    '/// Motion easing curves. `standard` is THE default transition ease.\npublic enum NockerlMotionEasing {\n' +
    eas.join('\n') +
    '\n}'
  );
}
