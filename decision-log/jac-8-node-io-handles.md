# Decision Log: JAC-8 — Node IO Handles

**Ticket:** https://linear.app/jackmcr/issue/JAC-8/node-io-handles
**Branch:** feature/jac-8-node-io-handles
**Date:** 2026-07-19

## Context

JAC-8 asks for each node to have input/output handles defined as an array
(DataSource: `[] → [Dataset]`; Transform: `[Dataset] → [Dataset]`; Model:
`[Dataset] → [Model]`). This data model, and a basic `Handle`-per-array-entry
render, already existed in the repo before this ticket — inherited from the
exercise starter scaffold via JAC-5's FSD reorg (`NODE_DEFINITIONS` in
`entities/workflow/model/nodeDefinitions.ts`, rendered by `WorkflowNodeCard`).
Per the ticket owner, this ticket's actual scope narrowed to two things: (1)
real test coverage — the only existing test on this data was an explicit
placeholder ("an example test so Vitest is proven to work") — and (2) a
requested visual redesign of the handles: labels shown directly at their
handle instead of in a separate list. This went through three rounds of
direct feedback: (1) a neutral-coloured letter badge (`D`/`M`) with the label
beside it in normal document flow; (2) replaced with a neutral semicircular
"bump" (no letter), label nested inside the handle reading inward, handle
restored to sit flush on the node's edge (round 1 had drifted off the edge);
(3) semicircle changed to a smaller plain circle, and a layout bug fixed
where every handle's label was landing on top of the node's title text. The
description below reflects the final, delivered design; earlier rounds are
noted only where they explain a decision that carried forward.

## Decisions

### The circle is the connection point itself, not a decoration next to it

