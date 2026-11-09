# -*- coding: utf-8 -*-
import docx

doc = docx.Document(r"c:\wamp64\www\Group-j_GreenSpot\Báo Cáo.docx")

# In docx, doc.part.related_parts has the relationships
for r_id in ['rId20', 'rId21', 'rId22', 'rId23', 'rId24', 'rId25', 'rId26', 'rId27', 'rId28', 'rId29', 'rId30', 'rId31']:
    rel = doc.part.rels.get(r_id)
    if rel:
        print(f"{r_id} -> {rel.target_ref}")
