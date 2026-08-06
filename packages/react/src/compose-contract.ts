/**
 * compose-contract.ts: the COMPOSITION CONTRACT convention.
 *
 * Every shipped design component (primitives + composites + shells) exports a
 * `const compose` describing HOW it may be composed. This file is the single,
 * type-checked source of that convention: the authoring spec lives here, not in a
 * hand-maintained markdown map (which rots). `scripts/compose-graph.ts` reads these
 * contracts + the real JSX composition graph and emits `build/compose-graph.json`;
 * the harness gate (and, once green, CI) fails on ANY violation. A dev-time runtime
 * guard (`assertComposeChildren`) warns if a container is slotted with an off-accepts
 * child in a client app too.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO KINDS of component:
 *
 *   LEAF renders its own markup and holds NO child design-components in a slot:
 *       export const compose = { tier: 'leaf' } satisfies ComposeContract;
 *     (NockerlIcon, NockerlStatusDot, NockerlBadge, NockerlSpinner, NockerlDivider, NockerlSwitch, NockerlSlider, …)
 *
 *   CONTAINER accepts child design-components in one or more named SLOTS:
 *       export const compose = {
 *         slots: {
 *           default:  { accepts: ['NockerlButton', 'NockerlIconButton', 'NockerlDivider'], required: true },
 *           trailing: { accepts: '*' },
 *         },
 *       } satisfies ComposeContract;
 *
 * SLOT names:
 *   • 'default'      → the JSX children:  <Toolbar> …these… </Toolbar>
 *   • '<propName>'   → a named ReactNode prop:  <Dialog footer={…this…} />
 *   The slot name MUST match the prop (or be 'default' for children) so the engine
 *   can map a usage's JSX back to the slot it fills.
 *
 * GLYPH props are NOT slots: a ReactNode prop that carries an <NockerlIcon> glyph
 * (leadingIcon, trailingIcon, a bare `icon`) is leaf ornamentation, not composition.
 * Do NOT model it as a slot. Model a slot only when it holds a structural child
 * COMPONENT (NockerlButton, NockerlListItem, NockerlDivider) or arbitrary component content. A component
 * whose only ReactNode props are glyphs is a LEAF (that `owns` its raw markup).
 *
 * accepts:
 *   • string[]  → ONLY these design components may appear as children in the slot.
 *   • '*'       → ANY design component may appear (generic wrappers: NockerlSurface, Card).
 *   EITHER WAY the slot FORBIDS raw hand-rolled FACSIMILE elements: a bare
 *   <button> (use NockerlButton/NockerlIconButton), <input> (NockerlTextField/NockerlCheckbox/NockerlSlider…),
 *   <a href> (NockerlLink), <hr> (NockerlDivider), [role=…] reimplementations, etc. Generic
 *   structural/text tags (div, span, p, ul, li, h1-6, section, …) are always fine
 *   as connective tissue, since they are not facsimiles of a primitive. The facsimile
 *   map lives in scripts/compose-graph.ts (raw tag → the primitive it duplicates).
 *
 * required:
 *   • true  → every usage of the component MUST fill this slot (Dialog needs a title).
 *   • false / omitted → optional.
 *
 * DERIVED TIER (emitted by the engine, never authored on a container):
 *   • leaf      is a LeafContract.
 *   • required  is a container with ≥1 required slot.
 *   • optional  is a container whose slots are all optional.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Children, isValidElement } from 'react';
import type { ReactNode } from 'react';

/** Allowed children of a slot: an explicit whitelist, or '*' (any design component). */
export type SlotAccepts = readonly string[] | '*';

export interface SlotSpec {
  /** Allowed child design-component names, or '*' for any. Raw facsimile elements
   *  (button/input/textarea/select/a[href]/hr/[role]) are forbidden either way. */
  accepts: SlotAccepts;
  /** Must this slot be filled at every usage site? Defaults to false. */
  required?: boolean;
}

interface BaseContract {
  /**
   * Raw FACSIMILE tags this component legitimately implements as its OWN primitive
   * identity: it IS the primitive for that element, so the raw tag is correct here,
   * not a hand-rolled copy. Examples: NockerlButton `owns: ['button']`, NockerlCheckbox
   * `['input']`, NockerlLink `['a']`, NockerlDivider `['hr']`, ProgressBar `['role=progressbar']`.
   *
   * Any facsimile tag a component renders that is NOT in its `owns` is a
   * `raw-facsimile` violation. Compose the real primitive instead. Shells and
   * composites (Sidebar, Toolbar, …) declare NO ownership of `button`/`input`/…,
   * so their hand-rolled controls flag until they compose NockerlButton / NockerlListItem / etc.
   *
   * Tag forms: a bare tag (`button`, `input`, `textarea`, `select`, `a`, `hr`,
   * `progress`) or a role form (`role=progressbar`, `role=switch`, `role=tab`, …).
   */
  owns?: readonly string[];
}

