# Decision Log: JAC-17 — Reflect save state in the UI

**Ticket:** Pasted by the user (Linear MCP connector was unreachable at the time; see Open questions).
**Branch:** feature/jac-17-reflect-save-state-in-ui
**Date:** 2026-07-20

## Context

The editor's Save button gave no indication of whether the canvas actually
had unsaved edits, or when it was last persisted — `SaveWorkflowButton` only
ever showed a transient action status ("Saving…", "Saved", "Failed to
save"), which reverted to blank on the next unrelated re-render trigger and
never told the user *when* the workflow was last saved. JAC-17 asks for a
persistent "Saved" / "Unsaved changes" indicator plus an always-visible
last-saved time, moved out of the top-left title card and onto the same row
as "Add Node". It also asks for resilience against transient server
failures: retry a failed save 3s after a 5xx, retry once more 5s after a
second 5xx, and if that also fails, tell the user clearly rather than fail
silently.

## Decisions

### Dirty tracking via a snapshot comparison, not a separate "did anything change" flag threaded through every mutation

- **Choice:** `useWorkflowPersistence` keeps a `savedSnapshotRef` — the
  JSON-serialized `Workflow` as of the last successful load or save. A
  `useEffect` re-serializes the current `nodes`/`edges`/`name` on every
  change and compares it to the snapshot to derive `isDirty`.
- **Alternatives considered:** Track dirtiness incrementally (set a flag on
  every node/edge/name mutation in the store, clear it on save). Rejected —
  that means every mutation call site in the app (add node, delete node,
  connect edge, rename, drag) needs to remember to flip the flag, which is
  exactly the kind of thing that silently drifts out of sync the first time
  someone adds a new mutation. A snapshot comparison is correct by
  construction and only needs updating in the two places state can become
  "clean" (load, successful save).
- **Trade-offs / risks accepted:** Re-serializing the whole workflow on every
  canvas change is `O(n)` in node/edge count per render — fine at this
  exercise's scale (a handful of nodes), not something to keep doing
  unchanged if workflows grow into the hundreds of nodes.

### Retry only on 5xx; every other failure keeps its existing (immediate) handling

- **Choice:** `save()`'s catch block checks `err.response?.status >= 500`
  before retrying. A 5xx retries up to twice, waiting 3s then 5s
  (`RETRY_DELAYS_MS`), via a real `setTimeout`-backed `sleep`. A 422 (client
  or server-side validation failure) or a network error with no response at
  all reports immediately through the existing toast path — retrying a 422
  can't succeed (the payload is still invalid), and there's no clear signal
  a network error is transient the way a 5xx is.
- **Alternatives considered:** Retry on any failure, including network
  errors. Rejected — the ticket specifically calls out 5xx, and retrying a
  network error the same way risks masking a real client-side problem (e.g.
  a misconfigured API base URL) behind a slow, silent retry loop.
- **Trade-offs / risks accepted:** None significant — this is exactly the
  ticket's spec (3s, then 5s, then give up).

### Exhausted retries surface a dialog, not another toast

- **Choice:** Added `ServerErrorDialog` (`features/persist-workflow/ui`), a
  small from-scratch modal (no existing dialog/modal primitive in the repo)
  shown when `serverIssue` is `true` — set only once both retries have also
  failed with a 5xx. It explains there's a problem on the backend's end and
  offers a dismiss button; `useWorkflowPersistence` exposes
  `dismissServerIssue()` to clear it.
- **Alternatives considered:** Reuse the existing toast stack
  (`useValidationWarnings`/`ValidationWarnings`) for this too, since it's
  already wired into the page. Rejected — a toast auto-dismisses after 5s
  and is easy to miss, but "the backend is down and your last two save
  attempts both failed" is exactly the kind of thing the ticket asked to be
  shown as a clear, impossible-to-miss warning; a modal that stays until the
  user acknowledges it is the better fit for that specific case. Toasts
  remain correct for every other failure (422s, non-server errors) — those
  are handled immediately, don't repeat, and don't warrant blocking the UI.
- **Trade-offs / risks accepted:** Introduces a bespoke dialog component
  rather than a shared `shared/ui/Dialog` primitive, since none existed to
  build on — if a second dialog need shows up later, it's worth factoring
  the overlay/backdrop logic out at that point rather than before there's a
  second consumer.

### Save/status pill moved out of the title card, onto the Add Node row

- **Choice:** `WorkflowEditorPage`'s title card (`← Workflows` / `Workflow
  editor`) now only contains the title itself. `SaveWorkflowButton` moved
  into a new row alongside `AddNodeToolbar`, positioned after it (so it
  reads as slightly to the right, per the request).
- **Alternatives considered:** Leave Save in the title card and only change
  its internal content. Rejected — explicitly requested; grouping Save with
  Add Node also reads better as "the two actions you take on this canvas",
  separate from pure navigation/title chrome.

### Pill is black-background/white-text, separate from the existing red error/invalid text

- **Choice:** `SaveWorkflowButton` renders a `bg-black text-white
  rounded-full` pill for the dirty/clean/saving state ("Saved" / "Unsaved
  changes" / "Saving…"), a plain slate-colored "Last saved …" (or "Not saved
  yet") line that's always present, and — unchanged from before — a red line
  for `error`/`invalid` statuses with the specific reason.
- **Alternatives considered:** Fold the error text into the same pill.
  Rejected — the pill answers one question ("is there anything to save
  right now") and the red text answers a different one ("why did the last
  save attempt fail specifically") — collapsing them would mean the pill's
  color/meaning changes depending on unrelated state.

## Open questions / follow-ups

- The Linear MCP connector was returning `net::ERR_FAILED` on every call
  (`get_issue`, `list_issues`, `list_issue_statuses`) for the whole session,
  so the ticket was never fetched from Linear directly and wasn't moved to
  "In Progress" via the connector — the user pasted the ticket text instead.
  Worth transitioning the ticket manually, or retrying once the connector is
  back.
- `isDirty` recomputes by re-serializing the whole workflow on every
  render where `nodes`/`edges`/`name` changed — fine at this exercise's
  scale, called out above as a scaling consideration if workflows grow
  large.
- No live repro exists for the exhausted-retry dialog (would require the
  backend to genuinely 5xx twice in a row); covered by fake-timer unit tests
  in `useWorkflowPersistence.test.ts` instead. The single-retry-then-succeed
  path and the dirty/clean/timestamp UI were verified live in the browser.
