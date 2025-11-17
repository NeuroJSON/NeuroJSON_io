import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function useGAPageviews(measurementId = "G-F0BKEF4Y2R") {
  const location = useLocation();

  useEffect(() => {
    // guard for dev or if gtag not yet loaded
    if (typeof window.gtag !== "function") return;

    const path = location.pathname + location.search + location.hash;

    // GA4 recommended SPA approach: call config on each route change
    window.gtag("config", measurementId, {
      page_path: path,
      page_title: document.title,
    });
  }, [location, measurementId]);
}
