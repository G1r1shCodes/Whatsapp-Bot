import os
import json
import uuid
from datetime import datetime

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")

DEFAULT_CONFIG = {
    "welcome_text": "Hi {profile_name}! 👋\nWelcome to *KDI Power*!",
    "welcome_image": "kdi-logo-white-bg.jpg",
    "browse_categories": [
        {"id": "cat_power", "title": "Power Cables"},
        {"id": "cat_wires", "title": "Electrical Wires"},
        {"id": "cat_armour", "title": "Armoured Cables"},
        {"id": "cat_unarmour", "title": "Unarmoured Cables"},
        {"id": "cat_control", "title": "Control Cables"}
    ],
    "product_categories": [
        "Power Cables", "House Wires", "Control Cables", "Rubber Cable",
        "Aerial Bunched Cable", "Instrumentation Wires", "Conductor"
    ],
    "message_templates": [],
    "broadcast_history": []
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
            # Migrate old quick_templates → ignore them (replaced by message_templates)
            if "quick_templates" in config and "message_templates" not in config:
                config["message_templates"] = []
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

# ── Message Template CRUD ─────────────────────────────────

def get_templates():
    """Returns the list of saved message templates."""
    config = get_config()
    return config.get("message_templates", [])

def save_template(template):
    """Saves a new template or updates an existing one by id."""
    config = get_config()
    templates = config.get("message_templates", [])
    # Check if template with same id already exists → update
    existing_idx = next((i for i, t in enumerate(templates) if t["id"] == template["id"]), None)
    if existing_idx is not None:
        templates[existing_idx] = template
    else:
        templates.append(template)
    config["message_templates"] = templates
    save_config(config)
    return template

def delete_template(template_id):
    """Deletes a template by id."""
    config = get_config()
    templates = config.get("message_templates", [])
    config["message_templates"] = [t for t in templates if t["id"] != template_id]
    save_config(config)
    return True

def create_template_obj(name, category, language, header=None, body="", footer="", buttons=None):
    """Creates a standardized template object."""
    return {
        "id": f"tpl_{uuid.uuid4().hex[:8]}",
        "name": name,
        "category": category,
        "language": language or "en",
        "header": header,  # { "type": "text"|"image"|"document"|"video", "content": "..." }
        "body": body,
        "footer": footer,
        "buttons": buttons or [],  # [{ "type": "url"|"phone"|"quick_reply", "text": "...", "value": "..." }]
        "meta_template_id": None,
        "meta_status": "LOCAL",  # LOCAL | PENDING | APPROVED | REJECTED
        "meta_rejection_reason": None,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }

# ── Broadcast History ─────────────────────────────────────

def get_broadcast_history():
    """Returns the list of broadcast history entries."""
    config = get_config()
    return config.get("broadcast_history", [])

def add_broadcast_entry(entry):
    """Adds a broadcast history entry."""
    config = get_config()
    history = config.get("broadcast_history", [])
    history.insert(0, entry)
    # Keep last 100 broadcasts
    config["broadcast_history"] = history[:100]
    save_config(config)
    return entry

# ── Product Categories CRUD ───────────────────────────────

def get_product_categories():
    """Returns the list of product categories."""
    config = get_config()
    return config.get("product_categories", DEFAULT_CONFIG["product_categories"])

def add_product_category(category_name):
    """Adds a new product category if it doesn't already exist."""
    config = get_config()
    categories = config.get("product_categories", DEFAULT_CONFIG["product_categories"][:])
    # Case-insensitive duplicate check
    if any(c.lower() == category_name.strip().lower() for c in categories):
        return False, "Category already exists"
    categories.append(category_name.strip())
    categories.sort()
    config["product_categories"] = categories
    save_config(config)
    return True, "Category added"

def delete_product_category(category_name):
    """Deletes a product category."""
    config = get_config()
    categories = config.get("product_categories", DEFAULT_CONFIG["product_categories"][:])
    original_len = len(categories)
    categories = [c for c in categories if c.lower() != category_name.strip().lower()]
    if len(categories) == original_len:
        return False, "Category not found"
    config["product_categories"] = categories
    save_config(config)
    return True, "Category deleted"

