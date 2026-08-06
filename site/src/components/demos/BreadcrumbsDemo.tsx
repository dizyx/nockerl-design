/**
 * BreadcrumbsDemo: the live island for the Breadcrumbs canon (now the shared
 * _Breadcrumbs module; extracted so the component could grow the
 * width-aware mobile collapse without busting this file's budget).
 *
 * Shows: the full trail (leading glyphs, non-interactive current crumb); a deep
 * trail whose middle collapses into the keyboard-operable "…" menu; a width-capped
 * trail proving the current-crumb ellipsis; and a PHONE-NARROW stage
 * where the trail AUTO-collapses to first + "…" + current (breadcrumbs are a desktop
 * pattern; on mobile the fold keeps every ancestor reachable through the same
 * overflow menu). Desktop stages render exactly as before (NO-REGRESS).
 *
 * All component laws + the a11y contract live in _Breadcrumbs; this harness only
 * arranges the stages. TOKEN-REACTIVE demo chrome; the mobile stage is capped at
 * var(--size-container-lg), a real phone content width.
 */
import { useState } from 'react';
import { Breadcrumbs, BREADCRUMBS_STYLES, type Crumb } from './_Breadcrumbs';
import type { ComposeContract } from '@dizyx/nockerl-react';

// The page-component census contract: the Breadcrumbs canon lives in _Breadcrumbs
// (which declares its OWN contract for the raw menu rows it owns); this harness
// renders only the composed <Breadcrumbs>, with no raw controls of its own.
export const compose = { tier: 'leaf' } satisfies ComposeContract;

// demo chrome only; the component recipe is BREADCRUMBS_STYLES (injected below).
const STYLES = `
.nk-bc-demo { font-family: var(--font-family-sans); }
.nk-bc-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-bc-demo__lbl + .nk-bc-bar, .nk-bc-bar + .nk-bc-demo__lbl { margin-top: 0; }
.nk-bc-demo__block + .nk-bc-demo__block { margin-top: var(--space-5); }
/* The phone-narrow stage: a real mobile content width (the size ramp's
   container-lg), proving the auto-collapse without any viewport trickery. */
.nk-bc-demo__phone { max-width: var(--size-container-lg); }
.nk-bc-demo__note { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-bc-demo__note b { color: var(--color-accent-primary); }
`;

export default function BreadcrumbsDemo() {
  const [last, setLast] = useState<string>('none yet');

  const trail: Crumb[] = [
    { label: 'dizyx', href: '#', icon: 'root' },
    { label: 'nockerl-design', href: '#', icon: 'folder' },
    { label: 'Design the Breadcrumbs component', href: '#', icon: 'task' },
    { label: 'BreadcrumbsDemo.tsx', icon: 'file' },
  ];

  const deep: Crumb[] = [
    { label: 'dizyx', href: '#', icon: 'root' },
    { label: 'nockerl-design', href: '#', icon: 'folder' },
    { label: 'site', href: '#', icon: 'folder' },
    { label: 'src', href: '#', icon: 'folder' },
    { label: 'components', href: '#', icon: 'folder' },
    { label: 'demos', href: '#', icon: 'folder' },
    { label: 'BreadcrumbsDemo.tsx', icon: 'file' },
  ];

  const long: Crumb[] = [
    { label: 'dizyx', href: '#', icon: 'root' },
    { label: 'nockerl-dashboard', href: '#', icon: 'folder' },
    { label: 'Conform the entire web dashboard to the published design tokens', icon: 'task' },
  ];

  return (
    <div className="nk-bc-demo">
      <style>{BREADCRUMBS_STYLES}</style>
      <style>{STYLES}</style>

      <div className="nk-bc-demo__block">
        <p className="nk-bc-demo__lbl">Trail: leading glyphs, current crumb marked &amp; non-interactive</p>
        <Breadcrumbs items={trail} onNavigate={setLast} />
      </div>

      <div className="nk-bc-demo__block">
        <p className="nk-bc-demo__lbl">Deep path: middle collapses into a keyboard-openable “…” menu</p>
        <Breadcrumbs items={deep} collapseAfter={2} onNavigate={setLast} />
      </div>

      <div className="nk-bc-demo__block">
        <p className="nk-bc-demo__lbl">Truncation: width-capped, the current crumb ellipsizes</p>
        <Breadcrumbs items={long} capped onNavigate={setLast} />
      </div>

      <div className="nk-bc-demo__block">
        <p className="nk-bc-demo__lbl">Mobile: phone-narrow container auto-collapses to first + “…” + current</p>
        <div className="nk-bc-demo__phone">
          <Breadcrumbs items={deep} onNavigate={setLast} />
        </div>
      </div>

      <p className="nk-bc-demo__note">
        Last crumb navigated: <b>{last}</b>. The island is live. Tab the crumbs; open “…” with Enter/Space, arrow
        through it, Esc to close. The mobile fold keeps every ancestor reachable through the same menu.
      </p>
    </div>
  );
}
