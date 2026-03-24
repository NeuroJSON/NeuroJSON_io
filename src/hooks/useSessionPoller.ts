import { useAppDispatch } from "./useAppDispatch";
import { useAppSelector } from "./useAppSelector";
import { useEffect, useRef } from "react";
import { getCurrentUser } from "redux/auth/auth.action";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const useSessionPoller = () => {
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Interval polling
  useEffect(() => {
    if (!isLoggedIn) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      dispatch(getCurrentUser());
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLoggedIn, dispatch]);

  // Immediate check when user returns to the tab
  useEffect(() => {
    if (!isLoggedIn) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        dispatch(getCurrentUser());
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isLoggedIn, dispatch]);
};
