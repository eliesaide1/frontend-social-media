"use client";

import SB_PageHeader from "@/components/ui/SB_PageHeader";
import SB_Card from "@/components/ui/SB_Card";
import SB_MiniList from "@/components/ui/SB_MiniList";
import SB_ProgressBar from "@/components/ui/SB_ProgressBar";

const countries = [
  { name: "Lebanon", pct: 38 },
  { name: "UAE", pct: 21 },
  { name: "Saudi Arabia", pct: 17 },
];

const ageGroups = [
  { range: "18–24", pct: "28%" },
  { range: "25–34", pct: "41%" },
  { range: "35–44", pct: "19%" },
];

export default function AudiencePage() {
  return (
    <>
      <SB_PageHeader
        title="Audience"
        description="Cross-platform demographics and follower insights."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        {/* Top Countries */}
        <SB_Card>
          <strong>Top Countries</strong>
          <div className="grid gap-2.5 mt-4">
            {countries.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">{c.name}</span>
                  <b className="text-sm">{c.pct}%</b>
                </div>
                <SB_ProgressBar value={c.pct} />
              </div>
            ))}
          </div>
        </SB_Card>

        {/* Age Groups */}
        <SB_Card>
          <strong>Age</strong>
          <SB_MiniList
            className="mt-3"
            items={ageGroups.map((a) => ({
              label: a.range,
              value: <b>{a.pct}</b>,
            }))}
          />
        </SB_Card>
      </div>
    </>
  );
}
