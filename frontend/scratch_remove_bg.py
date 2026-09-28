from PIL import Image
import numpy as np

def make_transparent(input_path, output_path):
    img = Image.open(input_path).convert('RGBA')
    arr = np.array(img)
    
    # Identify checkerboard pattern pixels:
    # In fake transparent PNGs, checkerboard consists of pure white (255,255,255) and light grey (e.g. 204,204,204 or 238,238,238)
    # The logo itself is a circular Tamil Nadu Govt emblem centered in the square image (400x400).
    # Radius of circle is approx 185 pixels from center (200, 200).
    
    h, w, _ = arr.shape
    cy, cx = h / 2.0, w / 2.0
    
    # Calculate distance of each pixel from center
    y_indices, x_indices = np.ogrid[:h, :w]
    dist_from_center = np.sqrt((x_indices - cx)**2 + (y_indices - cy)**2)
    
    # Outside the main emblem (dist > 188), remove everything (set alpha = 0)
    # Inside the emblem edge (dist between 180 and 190), soften/antialias or check neutral gray/white
    r = arr[:, :, 0].astype(int)
    g = arr[:, :, 1].astype(int)
    b = arr[:, :, 2].astype(int)
    
    # Check if pixel is neutral (r approx g approx b) and high luminance (checkerboard)
    diff_rg = np.abs(r - g)
    diff_rb = np.abs(r - b)
    diff_gb = np.abs(g - b)
    is_neutral = (diff_rg < 8) & (diff_rb < 8) & (diff_gb < 8) & (r > 195)
    
    # Any neutral checkerboard outside emblem or near edges
    mask_outside = dist_from_center > 192
    mask_near_edge_checker = (dist_from_center > 175) & is_neutral
    
    arr[mask_outside, 3] = 0
    arr[mask_near_edge_checker, 3] = 0
    
    result = Image.fromarray(arr)
    result.save(output_path, 'PNG')
    print("Saved transparent logo:", output_path)

if __name__ == '__main__':
    make_transparent(
        'c:/Users/sivan/OneDrive/Desktop/IQARENA_GOVT/frontend/image.png',
        'c:/Users/sivan/OneDrive/Desktop/IQARENA_GOVT/frontend/public/tn-govt-logo.png'
    )
