import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";
import { Toaster } from "sonner";

const queryClient = new QueryClient();

/** App-wide providers: data fetching, the ReactFlow canvas context, and toasts. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ReactFlowProvider>{children}</ReactFlowProvider>
      <Toaster richColors position="bottom-right" />
    </QueryClientProvider>
  );
}
