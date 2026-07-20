/**
 * Public API of the `connect-nodes` feature slice.
 */
export type {
  ConnectionRejectionReason,
  ConnectionValidationResult,
} from "./model/connectionValidation";
export { validateConnection } from "./model/connectionValidation";

export { useConnectNodes } from "./model/useConnectNodes";
export type { UseConnectNodesResult } from "./model/useConnectNodes";

export { ConnectionWarning } from "./ui/ConnectionWarning";
