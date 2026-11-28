#!/usr/bin/env python3
"""Neutral theme for the shadcn Sheet (the side drawer): lighter overlay, white
panel, grey border, blue focus ring, no green fill on the close button.

Run from the admin folder:  python3 tools/patch-sheet-theme.py
Safe to run twice. If any expected text is missing, the file is NOT changed.
"""
import pathlib
import sys

FILE = "src/components/ui/sheet.tsx"
PAIRS = [
    ("bg-black/80", "bg-black/40"),
    ("fixed z-50 gap-4 bg-background p-6 shadow-lg", "fixed z-50 gap-4 bg-white p-6 shadow-lg"),
    ("top-0 border-b data-[state=closed]:slide-out-to-top", "top-0 border-b border-slate-200 data-[state=closed]:slide-out-to-top"),
    ("bottom-0 border-t data-[state=closed]:slide-out-to-bottom", "bottom-0 border-t border-slate-200 data-[state=closed]:slide-out-to-bottom"),
    ("w-3/4 border-r data-[state=closed]:slide-out-to-left", "w-3/4 border-r border-slate-200 data-[state=closed]:slide-out-to-left"),
    ("w-3/4 border-l data-[state=closed]:slide-out-to-right", "w-3/4 border-l border-slate-200 data-[state=closed]:slide-out-to-right"),
    ("focus:ring-2 focus:ring-ring focus:ring-offset-2", "focus:ring-2 focus:ring-primary/30 focus:ring-offset-2"),
    ("data-[state=open]:bg-secondary", "data-[state=open]:text-slate-500"),
    ("text-lg font-semibold text-foreground", "text-lg font-semibold text-brand-navy"),
    ('cn("text-sm text-muted-foreground", className)', 'cn("text-sm text-slate-500", className)'),
]


def main() -> int:
    path = pathlib.Path(FILE)
    if not path.exists():
        print(f"SKIP  {FILE} (not found; run this from the admin folder)")
        return 1
    original = path.read_text()
    text, problems = original, []
    for old, new in PAIRS:
        if old in text:
            if text.count(old) != 1:
                problems.append(f"found {text.count(old)} times (expected 1): {old[:60]}...")
            else:
                text = text.replace(old, new)
        elif new not in text:
            problems.append(f"not found: {old[:60]}...")
    if problems:
        print(f"FAIL  {FILE}: not changed")
        for p in problems:
            print(f"      - {p}")
        return 1
    if text == original:
        print(f"OK    {FILE}: already patched")
    else:
        path.write_text(text)
        print(f"DONE  {FILE}: patched")
    return 0


if __name__ == "__main__":
    sys.exit(main())
