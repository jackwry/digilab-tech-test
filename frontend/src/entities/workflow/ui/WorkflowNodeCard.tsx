import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

import type { FlowNode } from "../model/flowTypes";

const HANDLE_STYLE = { width: 10, height: 10, background: "#64748b" } as const;

/**
 * A basic custom node showing its type, label, and input/output handles with
 * their data types.
 *
 * TODO (candidate): this is intentionally minimal (brief §C1).
 */
export function WorkflowNodeCard({ data }: NodeProps<FlowNode>) {
  const { label, nodeType, inputs, outputs } = data;

  return (
    <div className="min-w-44 rounded-lg border-2 border-slate-700 bg-white shadow-sm">
      <div className="rounded-t-md bg-slate-700 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
        {nodeType}
      </div>

      <div className="px-3 py-2 text-sm font-medium text-slate-900">{label}</div>

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
