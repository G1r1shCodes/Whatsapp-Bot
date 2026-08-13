import os
import json

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
    "quick_templates": [
        {
            "id": "tpl_address",
            "title": "📍 Factory & Corporate Address",
            "text": "🏢 *KDI Power — Corporate Office & Factory*\n📍 Factory Address: H-1243, DSIDC Industrial Area, Narela, New Delhi - 110040\n🏢 Corporate Office: 912, 9th Floor, D Mall, NSP, Pitampura, Delhi - 110034\n📞 +91-9205333843 (Vipul Kumar — Marketing Manager)\n🌐 https://kdipower.com/"
        },
        {
            "id": "tpl_catalogue",
            "title": "📑 Official Product Catalogue PDF",
            "text": "📑 *KDI Power Official Product Catalogue*\nDownload our official product catalogue featuring high-grade Aluminium/Copper XLPE Armoured Cables, House Wires, and HT Cables:\n🌐 https://kdipower.com/catalogue/CATALOUGE.pdf"
        },
        {
            "id": "tpl_export",
            "title": "🚢 Export & International Logistics Info",
            "text": "🚢 *KDI Power Export Information*\nYes, we export our electrical cables and wires globally with logistics & customs support.\nContact Manager Vipul Kumar (+91-9205333843) for customized export quotes and shipping lead times.\n🌐 https://kdipower.com/"
        },
        {
            "id": "tpl_quote",
            "title": "💰 Commercial Quote Follow-up",
            "text": "🎉 *KDI Power Quote Update*\nHi! Our sales team has reviewed your cable requirements. Please let us know if you need a formal commercial quotation or technical datasheet.\n📞 Call/WhatsApp: +91-9205333843\n🌐 https://kdipower.com/"
        }
    ]
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
