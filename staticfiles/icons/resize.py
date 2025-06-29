from PIL import Image


input_filename = "icon_512x512.png"
output_filename = "icon_192x192.png"

try:
    img = Image.open(input_filename)
    img = img.resize((192, 192))
    img.save(output_filename)
    print(f"Saved resized icon as {output_filename}")
except FileNotFoundError:
    print(f"File not found: {input_filename}")
