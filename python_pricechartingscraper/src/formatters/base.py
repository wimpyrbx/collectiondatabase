"""Base formatter interface"""

from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseFormatter(ABC):
    @abstractmethod
    def format(self, data: Dict[str, Any]) -> str:
        """Format the data into the desired output format"""
        pass 