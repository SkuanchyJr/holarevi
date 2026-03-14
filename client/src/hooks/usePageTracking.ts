import { useEffect } from "react";
import { useLocation } from "wouter";

export function usePageTracking() {
  const [location] = useLocation();

  useEffect(() => {
    // Don't track admin pages
    if (location.startsWith("/admin")) {
      return;
    }

    // Track page view
    fetch("/api/track-page-view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ path: location }),
    }).catch(() => {
      // Silently fail - analytics should not break the app
    });
  }, [location]);
}
