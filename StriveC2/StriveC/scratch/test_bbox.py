from PIL import Image

for width in [1440, 768]:
    # We already have aboutus-hero-fixed-1440.png and aboutus-hero-fixed-768.png in artifacts directory!
    path = f"/Users/avinesh_shukla/.gemini/antigravity/brain/0bb5ff4e-72a2-4bd0-b97c-6cc433440f57/aboutus-hero-fixed-{width}.png"
    im = Image.open(path)
    print(f"Loaded {path}, size: {im.size}")
