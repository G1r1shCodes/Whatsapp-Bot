import os
import httpx
from datetime import datetime
# Helper to load .env variables manually
def load_env():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip()

from logger import get_logger
logger = get_logger(__name__)

load_env()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

http_client = httpx.Client(timeout=10.0)


def request_supabase(endpoint, method="GET", data=None, params=None):
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.warning(f"SUPABASE_URL or SUPABASE_KEY is missing. Returning mock data for {endpoint}.")
        if endpoint == "leads":
            return [
                {"id": 1, "phone": "1234567890", "name": "John Doe", "company": "Acme Corp", "product_interest": "Power Cables", "status": "New", "created_at": datetime.utcnow().isoformat()},
                {"id": 2, "phone": "0987654321", "name": "Jane Smith", "company": "Tech Solutions", "product_interest": "House Wires", "status": "Quoted", "created_at": datetime.utcnow().isoformat()}
            ]
        elif endpoint == "products":
            return [
                {"name": "1.5 sq mm House Wire", "category": "House Wires", "conductor": "Copper", "size": "1.5 sq mm", "core": 1, "insulation": "PVC", "price_per_meter": 12.5, "stock_status": "In Stock", "specifications": "Flame retardant house wire"},
                {"name": "2.5 sq mm Power Cable", "category": "Power Cables", "conductor": "Aluminium", "size": "2.5 sq mm", "core": 3, "insulation": "XLPE", "price_per_meter": 45.0, "stock_status": "In Stock", "specifications": "Heavy duty power cable"}
            ]
        return []

    try:
        url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
        
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        response = http_client.request(
            method, 
            url, 
            json=data if data is not None else None,
            params=params, 
            headers=headers
        )
        response.raise_for_status()
        
        res_content = response.text
        if res_content:
            return response.json()
        return []
    except httpx.HTTPStatusError as http_err:
        error_body = http_err.response.text if http_err.response else 'No response body'
        logger.error(f"Supabase HTTP error on {endpoint} [{method}]: {http_err.response.status_code} - {error_body}")
        return None
    except Exception as e:
        logger.error(f"Supabase API error on {endpoint} [{method}]: {e}")
        return None  # Return None on error so callers can distinguish from empty results

def init_db():
    # Database tables are initialized on Supabase via MCP SQL execute
    pass

