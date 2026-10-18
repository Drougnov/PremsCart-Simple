import { useEffect, useState } from "react";

// Poll visible screens, revalidate on reconnect/focus, and after local writes.
// Updating data never remounts forms, so unsent drafts remain intact.
export function useRefreshTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "hidden") setTick((value) => value + 1);
    };
    const timer = setInterval(refresh, 5000);
    const events = ["focus", "online", "premscart-data-change"];
    events.forEach((event) => window.addEventListener(event, refresh));
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, refresh));
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return tick;
}
