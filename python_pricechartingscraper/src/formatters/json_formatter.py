"""JSON output formatter"""

import json
from typing import Dict, Any
from .base import BaseFormatter

class JSONFormatter(BaseFormatter):
    def __init__(self, pretty: bool = True):
        self.pretty = pretty

    def format(self, data: Dict[str, Any]) -> str:
        return json.dumps(data, indent=2 if self.pretty else None) 