def get_static_dummy_products():
    return [
        {
            "name": "KDI 1.5 sq mm FR House Wire (Copper)",
            "category": "House Wires",
            "conductor": "Copper",
            "size": "1.5 sq mm",
            "core": 1,
            "insulation": "PVC",
            "price_per_meter": 24.50,
            "stock_status": "In Stock",
            "specifications": "Flame Retardant, Lead Free"
        },
        {
            "name": "KDI 2.5 sq mm FRLS House Wire",
            "category": "House Wires",
            "conductor": "Copper",
            "size": "2.5 sq mm",
            "core": 1,
            "insulation": "FRLS PVC",
            "price_per_meter": 42.00,
            "stock_status": "In Stock",
            "specifications": "Flame Retardant Low Smoke"
        },
        {
            "name": "KDI Solar Cable 4 sq mm DC",
            "category": "Power Cables",
            "conductor": "Copper",
            "size": "4.0 sq mm",
            "core": 1,
            "insulation": "XLPE",
            "price_per_meter": 55.00,
            "stock_status": "In Stock",
            "specifications": "UV Resistant, DC Solar Application"
        },
        {
            "name": "KDI Solar Cable 6 sq mm UV Resistant",
            "category": "Power Cables",
            "conductor": "Copper",
            "size": "6.0 sq mm",
            "core": 1,
            "insulation": "XLPE",
            "price_per_meter": 82.50,
            "stock_status": "In Stock",
            "specifications": "TUV certified, UV Resistant"
        },
        {
            "name": "KDI Submersible Cable 3 Core 2.5 sq mm",
            "category": "Rubber Cable",
            "conductor": "Copper",
            "size": "2.5 sq mm",
            "core": 3,
            "insulation": "PVC",
            "price_per_meter": 115.00,
            "stock_status": "In Stock",
            "specifications": "Flat pump cable"
        },
        {
            "name": "KDI 3 Core Flat Submersible Cable 4 sq mm",
            "category": "Rubber Cable",
            "conductor": "Copper",
            "size": "4.0 sq mm",
            "core": 3,
            "insulation": "PVC",
            "price_per_meter": 168.00,
            "stock_status": "In Stock",
            "specifications": "Heavy duty flat pump cable"
        },
        {
            "name": "Copper Control Cable 4 Core 1.5 sq mm",
            "category": "Control Cables",
            "conductor": "Copper",
            "size": "1.5 sq mm",
            "core": 4,
            "insulation": "PVC",
            "price_per_meter": 95.00,
            "stock_status": "In Stock",
            "specifications": "Industrial control applications"
        },
        {
            "name": "Copper Control Cable 10 Core 2.5 sq mm",
            "category": "Control Cables",
            "conductor": "Copper",
            "size": "2.5 sq mm",
            "core": 10,
            "insulation": "PVC",
            "price_per_meter": 280.00,
            "stock_status": "Custom Only",
            "specifications": "Multi-core industrial signal cable"
        },
        {
            "name": "Copper Flexible Cable 3 Core 1.5 sq mm",
            "category": "Rubber Cable",
            "conductor": "Copper",
            "size": "1.5 sq mm",
            "core": 3,
            "insulation": "PVC",
            "price_per_meter": 72.00,
            "stock_status": "In Stock",
            "specifications": "Multistrand flexible cord"
        },
        {
            "name": "Flexible PVC Insulated Cord Cable 2 Core",
            "category": "Rubber Cable",
            "conductor": "Copper",
            "size": "1.0 sq mm",
            "core": 2,
            "insulation": "PVC",
            "price_per_meter": 38.00,
            "stock_status": "In Stock",
            "specifications": "Light duty twin flat cord"
        },
        {
            "name": "11kV HT Armoured Cable 3C x 95 sq mm",
            "category": "Power Cables",
            "conductor": "Aluminium",
            "size": "95 sq mm",
            "core": 3,
            "insulation": "XLPE",
            "price_per_meter": 1250.00,
            "stock_status": "Custom Only",
            "specifications": "11kV high voltage power distribution"
        },
        {
            "name": "33kV HT Armoured Cable XLPE",
            "category": "Power Cables",
            "conductor": "Aluminium",
            "size": "240 sq mm",
            "core": 3,
            "insulation": "XLPE",
            "price_per_meter": 3450.00,
            "stock_status": "Custom Only",
            "specifications": "33kV HT power transmission"
        },
        {
            "name": "Copper Conductor XLPE Armoured Cable 4C x 16 sq mm",
            "category": "Power Cables",
            "conductor": "Copper",
            "size": "16 sq mm",
            "core": 4,
            "insulation": "XLPE",
            "price_per_meter": 890.00,
            "stock_status": "In Stock",
            "specifications": "Low voltage copper armoured"
        },
        {
            "name": "Aluminium XLPE Armoured Cable 4C x 50 sq mm",
            "category": "Power Cables",
            "conductor": "Aluminium",
            "size": "50 sq mm",
            "core": 4,
            "insulation": "XLPE",
            "price_per_meter": 320.00,
            "stock_status": "In Stock",
            "specifications": "Low voltage aluminium armoured"
        },
        {
            "name": "Aluminium Power Cable 3.5C x 50 sq mm Armoured",
            "category": "Power Cables",
            "conductor": "Aluminium",
            "size": "50 sq mm",
            "core": 3.5,
            "insulation": "XLPE",
            "price_per_meter": 285.00,
            "stock_status": "In Stock",
            "specifications": "3.5 Core (3 Full + 1 Half Neutral), LT distribution, XLPE insulated, PVC sheathed, armoured"
        },
        {
            "name": "Aluminium Power Cable 3.5C x 70 sq mm Armoured",
            "category": "Power Cables",
            "conductor": "Aluminium",
            "size": "70 sq mm",
            "core": 3.5,
            "insulation": "XLPE",
            "price_per_meter": 375.00,
            "stock_status": "In Stock",
            "specifications": "3.5 Core (3 Full + 1 Half Neutral), LT distribution, XLPE insulated, PVC sheathed, armoured"
        },
        {
            "name": "Aluminium Power Cable 3.5C x 95 sq mm Armoured",
            "category": "Power Cables",
            "conductor": "Aluminium",
            "size": "95 sq mm",
            "core": 3.5,
            "insulation": "XLPE",
            "price_per_meter": 480.00,
            "stock_status": "In Stock",
            "specifications": "3.5 Core (3 Full + 1 Half Neutral), LT distribution, XLPE insulated, PVC sheathed, armoured"
        },
        {
            "name": "Aluminium Power Cable 3.5C x 120 sq mm Armoured",
            "category": "Power Cables",
            "conductor": "Aluminium",
            "size": "120 sq mm",
            "core": 3.5,
            "insulation": "XLPE",
            "price_per_meter": 590.00,
            "stock_status": "In Stock",
            "specifications": "3.5 Core (3 Full + 1 Half Neutral), LT distribution, XLPE insulated, PVC sheathed, armoured"
        },
        {
            "name": "Aluminium Power Cable 3.5C x 150 sq mm Armoured",
            "category": "Power Cables",
            "conductor": "Aluminium",
            "size": "150 sq mm",
            "core": 3.5,
            "insulation": "XLPE",
            "price_per_meter": 720.00,
            "stock_status": "In Stock",
            "specifications": "3.5 Core (3 Full + 1 Half Neutral), LT distribution, XLPE insulated, PVC sheathed, armoured"
        },
        {
            "name": "Aluminium Power Cable 3.5C x 185 sq mm Armoured",
            "category": "Power Cables",
            "conductor": "Aluminium",
            "size": "185 sq mm",
            "core": 3.5,
            "insulation": "XLPE",
            "price_per_meter": 870.00,
            "stock_status": "In Stock",
            "specifications": "3.5 Core (3 Full + 1 Half Neutral), LT distribution, XLPE insulated, PVC sheathed, armoured"
        },
        {
            "name": "Aluminium Power Cable 3.5C x 240 sq mm Armoured",
            "category": "Power Cables",
            "conductor": "Aluminium",
            "size": "240 sq mm",
            "core": 3.5,
            "insulation": "XLPE",
            "price_per_meter": 1080.00,
            "stock_status": "In Stock",
            "specifications": "3.5 Core (3 Full + 1 Half Neutral), LT distribution, XLPE insulated, PVC sheathed, armoured"
        },
        {
            "name": "Thermocouple Extension Cable KX Type",
            "category": "Instrumentation Wires",
            "conductor": "Chromel/Alumel",
            "size": "1.5 sq mm",
            "core": 2,
            "insulation": "PVC",
            "price_per_meter": 145.00,
            "stock_status": "In Stock",
            "specifications": "KX Type extension wire"
        },
        {
            "name": "Wind Power Energy Cable 3C x 150 sq mm",
            "category": "Power Cables",
            "conductor": "Copper",
            "size": "150 sq mm",
            "core": 3,
            "insulation": "EPR",
            "price_per_meter": 4200.00,
            "stock_status": "Custom Only",
            "specifications": "Flexible torsion-resistant wind cable"
        },
        {
            "name": "Triple Coated Multistrand House Wire 1.5 sq mm",
            "category": "House Wires",
            "conductor": "Copper",
            "size": "1.5 sq mm",
            "core": 1,
            "insulation": "Triple Layer PVC",
            "price_per_meter": 28.50,
            "stock_status": "In Stock",
            "specifications": "Extra safety triple sheath"
        },
        {
            "name": "KDI Aerial Bunched Cable 3C x 50 + 1C x 35 sq mm",
            "category": "Aerial Bunched Cable",
            "conductor": "Aluminium",
            "size": "50 sq mm",
            "core": 4,
            "insulation": "XLPE",
            "price_per_meter": 185.00,
            "stock_status": "In Stock",
            "specifications": "Overhead distribution cable"
        }
    ]

