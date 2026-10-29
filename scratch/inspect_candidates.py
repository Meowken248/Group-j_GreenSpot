# -*- coding: utf-8 -*-
from PIL import Image
import os

images_to_check = ['image64.png', 'image66.png', 'image70.png', 'image72.png', 'image15.png', 'image23.png', 'image33.png']
crop_dir = r"c:\wamp64\www\Group-j_GreenSpot\scratch\inspect_titles"
os.makedirs(crop_dir, exist_ok=True)

for fname in images_to_check:
    p = os.path.join(r"c:\wamp64\www\Group-j_GreenSpot\extracted_images", fname)
    if os.path.exists(p):
        im = Image.open(p)
        w, h = im.size
        crop_box = (int(w * 0.15), int(h * 0.05), int(w * 0.95), int(h * 0.25))
        c = im.crop(crop_box)
        c.save(os.path.join(crop_dir, f"crop_{fname}"))
        print(f"Cropped {fname}")

print("Done cropping inspection images!")
