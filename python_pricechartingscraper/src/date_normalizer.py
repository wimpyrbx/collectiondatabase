"""Date normalization utilities"""

from datetime import datetime
from typing import Optional
from dateutil import parser as date_parser

class DateNormalizer:
    @staticmethod
    def normalize_date(date_str: str) -> Optional[str]:
        """Convert various date formats to YYYY-MM-DD"""
        if not date_str or date_str.lower() in ['none', 'tba', 'n/a']:
            return None
        try:
            parsed_date = date_parser.parse(date_str)
            return parsed_date.strftime('%Y-%m-%d')
        except (ValueError, TypeError):
            return None 