# Lead Management helpers
def create_lead(phone, name, company, email, location, product_interest, quantity, requirements):
    data = {
        "phone": phone,
        "name": name,
        "company": company,
        "email": email,
        "location": location,
        "product_interest": product_interest,
        "quantity": quantity,
        "requirements": requirements,
        "status": "New",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z"
    }
    res = request_supabase("leads", "POST", data=data)
    if res:
        return res[0]["id"]
    return None

def upsert_lead_from_chat(phone, profile_name, lead_data, status):
    existing = get_lead_by_phone(phone)

    def pick_val(new_val, existing_val, fallback="Unknown"):
        if new_val and str(new_val).strip() not in ["Unknown", "", "None"]:
            return str(new_val).strip()
        if existing_val and str(existing_val).strip() not in ["Unknown", "", "None"]:
            return str(existing_val).strip()
        return fallback

    if existing and existing.get("status") in ["New", "Partial"]:
        data = {
            "name": pick_val(lead_data.get("name"), existing.get("name"), profile_name)[:200],
            "company": pick_val(lead_data.get("company"), existing.get("company"), "Unknown")[:200],
            "email": pick_val(lead_data.get("email"), existing.get("email"), "")[:200],
            "location": pick_val(lead_data.get("location"), existing.get("location"), "Unknown")[:200],
            "product_interest": pick_val(lead_data.get("product"), existing.get("product_interest"), "Unknown")[:200],
            "quantity": pick_val(lead_data.get("quantity"), existing.get("quantity"), "Unknown")[:100],
            "status": status,
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }
        request_supabase("leads", "PATCH", data=data, params={"id": f"eq.{existing['id']}"})
        return existing["id"]
    else:
        data = {
            "phone": phone,
            "name": pick_val(lead_data.get("name"), None, profile_name)[:200],
            "company": pick_val(lead_data.get("company"), None, "Unknown")[:200],
            "email": pick_val(lead_data.get("email"), None, "")[:200],
            "location": pick_val(lead_data.get("location"), None, "Unknown")[:200],
            "product_interest": pick_val(lead_data.get("product"), None, "Unknown")[:200],
            "quantity": pick_val(lead_data.get("quantity"), None, "Unknown")[:100],
            "requirements": "Captured via AI chatbot.",
            "status": status,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }
        res = request_supabase("leads", "POST", data=data)
        if res:
            return res[0]["id"]
        return None

