import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { registerSW } from "virtual:pwa-register";
import posthog from "posthog-js";
import { PostHogProvider } from "@posthog/react";
import "./index.css";
import App from "./App";

// Initialize PostHog analytics
posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_TOKEN, {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  ui_host: "https://us.posthog.com",
  defaults: "2026-01-30",
});

// Register service worker for PWA support
registerSW({
  onNeedRefresh() {
    if (confirm("New version available. Reload to update?")) {
      window.location.reload();
    }
  },
  onOfflineReady() {
    console.log("App ready to work offline");
  },
});

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <PostHogProvider client={posthog}>
    <ConvexAuthProvider client={convex}>
      <App />
    </ConvexAuthProvider>
  </PostHogProvider>,
);
