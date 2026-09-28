from PIL import Image
import numpy as np

def clean_logos():
    # 1. Clean tn-govt-logo.png (ensure crisp transparent circular emblem)
    img_tn = Image.open('c:/Users/sivan/OneDrive/Desktop/IQARENA_GOVT/frontend/image.png').convert('RGBA')
    arr_tn = np.array(img_tn)
    h, w, _ = arr_tn.shape
    cy, cx = h / 2.0, w / 2.0
    y, x = np.ogrid[:h, :w]
    dist = np.sqrt((x - cx)**2 + (y - cy)**2)
    
    # Outer circle cutoff
    arr_tn[dist > 185, 3] = 0
    # Antialias edge
    edge = (dist > 183) & (dist <= 185)
    arr_tn[edge, 3] = (arr_tn[edge, 3] * 0.5).astype(np.uint8)
    
    # Also remove any white/checkerboard inside border if neutral
    r = arr_tn[:, :, 0].astype(int)
    g = arr_tn[:, :, 1].astype(int)
    b = arr_tn[:, :, 2].astype(int)
    is_neutral = (np.abs(r-g) < 6) & (np.abs(r-b) < 6) & (np.abs(g-b) < 6) & (r > 200)
    arr_tn[(dist > 175) & is_neutral, 3] = 0
    
    Image.fromarray(arr_tn).save('c:/Users/sivan/OneDrive/Desktop/IQARENA_GOVT/frontend/public/tn-govt-logo.png', 'PNG')
    print("TN logo cleaned!")

    # 2. Clean iqlogo.jpeg -> public/iqlogo.png (make white/off-white background transparent)
    img_iq = Image.open('c:/Users/sivan/OneDrive/Desktop/IQARENA_GOVT/frontend/iqlogo.jpeg').convert('RGBA')
    arr_iq = np.array(img_iq)
    r = arr_iq[:, :, 0].astype(int)
    g = arr_iq[:, :, 1].astype(int)
    b = arr_iq[:, :, 2].astype(int)
    
    # Off-white / light grey background: r,g,b > 230 and closely matching
    is_bg = (r > 230) & (g > 230) & (b > 230) & (np.abs(r-g) < 10) & (np.abs(r-b) < 10)
    arr_iq[is_bg, 3] = 0
    
    Image.fromarray(arr_iq).save('c:/Users/sivan/OneDrive/Desktop/IQARENA_GOVT/frontend/public/iqlogo.png', 'PNG')
    print("IQ logo transparent PNG created!")

if __name__ == '__main__':
    clean_logos()
