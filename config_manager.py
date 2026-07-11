import os
import json

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")

DEFAULT_CONFIG = {
    "welcome_text": "Hi {profile_name}! 👋\nWelcome to *KDI Power*!",
    "welcome_image": "kdi-logo-white-bg.jpg"
}

def get_config():
    """Reads the configuration from config.json, returning defaults if not found."""
    if not os.path.exists(CONFIG_FILE):
        return DEFAULT_CONFIG.copy()
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            config = json.load(f)
            # Ensure missing keys use default values
            for k, v in DEFAULT_CONFIG.items():
                if k not in config:
                    config[k] = v
            return config
    except Exception:
        return DEFAULT_CONFIG.copy()

def save_config(new_config):
    """Saves the configuration to config.json."""
    current = get_config()
    current.update(new_config)
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=4)
        return True
    except Exception as e:
        print(f"Error saving config: {e}")
        return False
