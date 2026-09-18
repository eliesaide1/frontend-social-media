"use client";

import { useState, useEffect } from "react";

interface SB_LiveIndicatorProps {
  isLive: boolean;
  lastUpdated: Date | null;
  onToggle: (live: boolean) => void;
  /**
   * True when the SignalR hub is connected, so updates are pushed the moment
   * something changes rather than waiting for the next poll.
   */
  realtimeConnected?: boolean;
}

export default function SB_LiveIndicator({
  isLive,
  lastUpdated,
  onToggle,
  realtimeConnected = false,
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

  // "Live" alone became ambiguous once pushes existed: a connected hub and a 15s
  // poll both showed the same word, so there was no way to tell whether what is
  // on screen moves on its own or only on the next tick.
  const label = !isLive ? "Paused" : realtimeConnected ? "Live" : "Polling";

  const title = !isLive
    ? "Updates are paused"
    : realtimeConnected
      ? "Connected — changes are pushed as they happen"
      : "Not connected to live updates; refreshing on a timer";

  return (
    <button
      onClick={() => onToggle(!isLive)}
      title={title}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-line text-xs cursor-pointer hover:bg-[#f5f7fb] transition-colors"
    >
      <span
        className={`w-2 h-2 rounded-full ${
          !isLive
            ? "bg-[#8a96aa]"
            : realtimeConnected
              ? "bg-green animate-pulse"
              : "bg-[#f0a500]"
        }`}
      />
      <span className="font-medium">{label}</span>
      {lastUpdated && <span className="text-muted">{timeAgo}</span>}
    </button>
  );
}
