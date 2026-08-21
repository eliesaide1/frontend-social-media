"use client";

import { useState } from "react";
import SB_PageHeader from "@/components/ui/SB_PageHeader";
import SB_Tabs from "@/components/ui/SB_Tabs";
import SB_MetricCard from "@/components/ui/SB_MetricCard";
import SB_Card from "@/components/ui/SB_Card";
import SB_DataTable from "@/components/ui/SB_DataTable";

const adsMetrics = [
  { title: "Ad Spend", value: "$12,480" },
  { title: "Paid Reach", value: "1.84M" },
  { title: "Impressions", value: "3.21M" },
  { title: "Clicks", value: "48.3K" },
  { title: "CTR", value: "1.50%" },
  { title: "CPC", value: "$0.26" },
];

const campaigns = [
  {
    name: "Summer Sale",
    platform: "IG + FB",
    spend: "$3,200",
    reach: "620K",
    clicks: "14.2K",
    ctr: "1.37%",
  },
  {
    name: "Back to School",
    platform: "Instagram",
    spend: "$2,100",
    reach: "410K",
    clicks: "8.1K",
    ctr: "1.25%",
  },
];

export default function AdsPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <>
      <SB_PageHeader
        title="Ads Performance"
        description="Dummy paid-media data for future Meta Ads integration."
      />

      <SB_Tabs
        tabs={[
          { label: "Overview", value: "overview" },
          { label: "Campaigns", value: "campaigns" },
          { label: "Ad Sets", value: "adsets" },
          { label: "Ads", value: "ads" },
          { label: "Content", value: "content" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {adsMetrics.map((m) => (
          <SB_MetricCard key={m.title} title={m.title} value={m.value} />
        ))}
      </div>

      {/* Campaigns Table */}
      <SB_Card className="mt-4">
        <strong>Top Campaigns</strong>
        <SB_DataTable
          columns={[
            { header: "Campaign", accessor: "name" },
            { header: "Platform", accessor: "platform" },
            { header: "Spend", accessor: "spend" },
            { header: "Reach", accessor: "reach" },
            { header: "Clicks", accessor: "clicks" },
            { header: "CTR", accessor: "ctr" },
          ]}
          data={campaigns}
        />
      </SB_Card>
    </>
  );
}
