import { apiRequest, apiUpload } from "./client";

export interface FolderNode {
  id: string;
  type: "root" | "customer" | "year" | "month" | "kind";
  label: string;
  path: string;
  fileCount: number;
  children: FolderNode[];
}

export interface FileDoc {
  _id: string;
  title: string;
  kind: "NATIONAL_ID" | "CONTRACT" | "PAYMENT_PROOF" | "REPORT_EXPORT" | "OTHER";
  folder: string;
  customerId?: string | null;
  bookingId?: string | null;
  url: string;
  mimeType: string;
  sizeBytes: number;
  storageProvider: "CLOUDINARY" | "LOCAL";
  createdAt?: string;
}

export interface CustomerOption {
  _id: string;
  code: string;
  name: string;
}

export const filesApi = {
  list: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== ""),
    ).toString();
    return apiRequest<{ data: FileDoc[]; total: number }>(
      `/files${query ? `?${query}` : ""}`,
    );
  },
  tree: () =>
    apiRequest<{
      data: {
        roots: FolderNode[];
        totalFiles: number;
        totalBytes: number;
      };
    }>("/files/tree"),
  customers: () => apiRequest<{ data: CustomerOption[] }>("/customers"),
  upload: (formData: FormData) => apiUpload("/files/upload", formData),
};