def get_leads(status_filter=None, search_query=None):
    leads = request_supabase("leads", "GET", params={"order": "created_at.desc"}) or []

    if status_filter:
        leads = [l for l in leads if l.get("status") == status_filter]

    if search_query:
        q = search_query.lower()
        leads = [
            l for l in leads if (
                q in (l.get("name") or "").lower() or
                q in (l.get("phone") or "").lower() or
                q in (l.get("company") or "").lower() or
                q in (l.get("requirements") or "").lower() or
                q in (l.get("product_interest") or "").lower() or
                q in (l.get("location") or "").lower()
            )
        ]
    return leads

def update_lead_status(lead_id, status):
    data = {
        "status": status,
        "updated_at": datetime.utcnow().isoformat() + "Z"
    }
    request_supabase("leads", "PATCH", data=data, params={"id": f"eq.{lead_id}"})

def update_lead_details(lead_id, lead_data):
    """Updates any lead fields (name, company, email, location, product_interest, quantity, requirements, status)."""
    data = {
        "updated_at": datetime.utcnow().isoformat() + "Z"
    }
    allowed_fields = ["name", "company", "email", "location", "product_interest", "quantity", "requirements", "status"]
    for field in allowed_fields:
        if field in lead_data and lead_data[field] is not None:
            data[field] = lead_data[field]
            
    res = request_supabase("leads", "PATCH", data=data, params={"id": f"eq.{lead_id}"})
    return res


