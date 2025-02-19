"""Main scraper implementation"""

import requests
from bs4 import BeautifulSoup
import re
import json
import os
import time
from pathlib import Path
from typing import Dict, Optional, Union, Tuple
from .rate_limiter import RateLimiter
from .date_normalizer import DateNormalizer
from .utils.validators import clean_price, validate_page

class PriceChartingScraper:
    # Price type mappings
    PRICE_TYPE_MAP = {
        'Loose': 'loose',
        'Item & Box': 'item_box',
        'Item & Manual': 'item_manual',
        'Complete': 'complete',
        'New': 'new',
        'Graded CIB': 'graded_cib',
        'Graded New': 'graded_new',
        'Box Only': 'box_only',
        'Manual Only': 'manual_only'
    }

    # List of values that should be treated as None
    EMPTY_VALUES = ['none', '-', 'n/a']

    # Words that should not be capitalized in titles
    LOWERCASE_WORDS = {'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into', 'like', 
                      'near', 'nor', 'of', 'on', 'onto', 'or', 'over', 'past', 'so', 'than', 'the', 
                      'to', 'up', 'upon', 'with', 'yet'}

    # Base detail field configurations
    BASE_DETAIL_FIELDS = {
        'Genre': {
            'field_name': 'genre',
            'validator': lambda x: x.strip() if x and x.strip().lower() not in PriceChartingScraper.EMPTY_VALUES else None
        },
        'Release Date': {
            'field_name': 'release_date',
            'validator': lambda x: DateNormalizer.normalize_date(x) if x and x.strip().lower() not in PriceChartingScraper.EMPTY_VALUES else None
        },
        'Publisher': {
            'field_name': 'publisher',
            'validator': lambda x: x.strip() if x and x.strip().lower() not in PriceChartingScraper.EMPTY_VALUES else None
        },
        'Developer': {
            'field_name': 'developer',
            'validator': lambda x: x.strip() if x and x.strip().lower() not in PriceChartingScraper.EMPTY_VALUES else None
        },
        'EAN / GTIN': {
            'field_name': 'ean_gtin',
            'validator': lambda x: [code.strip() for code in x.split(',')] if x and x.strip().lower() not in PriceChartingScraper.EMPTY_VALUES else []
        },
        'UPC': {
            'field_name': 'upc',
            'validator': lambda x: [code.strip() for code in x.split(',')] if x and x.strip().lower() not in PriceChartingScraper.EMPTY_VALUES else []
        },
        'ASIN': {
            'field_name': 'asin',
            'validator': lambda x: [code.strip() for code in x.split(',')] if x and x.strip().lower() not in PriceChartingScraper.EMPTY_VALUES else []
        },
        'ASIN (Amazon)': {
            'field_name': 'asin',
            'validator': lambda x: [code.strip() for code in x.split(',')] if x and x.strip().lower() not in PriceChartingScraper.EMPTY_VALUES else []
        },
        'ePID': {
            'field_name': 'epid',
            'validator': lambda x: [code.strip() for code in x.split(',')] if x and x.strip().lower() not in PriceChartingScraper.EMPTY_VALUES else []
        },
        'ePID (eBay)': {
            'field_name': 'epid',
            'validator': lambda x: [code.strip() for code in x.split(',')] if x and x.strip().lower() not in PriceChartingScraper.EMPTY_VALUES else []
        }
    }

    def __init__(self, config):
        self.config = config
        self.base_url = "https://www.pricecharting.com/game"
        self.headers = {'User-Agent': config.get('scraper', 'user_agent')}
        self.rate_limiter = RateLimiter(
            config.get('rate_limit', 'delay'),
            config.get('rate_limit', 'variant_delay')
        )
        self.output_dir = Path('./json')
        self.output_dir.mkdir(exist_ok=True)
        self.saved_files = []  # Only tracks newly saved files
        self.cached_files = []  # Tracks files loaded from cache
        self.file_age = config.get('output', 'file_age', default=86400)  # Default to 24 hours
        
        # Initialize detail fields with rating validators
        self.detail_fields = self.BASE_DETAIL_FIELDS.copy()
        self.detail_fields.update({
            'PEGI Rating': {
                'field_name': 'rating',
                'validator': self._standardize_pegi_rating
            },
            'ESRB Rating': {
                'field_name': 'rating',
                'validator': self._standardize_esrb_rating
            }
        })

    def _standardize_pegi_rating(self, rating_str: str) -> Optional[str]:
        """Standardize PEGI rating format"""
        if not rating_str or 'PEGI' not in rating_str:
            return None
        match = re.search(r'PEGI\s*(\d+)', rating_str)
        if match:
            return f"PEGI {match.group(1)}"
        return None

    def _standardize_esrb_rating(self, rating_str: str) -> Optional[str]:
        """Standardize ESRB rating format"""
        if not rating_str:
            return None
        # Map of common ESRB rating variations to standardized format
        esrb_map = {
            'EARLY CHILDHOOD': 'EC',
            'EVERYONE': 'E',
            'EVERYONE 10+': 'E10',
            'TEEN': 'T',
            'MATURE': 'M',
            'ADULTS ONLY': 'AO',
            'RATING PENDING': 'RP'
        }
        rating_upper = rating_str.strip().upper()
        for full, abbrev in esrb_map.items():
            if full in rating_upper or abbrev in rating_upper:
                return f"ESRB {abbrev}"
        return None

    def _save_game_data(self, game_id: int, data: Dict) -> None:
        """Save game data to a JSON file"""
        output_path = self.output_dir / f"{game_id}.json"
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        self.saved_files.append(str(output_path))
        print(f"Saved game data to {output_path}")

    def _check_existing_file(self, game_id: int) -> Tuple[bool, Optional[Dict]]:
        """
        Check if a file exists and is within the age limit
        Returns: (should_skip_scrape, existing_data)
        """
        file_path = self.output_dir / f"{game_id}.json"
        
        if not file_path.exists():
            return False, None
            
        # Check file age
        file_age = time.time() - file_path.stat().st_mtime
        if file_age > self.file_age:
            return False, None
            
        # File exists and is fresh enough, load its data
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # Add file to cached files list
                self.cached_files.append(str(file_path))
                return True, data
        except (json.JSONDecodeError, IOError) as e:
            print(f"Warning: Error reading existing file for game {game_id}: {e}")
            return False, None

    def fetch_game_data(self, game_id: int, scrape_variants: bool = False) -> Dict[str, Union[float, str, None, dict, list]]:
        """Fetch and parse game data"""
        # First, check if we have valid cached data
        should_use_cache, cached_data = self._check_existing_file(game_id)
        
        # If we have valid cache and aren't scraping variants, return cached data immediately
        if should_use_cache and not scrape_variants:
            print(f"Using cached data for game {game_id}")
            return cached_data
        
        try:
            # Fetch the page (needed for variants or if no valid cache)
            self.rate_limiter.wait()
            response = requests.get(
                f"{self.base_url}/{game_id}",
                headers=self.headers,
                timeout=self.config.get('scraper', 'timeout', default=10)
            )
            
            if response.status_code != 200:
                error_response = self._get_error_response()
                if not should_use_cache:
                    self._save_game_data(game_id, error_response)
                return error_response

            soup = BeautifulSoup(response.text, 'html.parser')
            if not validate_page(soup, game_id):
                error_response = self._get_error_response()
                if not should_use_cache:
                    self._save_game_data(game_id, error_response)
                return error_response

            # Get variants list if scraping variants is enabled
            variants = self._parse_variants(soup) if scrape_variants else []
            
            # Process variants if requested, regardless of cache status
            if scrape_variants and variants:
                for variant in variants:
                    variant_id = variant['id']
                    # Check if variant file exists and is within age limit
                    variant_should_use_cache, _ = self._check_existing_file(variant_id)
                    if not variant_should_use_cache:
                        # Need to fetch the variant's page
                        self.rate_limiter.wait(True)  # Use variant delay
                        variant_response = requests.get(
                            f"{self.base_url}/{variant_id}",
                            headers=self.headers,
                            timeout=self.config.get('scraper', 'timeout', default=10)
                        )
                        if variant_response.status_code == 200:
                            variant_soup = BeautifulSoup(variant_response.text, 'html.parser')
                            if validate_page(variant_soup, variant_id):
                                variant_data = self._parse_game_data(variant_soup, variant_id, False)
                                variant_data['variant_name'] = variant['variant_name']
                                # Add combined name for variant
                                if variant_data['product_name'] and variant['variant_name']:
                                    variant_data['combined_name'] = f"{variant_data['product_name']} ({variant['variant_name']})"
                                self._save_game_data(variant_id, variant_data)
                                # Download variant image if available
                                if variant_data['success'] and variant_data.get('image_url'):
                                    from src.utils.image_utils import download_image
                                    download_image(variant_data['image_url'], variant_id, self.output_dir, self.headers)

            # If we have valid cached data and we only needed to check variants, return cached data
            if should_use_cache:
                print(f"Using cached data for game {game_id}")
                return cached_data

            # If no valid cache, parse all data
            result = self._parse_game_data(soup, game_id, False)
            self._save_game_data(game_id, result)
            return result

        except Exception as e:
            print(f"Error fetching game {game_id}: {e}")
            error_response = self._get_error_response()
            if not should_use_cache:
                self._save_game_data(game_id, error_response)
            return error_response

    def _parse_game_data(self, soup: BeautifulSoup, game_id: int, scrape_variants: bool) -> Dict:
        """Parse the game data from BeautifulSoup object"""
        results = {
            'success': True,
            'id': game_id,
            'product_name': None,
            'image_url': None,
            'prices': self._get_initialized_prices(),
            'details': {}
        }

        # Get canonical URL if available
        canonical_tag = soup.find('link', rel='canonical')
        if canonical_tag and canonical_tag.get('href'):
            results['pricecharting_url'] = canonical_tag['href']

        # Get product name
        self._parse_product_name(soup, results)
        
        # Get prices
        self._parse_prices(soup, results)
        
        # Get image
        self._parse_image(soup, results)
        
        # Get details
        self._parse_details(soup, results)
        
        # Add combined name if variant_name exists and is not empty
        if 'variant_name' in results and results['variant_name']:
            results['combined_name'] = f"{results['product_name']} ({results['variant_name']})"
        
        return results

    def _parse_product_name(self, soup: BeautifulSoup, results: Dict):
        """Parse the product name from the page"""
        title_elem = soup.find('h1', class_='chart_title')
        if title_elem:
            # Get all text content but exclude the platform text (which is in the nested <a> tag)
            platform_link = title_elem.find('a')
            if platform_link:
                platform_link.extract()  # Temporarily remove platform text
            name = title_elem.get_text(strip=True)
            
            # Extract variant from square brackets if present
            if '[' in name:
                parts = name.split('[', 1)
                base_name = parts[0].strip()
                if len(parts) == 2 and ']' in parts[1]:
                    variant = parts[1].split(']')[0].strip()
                    results['variant_name'] = self._propercase(variant)
                results['product_name'] = self._propercase(base_name)
            else:
                results['product_name'] = self._propercase(name)

    def _parse_prices(self, soup: BeautifulSoup, results: Dict):
        prices_div = soup.find('div', id='full-prices')
        if prices_div:
            for row in prices_div.find_all('tr'):
                type_td = row.find('td')
                price_td = row.find('td', class_='price js-price')
                if type_td and price_td:
                    price_type = type_td.text.strip()
                    if price_type in self.PRICE_TYPE_MAP:
                        field_name = self.PRICE_TYPE_MAP[price_type]
                        price = clean_price(price_td.text)
                        results['prices'][field_name] = price

    def _parse_image(self, soup: BeautifulSoup, results: Dict):
        """Parse the high-resolution image URL from the page"""
        # Look for the image link in the extra div
        extra_div = soup.find('div', class_='extra')
        if extra_div:
            image_link = extra_div.find('a', href=lambda x: x and 'googleapis.com' in x)
            if image_link:
                results['image_url'] = image_link['href']
            else:
                results['image_url'] = None
        else:
            results['image_url'] = None

    def _parse_details(self, soup: BeautifulSoup, results: Dict):
        details_table = soup.find('table', id='attribute')
        if details_table:
            # First pass: collect all fields except ratings
            for row in details_table.find_all('tr'):
                title_td = row.find('td', class_='title')
                details_td = row.find('td', class_='details')
                if title_td and details_td:
                    field_title = title_td.text.strip().rstrip(':')
                    if field_title in self.detail_fields:
                        field_config = self.detail_fields[field_title]
                        field_value = field_config['validator'](details_td.text)
                        # Skip rating field for now
                        if field_config['field_name'] != 'rating':
                            results['details'][field_config['field_name']] = field_value
            
            # Second pass: handle ratings with priority
            esrb_rating = None
            pegi_rating = None
            for row in details_table.find_all('tr'):
                title_td = row.find('td', class_='title')
                details_td = row.find('td', class_='details')
                if title_td and details_td:
                    field_title = title_td.text.strip().rstrip(':')
                    if field_title == 'ESRB Rating':
                        esrb_rating = self.detail_fields[field_title]['validator'](details_td.text)
                    elif field_title == 'PEGI Rating':
                        pegi_rating = self.detail_fields[field_title]['validator'](details_td.text)
            
            # Set the rating with ESRB taking priority
            results['details']['rating'] = esrb_rating if esrb_rating else pegi_rating

    def _parse_variants(self, soup: BeautifulSoup) -> list:
        variants = []
        variant_row = soup.find('td', string='Variants:')
        if variant_row:
            variant_details = variant_row.find_next_sibling('td')
            if variant_details:
                for variant in variant_details.find_all('a'):  # Find all links, not just class='variant'
                    try:
                        href = variant['href']
                        if href.startswith('/game/'):  # Ensure it's a game link
                            variant_id = int(href.split('/')[-1])
                            variant_name = self._propercase(variant.text.strip())
                            variants.append({
                                'id': variant_id,
                                'variant_name': variant_name
                            })
                    except (ValueError, KeyError, AttributeError):
                        continue
        return variants

    def _get_initialized_prices(self) -> Dict:
        return {price_type: None for price_type in self.PRICE_TYPE_MAP.values()}

    def _get_error_response(self) -> Dict:
        return {
            'success': False,
            'image_url': None,
            'pricecharting_url': None,
            'prices': {},
            'details': {}
        }

    def _propercase(self, text: str) -> str:
        """Convert text to proper case, respecting common title formatting rules"""
        if not text:
            return text

        words = text.split()
        if not words:
            return text

        # Capitalize first word always
        words[0] = words[0].capitalize()
        
        # Capitalize all other words except those in LOWERCASE_WORDS
        for i in range(1, len(words)):
            word = words[i]
            # Always capitalize if it contains uppercase letters (e.g., "II", "III", "HD")
            if any(c.isupper() for c in word):
                continue
            # Check if word should be lowercase
            lower_word = word.lower()
            if lower_word in self.LOWERCASE_WORDS:
                words[i] = lower_word
            else:
                words[i] = word.capitalize()

        return ' '.join(words) 