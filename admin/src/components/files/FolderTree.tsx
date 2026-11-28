// Left-hand folder tree for the file explorer (spec 9.6).
// Customers → year → month → kind, plus an Exports root.
import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FolderNode } from "../../api/files";

interface FolderTreeProps {
  nodes: FolderNode[];
  selectedPath: string;
  onSelect: (path: string) => void;
  level?: number;
}

function Icon({ open }: { open: boolean }) {
  return open ? (
    <FolderOpen className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
  ) : (
    <Folder className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
  );
}

export default function FolderTree({
  nodes,
  selectedPath,
  onSelect,
  level = 0,
}: FolderTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    customers: true,
  });

  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const open = Boolean(expanded[node.path]);
        const selected = selectedPath === node.path;
        const showChevron = hasChildren && node.type !== "kind";

        return (
          <li key={node.path}>
            <div
              className="flex items-center gap-1"
              style={{ paddingLeft: `${level * 12}px` }}
            >
              <button
                type="button"
                aria-label={open ? `Collapse ${node.label}` : `Expand ${node.label}`}
                aria-expanded={showChevron ? open : undefined}
                onClick={() =>
                  showChevron &&
                  setExpanded((prev) => ({ ...prev, [node.path]: !open }))
                }
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  !showChevron && "invisible",
                )}
              >
                {open ? (
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                )}
              </button>

              <button
                type="button"
                onClick={() => onSelect(node.path)}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  selected
                    ? "bg-slate-100 font-semibold text-primary"
                    : "font-medium text-slate-600 hover:bg-slate-50 hover:text-brand-navy",
                )}
              >
                {node.type === "kind" ? (
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                ) : (
                  <Icon open={open} />
                )}
                <span className="truncate">{node.label}</span>
                <span className="ml-auto shrink-0 text-xs tabular-nums text-slate-400">
                  {node.fileCount}
                </span>
              </button>
            </div>

            {hasChildren && open && (
              <FolderTree
                nodes={node.children}
                selectedPath={selectedPath}
                onSelect={onSelect}
                level={level + 1}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
