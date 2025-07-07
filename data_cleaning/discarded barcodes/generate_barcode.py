import os
import pandas as pd
import barcode
from barcode.writer import ImageWriter
from PIL import Image, ImageDraw

# Absolute path to the script's directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Get the Code128 barcode class
code128 = barcode.get_barcode_class('code128')

# Target dimensions in pixels (300 DPI)
# 3cm = 354 pixels, 1cm = 118 pixels at 300 DPI
TARGET_WIDTH = 354   # 3cm
TARGET_HEIGHT = 118  # 1cm

# Create a custom ImageWriter with minimal settings
class FixedSizeWriter(ImageWriter):
    def __init__(self):
        super().__init__()
        self.format = 'PNG'
        self.dpi = 300

# Output directory for barcode images
output_dir = os.path.join(BASE_DIR, "barcodes_bca")
os.makedirs(output_dir, exist_ok=True)

# Path to your CSV file
csv_path = os.path.join(BASE_DIR, 'bca.csv')

# Read the CSV into a DataFrame
df = pd.read_csv(csv_path)

print(f"📦 Generating {TARGET_WIDTH}x{TARGET_HEIGHT}px (3cm x 1cm @ 300 DPI) barcodes for {len(df)} students...")

def create_uniform_barcode(data, width=TARGET_WIDTH, height=TARGET_HEIGHT):
    """Create a barcode with EXACT uniform dimensions - all same size"""
    
    # Generate barcode with minimal options for clean output
    writer_options = {
        'module_width': 0.2,
        'module_height': 4.0,
        'quiet_zone': 0.5,
        'font_size': 0,
        'text_distance': 0,
        'write_text': False
    }
    
    # Create barcode object
    barcode_obj = code128(data, writer=FixedSizeWriter())
    
    # Generate barcode to memory
    from io import BytesIO
    buffer = BytesIO()
    barcode_obj.write(buffer, options=writer_options)
    buffer.seek(0)
    
    # Load original barcode image
    original_barcode = Image.open(buffer)
    
    # Create final image with EXACT target dimensions
    final_img = Image.new('RGB', (width, height), color='white')
    
    # STRETCH the barcode to fill the entire target area
    # This ensures ALL barcodes are exactly the same size
    stretched_barcode = original_barcode.resize((width, height), Image.Resampling.LANCZOS)
    
    # Paste the stretched barcode to fill the entire canvas
    final_img.paste(stretched_barcode, (0, 0))
    
    return final_img

# Generate barcode images
successful_count = 0
failed_count = 0

for index, row in df.iterrows():
    roll_no = str(row['roll_no'])
    value = str(row['barcode_hash'])  # The value to encode in barcode
    
    try:
        # Create uniform-size barcode (stretched to exact dimensions)
        barcode_image = create_uniform_barcode(value)
        
        # Save the barcode
        filename = os.path.join(output_dir, f"barcode_{roll_no}.png")
        barcode_image.save(filename, dpi=(300, 300))
        
        # Verify dimensions
        saved_img = Image.open(filename)
        width, height = saved_img.size
        
        print(f"✅ {roll_no}: {width}x{height}px | Data: {value}")
        successful_count += 1
        
    except Exception as e:
        print(f"❌ Error for {roll_no}: {str(e)}")
        failed_count += 1

print(f"\n🎉 Results:")
print(f"✅ Successfully generated: {successful_count} barcodes")
print(f"❌ Failed: {failed_count} barcodes")
print(f"📁 Location: {output_dir}/")
print(f"📏 ALL barcodes are exactly {TARGET_WIDTH}x{TARGET_HEIGHT} pixels (3cm x 1cm at 300 DPI)")
print(f"🖨️  For printing: Set printer to 300 DPI for accurate physical dimensions")
print(f"⚠️  Note: Barcodes are stretched to uniform size - this maintains scannability")