"use client";

import { useState } from "react";
import SB_Input from "@/components/ui/SB_Input";
import SB_TextArea from "@/components/ui/SB_TextArea";
import SB_Select from "@/components/ui/SB_Select";
import SB_FileUpload from "@/components/ui/SB_FileUpload";
import SB_Button from "@/components/ui/SB_Button";

interface SB_CreatePostFormProps {
  onPublish: () => void;
  onSaveDraft: () => void;
}

export default function SB_CreatePostForm({
  onPublish,
  onSaveDraft,
}: SB_CreatePostFormProps) {
  const [platforms, setPlatforms] = useState({ instagram: true, facebook: true });
  const [contentType, setContentType] = useState("image");
  const [caption, setCaption] = useState(
    "New collection is out now ✨\n\n#NewCollection #SummerVibes #ACME"
  );
  const [publishOption, setPublishOption] = useState("now");
  const [scheduledDate, setScheduledDate] = useState("2026-08-12 14:00");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {/* Left Column */}
      <div>
        {/* Platform Selection */}
        <div className="mb-3.5">
          <label className="block text-xs text-[#6d7a90] font-bold mb-1.5">
            Publish to
          </label>
          <div className="flex gap-2.5">
            <label className="flex items-center gap-2 border border-line px-3 py-2.5 rounded-[12px] bg-white cursor-pointer">
              <input
                type="checkbox"
                checked={platforms.instagram}
                onChange={(e) =>
                  setPlatforms((p) => ({ ...p, instagram: e.target.checked }))
                }
              />
              Instagram
            </label>
            <label className="flex items-center gap-2 border border-line px-3 py-2.5 rounded-[12px] bg-white cursor-pointer">
              <input
                type="checkbox"
                checked={platforms.facebook}
                onChange={(e) =>
                  setPlatforms((p) => ({ ...p, facebook: e.target.checked }))
                }
              />
              Facebook
            </label>
          </div>
        </div>

        {/* Content Type */}
        <div className="mb-3.5">
          <SB_Select
            options={[
              { label: "Post / Image", value: "image" },
              { label: "Video", value: "video" },
              { label: "Reel", value: "reel" },
              { label: "Carousel", value: "carousel" },
              { label: "Story", value: "story" },
            ]}
            value={contentType}
            onChange={setContentType}
          />
        </div>

        {/* Media Upload */}
        <div className="mb-3.5">
          <label className="block text-xs text-[#6d7a90] font-bold mb-1.5">
            Media
          </label>
          <SB_FileUpload />
        </div>
      </div>

      {/* Right Column */}
      <div>
        {/* Caption */}
        <SB_TextArea
          label="Caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />

        {/* Schedule Options */}
        <div className="grid grid-cols-2 gap-3.5 mt-3.5">
          <div>
            <SB_Select
              options={[
                { label: "Publish now", value: "now" },
                { label: "Schedule", value: "schedule" },
                { label: "Save draft", value: "draft" },
              ]}
              value={publishOption}
              onChange={setPublishOption}
            />
          </div>
          <SB_Input
            label="Date / time"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2.5 mt-5">
          <SB_Button variant="ghost" onClick={onSaveDraft}>
            Save Draft
          </SB_Button>
          <SB_Button variant="primary" onClick={onPublish}>
            Publish
          </SB_Button>
        </div>
      </div>
    </div>
  );
}
