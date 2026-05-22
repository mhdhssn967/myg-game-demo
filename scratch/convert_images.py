import os
from PIL import Image

def convert_and_resize(src_dir, max_size, quality=80):
    print(f"Processing directory: {src_dir}")
    if not os.path.exists(src_dir):
        print(f"Directory not found: {src_dir}")
        return

    files = [f for f in os.listdir(src_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    for filename in files:
        src_path = os.path.join(src_dir, filename)
        name, ext = os.path.splitext(filename)
        dest_path = os.path.join(src_dir, f"{name}.webp")
        
        try:
            with Image.open(src_path) as img:
                # Calculate new size while keeping aspect ratio
                width, height = img.size
                if width > max_size or height > max_size:
                    if width > height:
                        new_width = max_size
                        new_height = int(height * (max_size / width))
                    else:
                        new_height = max_size
                        new_width = int(width * (max_size / height))
                    img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                    print(f"Resized {filename} from {width}x{height} to {new_width}x{new_height}")
                
                # Convert to WebP and save
                img.save(dest_path, "WEBP", quality=quality)
                orig_size = os.path.getsize(src_path) / 1024
                webp_size = os.path.getsize(dest_path) / 1024
                print(f"Converted {filename} ({orig_size:.1f} KB) -> {name}.webp ({webp_size:.1f} KB) - Savings: {((orig_size - webp_size) / orig_size) * 100:.1f}%")
        except Exception as e:
            print(f"Error processing {filename}: {e}")

if __name__ == "__main__":
    # Convert products (max size 400px for gameplay obstacles)
    convert_and_resize("public/images/products", 400, quality=80)
    
    # Convert billboards (max size 800px for background displays)
    convert_and_resize("public/images/billboards", 800, quality=80)
    
    print("Conversion complete!")
