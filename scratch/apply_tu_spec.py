# -*- coding: utf-8 -*-

md_path = r"c:\wamp64\www\Group-j_GreenSpot\DANH_SACH_CHUC_NANG_DU_AN_GREENSPOT.md"
tu_spec_path = r"c:\wamp64\www\Group-j_GreenSpot\scratch\tu_full_spec.md"

with open(md_path, "r", encoding="utf-8") as f:
    content = f.read()

with open(tu_spec_path, "r", encoding="utf-8") as f:
    new_tu_spec = f.read()

start_marker = "### 1. Phân hệ Huỳnh Anh Tú (13 → 24)"
end_marker = "### 2. Phân hệ Bùi Nguyễn Minh Quân (25 → 36)"

if start_marker not in content:
    print(f"Error: start_marker not found: {start_marker}")
    exit(1)

if end_marker not in content:
    print(f"Error: end_marker not found: {end_marker}")
    exit(1)

# Find positions
start_pos = content.find(start_marker)
end_pos = content.find(end_marker)

# Keep everything before start_marker, add new_tu_spec, add newline & separator, then everything from end_marker
updated_content = content[:start_pos] + new_tu_spec.strip() + "\n\n---\n\n" + content[end_pos:]

with open(md_path, "w", encoding="utf-8") as f:
    f.write(updated_content)

print(f"Successfully updated {md_path} with Tu's full academic specification!")
