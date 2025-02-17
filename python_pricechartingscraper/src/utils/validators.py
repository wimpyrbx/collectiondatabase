"""Validation utilities for the scraper"""

from typing import Optional
from bs4 import BeautifulSoup
import re

def clean_price(price_str: str) -> Optional[float]:
    """
    Convert price string to float, handling various formats and invalid values
    
    Args:
        price_str: String containing price value
        
    Returns:
        Float value if valid price, None otherwise
    """
    if not price_str or price_str.strip() in ['--', 'N/A', '']:
        return None
    try:
        # Remove currency symbol, commas, and whitespace
        cleaned = price_str.strip().replace('$', '').replace(',', '')
        return float(cleaned)
    except (ValueError, AttributeError):
        return None

def validate_page(soup: BeautifulSoup, expected_id: int) -> bool:
    """
    Validate that the page contains the expected game ID
    
    Args:
        soup: BeautifulSoup object of the page
        expected_id: Expected game ID
        
    Returns:
        True if page is valid, False otherwise
    """
    scripts = soup.find_all('script')
    for script in scripts:
        if script.string and 'VGPC.product' in script.string:
            id_pattern = r'id:\s*(\d+)'
            match = re.search(id_pattern, script.string)
            if match and int(match.group(1)) == expected_id:
                return True
    return False 