import os
from PIL import Image

def convert_spritesheet(src_path, dest_path, quality=80):
    print(f"Converting spritesheet: {src_path} -> {dest_path}")
    if not os.path.exists(src_path):
        print(f"File not found: {src_path}")
        return
        
    try:
        with Image.open(src_path) as img:
            # Check transparency (RGBA)
            if img.mode != "RGBA":
                img = img.convert("RGBA")
            
            # Save as WebP
            img.save(dest_path, "WEBP", quality=quality, lossless=False)
            
            orig_size = os.path.getsize(src_path) / 1024
            webp_size = os.path.getsize(dest_path) / 1024
            print(f"Successfully converted {os.path.basename(src_path)}!")
            print(f"Original size: {orig_size:.1f} KB")
            print(f"WebP size: {webp_size:.1f} KB")
            print(f"Savings: {((orig_size - webp_size) / orig_size) * 100:.1f}%\n")
    except Exception as e:
        print(f"Error converting spritesheet: {e}")

if __name__ == "__main__":
    src_dir = "src/assets"
    
    # Convert wave.png
    convert_spritesheet(
        os.path.join(src_dir, "wave.png"),
        os.path.join(src_dir, "wave.webp"),
        quality=80
    )
    
    # Convert runnew.png
    convert_spritesheet(
        os.path.join(src_dir, "runnew.png"),
        os.path.join(src_dir, "runnew.webp"),
        quality=80
    )
    
    print("Spritesheet conversion finished!")
