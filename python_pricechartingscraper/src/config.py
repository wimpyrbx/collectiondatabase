"""Configuration handler for the scraper"""

import yaml
from pathlib import Path
from typing import Dict, Optional

class Config:
    def __init__(self, config_path: Optional[str] = None):
        self.config = self._load_default_config()
        if config_path:
            self._update_config(config_path)

    def _load_default_config(self) -> Dict:
        default_path = Path(__file__).parent.parent / 'config' / 'default_config.yaml'
        with open(default_path, 'r') as f:
            return yaml.safe_load(f)

    def _update_config(self, user_config_path: str):
        try:
            with open(user_config_path, 'r') as f:
                user_config = yaml.safe_load(f)
                if user_config:
                    self._deep_update(self.config, user_config)
        except Exception as e:
            print(f"Warning: Could not load user config file: {e}")

    def _deep_update(self, d: Dict, u: Dict):
        for k, v in u.items():
            if isinstance(v, dict):
                d[k] = self._deep_update(d.get(k, {}), v)
            else:
                d[k] = v
        return d

    def get(self, *keys, default=None):
        """Safely get nested config values"""
        value = self.config
        for key in keys:
            try:
                value = value[key]
            except (KeyError, TypeError):
                return default
        return value 