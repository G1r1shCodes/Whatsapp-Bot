import os
import json
import httpx
import urllib.parse
from datetime import datetime, timedelta
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
    except Exception as e:
        logger.error(f"Supabase API error on {endpoint} [{method}]: {e}")
        return None  # Return None on error so callers can distinguish from empty results

def init_db():
    # Database tables are initialized on Supabase via MCP SQL execute
    pass

# Session Management helpers
def get_session(phone):
    res = request_supabase("sessions", "GET", params={"phone": f"eq.{phone}"})
    if res:
        row = res[0]
        # Parse data JSON
        state_data = row["data"]
        if isinstance(state_data, str):
            state_data = json.loads(state_data)
        return {
            "current_state": row["state"],
            "state_data": state_data,
            "last_active": row["updated_at"]
        }
    return None

def save_session(phone, current_state, state_data):
    exists = get_session(phone)
    data = {
        "phone": phone,
        "state": current_state,
        "step": state_data.get("step", 0),
        "data": state_data,
        "updated_at": datetime.utcnow().isoformat() + "Z"
    }
    if exists:
        request_supabase("sessions", "PATCH", data=data, params={"phone": f"eq.{phone}"})
    else:
        request_supabase("sessions", "POST", data=data)

def delete_session(phone):
    request_supabase("sessions", "DELETE", params={"phone": f"eq.{phone}"})

def get_static_dummy_leads():
    """Removed — dummy data has been disabled."""
    return []



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
            "category": "Power Cable",
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
            "category": "Power Cable",
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
            "category": "Power Cable",
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
            "category": "Power Cable",
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
            "category": "Power Cable",
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
            "category": "Power Cable",
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
            "category": "Power Cable",
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
            "category": "Power Cable",
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
            "category": "Power Cable",
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
            "category": "Power Cable",
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
            "category": "Power Cable",
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
            "category": "Power Cable",
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
            "category": "Power Cable",
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
            "category": "Power Cable",
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

def is_dummy_phone(phone):
    if not phone:
        return False
    cleaned = phone.replace("+", "").strip()
    return cleaned.startswith("9198765") and len(cleaned) == 10

