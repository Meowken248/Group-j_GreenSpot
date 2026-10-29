# -*- coding: utf-8 -*-
import docx

doc = docx.Document(r"c:\wamp64\www\Group-j_GreenSpot\Báo Cáo.docx")

with open(r"c:\wamp64\www\Group-j_GreenSpot\scratch\tu_docx_details.txt", "w", encoding="utf-8") as out:
    out.write(f"Total paragraphs: {len(doc.paragraphs)}\n")
    out.write(f"Total tables: {len(doc.tables)}\n\n")

    # Look for all paragraphs mentioning Chức năng 13 to 24 or Huỳnh Anh Tú
    out.write("=== PARAGRAPHS 300 to 500 ===\n")
    for i in range(250, 550):
        if i < len(doc.paragraphs):
            p_text = doc.paragraphs[i].text.strip()
            if p_text:
                out.write(f"P[{i}]: {p_text}\n")

    out.write("\n=== ALL PARAGRAPHS WITH 'Chức năng' ===\n")
    for i, p in enumerate(doc.paragraphs):
        t = p.text.strip()
        if "chức năng" in t.lower() or "hình 4." in t.lower():
            out.write(f"P[{i}]: {t}\n")

print("Done extracting paragraphs to tu_docx_details.txt")
