#!/usr/bin/env python3
"""Extract the hero artwork ("the world") from the design mockup.

The mockup (1536x1024) has text baked in. The artwork occupies x 0-1209 and
y ~92-957, with a hard cut on its right edge. This script crops it with a small
margin and paints over the baked-in title (which sits on flat background).

Usage:
    python3 scripts/world/extract-from-mockup.py "<mockup.png>" assets-src/world/world-from-mockup.png

The output size defines the *world units* used by regions.yaml and world.yaml
(1210 x 900). If you replace the artwork with a different composition, redraw
the regions with the dev region editor (see docs/EDITING.md).
"""
import sys
from pathlib import Path

from PIL import Image

CROP = (0, 76, 1210, 976)          # left, top, right, bottom in mockup pixels
TITLE_BOX = (40, 76, 440, 128)     # baked-in "YANN HAREL / COGNITIVE NEUROSCIENTIST" (mockup px)
CLEAN_ROWS_OFFSET = 70             # rows this far above the title are plain background


def main(src: str, dst: str) -> None:
    im = Image.open(src).convert("RGB")
    if im.size != (1536, 1024):
        sys.exit(f"Expected the 1536x1024 mockup, got {im.size}")

    px = im.load()
    x0, y0, x1, y1 = TITLE_BOX
    for y in range(y0, y1):
        for x in range(x0, x1):
            px[x, y] = px[x, y - CLEAN_ROWS_OFFSET]

    world = im.crop(CROP)
    Path(dst).parent.mkdir(parents=True, exist_ok=True)
    world.save(dst, optimize=True)

    # sanity check: mean colour of the top-left corner should match the page background (#060d14)
    corner = world.crop((0, 0, 40, 20)).resize((1, 1), Image.BOX).getpixel((0, 0))
    print(f"wrote {dst} {world.size[0]}x{world.size[1]}  corner≈#{corner[0]:02x}{corner[1]:02x}{corner[2]:02x}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