def get_dummy_chat_history(phone):
    cleaned = phone.replace("+", "").strip()
    try:
        idx = int(cleaned[-3:])
    except Exception:
        idx = 0
        
    dummies = get_static_dummy_leads()
    lead = dummies[idx] if idx < len(dummies) else dummies[0]
    
    name = lead["name"]
    product = lead["product_interest"]
    qty = lead["quantity"]
    loc = lead["location"]
    status = lead["status"]
    
    history = []
    base_time = datetime.fromisoformat(lead["created_at"].replace("Z", ""))
    
    history.append({
        "phone": phone,
        "direction": "inbound",
        "body": "Hello, I am interested in purchasing some cables.",
        "created_at": base_time.isoformat() + "Z"
    })
    
    history.append({
        "phone": phone,
        "direction": "outbound",
        "body": f"Hello {name}! 👋\nWelcome to *KDI Power*!\nI would be happy to help you with your query. Could you please specify which cable/wire you are looking for?",
        "created_at": (base_time + timedelta(minutes=1)).isoformat() + "Z"
    })
    
    history.append({
        "phone": phone,
        "direction": "inbound",
        "body": f"I need {product}.",
        "created_at": (base_time + timedelta(minutes=2)).isoformat() + "Z"
    })
    
    history.append({
        "phone": phone,
        "direction": "outbound",
        "body": f"Got it! What quantity of *{product}* do you require?",
        "created_at": (base_time + timedelta(minutes=3)).isoformat() + "Z"
    })
    
    history.append({
        "phone": phone,
        "direction": "inbound",
        "body": f"We require around {qty}.",
        "created_at": (base_time + timedelta(minutes=4)).isoformat() + "Z"
    })
    
    history.append({
        "phone": phone,
        "direction": "outbound",
        "body": "Understood. Please share your delivery location and company name if applicable.",
        "created_at": (base_time + timedelta(minutes=5)).isoformat() + "Z"
    })
    
    if status == "Partial":
        return history
        
    history.append({
        "phone": phone,
        "direction": "inbound",
        "body": f"Delivery is at {loc}. Company name is {lead['company']}.",
        "created_at": (base_time + timedelta(minutes=6)).isoformat() + "Z"
    })
    
    history.append({
        "phone": phone,
        "direction": "outbound",
        "body": f"Thank you for the details, {name}. Your inquiry has been logged successfully with ID #{lead['id']}.\n\nOur sales representative will reach out to you shortly to provide the quote.",
        "created_at": (base_time + timedelta(minutes=7)).isoformat() + "Z"
    })
    
    if status == "New":
        return history
        
    history.append({
        "phone": phone,
        "direction": "outbound",
        "body": "📞 *Sales Representative Update*\nOur sales team has reviewed your inquiry and is preparing your quotation.",
        "created_at": (base_time + timedelta(hours=1)).isoformat() + "Z"
    })
    
    if status == "Contacted":
        return history
        
    history.append({
        "phone": phone,
        "direction": "outbound",
        "body": f"📄 *Quotation Sent*\nWe have emailed the quotation to {lead['email']}.\n\n*Summary:*\nProduct: {product}\nQuantity: {qty}\nPrice: Special Project Pricing applied.",
        "created_at": (base_time + timedelta(hours=2)).isoformat() + "Z"
    })
    
    if status == "Quoted":
        return history
        
    if status == "Won":
        history.append({
            "phone": phone,
            "direction": "inbound",
            "body": "Thank you, we accept the quote and have processed the purchase order.",
            "created_at": (base_time + timedelta(hours=3)).isoformat() + "Z"
        })
        history.append({
            "phone": phone,
            "direction": "outbound",
            "body": "🎉 *Deal Closed!*\nPayment received. Dispatch is being scheduled. Thank you for doing business with KDI Power!",
            "created_at": (base_time + timedelta(hours=3, minutes=10)).isoformat() + "Z"
        })
        return history
        
    if status == "Lost":
        history.append({
            "phone": phone,
            "direction": "inbound",
            "body": "Sorry, we have selected another vendor with a lower price.",
            "created_at": (base_time + timedelta(hours=4)).isoformat() + "Z"
        })
        history.append({
            "phone": phone,
            "direction": "outbound",
            "body": "Thank you for the update. We hope to work with you on future projects.",
            "created_at": (base_time + timedelta(hours=4, minutes=5)).isoformat() + "Z"
        })
        return history
        
    return history

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
def get_all_products(category_filter=None):
    params = {}
    if category_filter:
        params["category"] = f"eq.{category_filter}"
    
    products = request_supabase("products", "GET", params=params)
    if products is None:
        # Supabase error — fall back to local static catalog
        local_products = get_static_dummy_products()
        if category_filter:
            local_products = [p for p in local_products if p["category"] == category_filter]
        return local_products
    return products

def get_product_by_id(product_name):
    res = request_supabase("products", "GET", params={"name": f"eq.{product_name}"})
    if res is None:
        # Supabase error — fall back to static data
        local_products = get_static_dummy_products()
        matches = [p for p in local_products if p["name"] == product_name]
        return matches[0] if matches else None
    return res[0] if res else None

def update_product_price_and_stock(product_name, price, stock_status):
    data = {
        "price_per_meter": price,
        "stock_status": stock_status
    }
    request_supabase("products", "PATCH", data=data, params={"name": f"eq.{product_name}"})

def upsert_product(product_data):
    name = product_data.get("name")
    if not name:
        return None
    
    existing = get_product_by_id(name)
    if existing:
        request_supabase("products", "PATCH", data=product_data, params={"name": f"eq.{name}"})
        return "updated"
    else:
        result = request_supabase("products", "POST", data=product_data)
        return "created" if result is not None else None

def create_product(product_data):
    """Directly create a product in Supabase (no fallback confusion)."""
    name = product_data.get("name")
    if not name:
        return None
    
    # Check Supabase directly — don't use get_product_by_id which has static fallback
    existing = request_supabase("products", "GET", params={"name": f"eq.{name}"})
    if existing is None:
        logger.error(f"Cannot check for existing product — Supabase error")
        return None
    if existing:  # Product already exists in Supabase
        return "exists"
    
    result = request_supabase("products", "POST", data=product_data)
    return "created" if result is not None else None

def get_product_categories():
    products = get_all_products()
    categories = list(set([p["category"] for p in products]))
    return categories

# Chat History loggers
def log_chat_message(phone, direction, body):
    data = {
        "phone": phone,
        "direction": direction,
        "body": body,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    request_supabase("chat_history", "POST", data=data)

def get_chat_history(phone, limit=30):
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
