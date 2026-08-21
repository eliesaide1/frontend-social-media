"use client";

import { useState } from "react";
import SB_PageHeader from "@/components/ui/SB_PageHeader";
import SB_Tabs from "@/components/ui/SB_Tabs";
import SB_Card from "@/components/ui/SB_Card";
import SB_DataTable from "@/components/ui/SB_DataTable";
import SB_Badge from "@/components/ui/SB_Badge";
import SB_Modal from "@/components/ui/SB_Modal";
import SB_MetricCard from "@/components/ui/SB_MetricCard";

interface ContentRow {
  title: string;
  platform: "instagram" | "facebook";
  type: string;
  reach: string;
  likes: string;
  isPaid: boolean;
  spend: string;
}

const contentData: ContentRow[] = [
  {
    title: "Summer Promo",
    platform: "instagram",
    type: "Image",
    reach: "91.2K",
    likes: "8.4K",
    isPaid: true,
    spend: "$3,200",
  },
  {
    title: "New Collection Launch",
    platform: "facebook",
    type: "Video",
    reach: "75.4K",
    likes: "5.3K",
    isPaid: false,
    spend: "—",
  },
];

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedPost, setSelectedPost] = useState<ContentRow | null>(null);

  return (
    <>
      <SB_PageHeader
        title="All Content"
        description="Cross-platform performance for published content."
        actionLabel="＋ Create Post"
      />

      <SB_Tabs
        tabs={[
          { label: "All", value: "all" },
          { label: "Instagram", value: "instagram" },
          { label: "Facebook", value: "facebook" },
          { label: "Paid", value: "paid" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <SB_Card>
        <SB_DataTable
          columns={[
            { header: "Content", accessor: "title" },
            {
              header: "Platform",
              accessor: (row: ContentRow) => (
                <SB_Badge variant={row.platform}>
                  {row.platform === "instagram" ? "Instagram" : "Facebook"}
                </SB_Badge>
              ),
            },
            { header: "Type", accessor: "type" },
            { header: "Reach", accessor: "reach" },
            { header: "Likes", accessor: "likes" },
            {
              header: "Paid?",
              accessor: (row: ContentRow) =>
                row.isPaid ? (
                  <SB_Badge variant="paid">Promoted</SB_Badge>
                ) : (
                  "—"
                ),
            },
            { header: "Spend", accessor: "spend" },
          ]}
          data={contentData}
          onRowClick={(row) => setSelectedPost(row)}
        />
      </SB_Card>

      {/* Post Detail Modal */}
      <SB_Modal
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        title={selectedPost?.title || ""}
        subtitle={`${selectedPost?.platform === "instagram" ? "Instagram" : "Facebook"} · ${selectedPost?.isPaid ? "Promoted post" : "Organic post"}`}
      >
        {selectedPost && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-[250px] md:h-[380px] rounded-[18px] bg-gradient-to-br from-[#7fc7ff] to-[#ffd6a8]" />
            <div className="grid grid-cols-2 gap-3.5">
              <SB_MetricCard title="Total Reach" value="620K" />
              <SB_MetricCard title="Organic Reach" value="42K" />
              <SB_MetricCard title="Paid Reach" value="578K" />
              <SB_MetricCard title="Spend" value="$3,200" />
            </div>
          </div>
        )}
      </SB_Modal>
    </>
  );
}
