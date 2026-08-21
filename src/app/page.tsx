"use client";

import { useState } from "react";
import SB_PageHeader from "@/components/ui/SB_PageHeader";
import SB_Tabs from "@/components/ui/SB_Tabs";
import SB_MetricCard from "@/components/ui/SB_MetricCard";
import SB_Card from "@/components/ui/SB_Card";
import SB_LineChart from "@/components/charts/SB_LineChart";
import SB_DonutChart from "@/components/charts/SB_DonutChart";
import SB_Badge from "@/components/ui/SB_Badge";
import SB_MiniList from "@/components/ui/SB_MiniList";
import SB_DataTable from "@/components/ui/SB_DataTable";

const overviewMetrics = [
  { title: "Followers", value: "52.4K", change: "4.3%", sparkData: [22, 14, 18, 11, 17, 8, 14, 10, 4, 13, 9] },
  { title: "Reach", value: "684K", change: "12.8%" },
  { title: "Interactions", value: "48.7K", change: "8.2%" },
  { title: "Content Published", value: "87", change: "15.2%" },
  { title: "Ad Spend", value: "$12,480", change: "9.4%" },
];

const performanceData = [
  { label: "Week 1", instagram: 195, facebook: 225 },
  { label: "Week 2", instagram: 155, facebook: 205 },
  { label: "Week 3", instagram: 140, facebook: 198 },
  { label: "Week 4", instagram: 120, facebook: 190 },
  { label: "Week 5", instagram: 100, facebook: 170 },
  { label: "Week 6", instagram: 92, facebook: 150 },
  { label: "Week 7", instagram: 75, facebook: 140 },
];

const platformSplit = [
  { name: "Instagram", value: 420000, color: "#ef4b9a" },
  { name: "Facebook", value: 264000, color: "#356df3" },
];

const topContent = [
  { title: "Summer Promo", platform: "instagram" as const, reach: "91.2K" },
  { title: "New Collection", platform: "facebook" as const, reach: "75.4K" },
];

export default function OverviewPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [chartTab, setChartTab] = useState("reach");

  return (
    <>
      <SB_PageHeader
        title="Overview"
        description="Track and analyze social performance across all platforms."
        actionLabel="＋ Create Post"
      />

      <SB_Tabs
        tabs={[
          { label: "All Platforms", value: "all" },
          { label: "Instagram", value: "instagram" },
          { label: "Facebook", value: "facebook" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {overviewMetrics.map((m) => (
          <SB_MetricCard
            key={m.title}
            title={m.title}
            value={m.value}
            change={m.change}
            changeDirection="up"
            sparkData={m.sparkData}
            sparkColor="#7c5cff"
          />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mt-4">
        {/* Performance Over Time */}
        <SB_Card>
          <div className="flex justify-between items-center">
            <strong>Performance Over Time</strong>
            <div className="flex gap-4 text-[#68758b] text-xs">
              <span>
                <i className="inline-block w-2 h-2 rounded-full bg-pink mr-1.5" />
                Instagram
              </span>
              <span>
                <i className="inline-block w-2 h-2 rounded-full bg-brand mr-1.5" />
                Facebook
              </span>
            </div>
          </div>
          <SB_Tabs
            tabs={[
              { label: "Reach", value: "reach" },
              { label: "Interactions", value: "interactions" },
              { label: "Followers", value: "followers" },
            ]}
            activeTab={chartTab}
            onTabChange={setChartTab}
          />
          <SB_LineChart
            data={performanceData}
            lines={[
              { dataKey: "instagram", color: "#ef4b9a", name: "Instagram" },
              { dataKey: "facebook", color: "#356df3", name: "Facebook" },
            ]}
            height={280}
          />
        </SB_Card>

        {/* Platform Performance Donut */}
        <SB_Card>
          <strong>Platform Performance</strong>
          <div className="mt-7">
            <SB_DonutChart
              data={platformSplit}
              centerValue="684K"
              centerLabel="Total Reach"
            />
          </div>
          <SB_MiniList
            className="mt-5"
            items={[
              {
                label: <SB_Badge variant="instagram">Instagram</SB_Badge>,
                value: <b>420K</b>,
              },
              {
                label: <SB_Badge variant="facebook">Facebook</SB_Badge>,
                value: <b>264K</b>,
              },
            ]}
          />
        </SB_Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr] gap-4 mt-4">
        {/* Top Performing Content */}
        <SB_Card>
          <strong>Top Performing Content</strong>
          <SB_DataTable
            columns={[
              { header: "Content", accessor: "title" },
              {
                header: "Platform",
                accessor: (row: (typeof topContent)[0]) => (
                  <SB_Badge variant={row.platform}>{row.platform === "instagram" ? "Instagram" : "Facebook"}</SB_Badge>
                ),
              },
              { header: "Reach", accessor: "reach" },
            ]}
            data={topContent}
          />
        </SB_Card>

        {/* Upcoming Scheduled Posts */}
        <SB_Card>
          <strong>Upcoming Scheduled Posts</strong>
          <SB_MiniList
            className="mt-3"
            items={[
              { label: "IG · Product Teaser", value: "10:00" },
              { label: "FB · Blog", value: "14:30" },
            ]}
          />
        </SB_Card>

        {/* Recent Comments */}
        <SB_Card>
          <strong>Recent Comments</strong>
          <SB_MiniList
            className="mt-3"
            items={[
              {
                label: (
                  <span>
                    <b>jane.doe</b>
                    <div className="text-xs text-muted">This is amazing 🔥</div>
                  </span>
                ),
                value: "2m",
              },
              {
                label: (
                  <span>
                    <b>mariam.k</b>
                    <div className="text-xs text-muted">Love this!</div>
                  </span>
                ),
                value: "15m",
              },
            ]}
          />
        </SB_Card>
      </div>
    </>
  );
}
