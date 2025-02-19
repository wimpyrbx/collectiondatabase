"""Rate limiting functionality"""

import time
import random
from typing import Optional

class RateLimiter:
    def __init__(self, delay: float, variant_delay: float):
        self.delay = delay
        self.variant_delay = variant_delay
        self.last_request: float = 0

    def wait(self, is_variant: bool = False):
        """Wait appropriate time between requests"""
        # Add random delay between 5-10 seconds
        random_delay = random.uniform(2.0, 4.0)
        delay = random_delay + (self.variant_delay if is_variant else self.delay)
        
        now = time.time()
        elapsed = now - self.last_request
        if elapsed < delay:
            time.sleep(delay - elapsed)
        self.last_request = time.time() 