def delete_lead(lead_id):
    params = {"id": f"eq.{lead_id}"}
    lead = request_supabase("leads", "GET", params=params)
    if lead:
        phone = lead[0].get("phone")
        if phone:
            request_supabase("chat_history", "DELETE", params={"phone": f"eq.{phone}"})
    request_supabase("leads", "DELETE", params=params)

def get_lead_by_phone(phone):
    params = {
        "phone": f"eq.{phone}",
        "order": "created_at.desc",
        "limit": "1"
    }
    res = request_supabase("leads", "GET", params=params)
    return res[0] if res else None

# Product Catalog Management helpers

# Canonical category names — legacy/imported aliases are mapped here so the
# catalog, dashboard filters, analytics, and the AI all see one consistent set.
CATEGORY_ALIASES = {
    "Power Cable": "Power Cables",
    "HT Cables": "Power Cables",
    "Solar Cables": "Power Cables",
    "Wind Power Cables": "Power Cables",
    "Insulated Cables": "Power Cables",
    "Armoured Cables": "Power Cables",
    "Copper Armoured Cables": "Power Cables",
    "Copper Unarmoured Cables": "Power Cables",
    "Copper XLPE Armoured Cables": "Power Cables",
    "Copper XLPE Unarmoured Cables": "Power Cables",
    "Aluminium XLPE Armoured Cables": "Power Cables",
    "Aluminium Unarmoured Cables": "Power Cables",
    "Electrical Wires": "House Wires",
    "Industrial Wires": "House Wires",
    "Multi Core Wires": "House Wires",
    "Triple Coating Cables": "House Wires",
    "General Cables": "House Wires",
    "Flexible Cables": "Rubber Cable",
    "Submersible Cables": "Rubber Cable",
    "Thermocouple Cables": "Instrumentation Wires",
}

def normalize_category(category):
    """Map a category name to its canonical form (unknown names pass through)."""
    if not category:
        return category
    return CATEGORY_ALIASES.get(category, category)


def get_base_catalog_products():
    """Loads the complete base catalog of 376+ products extracted from KDI price lists and catalog."""
    catalog_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "products_catalog.json")
    if os.path.exists(catalog_path):
        try:
            import json
            with open(catalog_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading products_catalog.json: {e}")
            
    # Dynamic fallback to parsing data/prices/ directly
    try:
        import sys
        scripts_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scripts")
        if scripts_dir not in sys.path:
            sys.path.append(scripts_dir)
        import ingest_prices
        prices_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "prices")
        p_file = os.path.join(prices_dir, "price_power.txt")
        c_file = os.path.join(prices_dir, "price_control.txt")
        f_file = os.path.join(prices_dir, "price_cu_flexible.txt")
        prods = []
        if os.path.exists(p_file):
            lines = [l.strip() for l in open(p_file, encoding="utf-8") if l.strip()]
            prods.extend(ingest_prices.extract_power_cables(lines))
        if os.path.exists(c_file):
            lines = [l.strip() for l in open(c_file, encoding="utf-8") if l.strip()]
            prods.extend(ingest_prices.extract_control_cables(lines))
        if os.path.exists(f_file):
            lines = [l.strip() for l in open(f_file, encoding="utf-8") if l.strip()]
            prods.extend(ingest_prices.extract_flexible_cables(lines))
        prods.extend(get_static_dummy_products())
        seen = set()
        unique_prods = []
        for p in prods:
            k = p.get("name", "").strip().lower()
            if k and k not in seen:
                seen.add(k)
                unique_prods.append(p)
        return unique_prods
    except Exception as err:
        logger.error(f"Dynamic catalog generation failed: {err}")
    return get_static_dummy_products()


