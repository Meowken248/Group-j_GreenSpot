# -*- coding: utf-8 -*-
from PIL import Image
import os

extracted_dir = r"c:\wamp64\www\Group-j_GreenSpot\extracted_images"
all_files = [f for f in os.listdir(extracted_dir) if f.endswith(".png")]

# List of already identified files
known = {
    # Tuan (12 files, 1051x657)
    'image1.png', 'image2.png', 'image13.png', 'image22.png', 
    'image25.png', 'image26.png', 'image28.png', 'image30.png', 
    'image36.png', 'image37.png', 'image38.png', 'image9.png',
    # Dat (12 files)
    'image64.png', 'image66.png', 'image70.png', 'image72.png',
    'image68.png', 'image69.png', 'image71.png', 'image56.png',
    'image42.png', 'image49.png', 'image40.png', 'image24.png',
    # Tu known (10 files)
    'image67.png', 'image6.png', 'image47.png', 'image33.png',
    'image48.png', 'image12.png', 'image54.png', 'image52.png',
    'image62.png', 'image3.png',
    # Duplicates or others
    'image15.png', 'image23.png'
}

remaining = [f for f in all_files if f not in known]
print(f"Remaining files to check: {len(remaining)}")

for f in remaining:
    im = Image.open(os.path.join(extracted_dir, f))
    print(f"{f}: size={im.size}")
