# -*- coding: utf-8 -*-
from PIL import Image
import os

extracted_dir = r"c:\wamp64\www\Group-j_GreenSpot\extracted_images"
crop_dir = r"c:\wamp64\www\Group-j_GreenSpot\scratch\all_headers"
os.makedirs(crop_dir, exist_ok=True)

files = [f for f in os.listdir(extracted_dir) if f.endswith(".png")]

for f in files:
    p = os.path.join(extracted_dir, f)
    im = Image.open(p)
    w, h = im.size
    # crop the title region: x from 150 to 750, y from 60 to 140
    if w >= 800 and h >= 500:
        c = im.crop((int(w * 0.18), int(h * 0.08), int(w * 0.85), int(h * 0.17)))
        c.save(os.path.join(crop_dir, f"hdr_{f}"))

print("Cropped headers for all large png files!")
