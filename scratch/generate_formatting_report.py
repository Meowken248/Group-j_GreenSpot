# -*- coding: utf-8 -*-
import re

md_path = r"c:\wamp64\www\Group-j_GreenSpot\DANH_SACH_CHUC_NANG_DU_AN_GREENSPOT.md"

with open(md_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

with open(r"c:\wamp64\www\Group-j_GreenSpot\scratch\formatting_report.txt", "w", encoding="utf-8") as out:
    out.write(f"Total lines: {len(lines)}\n\n")

    out.write("=== TABLE CAPTIONS ===\n")
    for idx, line in enumerate(lines):
        if line.strip().startswith("*Bảng") or line.strip().startswith("Bảng"):
            out.write(f"L[{idx+1}]: {line.strip()}\n")

    out.write("\n=== FIGURE CAPTIONS ===\n")
    for idx, line in enumerate(lines):
        if line.strip().startswith("*Hình") or line.strip().startswith("Hình"):
            out.write(f"L[{idx+1}]: {line.strip()}\n")

    out.write("\n=== HEADINGS ===\n")
    for idx, line in enumerate(lines):
        if line.startswith("#"):
            out.write(f"L[{idx+1}]: {line.strip()}\n")

print("Report written to formatting_report.txt successfully!")
