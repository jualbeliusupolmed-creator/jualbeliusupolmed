"use client";

import { useState, useRef, useEffect } from "react";
import { hapticMedium } from "@/lib/haptics";

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const hapticTriggered = useRef(false);
  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  const PULL_THRESHOLD = 64;

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const handleTouchStart = (e) => {
      if (window.scrollY <= 2 && !isRefreshingRef.current) {
        startY.current = e.touches[0].pageY;
        isDragging.current = true;
        hapticTriggered.current = false;
      }
    };

    const handleTouchMove = (e) => {
      if (!isDragging.current || isRefreshingRef.current) return;
      const currentY = e.touches[0].pageY;
      const diff = currentY - startY.current;

      if (diff > 0 && window.scrollY <= 2) {
        e.preventDefault();
        // Logarithmic friction resistance
        const distance = Math.min(Math.pow(diff, 0.82) * 1.6, 90);
        pullDistanceRef.current = distance;
        setPullDistance(distance);

        if (distance >= PULL_THRESHOLD && !hapticTriggered.current) {
          hapticMedium();
          hapticTriggered.current = true;
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isDragging.current) return;
      isDragging.current = false;

      if (pullDistanceRef.current >= PULL_THRESHOLD && onRefreshRef.current && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        setPullDistance(50);
        try {
          await onRefreshRef.current();
        } catch {}
        setTimeout(() => {
          isRefreshingRef.current = false;
          pullDistanceRef.current = 0;
          setIsRefreshing(false);
          setPullDistance(0);
        }, 400);
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  return (
    <div className="relative">
      {/* Pull Indicator */}
      <div 
        className="fixed top-14 left-0 right-0 z-40 flex justify-center pointer-events-none transition-transform duration-200"
        style={{
          transform: `translateY(${Math.min(pullDistance, 70)}px)`,
          opacity: pullDistance > 10 || isRefreshing ? 1 : 0
        }}
      >
        <div className="flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 px-4 py-2 rounded-full shadow-lg border border-slate-200/80 dark:border-slate-800 backdrop-blur-md">
          <div 
            className={`w-4 h-4 rounded-full border-2 border-primary border-t-transparent ${isRefreshing ? "animate-spin" : ""}`}
            style={{
              transform: isRefreshing ? "none" : `rotate(${pullDistance * 4}deg)`
            }}
          />
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
            {isRefreshing ? "Memperbarui..." : pullDistance >= PULL_THRESHOLD ? "Lepas untuk segarkan" : "Tarik untuk segarkan"}
          </span>
        </div>
      </div>

      {children}
    </div>
  );
}
