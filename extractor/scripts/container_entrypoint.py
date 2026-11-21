"""Fail visibly on missing required fonts before starting the container worker."""
import glob
import os
import sys
from matplotlib import font_manager

# Explicitly register any mounted TTF fonts so matplotlib finds them without needing fontconfig cache
for font_file in glob.glob('/usr/local/share/fonts/**/*.ttf', recursive=True) + \
                 glob.glob('/usr/local/share/fonts/**/*.TTF', recursive=True):
    try:
        font_manager.fontManager.addfont(font_file)
    except Exception:
        pass

for weight in ('normal', 'bold'):
    font_manager.findfont(font_manager.FontProperties(family='Arial', weight=weight),
                          fallback_to_default=False)
if len(sys.argv) < 2:
    raise SystemExit('A container command is required')
os.execvp(sys.argv[1], sys.argv[1:])
