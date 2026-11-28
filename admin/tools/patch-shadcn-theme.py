#!/usr/bin/env python3
"""Neutral theme for the shadcn Dialog and Select (no green highlight, lighter overlay).

Run from the admin folder:  python3 tools/patch-shadcn-theme.py
- Edits only src/components/ui/dialog.tsx and src/components/ui/select.tsx.
- Safe to run twice (already-patched files are left alone).
- If any expected text is not found, that file is NOT changed and the problem is printed.
"""
import pathlib
import sys

PATCHES = {
    "src/components/ui/dialog.tsx": [
        # lighter overlay
        ("bg-black/80", "bg-black/40"),
        # white box, grey border, margin on phones, scrolls when tall
        (
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg",
            "fixed left-[50%] top-[50%] z-50 grid max-h-[90vh] w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto border border-slate-200 bg-white p-6 shadow-lg",
        ),
        ("sm:rounded-lg", "rounded-lg"),
        # close button: blue focus ring, no green fill
        ("focus:ring-2 focus:ring-ring focus:ring-offset-2", "focus:ring-2 focus:ring-primary/30 focus:ring-offset-2"),
        (
            " data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
            " data-[state=open]:text-slate-500",
        ),
        # description text: grey instead of navy
        ('cn("text-sm text-muted-foreground", className)', 'cn("text-sm text-slate-500", className)'),
    ],
    "src/components/ui/select.tsx": [
        ("h-9 w-full items-center justify-between", "h-10 w-full items-center justify-between"),
        (
            "border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
            "border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-background data-[placeholder]:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25",
        ),
        (
            "rounded-md border bg-popover text-popover-foreground shadow-md",
            "rounded-md border border-slate-200 bg-white text-brand-navy shadow-md",
        ),
        # the highlighted item: light grey instead of solid green
        ("focus:bg-accent focus:text-accent-foreground", "focus:bg-slate-100 focus:text-brand-navy"),
        ('cn("-mx-1 my-1 h-px bg-muted", className)', 'cn("-mx-1 my-1 h-px bg-slate-100", className)'),
    ],
}


def patch_file(path: pathlib.Path, pairs):
    text = path.read_text()
    problems = []
    for old, new in pairs:
        if old in text:
            if text.count(old) != 1:
                problems.append(f"found {text.count(old)} times (expected 1): {old[:60]}...")
            else:
                text = text.replace(old, new)
        elif new in text:
            continue  # already patched
        else:
            problems.append(f"not found: {old[:60]}...")
    return text, problems


def main() -> int:
    failed = False
    for name, pairs in PATCHES.items():
        path = pathlib.Path(name)
        if not path.exists():
            print(f"SKIP  {name} (file not found; run this from the admin folder)")
            failed = True
            continue
        original = path.read_text()
        text, problems = patch_file(path, pairs)
        if problems:
            failed = True
            print(f"FAIL  {name}: not changed")
            for p in problems:
                print(f"      - {p}")
        elif text == original:
            print(f"OK    {name}: already patched")
        else:
            path.write_text(text)
            print(f"DONE  {name}: patched")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
