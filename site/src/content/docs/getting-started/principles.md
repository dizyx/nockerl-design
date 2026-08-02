---
title: Principles
description: The opinionated point of view behind every Nockerl design decision.
status: review
---

These are the working principles other sessions consult for "how should we approach this
design?" They are practical and opinionated, not generic. The hard, non-negotiable
ruleset lives in [Design laws](/foundations/design-laws/); this page is the *why* behind
the rules.

## The principles

1. **One source of truth.** Every visual value comes from `tokens/`. If it is hardcoded in
   an app, it is a bug. The framework owns the value; clients consume it.

2. **Tokens over raw values.** Reference *semantic* tokens (`color.status.error`,
   `radius.control`), not raw hexes or pixel literals, so a theme change or a rebrand is
   one edit, everywhere.

3. **Consistency beats novelty.** A predictable radius / spacing / elevation rhythm across
   apps matters more than a clever one-off. The system's coherence is the product.

4. **Accessible by default.** Meet WCAG AA contrast on every state, never encode meaning in
   color alone (pair it with shape, icon, or text), respect `prefers-reduced-motion`, and
   keep targets and focus indicators within reach. Accessibility is table stakes, not a
   feature.

5. **Platform-honest.** Web feels native to the web; Compose feels native to Android;
   SwiftUI feels native to macOS. **Brand expression is unified, interaction is
   platform-native.** Shared tokens, platform-appropriate components. Never a
   lowest-common-denominator mush.

6. **Versioned, reviewable change.** A token edit is a pull request with a CHANGELOG entry.
   Consumers pin a version and upgrade deliberately. Nothing changes under a client's feet.

## Who decides

**The human is the design decision-maker.** The framework supplies rigor: every state,
accessibility, per-device behavior, options, a reference shelf, and deliberate
provocations. The design lead supplies the spark. We avoid the trained-mean default: the job is to
bring raw material and sharp provocations, not a single safe finished design.

## How to ask this project a design question

- **Canonical values** → `tokens/` (and the [Foundations](/foundations/color/) pages here).
- **Component behavior / anatomy** → the [Components](/components/button/) pages.
- **"Should we…" / approach** → here and in the project `docs/`.
- **Missing something?** Add it to the framework via a pull request. Never fork the
  decision into an app repo.
