import React from "react";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  accept?: string;
}

export default function FileUpload({
  onFileSelected,
  accept = "*/*",
}: FileUploadProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  }

  return (
    <input
      type="file"
      accept={accept}
      onChange={handleChange}
      className="block w-full text-xs text-brand-navy file:mr-3 file:rounded-md file:border-0 file:bg-brand-blue file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-navy"
    />
  );
}
