from PIL import Image
import numpy as np
import sys

def remove_white_bg(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    data = np.array(img)
    
    r, g, b, a = data.T
    # Tolerance for white
    white_areas = (r > 240) & (g > 240) & (b > 240)
    data[..., :][white_areas.T] = (0, 0, 0, 0)
    
    img_new = Image.fromarray(data)
    img_new.save(output_path)

if __name__ == "__main__":
    remove_white_bg(
        r"C:\Users\DELL\.gemini\antigravity-ide\brain\76ac10c1-f444-4801-b140-ec660e09f29a\prism_icon_white_bg_1788553115330.jpg",
        r"C:\Users\DELL\Documents\Honors\honors major project\frontend\public\prism-icon.png"
    )
