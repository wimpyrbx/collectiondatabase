#!/usr/bin/env python3
"""
Game Price Scraper v1.2
Entry point for the price charting scraper
"""

import argparse
import sys
import re
import requests
from bs4 import BeautifulSoup
from pathlib import Path
from urllib.parse import urlparse
from src.config import Config
from src.scraper import PriceChartingScraper
from src.formatters import get_formatter
from src.utils.image_utils import download_image

def extract_game_id_from_html(url: str, headers: dict) -> int:
    """Fetch the page and extract the PriceCharting ID from the HTML"""
    response = requests.get(url, headers=headers, timeout=10)
    if response.status_code != 200:
        raise ValueError(f"Failed to fetch URL: {url}")
        
    soup = BeautifulSoup(response.text, 'html.parser')
    id_row = soup.find('td', string='PriceCharting ID:')
    if id_row and (details := id_row.find_next_sibling('td')):
        try:
            return int(details.text.strip())
        except ValueError:
            pass
            
    raise ValueError("Could not find PriceCharting ID in the page")

def extract_game_id(url: str, headers: dict) -> int:
    """Extract game ID from either numeric ID or full URL"""
    # Try direct numeric ID first
    if url.isdigit():
        return int(url)
        
    # Try to extract from URL
    # Handle both full URLs and relative paths
    match = re.search(r'/game/(?:[^/]+/)*(\d+)(?:/[^/]*)?$', url)
    if match:
        return int(match.group(1))
        
    # If URL parsing fails, try to fetch the page and get ID from HTML
    if url.startswith(('http://', 'https://', 'www.')):
        # Ensure URL has proper scheme
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        return extract_game_id_from_html(url, headers)
        
    raise ValueError("Could not extract game ID. Please provide either a numeric ID or a valid pricecharting.com game URL")

def process_url(url: str, scraper: PriceChartingScraper, scrape_variants: bool) -> bool:
    """Process a single URL and return success status"""
    try:
        # Extract game ID from URL or numeric input
        game_id = extract_game_id(url.strip(), scraper.headers)
        
        # Fetch data and track saved files
        result = scraper.fetch_game_data(game_id, scrape_variants)
        
        # Download image if available
        if result['success'] and result.get('image_url'):
            download_image(result['image_url'], game_id, scraper.output_dir, scraper.headers)
            
        return result['success']
    except Exception as e:
        print(f"Error processing {url}: {e}", file=sys.stderr)
        return False

def main():
    parser = argparse.ArgumentParser(description='Fetch game prices from pricecharting.com')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--url', type=str, 
                      help='Game URL (e.g., https://www.pricecharting.com/game/pal-xbox-360/kinect-sports) or numeric ID')
    group.add_argument('--file', type=str,
                      help='File containing list of URLs/IDs to process (one per line)')
    parser.add_argument('--config', type=str, help='Path to config file')
    parser.add_argument('--format', choices=['json', 'csv'], default='json', help='Output format')
    parser.add_argument('--scrapevariants', action='store_true', help='Fetch variant data')
    
    try:
        args = parser.parse_args()
        
        # Initialize configuration
        config = Config(args.config)
        
        # Initialize scraper
        scraper = PriceChartingScraper(config)
        
        success = True
        if args.url:
            # Process single URL
            success = process_url(args.url, scraper, args.scrapevariants)
        else:
            # Process URLs from file
            try:
                with open(args.file, 'r') as f:
                    urls = [line.strip() for line in f if line.strip()]
                    
                if not urls:
                    raise ValueError("URL list file is empty")
                    
                # Process each URL
                results = []
                for url in urls:
                    results.append(process_url(url, scraper, args.scrapevariants))
                success = all(results)
                    
            except IOError as e:
                raise ValueError(f"Could not read URL list file: {e}")
        
        # Print summary of files
        if scraper.cached_files:
            print("\nCached:")
            for file_path in scraper.cached_files:
                print(f"- {file_path}")
                
        if scraper.saved_files:
            print("\nSaved:")
            for file_path in scraper.saved_files:
                print(f"- {file_path}")
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main()) 