def get_all_products(category_filter=None):
    params = {}
    if category_filter:
        params["category"] = f"eq.{category_filter}"
    
    # 1. Start with the complete 376+ products catalog as baseline
    base_products = get_base_catalog_products()
    catalog_map = {p["name"].strip().lower(): dict(p) for p in base_products if p.get("name")}
    
    # 2. If Supabase returns products, merge/override them by name
    try:
        remote_products = request_supabase("products", "GET", params=params)
        if remote_products:
            for rp in remote_products:
                name_key = rp.get("name", "").strip().lower()
                if name_key:
                    catalog_map[name_key] = dict(rp)
    except Exception as e:
        logger.warning(f"Failed to fetch products from Supabase: {e}")
        
    # 3. Add custom products created via dashboard
    try:
        import config_manager
        custom_products = config_manager.get_custom_products()
        for cp in custom_products:
            name_key = cp.get("name", "").strip().lower()
            if name_key:
                catalog_map[name_key] = dict(cp)
        
        # 4. Apply saved price and stock overrides
        overrides = config_manager.get_product_overrides()
        for name, ov in overrides.items():
            name_key = name.strip().lower()
            if name_key in catalog_map:
                if "price" in ov and ov["price"] is not None:
                    catalog_map[name_key]["price_per_meter"] = ov["price"]
                if "stock_status" in ov and ov["stock_status"] is not None:
                    catalog_map[name_key]["stock_status"] = ov["stock_status"]
                    
        # 5. Filter out user-deleted products
        deleted_names = {d.strip().lower() for d in config_manager.get_deleted_products()}
        if deleted_names:
            for del_name in deleted_names:
                catalog_map.pop(del_name, None)
    except Exception as err:
        logger.error(f"Error applying custom products/overrides: {err}")

    products = list(catalog_map.values())

    if category_filter:
        products = [p for p in products if p.get("category") == category_filter]

    for product in products:
        product["category"] = normalize_category(product.get("category"))
    return products


def get_product_by_id(product_name):
    res = request_supabase("products", "GET", params={"name": f"eq.{product_name}"})
    if not res:
        # Fall back to local catalog
        all_prods = get_all_products()
        matches = [p for p in all_prods if p.get("name", "").strip().lower() == product_name.strip().lower()]
        return matches[0] if matches else None
    if res:
        res[0]["category"] = normalize_category(res[0].get("category"))
    return res[0] if res else None

def update_product_price_and_stock(product_name, price, stock_status):
    # Always save to local config so changes persist reliably
    try:
        import config_manager
        config_manager.save_product_override(product_name, price, stock_status)
    except Exception as err:
        logger.error(f"Error saving product override to config: {err}")

    data = {}
    if price is not None:
        data["price_per_meter"] = price
    if stock_status is not None:
        data["stock_status"] = stock_status
    if data:
        try:
            request_supabase("products", "PATCH", data=data, params={"name": f"eq.{product_name}"})
        except Exception as e:
            logger.warning(f"Supabase PATCH failed: {e}")

def upsert_product(product_data):
    name = product_data.get("name")
    if not name:
        return None
    
    product_data["category"] = normalize_category(product_data.get("category"))
    
    existing = get_product_by_id(name)
    if existing:
        update_product_price_and_stock(name, product_data.get("price_per_meter"), product_data.get("stock_status"))
        try:
            request_supabase("products", "PATCH", data=product_data, params={"name": f"eq.{name}"})
        except Exception:
            pass
        return "updated"
    else:
        return create_product(product_data)

def create_product(product_data):
    name = product_data.get("name")
    if not name:
        return None
    
    product_data["category"] = normalize_category(product_data.get("category"))
    
    existing = get_product_by_id(name)
    if existing:
        return "exists"
    
    # Save locally to ensure product is immediately available and preserved
    try:
        import config_manager
        config_manager.add_custom_product(product_data)
    except Exception as err:
        logger.error(f"Error saving custom product to config: {err}")

    # Also attempt Supabase insert
    try:
        request_supabase("products", "POST", data=product_data)
    except Exception as e:
        logger.warning(f"Supabase POST failed, saved locally: {e}")

    return "created"

def delete_product(product_name):
    """Deletes a product from local overrides/custom products and Supabase."""
    try:
        import config_manager
        config_manager.mark_product_deleted(product_name)
    except Exception as err:
        logger.error(f"Error marking product deleted in config: {err}")
    try:
        request_supabase("products", "DELETE", params={"name": f"eq.{product_name}"})
    except Exception as err:
        logger.warning(f"Supabase DELETE failed: {err}")
    return True

