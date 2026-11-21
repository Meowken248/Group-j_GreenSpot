# -*- coding: utf-8 -*-
from PIL import Image
import os

images = [
    ("hinh_4_13", "image67.png"),
    ("hinh_4_14", "image6.png"),
    ("hinh_4_15", "image33.png"),
    ("hinh_4_16", "image47.png"),
    ("hinh_4_17", "image23.png"),
    ("hinh_4_18", "image48.png"),
    ("hinh_4_19", "image15.png"),
    ("hinh_4_20", "image12.png"),
    ("hinh_4_21", "image54.png"),
    ("hinh_4_22", "image52.png"),
    ("hinh_4_23", "image62.png"),
    ("hinh_4_24", "image3.png"),
]

crop_dir = r"c:\wamp64\www\Group-j_GreenSpot\scratch\crops"
os.makedirs(crop_dir, exist_ok=True)

for label, fname in images:
    img_path = os.path.join(r"c:\wamp64\www\Group-j_GreenSpot\extracted_images", fname)
    if os.path.exists(img_path):
        im = Image.open(img_path)
        # crop header area: top from y=50 to 180, x from 180 to 950
        w, h = im.size
        crop_box = (int(w * 0.18), int(h * 0.08), int(w * 0.98), int(h * 0.22))
        cropped = im.crop(crop_box)
        out_path = os.path.join(crop_dir, f"{label}_title.png")
        cropped.save(out_path)
        print(f"Cropped {label} ({fname}): size {w}x{h}")
    else:
        print(f"File not found: {img_path}")

print("Done cropping titles!")
