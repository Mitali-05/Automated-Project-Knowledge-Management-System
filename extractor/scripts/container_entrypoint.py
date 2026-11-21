"""Fail visibly on missing required fonts before starting the container worker."""
import os
import sys
from matplotlib import font_manager

for weight in ('normal', 'bold'):
    font_manager.findfont(font_manager.FontProperties(family='Arial', weight=weight),
                          fallback_to_default=False)
if len(sys.argv) < 2:
    raise SystemExit('A container command is required')
os.execvp(sys.argv[1], sys.argv[1:])
