import json
import sys
import os
import glob
import argparse

def determine_region_and_validate_rating(url: str, rating: str) -> tuple[str, str]:
    """
    Determine region from URL and validate rating based on region rules.
    Returns tuple of (region, validated_rating)
    """
    # Handle None URL
    if not url:
        return "PAL", None  # Default to PAL if no URL available
        
    # Determine region from URL
    if "/pal-xbox-360" in url:
        region = "PAL"
    elif "/jp-xbox-360" in url:
        region = "NTSC-J"
    elif "/xbox-360" in url:
        region = "NTSC"
    else:
        region = "PAL"  # Default to PAL if no clear indication
        
    # Validate rating based on region
    validated_rating = None
    if rating:
        if region == "NTSC" and rating.startswith("ESRB"):
            validated_rating = rating
        elif region == "NTSC-J" and rating.startswith("CERO"):
            validated_rating = rating
        elif region == "PAL" and any(rating.startswith(r) for r in ["PEGI", "USK", "BBFC", "ACB"]):
            validated_rating = rating
    
    return region, validated_rating

def determine_product_type(title: str) -> tuple[str, bool]:
    """
    Determine product type based on title.
    Returns tuple of (product_type, should_clear_variant_and_genre)
    """
    title_lower = title.lower()
    
    if " controller" in title_lower:
        return "Peripheral", True
    elif " console" in title_lower:
        return "Console", True
    else:
        return "Game", False

def generate_sql_block(json_data, ignore_existing=False):
    """
    Generates an SQL block for inserting data into the products and prices tables.
    
    Args:
        json_data: The JSON data to process
        ignore_existing: If True, skip existing records instead of updating them
    """
    # Extract product details safely with defaults
    product_name = json_data.get("product_name", "")
    pricecharting_url = json_data.get("pricecharting_url")
    
    # Extract variant from square brackets if present
    variant = json_data.get("variant_name", "")  # Get any existing variant first
    if not variant and '[' in product_name:
        # Split at first '[' and get everything up to the closing ']'
        parts = product_name.split('[', 1)
        if len(parts) == 2 and ']' in parts[1]:
            product_name = parts[0].strip()  # Update product name to be everything before '['
            # Extract text between '[' and ']'
            variant = parts[1].split(']')[0].strip()
    
    # Exit if pricecharting_url is missing
    if not pricecharting_url:
        print("\nError: Missing pricecharting_url in JSON data:", file=sys.stderr)
        print(json.dumps(json_data, indent=2), file=sys.stderr)
        sys.exit(1)
    
    # Determine product type and if we should clear variant/genre
    product_type, should_clear_extras = determine_product_type(product_name)
    
    # Clear variant if should_clear_extras is True
    variant = "" if should_clear_extras else variant
    
    # Extract and validate details
    details = json_data.get("details", {})
    release_year = details.get("release_date")
    # Extract and validate release year
    try:
        if release_year:
            year = int(release_year.split("-")[0])
            release_year = str(year) if 2000 <= year <= 2024 else '0'
        else:
            release_year = '0'
    except (ValueError, AttributeError):
        release_year = '0'
    
    # Get rating and determine region
    rating = details.get("rating", "")
    region_name, validated_rating = determine_region_and_validate_rating(pricecharting_url, rating)
    
    # Extract other fields with safe defaults
    publisher = details.get("publisher", "")
    developer = details.get("developer", "")
    genre = "" if should_clear_extras else details.get("genre", "")
    image_url = json_data.get("image_url", "")
    ean_gtin = details.get("ean_gtin", [])
    asin = details.get("asin", [])
    epid = details.get("epid", [])
    pricechartingid = json_data.get("id", "")

    # Handle arrays for identifiers
    def array_to_sql(arr):
        if not arr:
            return "ARRAY[]::text[]"
        return f"ARRAY[{', '.join(repr(x) for x in arr)}]"

    ean_gtin_sql = array_to_sql(ean_gtin)
    asin_sql = array_to_sql(asin)
    epid_sql = array_to_sql(epid)

    # Helper function to handle text fields
    def text_to_sql(value, allow_null=True):
        if not value:
            return 'NULL' if allow_null else "''"
        escaped = str(value).replace("'", "''")
        return f"'{escaped}'"

    # Generate the SQL block for inserting into the products table
    update_clause = """UPDATE SET
        release_year = EXCLUDED.release_year,
        product_type = EXCLUDED.product_type,
        region = EXCLUDED.region,
        publisher = EXCLUDED.publisher,
        developer = EXCLUDED.developer,
        genre = EXCLUDED.genre,
        image_url = EXCLUDED.image_url,
        ean_gtin = EXCLUDED.ean_gtin,
        asin = EXCLUDED.asin,
        epid = EXCLUDED.epid,
        rating = EXCLUDED.rating,
        pricecharting_id = EXCLUDED.pricecharting_id,
        pricecharting_url = EXCLUDED.pricecharting_url,
        products_updated_at = NOW()"""

    sql_block = f"""
DO $$
DECLARE
    product_id INTEGER;
BEGIN
    -- Insert into the products table with conflict handling
    INSERT INTO products (
        product_title,
        product_group,
        product_variant,
        release_year,
        product_type,
        region,
        publisher,
        developer,
        genre,
        image_url,
        ean_gtin,
        asin,
        epid,
        rating,
        pricecharting_id,
        pricecharting_url,
        created_at,
        products_updated_at
    ) VALUES (
        {text_to_sql(product_name)},
        'Xbox 360',
        {text_to_sql(variant, allow_null=False)},
        {release_year},
        {text_to_sql(product_type)},
        {text_to_sql(region_name)},
        {text_to_sql(publisher)},
        {text_to_sql(developer)},
        {text_to_sql(genre)},
        {text_to_sql(image_url)},
        {ean_gtin_sql},
        {asin_sql},
        {epid_sql},
        {text_to_sql(validated_rating)},
        {pricechartingid},
        {text_to_sql(pricecharting_url)},
        NOW(),
        NOW()
    )
    ON CONFLICT (product_title, product_variant, product_group) DO {update_clause if not ignore_existing else "NOTHING"}
    RETURNING id INTO product_id;

    -- Insert into the prices table (only if price is not null)
    IF FOUND THEN
"""

    # Add SQL for inserting prices (only non-null prices)
    prices = json_data.get("prices", {})
    price_statements = []

    for price_type, price_value in prices.items():
        if price_value is not None:
            price_statements.append(f"""
        INSERT INTO product_prices (product_id, price_type, price_usd, price_nok, price_nok_fixed, updated_at)
        VALUES (product_id, {text_to_sql(price_type)}::price_type, {price_value}, NULL, NULL, NOW());
""")

    # Append price inserts only if there are valid price values
    if price_statements:
        sql_block += "\n".join(price_statements)
    else:
        sql_block += "\n    -- No valid prices to insert."

    # Close the SQL block
    sql_block += """
    END IF;
END $$;

"""  # Added extra newline between blocks

    return sql_block

