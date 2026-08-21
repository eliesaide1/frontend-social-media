"use client";

import { useState, useEffect } from "react";

interface SB_LiveIndicatorProps {
  isLive: boolean;
  lastUpdated: Date | null;
  onToggle: (live: boolean) => void;
}

export default function SB_LiveIndicator({
  isLive,
  lastUpdated,
  onToggle,
}: SB_LiveIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState("");

  // Update "time ago" every 5 seconds
  useEffect(() => {
    function update() {
      if (!lastUpdated) return;
      const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (seconds < 5) setTimeAgo("just now");
      else if (seconds < 60) setTimeAgo(`${seconds}s ago`);
      else setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
    }
    update();
    const timer = setInterval(update, 5000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  return (
    <button
      onClick={() => onToggle(!isLive)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-line text-xs cursor-pointer hover:bg-[#f5f7fb] transition-colors"
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isLive ? "bg-green animate-pulse" : "bg-[#8a96aa]"
        }`}
      />
      <span className="font-medium">{isLive ? "Live" : "Paused"}</span>
      {lastUpdated && (
        <span className="text-muted">{timeAgo}</span>
      )}
    </button>
  );
}
