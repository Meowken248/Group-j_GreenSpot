# -*- coding: utf-8 -*-
import re

md_path = r"c:\wamp64\www\Group-j_GreenSpot\DANH_SACH_CHUC_NANG_DU_AN_GREENSPOT.md"

with open(md_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Check for table numbering
table_lines = []
figure_lines = []
for idx, line in enumerate(lines):
    if line.strip().startswith("*Bảng") or line.strip().startswith("Bảng"):
        table_lines.append((idx + 1, line.strip()))
    if line.strip().startswith("*Hình") or line.strip().startswith("Hình"):
        figure_lines.append((idx + 1, line.strip()))

print(f"Total table caption lines: {len(table_lines)}")
for t in table_lines[:15]:
    print(t)

print(f"\nTotal figure caption lines: {len(figure_lines)}")
for f in figure_lines[:15]:
    print(f)
