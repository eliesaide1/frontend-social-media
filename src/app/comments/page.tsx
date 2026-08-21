"use client";

import SB_PageHeader from "@/components/ui/SB_PageHeader";
import SB_Card from "@/components/ui/SB_Card";
import SB_DataTable from "@/components/ui/SB_DataTable";
import SB_Badge from "@/components/ui/SB_Badge";
import SB_Button from "@/components/ui/SB_Button";

interface CommentRow {
  user: string;
  platform: "instagram" | "facebook";
  comment: string;
}

const comments: CommentRow[] = [
  {
    user: "@jane.doe",
    platform: "instagram",
    comment: "This is amazing 🔥",
  },
  {
    user: "Karim A.",
    platform: "facebook",
    comment: "Where can I order this?",
  },
];

export default function CommentsPage() {
  return (
    <>
      <SB_PageHeader
        title="Comments"
        description="Unified community management workspace."
      />

      <SB_Card>
        <SB_DataTable
          columns={[
            { header: "User", accessor: "user" },
            {
              header: "Platform",
              accessor: (row: CommentRow) => (
                <SB_Badge variant={row.platform}>
                  {row.platform === "instagram" ? "Instagram" : "Facebook"}
                </SB_Badge>
              ),
            },
            { header: "Comment", accessor: "comment" },
            {
              header: "Action",
              accessor: () => (
                <SB_Button variant="ghost">Reply</SB_Button>
              ),
            },
          ]}
          data={comments}
        />
      </SB_Card>
    </>
  );
}
