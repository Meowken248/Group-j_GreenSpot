# -*- coding: utf-8 -*-
from PIL import Image
import os

check_list = [
    'image1.png', 'image2.png', 'image13.png', 'image22.png', 
    'image25.png', 'image26.png', 'image28.png', 'image30.png', 
    'image36.png', 'image37.png', 'image38.png', 'image9.png'
]

extracted_dir = r"c:\wamp64\www\Group-j_GreenSpot\extracted_images"

for f in check_list:
    p = os.path.join(extracted_dir, f)
    if os.path.exists(p):
        im = Image.open(p)
        print(f"{f}: size = {im.size}")