/** A component that holds no child design-components in a slot. */
export interface LeafContract extends BaseContract {
  tier: 'leaf';
}

/** A component that composes children in one or more named slots. */
export interface ContainerContract extends BaseContract {
  /** 'default' = JSX children; any other key = a named ReactNode prop of that name. */
  slots: Record<string, SlotSpec>;
}

/** The `compose` export shape every design component declares. */
export type ComposeContract = LeafContract | ContainerContract;

/** The engine-emitted tier (derived, not authored on containers). */
export type ComposeTier = 'leaf' | 'optional' | 'required';

/** Narrow a contract to the container shape. */
export function isContainer(c: ComposeContract): c is ContainerContract {
  return (c as ContainerContract).slots !== undefined;
}

/** Derive the tier from a contract: leaf → 'leaf'; container → 'required' if any slot
 *  is required, else 'optional'. Kept here so the engine and any runtime agree. */
export function tierOf(c: ComposeContract): ComposeTier {
  if (!isContainer(c)) return 'leaf';
  return Object.values(c.slots).some((s) => s.required) ? 'required' : 'optional';
}

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME dev-warning (Phase 4). The static compose-graph gate catches off-contract
// composition in THIS repo; this catches it at runtime in CLIENT apps (the dashboard,
// landing pages) that compose the published components. A container calls
// `assertComposeChildren` in its render with a slot's accepts + the slot's children; in
// development it console.warns on a raw hand-rolled facsimile element or an off-accepts
// child. It is a NO-OP in production and warns at most once per (component, slot, child).
// ─────────────────────────────────────────────────────────────────────────────

const RUNTIME_FACSIMILE_TAGS = new Set(['button', 'input', 'textarea', 'select', 'a', 'hr', 'progress']);
const RUNTIME_FACSIMILE_ROLES = new Set([
  'progressbar', 'switch', 'checkbox', 'radio', 'radiogroup', 'slider', 'tab', 'tablist', 'menu', 'menuitem',
]);
const warnedCompose = new Set<string>();
function warnOnceCompose(key: string, message: string): void {
  if (warnedCompose.has(key)) return;
  warnedCompose.add(key);
  console.warn(message);
}

/**
 * Dev-only composition guard. Call it in a container's render:
 *   assertComposeChildren('Toolbar', ['NockerlButton', 'NockerlIconButton', 'NockerlDivider'], children);
 * It walks the direct children and, in development, warns when a child is a raw facsimile
 * element (a bare <button>/<input>/<a>/… or a [role=…] reimplementation) or a design
 * component not in `accepts` (when `accepts` is an explicit list; '*' allows any design
 * component but still forbids raw facsimiles). No-op in production; dedupes warnings.
 */
export function assertComposeChildren(
  component: string,
  accepts: SlotAccepts,
  children: ReactNode,
  slot = 'default',
): void {
  if (process.env.NODE_ENV === 'production') return;
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const type = child.type as string | { displayName?: string; name?: string };
    if (typeof type === 'string') {
      const role = (child.props as { role?: string } | null | undefined)?.role;
      const isFacsimile = RUNTIME_FACSIMILE_TAGS.has(type) || (role != null && RUNTIME_FACSIMILE_ROLES.has(role));
      if (isFacsimile) {
        warnOnceCompose(
          `${component}:${slot}:raw:${type}:${role ?? ''}`,
          `[nockerl-design] <${component}> "${slot}" slot rendered a raw <${type}${role ? ` role="${role}"` : ''}> - compose the real primitive (NockerlButton / NockerlIconButton / NockerlTextField / NockerlLink / ...) instead of a hand-rolled element.`,
        );
      }
      return;
    }
    if (Array.isArray(accepts)) {
      const name = type.displayName || type.name || '';
      if (name && !accepts.includes(name)) {
        warnOnceCompose(
          `${component}:${slot}:off:${name}`,
          `[nockerl-design] <${component}> "${slot}" slot got <${name}> - it accepts only: ${accepts.join(', ')}.`,
        );
      }
    }
  });
}
