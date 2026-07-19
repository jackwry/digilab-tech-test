import { useEffect, useRef, useState } from "react";

import { NODE_DEFINITIONS } from "@/entities/workflow";
import type { NodeType } from "@/entities/workflow";

import { NODE_TYPE_DESCRIPTIONS, NODE_TYPE_LABELS } from "../model/nodeCopy";

const ADDABLE_NODE_TYPES = Object.keys(NODE_DEFINITIONS) as NodeType[];

function PlusIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M8 2v12M2 8h12" />
    </svg>
  );
}

interface AddNodeToolbarProps {
  onAdd: (nodeType: NodeType) => void;
}

/**
 * "Add Node" dropdown for adding one of the permitted node types to the
 * canvas (brief §C1 / JAC-6). The menu list is derived from
 * `NODE_DEFINITIONS` so it can't drift out of sync if a node type is added
 * or removed.
 *
 * Positions itself relative to wherever it's rendered (e.g. inline in the
 * page's title panel) rather than assuming its own placement on the page.
 */
export function AddNodeToolbar({ onAdd }: AddNodeToolbarProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSelect = (nodeType: NodeType) => {
    onAdd(nodeType);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 shadow hover:bg-white"
      >
        <PlusIcon />
        Add Node
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {ADDABLE_NODE_TYPES.map((nodeType) => (
            <button
              key={nodeType}
              type="button"
              role="menuitem"
              onClick={() => handleSelect(nodeType)}
              className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-slate-50"
            >
              <span className="text-sm font-medium text-slate-800">
                {NODE_TYPE_LABELS[nodeType]}
              </span>
              <span className="text-xs text-slate-500">
                {NODE_TYPE_DESCRIPTIONS[nodeType]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
