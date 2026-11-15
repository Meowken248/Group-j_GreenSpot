# -*- coding: utf-8 -*-
import os
from PIL import Image

# We can search through all extracted_images to inspect their titles
extracted_dir = r"c:\wamp64\www\Group-j_GreenSpot\extracted_images"
all_files = [f for f in os.listdir(extracted_dir) if f.endswith(".png")]

print(f"Total extracted png files: {len(all_files)}")

# Let's crop the header from each image and save to scratch/headers
header_dir = r"c:\wamp64\www\Group-j_GreenSpot\scratch\headers"
os.makedirs(header_dir, exist_ok=True)

# Also let's check file sizes and dimensions
summary = []
for f in all_files:
    p = os.path.join(extracted_dir, f)
    im = Image.open(p)
    w, h = im.size
    # If size is around 800-900 x 500-600, it's likely one of Tu's wireframes!
    # Notice: image67 (873x556), image6 (877x557), image47 (877x556), image48 (876x555), etc.
    if 800 <= w <= 950 and 500 <= h <= 650:
        crop_box = (int(w * 0.18), int(h * 0.08), int(w * 0.98), int(h * 0.22))
        c = im.crop(crop_box)
        c_path = os.path.join(header_dir, f"hdr_{f}")
        c.save(c_path)
        summary.append((f, w, h, "Tu-wireframe-size"))

print("Found matching sizes:")
for s in summary:
    print(s)
