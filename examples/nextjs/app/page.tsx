"use client";

import { BasedashChat, BasedashProvider } from "@basedash/embed/react";
import { useCallback } from "react";

export default function Home() {
  const fetchToken = useCallback(async () => {
    const response = await fetch("/api/basedash-token");
    if (!response.ok) {
      throw new Error("Could not create a Basedash embed token");
    }
    return response.text();
  }, []);

  return (
    <main style={{ height: "100vh" }}>
      <BasedashProvider fetchToken={fetchToken}>
        <BasedashChat
          loadingFallback={<p>Loading analytics…</p>}
          style={{ minHeight: 640 }}
        />
      </BasedashProvider>
    </main>
  );
}