def get_product_categories():
    products = get_all_products()
    categories = list(set([p["category"] for p in products if p.get("category")]))
    return sorted(categories)



# Chat History loggers
def log_chat_message(phone, direction, body, profile_name=None):
    data = {
        "phone": phone,
        "direction": direction,
        "body": body,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    if profile_name:
        data["profile_name"] = profile_name
    request_supabase("chat_history", "POST", data=data)

def get_chat_history(phone, limit=50):
    params = {
        "phone": f"eq.{phone}",
        "order": "created_at.desc",
        "limit": str(limit)
    }
    res = request_supabase("chat_history", "GET", params=params) or []
    # Reverse to get chronological order (oldest first)
    res = list(reversed(res))
    for row in res:
        row["timestamp"] = row["created_at"]
    return res

def get_visitor_chats():
    """Returns a list of chat contacts who are NOT registered in the leads table."""
    all_chats = request_supabase("chat_history", "GET", params={"order": "created_at.desc", "limit": "500"}) or []
    all_leads = request_supabase("leads", "GET", params={"limit": "500"}) or []
    
    lead_phones = set(l.get("phone") for l in all_leads if l.get("phone"))
    
    visitors_map = {}
    for chat in all_chats:
        phone = chat.get("phone")
        if not phone or phone in lead_phones:
            continue
        
        if phone not in visitors_map:
            visitors_map[phone] = {
                "phone": phone,
                "name": f"Visitor ({phone[-4:] if len(phone)>=4 else phone})",
                "last_message": chat.get("body", ""),
                "direction": chat.get("direction", "inbound"),
                "last_active": chat.get("created_at", ""),
                "message_count": 1
            }
        else:
            visitors_map[phone]["message_count"] += 1
            
    visitors_list = list(visitors_map.values())
    visitors_list.sort(key=lambda x: x["last_active"], reverse=True)
    return visitors_list

def delete_visitor_chats(phone):
    """Deletes chat history for a single non-lead visitor phone."""
    request_supabase("chat_history", "DELETE", params={"phone": f"eq.{phone}"})

def convert_visitor_to_lead(phone, context="", extracted_details=None):
    """Creates a lead record from a non-lead visitor chat using AI-extracted or default details.
    Returns 'created', 'exists' (phone already has a lead), or None on error."""
    existing = get_lead_by_phone(phone)
    if existing:
        return "exists"

    details = extracted_details or {}
    data = {
        "phone": phone,
        "name": details.get("name") or "Unknown",
        "company": details.get("company") or "Unknown",
        "email": details.get("email") or "",
        "location": details.get("location") or "Unknown",
        "product_interest": details.get("product_interest") or "Unknown",
        "quantity": details.get("quantity") or "Unknown",
        "requirements": context or details.get("requirements") or "Converted from visitor chat.",
        "status": "New",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z"
    }
    res = request_supabase("leads", "POST", data=data)
    return "created" if res else None

def clear_visitor_chats():
    """Deletes chat history for every phone that is not a registered lead.
    Returns the number of visitor chats deleted."""
    all_chats = request_supabase("chat_history", "GET", params={"order": "created_at.desc", "limit": "500"}) or []
    all_leads = request_supabase("leads", "GET", params={"limit": "500"}) or []

    lead_phones = set(l.get("phone") for l in all_leads if l.get("phone"))
    visitor_phones = set(c.get("phone") for c in all_chats if c.get("phone") and c.get("phone") not in lead_phones)

    for phone in visitor_phones:
        request_supabase("chat_history", "DELETE", params={"phone": f"eq.{phone}"})
    return len(visitor_phones)

def get_all_outbound_messages():
    """Returns history of direct manager outbound messages."""
    chats = request_supabase("chat_history", "GET", params={"direction": "eq.outbound", "order": "created_at.desc", "limit": "100"}) or []
    return chats
