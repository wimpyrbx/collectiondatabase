import sys
from bs4 import BeautifulSoup
import re

def extract_links(html_file):
    # Read the HTML file
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"Read {len(content)} bytes from file")
    
    # Parse HTML
    soup = BeautifulSoup(content, 'html.parser')
    
    # Find all 'a' tags
    all_links = soup.find_all('a', href=True)
    print(f"Found {len(all_links)} total links")
    
    # Find all 'a' tags with href starting with the specific URL
    target_links = []
    for link in all_links:
        href = link['href']
        if href.startswith('https://www.pricecharting.com/game/') or href.startswith('/game/'):
            # Convert relative URLs to absolute
            if href.startswith('/'):
                href = f"https://www.pricecharting.com{href}"
            
            # Find canonical URL for this game page
            canonical_url = None
            if href.startswith('https://www.pricecharting.com/game/'):
                # Make a temporary soup for this link to find its canonical URL
                link_soup = BeautifulSoup(f'<link rel="canonical" href="{href}" />', 'html.parser')
                canonical_tag = link_soup.find('link', rel='canonical')
                if canonical_tag:
                    canonical_url = canonical_tag['href']
            
            target_links.append({
                'url': href,
                'canonical_url': canonical_url or href  # Use original URL if no canonical found
            })
    
    print(f"Found {len(target_links)} pricecharting game links")
    
    # Remove duplicates while preserving order
    seen = set()
    unique_links = []
    for link in target_links:
        if link['canonical_url'] not in seen:
            seen.add(link['canonical_url'])
            unique_links.append(link)
    
    print(f"Found {len(unique_links)} unique pricecharting game links")
    
    # Write links to file.txt
    with open('file.txt', 'w', encoding='utf-8') as f:
        for link in unique_links:
            f.write(f"{link['url']}\t{link['canonical_url']}\n")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python script.py <htmlfile>")
        sys.exit(1)
    
    html_file = sys.argv[1]
    try:
        extract_links(html_file)
        print(f"Links have been extracted to file.txt")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()