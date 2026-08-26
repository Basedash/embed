import { BasedashDashboards, BasedashProvider } from "@basedash/embed/react";
import { StrictMode, useCallback } from "react";
import { createRoot } from "react-dom/client";

function App() {
  const fetchToken = useCallback(async () => {
    const response = await fetch("/api/basedash-token");
    if (!response.ok) {
      throw new Error("Could not create a Basedash embed token");
    }
    return response.text();
  }, []);

  return (
    <BasedashProvider fetchToken={fetchToken}>
      <BasedashDashboards
        loadingFallback={<p>Loading analytics…</p>}
        style={{ height: "100vh" }}
      />
    </BasedashProvider>
  );
}

const root = document.getElementById("root");
if (root === null) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
