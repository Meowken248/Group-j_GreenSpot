# -*- coding: utf-8 -*-

md_path = r"c:\wamp64\www\Group-j_GreenSpot\DANH_SACH_CHUC_NANG_DU_AN_GREENSPOT.md"

with open(md_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

tables_found = []
figures_found = []

for idx, line in enumerate(lines):
    l = line.strip()
    if l.startswith("*Bảng 4."):
        tables_found.append((idx + 1, l))
    if l.startswith("*Hình 4."):
        figures_found.append((idx + 1, l))

print(f"Total standardized tables: {len(tables_found)}")
print(f"Total standardized figures: {len(figures_found)}")

with open(r"c:\wamp64\www\Group-j_GreenSpot\scratch\verify_final.txt", "w", encoding="utf-8") as out:
    out.write("=== STANDARDIZED TABLES ===\n")
    for t in tables_found:
        out.write(f"L[{t[0]}]: {t[1]}\n")
    out.write("\n=== STANDARDIZED FIGURES ===\n")
    for f in figures_found:
        out.write(f"L[{f[0]}]: {f[1]}\n")

print("Written verification to verify_final.txt")
