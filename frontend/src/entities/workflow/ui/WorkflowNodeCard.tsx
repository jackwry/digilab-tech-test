import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

import type { HandleDefinition } from "../model/types";
import type { FlowNode } from "../model/flowTypes";

const HANDLE_SIZE = 10;

/**
 * Each handle row gets its own fixed-height, `position: relative` `<li>`, so
 * the `Handle` (itself `position: absolute` by default) centers vertically
 * within *that row* rather than ReactFlow's default of centering on the
 * whole node — which, before this, visually collided with the node's title
 * (confirmed during review: both were landing at ~50% of the full card
 * height). The `<li>` being `w-full` inside a `flex-1` `<ul>` also keeps the
 * handle's `left: 0` / `right: 0` flush with the card's true edges, not just
 * wherever the row happens to sit.
 */
const HANDLE_ROW_HEIGHT = 20;

/**
 * The handle itself is a small neutral circle. Every visual property here is
 * set via inline `style`, not Tailwind classes: ReactFlow's own (unlayered)
 * stylesheet sets explicit `width`, `height`, `border`, `border-radius`, and
 * `background-color` on `.react-flow__handle`. Tailwind v4's utilities live
 * inside `@layer`, and the CSS cascade always ranks unlayered rules above
 * layered ones regardless of specificity or source order — so `h-*`/
 * `rounded-*`/`bg-*` classes silently lose to ReactFlow's defaults (confirmed
 * in-browser: computed size stayed 6px and border-radius stayed 100% even
 * with those classes applied). Inline style outranks both layers.
 */
const HANDLE_BADGE_STYLE = {
  width: HANDLE_SIZE,
  height: HANDLE_SIZE,
  border: "none",
  borderRadius: "9999px",
  backgroundColor: "#64748b",
} as const;

function HandleRow({
  handle,
  handleType,
}: {
  handle: HandleDefinition;
  handleType: "target" | "source";
}) {
  const isInput = handleType === "target";

  return (
    <li className="relative w-full" style={{ height: HANDLE_ROW_HEIGHT }}>
      <Handle
        id={handle.id}
        type={handleType}
        position={isInput ? Position.Left : Position.Right}
        title={handle.type}
        style={HANDLE_BADGE_STYLE}
      >
        {/* Nested inside the handle itself, but positioned to read inward
            (toward the node body) rather than over the handle's circle. */}
        <span
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] text-slate-600 ${
            isInput ? "left-full ml-1.5" : "right-full mr-1.5"
          }`}
        >
          {handle.label}
        </span>
      </Handle>
    </li>
  );
}

/**
 * A basic custom node showing its type, label, and input/output handles with
 * their data types. Inputs are listed on the left, outputs on the right —
 * each handle sits flush on the node's edge, with its label reading inward.
 */
export function WorkflowNodeCard({ data }: NodeProps<FlowNode>) {
  const { label, nodeType, inputs, outputs } = data;

  return (
    <div className="min-w-56 rounded-lg border-2 border-slate-700 bg-white shadow-sm">
      <div className="rounded-t-md bg-slate-700 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
        {nodeType}
      </div>

      <div className="px-3 py-2 text-sm font-medium text-slate-900">{label}</div>

      <div className="flex gap-3 pb-3">
        <ul className="flex flex-1 flex-col gap-2">
          {inputs.map((handle) => (
            <HandleRow key={handle.id} handle={handle} handleType="target" />
          ))}
        </ul>
        <ul className="flex flex-1 flex-col gap-2">
          {outputs.map((handle) => (
            <HandleRow key={handle.id} handle={handle} handleType="source" />
          ))}
        </ul>
      </div>
    </div>
  );
}
