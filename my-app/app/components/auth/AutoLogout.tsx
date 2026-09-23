"use client";

import { useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";

// 15 minutes inactivity timeout
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; 

export default function AutoLogout() {
  const { data: session, status } = useSession();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Only set the timer if the user is authenticated
    if (status === "authenticated") {
      timeoutRef.current = setTimeout(() => {
        // Log the user out after inactivity
        signOut({ callbackUrl: "/login?message=Session expired due to inactivity" });
      }, INACTIVITY_TIMEOUT);
    }
  };

  useEffect(() => {
    // Initial timer setup
    resetTimer();

    // Events that count as user activity
    const events = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart"
    ];

    const handleActivity = () => {
      resetTimer();
    };

    if (status === "authenticated") {
      events.forEach((event) => {
        window.addEventListener(event, handleActivity);
      });
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [status]);

  // This component doesn't render anything visible
  return null;
}
