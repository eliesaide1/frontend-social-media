"use client";

import { useState } from "react";
import SB_Sidebar from "./SB_Sidebar";
import SB_Topbar from "./SB_Topbar";
import SB_Modal from "@/components/ui/SB_Modal";
import SB_CreatePostForm from "@/components/forms/SB_CreatePostForm";
import SB_Toast from "@/components/ui/SB_Toast";
import { useToast } from "@/hooks/useToast";
import { DateRangeProvider } from "@/contexts/DateRangeContext";

export default function SB_DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  // The provider wraps the shell so the topbar selector and every page below
  // read the same range — previously the selection lived in local state here
  // and reached nothing.
  return (
    <DateRangeProvider>
      <DashboardChrome>{children}</DashboardChrome>
    </DateRangeProvider>
  );
}

function DashboardChrome({ children }: { children: React.ReactNode }) {
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  return (
    <div className="flex min-h-screen">
      <SB_Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCreatePost={() => setCreatePostOpen(true)}
      />
      <main className="flex-1 min-w-0">
        <SB_Topbar
          onExport={() => showToast("Report exported")}
          onMenuToggle={() => setSidebarOpen(true)}
        />
        <section className="p-4 sm:p-5 lg:p-7">{children}</section>
      </main>

      {/* Create Post Modal */}
      <SB_Modal
        open={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        title="Create Post"
        subtitle="Publish or schedule to connected platforms."
      >
        <SB_CreatePostForm
          onPublish={() => {
            setCreatePostOpen(false);
            showToast("Content published");
          }}
          onSaveDraft={() => {
            showToast("Draft saved");
          }}
        />
      </SB_Modal>

      {/* Global Toast */}
      <SB_Toast
        message={toast.message}
        show={toast.show}
        onHide={hideToast}
      />
    </div>
  );
}