def process_json_file(json_file, ignore_existing=False):
    """Process a single JSON file and return SQL block or None if error"""
    try:
        with open(json_file, "r") as f:
            json_data = json.load(f)
        return generate_sql_block(json_data, ignore_existing)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error processing {json_file}: {e}", file=sys.stderr)
        return None

def main():
    # Check if files are provided as arguments
    parser = argparse.ArgumentParser(description='Process JSON files into SQL inserts')
    parser.add_argument('files', nargs='+', help='JSON file(s) or pattern(s) to process')
    parser.add_argument('--ignore-existing', action='store_true', 
                      help='Skip records that already exist instead of updating them')
    
    args = parser.parse_args()

    # Clear/create insert.txt
    with open("insert.txt", "w") as f:
        f.write("-- Generated SQL inserts\n\n")

    # Process all file patterns
    processed_files = 0
    for pattern in args.files:
        # Expand wildcards
        files = glob.glob(pattern)
        if not files:
            print(f"Warning: No files match pattern '{pattern}'", file=sys.stderr)
            continue

        # Process each file
        for json_file in files:
            if not os.path.exists(json_file):
                print(f"Warning: File '{json_file}' not found.", file=sys.stderr)
                continue

            print(f"Processing {json_file}...")
            sql_block = process_json_file(json_file, args.ignore_existing)
            
            if sql_block:
                with open("insert.txt", "a") as f:
                    f.write(f"-- Processing {json_file}\n")
                    f.write(sql_block)
                processed_files += 1

    if processed_files > 0:
        print(f"\nProcessed {processed_files} files. SQL blocks have been written to insert.txt.")
    else:
        print("\nNo files were processed successfully.", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()