import os
import glob
from PIL import Image

def main():
    source_dir = r"d:\Oqulix\Oqulix Projects\MYG Platformer Demo\public\toadd"
    target_dir = r"d:\Oqulix\Oqulix Projects\MYG Platformer Demo\public\images\billboards"
    
    # Ensure target directory exists
    os.makedirs(target_dir, exist_ok=True)
    
    # Find all jpg files
    jpg_files = glob.glob(os.path.join(source_dir, "*.jpg"))
    # Sort alphabetically to ensure a deterministic order
    jpg_files.sort()
    
    print(f"Found {len(jpg_files)} JPEG files in source directory.")
    
    start_index = 6
    max_dimension = 800  # Resize high-res 13MB images to max 800px dimension for gaming performance
    
    for idx, filepath in enumerate(jpg_files):
        board_num = start_index + idx
        target_filename = f"board{board_num}.webp"
        target_path = os.path.join(target_dir, target_filename)
        
        try:
            with Image.open(filepath) as img:
                orig_width, orig_height = img.size
                
                # Calculate new size while maintaining aspect ratio
                if orig_width > max_dimension or orig_height > max_dimension:
                    if orig_width > orig_height:
                        new_width = max_dimension
                        new_height = int((orig_height / orig_width) * max_dimension)
                    else:
                        new_height = max_dimension
                        new_width = int((orig_width / orig_height) * max_dimension)
                        
                    # Use LANCZOS for high-quality downsampling
                    resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                else:
                    resized_img = img
                    new_width, new_height = orig_width, orig_height
                
                # Save as WebP
                resized_img.save(target_path, format="WEBP", quality=82)
                
                # Get file sizes for reporting
                orig_size_mb = os.path.getsize(filepath) / (1024 * 1024)
                new_size_kb = os.path.getsize(target_path) / 1024
                
                print(f"[{idx+1}/{len(jpg_files)}] Converted: {os.path.basename(filepath)}")
                print(f"  Size: {orig_width}x{orig_height} ({orig_size_mb:.2f} MB) -> {new_width}x{new_height} ({new_size_kb:.1f} KB)")
                print(f"  Saved as: {target_filename}")
                
        except Exception as e:
            print(f"Error processing {filepath}: {e}")

if __name__ == "__main__":
    main()
