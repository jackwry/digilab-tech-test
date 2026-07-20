import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

import type { FlowNode } from "../model/flowTypes";

const HANDLE_STYLE = { width: 10, height: 10, background: "#64748b" } as const;

interface WorkflowNodeCardProps extends NodeProps<FlowNode> {
  /** Called with (id, label) when an edit to the node's label is committed. */
  onLabelChange?: (id: string, label: string) => void;
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

/**
 * A basic custom node showing its type, label, and input/output handles with
 * their data types. The label is editable (JAC-9): a hover-revealed edit
 * icon at the end of the label switches it to a text input. Enter/blur
 * commits, Escape cancels. An empty label reverts rather than committing,
 * since blank node labels aren't meaningful in the canvas.
 *
 * TODO (candidate): this is intentionally minimal (brief §C1).
 */
export function WorkflowNodeCard({
  id,
  data,
  onLabelChange,
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
      <div className="rounded-t-md bg-slate-700 px-3 py-1 text-[10px] font-semibold tracking-wide text-white uppercase">
        {nodeType}
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

      <div className="grid grid-cols-2 gap-3 px-3 pb-2 text-[10px] text-slate-500">
        <ul>
          {inputs.map((handle) => (
            <li key={handle.id}>
              ◦ {handle.label}: {handle.type}
            </li>
          ))}
        </ul>
        <ul className="text-right">
          {outputs.map((handle) => (
            <li key={handle.id}>
              {handle.label}: {handle.type} ◦
            </li>
          ))}
        </ul>
      </div>

      {inputs.map((handle, index) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="target"
          position={Position.Left}
          style={{
            ...HANDLE_STYLE,
            top: `${((index + 1) / (inputs.length + 1)) * 100}%`,
          }}
        />
      ))}
      {outputs.map((handle, index) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="source"
          position={Position.Right}
          style={{
            ...HANDLE_STYLE,
            top: `${((index + 1) / (outputs.length + 1)) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}
