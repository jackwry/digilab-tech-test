import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
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
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[10px] whitespace-nowrap text-slate-600 ${
            isInput ? "left-full ml-1.5" : "right-full mr-1.5"
          }`}
        >
          {handle.label}
        </span>
      </Handle>
    </li>
  );
}

interface WorkflowNodeCardProps extends NodeProps<FlowNode> {
  /** Called with (id, label) when an edit to the node's label is committed. */
  onLabelChange?: (id: string, label: string) => void;
  /** Called with (id) when the node's delete icon is clicked. No confirmation (JAC-19). */
  onDelete?: (id: string) => void;
}

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.5 2.5a1.5 1.5 0 0 1 2 2L5 13l-3 1 1-3 8.5-8.5Z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="10"
      height="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  );
}

/**
 * A basic custom node showing its type, label, and input/output handles with
 * their data types. The label is editable (JAC-9): a hover-revealed edit
 * icon at the end of the label switches it to a text input. Enter/blur
 * commits, Escape cancels. An empty label reverts rather than committing,
 * since blank node labels aren't meaningful in the canvas. The node can be
 * deleted (JAC-19).
 */
export function WorkflowNodeCard({
  id,
  data,
  onLabelChange,
  onDelete,
}: WorkflowNodeCardProps) {
  const { label, nodeType, inputs, outputs } = data;
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);
  const settledRef = useRef(false);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const startEditing = () => {
    settledRef.current = false;
    setDraft(label);
    setIsEditing(true);
  };

  const settle = (commit: boolean) => {
    if (settledRef.current) return;
    settledRef.current = true;
    setIsEditing(false);

    if (!commit) return;
    const trimmed = draft.trim();
    if (trimmed && trimmed !== label) {
      onLabelChange?.(id, trimmed);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      settle(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      settle(false);
    }
  };

  return (
    <div className="min-w-44 rounded-lg border-2 border-slate-700 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 rounded-t-md bg-slate-700 px-3 py-1 text-[10px] font-semibold tracking-wide text-white uppercase">
        <span>{nodeType}</span>
        <button
          type="button"
          aria-label="Delete node"
          onClick={() => onDelete?.(id)}
          className="nodrag nopan shrink-0 rounded p-0.5 text-white/70 normal-case hover:bg-white/20 hover:text-white"
        >
          <DeleteIcon />
        </button>
      </div>

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => settle(true)}
          className="nodrag nopan mx-3 my-2 w-[calc(100%-1.5rem)] rounded border border-slate-400 px-1 py-0.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-600"
        />
      ) : (
        <div className="group flex items-center justify-between gap-2 px-3 py-2">
          <span className="text-sm font-medium text-slate-900">{label}</span>
          <button
            type="button"
            aria-label="Edit label"
            onClick={startEditing}
            className="nodrag nopan shrink-0 rounded p-1 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600 focus-visible:opacity-100"
          >
            <EditIcon />
          </button>
        </div>
      )}

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
