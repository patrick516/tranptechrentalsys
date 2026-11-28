// In-app file viewer. The file is fetched with the session token and shown
// inside a dialog, so nothing is saved to the user's Downloads folder.
import { useEffect, useState } from "react";
import { ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { apiBlob } from "../../api/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FileViewerProps {
  docId: string | null;
  title: string;
  onClose: () => void;
}

const TEXT_KINDS = ["text/", "application/json", "application/xml"];

export default function FileViewer({ docId, title, onClose }: FileViewerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let objectUrl: string | null = null;
    if (!docId) {
      setUrl(null);
      setText("");
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    setUrl(null);
    setText("");

    (async () => {
      try {
        const { blob, fileName } = await apiBlob(`/files/${docId}/content`);
        const type = blob.type || "application/octet-stream";
        setMimeType(type);
        if (TEXT_KINDS.some((t) => type.startsWith(t))) {
          setText(await blob.text());
        } else {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
        void fileName;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not open this file");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [docId]);

  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  async function openInNewTab() {
    if (!url) return;
    window.open(url, "_blank", "noopener");
  }

  return (
    <Dialog open={Boolean(docId)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="pr-8">{title}</DialogTitle>
          <DialogDescription>
            Shown here instead of saving it to your computer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">{mimeType || "…"}</span>
          {url && (
            <Button variant="outline" size="sm" onClick={openInNewTab}>
              <ExternalLink aria-hidden />
              Open in a new tab
            </Button>
          )}
        </div>

        <div className="max-h-[65vh] overflow-auto rounded-md border border-slate-200 bg-slate-50">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Opening file…
            </div>
          )}

          {error && (
            <p role="alert" className="flex items-start gap-2 p-6 text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          {!loading && !error && url && isImage && (
            <img src={url} alt={title} className="mx-auto max-h-[65vh] bg-white" />
          )}

          {!loading && !error && url && isPdf && (
            <iframe
              src={url}
              title={title}
              className="h-[65vh] w-full bg-white"
            />
          )}

          {!loading && !error && url && !isImage && !isPdf && (
            <p className="p-6 text-sm text-slate-600">
              This file type opens in the browser. Use “Open in a new tab” above.
            </p>
          )}

          {!loading && !error && text && (
            <pre className="whitespace-pre-wrap p-4 font-mono text-xs text-brand-navy">
              {text}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