- **Choice:** The circular marker *is* the ReactFlow `Handle` (styled
  directly via `border-radius`/`width`/`height` on the `Handle` element),
  with the label nested as the `Handle`'s own child, rather than a separate
  styled `<div>` placed next to an invisible/plain handle. Per the ReactFlow
  docs (customization/handles#custom-handles), `Handle` supports children
  and is commonly customised this way.
- **Alternatives considered:** Rendering the marker as a sibling element with
  the actual `Handle` kept as an unstyled dot behind/beside it. Rejected —
  it's two DOM nodes tracking one visual concept, with a real risk of them
  drifting apart (marker visually present, but the actual clickable/
  connectable target size or position not matching what the user sees).
- **Trade-offs / risks accepted:** None significant — this is the
  documented, supported customization pattern.

### Each handle centers within its own row, not the whole node

- **Choice:** Round 1 moved the whole `Handle` into normal document flow via
  `style={{ position: "static" }}`, which drifted the connection point off
  the node's border — flagged directly by the ticket owner, fixed in round 2
  by reverting to ReactFlow's default absolute, edge-pinned CSS. That default
  centers the handle at `top: 50%` of its *nearest positioned ancestor* — and
  with no positioned ancestor closer than the outer node wrapper, "50%"
  meant 50% of the whole card's height (header + title + handle rows
  combined), which happened to land right on top of the title text (visible
  in the round-2 screenshot: both "Dataset" labels overlapping "Transform
  Dataset"). The fix: each handle's `<li>` row is now `position: relative`
  with an explicit height (`HANDLE_ROW_HEIGHT`), making *it* — not the whole
  node — the handle's containing block, so `top: 50%` centers within that
  20px row instead. The row's `<ul>` is `flex-1` and the `<li>` is `w-full`,
  which keeps `left: 0` / `right: 0` resolving against the card's true edges
  (not just the row's), so edge alignment is preserved. Verified in-browser:
  handle centre-x still equals the node's edge coordinate for all three node
  types, and handle centre-y (and its label) now sits clearly below the
  title's bottom edge, with no overlap.
- **Alternatives considered:** Percentage-based `top` computed from
  index/handle-count relative to the whole node (the pre-JAC-8 approach).
  Rejected — it requires knowing the node's total rendered height in advance
  to avoid landing on the header/title, which is fragile against label-length
  or font changes; anchoring to each row's own box is self-contained and
  correct regardless of how much content sits above it.
- **Trade-offs / risks accepted:** None — this is a strict improvement, and
  also makes the layout correct for a future node type with more than one
  handle per side (each gets its own row, deterministically stacked),
  which the previous "50% of whole node" math did not handle correctly either.

### Circle, smaller, no letter — single neutral colour

- **Choice:** Round 3 dropped the semicircle for a small (10px) full circle,
  per direct feedback, with no per-type marking beyond the adjacent label
  text (and the `title` attribute for a hover tooltip). The letter badge from
  round 1 had already been removed per feedback before round 2.
- **Alternatives considered:** Keeping the letter (`D`/`M`) inside the
  marker, and/or keeping the semicircle shape. Rejected per the ticket
  owner's explicit asks across rounds — the label text is the only type
  indicator now, and a plain circle was requested over the semicircle.

### Every visual property on the handle set via inline style, not Tailwind classes

- **Choice:** `width`, `height`, `border`, `border-radius`, and
  `background-color` are all set via inline `style` on the `Handle`, not
  Tailwind utility classes.
- **Alternatives considered:** Tailwind classes (`h-4 w-4 rounded-r-full
  bg-slate-500`), as originally implemented for the badge's background in
  the first round. Confirmed in-browser that this silently loses for *any*
  property ReactFlow's own stylesheet also sets on `.react-flow__handle`:
  `@xyflow/react/dist/style.css` sets explicit `width: 6px; height: 6px;
  border: 1px solid …; border-radius: 100%; background-color: …` on that
  class, and it is unlayered CSS, while Tailwind v4's utilities live inside
  `@layer utilities` — per the CSS cascade, unlayered rules always beat
  layered ones regardless of specificity or source order. The first round
  only hit this for `background-color`; this round's larger shape change
  (explicit size, asymmetric radius, no border) surfaced that it affects
  every one of these properties, not just colour. Inline `style` outranks
  cascade layers entirely, so all of them moved there; only `pointer-events`
  and layout classes on the *label* (which don't collide with anything
  ReactFlow sets) remain as Tailwind utilities.
- **Trade-offs / risks accepted:** The handle's visual styling is a plain
  style object rather than Tailwind classes — less consistent with the rest
  of the file, but there isn't a way around it given the unlayered/layered
  cascade conflict, short of wrapping ReactFlow's CSS in a layer at the
  import site (a global change with wider blast radius than this ticket
  warrants).

### Node width increased from `min-w-44` to `min-w-56`

- **Choice:** Per direct feedback alongside the overlap fix, the card's
  minimum width grew from 176px to 224px, giving the inward-reading handle
  labels and the node's own title more horizontal room.
- **Alternatives considered:** Leaving width unchanged, relying solely on the
  vertical fix above. The vertical fix alone resolves the *reported* overlap
  (labels and title no longer share a row at all), but the extra width was
  an explicit, separate ask and gives more breathing room for longer labels
  a future node type might introduce.

### No changes to the domain data model

- **Choice:** `types.ts` (`HandleDefinition`, `DataType`) and
  `nodeDefinitions.ts` (`NODE_DEFINITIONS`) are untouched — they already
  matched the ticket's spec exactly before this work started.

## Open questions / follow-ups

- Connection-rule validation (type compatibility, single-incoming-edge,
  etc. — brief §C2) is out of scope here; `useWorkflowCanvasState`'s
  `onConnect` still accepts any connection unconditionally (pre-existing
  `TODO`), unrelated to this ticket's ask.
- If a future ticket wants per-`DataType` visual distinction again (colour,
  icon, etc.) beyond the label text, revisit the cascade-layer note above
  first — it applies to any further styling of `Handle` elements directly.
