import { BrowserRouter, Route, Routes } from "react-router-dom";

import { WorkflowEditorPage } from "@/pages/workflow-editor";
import { WorkflowsHomePage } from "@/pages/workflows-home";

export function App() {
  return (
    <div className="h-full w-full">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WorkflowsHomePage />} />
          <Route
            path="/workflows/:workflowId"
            element={<WorkflowEditorPage />}
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
