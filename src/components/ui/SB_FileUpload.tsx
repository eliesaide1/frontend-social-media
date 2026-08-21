"use client";

import { useRef } from "react";
import SB_Button from "./SB_Button";

interface SB_FileUploadProps {
  onFileSelect?: (files: FileList) => void;
  accept?: string;
}

export default function SB_FileUpload({
  onFileSelect,
  accept = "image/*,video/*",
}: SB_FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect?.(e.target.files);
    }
  };

  return (
    <div
      className="border-[1.5px] border-dashed border-[#c9d3e6] rounded-[16px] bg-[#fafcff] min-h-[220px] grid place-items-center text-[#7b879c] text-center p-5 cursor-pointer"
      onClick={() => inputRef.current?.click()}
    >
      <div>
        <b className="text-text">Drag & drop media</b>
        <div className="text-xs text-muted mt-1">
          Upload images or videos for your post
        </div>
        <SB_Button
          variant="ghost"
          className="mt-3"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          Choose File
        </SB_Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
