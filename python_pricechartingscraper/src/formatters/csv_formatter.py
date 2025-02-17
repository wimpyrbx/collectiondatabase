"""CSV output formatter"""

import csv
from io import StringIO
from typing import Dict, Any
from .base import BaseFormatter

class CSVFormatter(BaseFormatter):
    def format(self, data: Dict[str, Any]) -> str:
        output = StringIO()
        writer = csv.writer(output)
        
        # Write headers
        headers = ['success', 'image_url']
        headers.extend(f"price_{k}" for k in data.get('prices', {}).keys())
        headers.extend(f"detail_{k}" for k in data.get('details', {}).keys())
        writer.writerow(headers)
        
        # Write data
        row = [data['success'], data['image_url']]
        row.extend(str(data['prices'].get(k, '')) for k in data.get('prices', {}).keys())
        row.extend(str(data['details'].get(k, '')) for k in data.get('details', {}).keys())
        writer.writerow(row)
        
        return output.getvalue() 