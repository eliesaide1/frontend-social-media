"use client";

import SB_PageHeader from "@/components/ui/SB_PageHeader";

export default function SettingsPage() {
  return (
    <>
      <SB_PageHeader
        title="Settings"
        description="Workspace, client and platform settings."
      />

      <div className="border-2 border-dashed border-[#d6deeb] rounded-[18px] bg-[#fbfcff] p-[50px] text-center text-[#7d899c]">
        Settings placeholder — connections, users, permissions, branding.
      </div>
    </>
  );
}
