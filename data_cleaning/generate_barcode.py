import os
import pandas as pd
import barcode
from barcode.writer import ImageWriter

# Absolute path to the script's directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Get the Code128 barcode class
code128 = barcode.get_barcode_class('code128')

# Writer options to improve barcode readability and remove text
writer_options = {
    'module_width': 0.6,       # Wider bars (default is 0.2)
    'module_height': 30.0,     # Taller barcode
    'quiet_zone': 8.0,         # Extra whitespace padding around the barcode
    'font_size': 0,            # Disables font rendering
    'text_distance': 0,        # No gap needed if text is hidden
    'write_text': False        # ⛔ Don't write human-readable text
}

output_dir = "barcodes"
os.makedirs(output_dir, exist_ok=True)

csv_path = os.path.join(os.path.dirname(__file__), 'student_data2.csv')
df = pd.read_csv(csv_path)

# Generate barcode images
for index, row in df.iterrows():
    value = str(row['barcode_hash'])  # The value to encode in barcode
    filename = os.path.join(output_dir, f"barcode_{row['roll_no']}.png")

    barcode_obj = code128(value, writer=ImageWriter())
    barcode_obj.save(filename, options=writer_options)

print(f"✅ {len(df)} barcodes saved in folder: {output_dir}/")
