"""Image downloading and processing utilities"""

import sys
import io
import requests
from pathlib import Path
from PIL import Image

def download_image(url: str, game_id: int, output_dir: Path, headers: dict) -> bool:
    """Download image from URL and save it as WebP"""
    if not url:
        return False
        
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            print(f"Failed to download image for game {game_id}: HTTP {response.status_code}", file=sys.stderr)
            return False
            
        # Load image from response content
        image = Image.open(io.BytesIO(response.content))
        
        # Convert to RGB if needed (WebP doesn't support RGBA)
        if image.mode in ('RGBA', 'LA') or (image.mode == 'P' and 'transparency' in image.info):
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1])
            image = background
        
        # Save as WebP
        image_path = output_dir / f"{game_id}.webp"
        image.save(str(image_path), 'WEBP', quality=90)
        print(f"Saved image: {image_path}")
        return True
        
    except Exception as e:
        print(f"Error downloading/converting image for game {game_id}: {e}", file=sys.stderr)
        return False 