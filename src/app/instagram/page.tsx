"use client";

import { useState } from "react";
import SB_PageHeader from "@/components/ui/SB_PageHeader";
import SB_Tabs from "@/components/ui/SB_Tabs";
import SB_MetricCard from "@/components/ui/SB_MetricCard";
import SB_Card from "@/components/ui/SB_Card";
import SB_LineChart from "@/components/charts/SB_LineChart";
import SB_MiniList from "@/components/ui/SB_MiniList";

const igMetrics = [
  { title: "Followers", value: "18.4K" },
  { title: "Reach", value: "420K" },
  { title: "Impressions", value: "690K" },
  { title: "Interactions", value: "34.5K" },
];

const igPerformance = [
  { label: "Week 1", reach: 200 },
  { label: "Week 2", reach: 170 },
  { label: "Week 3", reach: 150 },
  { label: "Week 4", reach: 110 },
  { label: "Week 5", reach: 85 },
  { label: "Week 6", reach: 150 },
  { label: "Week 7", reach: 108 },
];

export default function InstagramPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <>
      <SB_PageHeader
        title="Instagram Overview"
        description="@acmecompany · Detailed Instagram analytics."
        actionLabel="＋ Create"
      />

      <SB_Tabs
        tabs={[
          { label: "Overview", value: "overview" },
          { label: "Content", value: "content" },
          { label: "Audience", value: "audience" },
          { label: "Stories", value: "stories" },
          { label: "Reels", value: "reels" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {igMetrics.map((m) => (
          <SB_MetricCard key={m.title} title={m.title} value={m.value} />
        ))}
      </div>

      {/* Charts & Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mt-4">
        <SB_Card>
          <strong>Performance Over Time</strong>
          <div className="mt-4">
            <SB_LineChart
              data={igPerformance}
              lines={[
                { dataKey: "reach", color: "#ef4b9a", name: "Reach" },
              ]}
              height={280}
            />
          </div>
        </SB_Card>

        <SB_Card>
          <strong>Engagement</strong>
          <SB_MiniList
            className="mt-3"
            items={[
              { label: "Likes", value: <b>24.8K</b> },
              { label: "Comments", value: <b>1.9K</b> },
              { label: "Shares", value: <b>4.7K</b> },
              { label: "Saves", value: <b>3.1K</b> },
            ]}
          />
        </SB_Card>
      </div>
    </>
  );
}
