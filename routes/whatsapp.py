import os
import json
import re
from fastapi import APIRouter, Request, Response, HTTPException, BackgroundTasks
import db
import ai
import httpx
import config_manager
from logger import get_logger

http_client = httpx.Client(timeout=10.0)

logger = get_logger(__name__)

router = APIRouter()

META_VERIFY_TOKEN = os.environ.get("META_VERIFY_TOKEN", "default_verify_token")
META_ACCESS_TOKEN = os.environ.get("META_ACCESS_TOKEN")
META_PHONE_NUMBER_ID = os.environ.get("META_PHONE_NUMBER_ID")
META_WABA_ID = os.environ.get("META_WABA_ID")

def send_whatsapp_message(to_phone: str, text: str, image_url: str = None, show_menu: bool = False, show_categories_menu: bool = False):
    """Sends a message to the user via Meta Cloud API."""
    if not META_ACCESS_TOKEN or not META_PHONE_NUMBER_ID:
        logger.error("Missing Meta API credentials in environment variables.")
        raise RuntimeError("Meta API credentials (META_ACCESS_TOKEN / META_PHONE_NUMBER_ID) are missing in environment variables.")
        
    url = f"https://graph.facebook.com/v21.0/{META_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {META_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # 1. Send Main Menu if requested (Embeds image directly at TOP of card if provided)
    menu_sent = False
    if show_menu:
        header_obj = {"type": "text", "text": "KDI Power"}
        if image_url:
            header_obj = {"type": "image", "image": {"link": image_url}}

        payload_menu = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_phone,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "header": header_obj,
                "body": {
                    "text": text if text else "How can we assist you today?"
                },
                "footer": {
                    "text": "Please choose an option below:"
                },
                "action": {
                    "buttons": [
                        {
                            "type": "reply",
                            "reply": {
                                "id": "menu_browse",
                                "title": "Browse Products"
                            }
                        },
                        {
                            "type": "reply",
                            "reply": {
                                "id": "menu_quote",
                                "title": "Request a Quote"
                            }
                        },
                        {
                            "type": "reply",
                            "reply": {
                                "id": "menu_contact",
                                "title": "Call Us"
                            }
                        }
                    ]
                }
            }
        }
            
        try:
            response = http_client.post(url, json=payload_menu, headers=headers)
            response.raise_for_status()
            logger.info("Sent menu with image header successfully")
            menu_sent = True
        except Exception as e:
            logger.error(f"Error sending Meta menu with image header: {e}")
            # Fallback 1: Try sending menu with text header if image header failed
            if image_url:
                try:
                    payload_menu["interactive"]["header"] = {"type": "text", "text": "KDI Power"}
                    response = http_client.post(url, json=payload_menu, headers=headers)
                    response.raise_for_status()
                    logger.info("Sent fallback text-header menu successfully")
                    menu_sent = True
                except Exception as e2:
                    logger.error(f"Error sending fallback text-header menu: {e2}")

        # Fallback 2: if interactive menu failed completely, send text body
        if not menu_sent and text:
            payload_text_fallback = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to_phone,
                "type": "text",
                "text": {"preview_url": False, "body": text}
            }
            try:
                http_client.post(url, json=payload_text_fallback, headers=headers)
                logger.info("Sent fallback text menu successfully")
            except Exception as fe:
                logger.error(f"Error sending fallback menu text: {fe}")

    # 2. Send Standalone Image (only if menu was NOT sent, or for product images)
    if image_url and not show_menu:
        payload_img = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_phone,
            "type": "image",
            "image": {
                "link": image_url
            }
        }
        # If no menu follows, put the text in the caption
        if not show_categories_menu and text:
            payload_img["image"]["caption"] = text
            
        try:
            response = http_client.post(url, json=payload_img, headers=headers)
            response.raise_for_status()
            logger.info("Sent image successfully")
        except Exception as e:
            logger.error(f"Error sending Meta image: {e}")


    # 3. Send Categories Menu if requested
    if show_categories_menu:
        # Load categories dynamically from config
        import config_manager
        cfg = config_manager.get_config()
        browse_cats = cfg.get("browse_categories", [
            {"id": "cat_power", "title": "Power Cables"},
            {"id": "cat_wires", "title": "Electrical Wires"},
            {"id": "cat_armour", "title": "Armoured Cables"},
            {"id": "cat_unarmour", "title": "Unarmoured Cables"},
            {"id": "cat_control", "title": "Control Cables"}
        ])
        category_rows = [{"id": cat["id"], "title": cat["title"]} for cat in browse_cats[:10]]

        payload_cat = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_phone,
            "type": "interactive",
            "interactive": {
                "type": "list",
                "header": {
                    "type": "text",
                    "text": "KDI Products"
                },
                "body": {
                    "text": text if text else "Browse our product categories:"
                },
                "footer": {
                    "text": "Tap the button below"
                },
                "action": {
                    "button": "Categories",
                    "sections": [
                        {
                            "title": "Select a Category",
                            "rows": category_rows
                        }
                    ]
                }
            }
        }
        try:
            response = http_client.post(url, json=payload_cat, headers=headers)
            response.raise_for_status()
            logger.info("Sent categories menu successfully")
        except httpx.HTTPStatusError as he:
            logger.error(f"Error sending Meta cat menu (HTTP {he.response.status_code}): {he.response.text}")
        except Exception as e:
            logger.error(f"Error sending Meta cat menu: {e}")

    # 4. Standard Text Message (if no menu, and image wasn't sent with caption)
    if not show_menu and not show_categories_menu and text:
        # Don't double-send text if image already sent text as caption
        if not (image_url and text):
            payload_text = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to_phone,
                "type": "text",
                "text": {
                    "preview_url": False,
                    "body": text
                }
            }
            try:
                response = http_client.post(url, json=payload_text, headers=headers)
                response.raise_for_status()
                logger.info("Sent text successfully")
                return True
            except httpx.HTTPStatusError as he:
                res_text = he.response.text
                logger.error(f"Error sending Meta text (HTTP {he.response.status_code}): {res_text}")
                if "131047" in res_text or "24 hour" in res_text.lower() or "outside the allowed window" in res_text.lower():
                    raise RuntimeError("24H_WINDOW_EXPIRED")
                raise RuntimeError(f"Meta API Error: {res_text}")
            except Exception as e:
                logger.error(f"Error sending Meta text: {e}")
                raise e

def send_whatsapp_document(to_phone: str, document_url: str, filename: str, caption: str = ""):
    """Sends a PDF/document to the user via Meta Cloud API."""
    if not META_ACCESS_TOKEN or not META_PHONE_NUMBER_ID:
        logger.error("Missing Meta API credentials in environment variables.")
        return
    
    url = f"https://graph.facebook.com/v21.0/{META_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {META_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to_phone,
        "type": "document",
        "document": {
            "link": document_url,
            "filename": filename
        }
    }
    if caption:
        payload["document"]["caption"] = caption
    
    try:
        response = http_client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        logger.info(f"Sent document '{filename}' to {to_phone} successfully")
    except Exception as e:
        logger.error(f"Error sending document to {to_phone}: {e}")

# ── Meta Template Management API ──────────────────────────

def get_meta_templates():
    """Fetches all message templates from Meta for this WABA."""
    if not META_ACCESS_TOKEN or not META_WABA_ID:
        logger.error("Missing META_ACCESS_TOKEN or META_WABA_ID for template management.")
        return []
    url = f"https://graph.facebook.com/v21.0/{META_WABA_ID}/message_templates"
    headers = {"Authorization": f"Bearer {META_ACCESS_TOKEN}"}
    params = {"limit": 100}
    try:
        response = http_client.get(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        return data.get("data", [])
    except Exception as e:
        logger.error(f"Error fetching Meta templates: {e}")
        return []

def create_meta_template(name, category, language, components):
    """Creates a message template via Meta Graph API for review.
    Returns the API response dict or raises on error.
    """
    if not META_ACCESS_TOKEN or not META_WABA_ID:
        raise RuntimeError("META_ACCESS_TOKEN and META_WABA_ID are required for template management.")
    url = f"https://graph.facebook.com/v21.0/{META_WABA_ID}/message_templates"
    headers = {
        "Authorization": f"Bearer {META_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "name": name,
        "category": category.upper(),
        "language": language or "en",
        "components": components
    }
    try:
        response = http_client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as he:
        logger.error(f"Meta template creation failed (HTTP {he.response.status_code}): {he.response.text}")
        raise RuntimeError(f"Meta API error: {he.response.text}")
    except Exception as e:
        logger.error(f"Error creating Meta template: {e}")
        raise

def delete_meta_template(template_name):
    """Deletes a message template from Meta by name."""
    if not META_ACCESS_TOKEN or not META_WABA_ID:
        return False
    url = f"https://graph.facebook.com/v21.0/{META_WABA_ID}/message_templates"
    headers = {"Authorization": f"Bearer {META_ACCESS_TOKEN}"}
    params = {"name": template_name}
    try:
        response = http_client.delete(url, headers=headers, params=params)
        response.raise_for_status()
        logger.info(f"Deleted Meta template: {template_name}")
        return True
    except Exception as e:
        logger.error(f"Error deleting Meta template '{template_name}': {e}")
        return False

def send_whatsapp_template(to_phone, template_name, language_code, components=None):
    """Sends a template message to a phone number via Meta Cloud API.
    This works even outside the 24-hour customer service window.
    """
    if not META_ACCESS_TOKEN or not META_PHONE_NUMBER_ID:
        raise RuntimeError("Meta API credentials are required.")
    url = f"https://graph.facebook.com/v21.0/{META_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {META_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    lang = language_code or "en"
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to_phone,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": lang}
        }
    }
    if components:
        payload["template"]["components"] = components
    try:
        response = http_client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        logger.info(f"Sent template '{template_name}' to {to_phone}")
        return response.json()
    except httpx.HTTPStatusError as he:
        res_text = he.response.text
        # Fallback for en vs en_US code if error 132001
        if "132001" in res_text and lang == "en":
            logger.info(f"Retrying template '{template_name}' with language code 'en_US'...")
            payload["template"]["language"]["code"] = "en_US"
            try:
                res2 = http_client.post(url, json=payload, headers=headers)
                res2.raise_for_status()
                logger.info(f"Sent template '{template_name}' (en_US) to {to_phone}")
                return res2.json()
            except Exception:
                pass
        logger.error(f"Error sending template message (HTTP {he.response.status_code}): {res_text}")
        if "132001" in res_text:
            raise RuntimeError("Template is currently PENDING approval on Meta (or language code mismatch). Click 'Sync with Meta' and wait until status turns APPROVED.")
        raise RuntimeError(f"Meta API error: {res_text}")
    except Exception as e:
        logger.error(f"Error sending template message: {e}")
        raise

def build_meta_components(header=None, body="", footer="", buttons=None):
    """Builds Meta-compatible components array from template data.
    Used when creating a template via the Meta API.
    """
    components = []
    # Header
    if header and header.get("type"):
        h = {"type": "HEADER"}
        htype = header["type"].upper()
        if htype == "TEXT":
            h["format"] = "TEXT"
            h["text"] = header.get("content", "")
        elif htype in ["IMAGE", "VIDEO", "DOCUMENT"]:
            h["format"] = htype
            # For media headers, Meta requires an example handle during creation.
            # The actual media is provided at send-time via components parameters.
            example_url = header.get("content", "")
            if example_url:
                h["example"] = {"header_handle": [example_url]}
        components.append(h)
    # Body
    if body:
        b = {"type": "BODY", "text": body}
        # Extract variable count
        import re
        variables = re.findall(r'\{\{(\d+)\}\}', body)
        if variables:
            b["example"] = {"body_text": [[f"sample_{v}" for v in variables]]}
        components.append(b)
    # Footer
    if footer:
        components.append({"type": "FOOTER", "text": footer})
    # Buttons
    if buttons and len(buttons) > 0:
        btn_component = {"type": "BUTTONS", "buttons": []}
        for btn in buttons[:3]:  # Max 3 buttons
            btype = btn.get("type", "").upper()
            if btype == "URL":
                btn_component["buttons"].append({
                    "type": "URL",
                    "text": btn.get("text", "Visit"),
                    "url": btn.get("value", "")
                })
            elif btype == "PHONE":
                btn_component["buttons"].append({
                    "type": "PHONE_NUMBER",
                    "text": btn.get("text", "Call Us"),
                    "phone_number": btn.get("value", "")
                })
            elif btype == "QUICK_REPLY":
                btn_component["buttons"].append({
                    "type": "QUICK_REPLY",
                    "text": btn.get("text", "Reply")
                })
        if btn_component["buttons"]:
            components.append(btn_component)
    return components

@router.get("/webhook")
async def verify_webhook(request: Request):
    """Handles Meta Webhook Verification Challenge."""
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode and token:
        if mode == "subscribe" and token == META_VERIFY_TOKEN:
            logger.info("Webhook verified successfully!")
            return Response(content=challenge, status_code=200)
        else:
            raise HTTPException(status_code=403, detail="Verification token mismatch")
    
    return Response(content="Hello from Webhook", status_code=200)

def process_incoming_message(from_number: str, incoming_msg: str, profile_name: str):
    """Processes the message in the background to avoid Meta webhook timeouts."""
    try:
        # Process Message
        db.log_chat_message(from_number, "inbound", incoming_msg)
        
        # Intercept static buttons and greetings to save API calls & respond instantly
        lower_msg = incoming_msg.lower().strip()
        clean_msg = re.sub(r'[^\w\s]', '', lower_msg).strip()
        
        image_file = None
        menu_match = False
        cat_match = False
        
        greeting_words = {
            "hi", "hello", "hey", "hii", "helo", "yoo", "greetings", "dear",
            "sup", "hi there", "hello there", "good morning", "good evening",
            "good afternoon", "namaste", "namaskar", "pranam", "start"
        }
        
        if clean_msg in greeting_words or lower_msg in ["main menu", "menu", "help", "options"]:
            cfg = config_manager.get_config()
            welcome_template = cfg.get("welcome_text", "Hi {profile_name}! 👋\nWelcome to *KDI Power*!")
            reply_text = welcome_template.format(profile_name=profile_name)
            image_file = cfg.get("welcome_image", "kdi-logo-white-bg.jpg")
            menu_match = True
        elif lower_msg in ["contact sales", "call us"]:
            reply_text = "📞 *Sales & Support*\nTap the number below to call us directly:\n\n*+91-9205333843*\n👤 Vipul Kumar — Marketing Manager\n\n📍 *Factory Address*\nH-1243, DSIDC Industrial Area, Narela, New Delhi\n\n🌐 https://kdipower.com/"
        elif lower_msg in ["request a quote", "request quote", "get quote", "quote"]:
            reply_text = (
                "📝 *Request a Price Quote*\n\n"
                "To get you the best bulk pricing, please reply with your requirements:\n\n"
                "1️⃣ *Your Name*\n"
                "2️⃣ *Company / Firm Name*\n"
                "3️⃣ *Email Address*\n"
                "4️⃣ *Product & Specification* (e.g. 1.5 sq mm Copper Wire)\n"
                "5️⃣ *Quantity* (meters, coils, or drums)\n"
                "6️⃣ *Delivery Location / City*\n\n"
                "💡 *Tip:* You can reply with all details in a single message or share them one by one!"
            )
        elif lower_msg in ["address", "location", "factory address", "where is factory", "factory location", "office address", "corporate office"]:
            reply_text = (
                "📍 *KDI Power — Location & Contact*\n\n"
                "🏭 *Factory Address*\n"
                "H-1243, DSIDC Industrial Area, Narela, New Delhi - 110040\n\n"
                "🏢 *Corporate Office*\n"
                "912, 9th Floor, D Mall, Netaji Subhash Place, Pitampura, Delhi - 110034\n\n"
                "📞 *Sales Line:* +91-9205333843 (Vipul Kumar — Marketing Manager)\n\n"
                "🌐 *Website:* https://kdipower.com/"
            )
        elif lower_msg == "track my inquiry":
            lead = db.get_lead_by_phone(from_number)
            if lead:
                status_emoji = {"New": "🆕", "Contacted": "📞", "Quoted": "💰", "Won": "🎉", "Lost": "❌"}.get(lead["status"], "ℹ️")
                reply_text = f"📄 *Your Inquiry Status*\n\n🔹 *Inquiry ID:* #{lead['id']}\n🔹 *Product:* {lead['product_interest']}\n🔹 *Quantity:* {lead['quantity']}\n🔹 *Status:* {status_emoji} *{lead['status']}*\n🔹 *Updated:* {lead['updated_at'][:16]}"
            else:
                reply_text = "❌ No active inquiry found for your number. Feel free to request a quote by chatting with me!"
        elif any(kw in lower_msg for kw in ["catalogue", "catalog", "catalouge", "cataloge", "brochure"]) or lower_msg in ["pdf", "price list pdf", "product pdf"]:
            # Send the catalogue PDF directly
            base_url = os.environ.get("BASE_URL", "https://whatsapp-bot-4ukk.onrender.com")
            catalogue_url = f"{base_url}/catalogue/CATALOUGE.pdf"
            reply_text = "📄 Here is our complete *KDI Power Product Catalogue*!\n\nBrowse through our full range of electrical wires and cables. Feel free to ask about any product you see! 💬"
            db.log_chat_message(from_number, "outbound", reply_text)
            send_whatsapp_document(from_number, catalogue_url, "KDI_Power_Catalogue.pdf", caption=reply_text)
            return  # Early return — document is sent, no further processing needed
        elif lower_msg in ["website", "website link", "link", "company website", "share website", "share link", "company link", "your website", "share your website", "share website link"]:
            reply_text = "🌐 *KDI Power Website*\n\nVisit us at: https://kdipower.com/\n\nBrowse our full range of electrical cables, wires, and get instant quotes! 💡"
        elif lower_msg == "browse products":
            reply_text = ""
            cat_match = True
        elif lower_msg in ["power cables", "electrical wires", "armoured cables", "unarmoured cables", "control cables"]:
            # Fast-path for Category Selection
            all_prods = db.get_all_products()
            cat_keywords = {
                "power cables": ["power"],
                "electrical wires": ["wire", "house"],
                "armoured cables": ["armoured", "armored"],
                "unarmoured cables": ["unarmoured", "unarmored"],
                "control cables": ["control"]
            }
            kws = cat_keywords.get(lower_msg, [lower_msg])
            matching = [p for p in all_prods if any(kw in p.get("name", "").lower() or kw in p.get("category", "").lower() for kw in kws)]
            
            if matching:
                show = matching[:5]
                total = len(matching)
                lines = [f"🔹 *{p['name']}*: ~INR {p['price_per_meter']}/m | {p.get('conductor','')} {p.get('size','')} | {p.get('core','')} Core(s)" for p in show]
                more_note = f"\n\n📋 *Showing {len(show)} of {total} available options.*" if total > len(show) else ""
                reply_text = (
                    f"📦 *{lower_msg.title()}*\n\n"
                    + "\n".join(lines)
                    + more_note
                    + "\n\n💡 *Prices are indicative and subject to daily metal rates.*"
                    + "\n💬 Reply with a specific product name or size (e.g. *3.5C x 70 sqmm*) to get a formal quote!"
                    + "\n🏭 *Custom specifications also available on request.*"
                )
            else:
                reply_text = f"📦 We offer various options for *{lower_msg.title()}*. Please share your specific core count, conductor size, or conductor type (Copper/Aluminium) and we'll find the right product for you!"
        else:
            # Questions requiring complex reasoning or general product knowledge call Groq AI
            ai_response = ai.get_ai_response(from_number, profile_name)

            
            reply_text = ai_response
            
            # Parse specific tags
            submit_match = re.search(r'\[LEAD_SUBMIT:\s*(\{.*?\})\s*\]', ai_response, re.DOTALL)
            partial_match = re.search(r'\[LEAD_PARTIAL:\s*(\{.*?\})\s*\]', ai_response, re.DOTALL)
            status_match = "[LEAD_STATUS_CHECK]" in ai_response
            menu_match = "[SHOW_MAIN_MENU]" in ai_response
            catalogue_match = "[SEND_CATALOGUE]" in ai_response
            image_match = re.search(r'\[IMAGE:\s*(.+?)\s*\]', ai_response)
            
            if menu_match:
                reply_text = reply_text.replace("[SHOW_MAIN_MENU]", "").strip()
                
            if catalogue_match:
                reply_text = reply_text.replace("[SEND_CATALOGUE]", "").strip()
                base_url = os.environ.get("BASE_URL", "https://whatsapp-bot-4ukk.onrender.com")
                catalogue_url = f"{base_url}/catalogue/CATALOUGE.pdf"
                # Send the text reply first, then the document
                if reply_text:
                    reply_text = reply_text.replace("**", "*")
                    reply_text = re.sub(r'\n{3,}', '\n\n', reply_text).strip()
                    db.log_chat_message(from_number, "outbound", reply_text)
                    send_whatsapp_message(from_number, reply_text)
                send_whatsapp_document(from_number, catalogue_url, "KDI_Power_Catalogue.pdf", caption="📄 KDI Power Product Catalogue")
                return  # Early return — handled completely

            if image_match:
                image_file = image_match.group(1).strip()
                reply_text = re.sub(r'\[IMAGE:\s*.+?\s*\]', '', reply_text).strip()

            if partial_match:
                try:
                    lead_data = json.loads(partial_match.group(1))
                    db.upsert_lead_from_chat(phone=from_number, profile_name=profile_name, lead_data=lead_data, status="Partial")
                    reply_text = re.sub(r'\[LEAD_PARTIAL:\s*\{.*?\}\s*\]', '', reply_text, flags=re.DOTALL).strip()
                except Exception as e:
                    logger.error(f"Error parsing LEAD_PARTIAL tag: {e}")

            if submit_match:
                try:
                    lead_data = json.loads(submit_match.group(1))
                    db.upsert_lead_from_chat(phone=from_number, profile_name=profile_name, lead_data=lead_data, status="New")
                    cleaned_text = re.sub(r'\[LEAD_SUBMIT:\s*\{.*?\}\s*\]', '', reply_text, flags=re.DOTALL).strip()
                    success_msg = f"🎉 *Inquiry Submitted Successfully!*\n\nOur sales representatives are reviewing your requirements and will reach out shortly."
                    reply_text = f"{cleaned_text}\n\n{success_msg}" if cleaned_text else success_msg
                except Exception as e:
                    logger.error(f"Error parsing LEAD_SUBMIT tag: {e}")
                    reply_text = "I encountered an error submitting your quote request. Please try again."
                    
            elif status_match:
                lead = db.get_lead_by_phone(from_number)
                cleaned_text = ai_response.replace("[LEAD_STATUS_CHECK]", "").strip()
                if lead:
                    status_emoji = {"New": "🆕", "Contacted": "📞", "Quoted": "💰", "Won": "🎉", "Lost": "❌"}.get(lead["status"], "ℹ️")
                    status_msg = f"📄 *Your Inquiry Status*\n\n🔹 *Inquiry ID:* #{lead['id']}\n🔹 *Product:* {lead['product_interest']}\n🔹 *Quantity:* {lead['quantity']}\n🔹 *Status:* {status_emoji} *{lead['status']}*\n🔹 *Updated:* {lead['updated_at'][:16]}"
                else:
                    status_msg = "❌ No active inquiry found for your number. Feel free to request a quote by chatting with me!"
                reply_text = f"{cleaned_text}\n\n{status_msg}" if cleaned_text else status_msg
            
        reply_text = reply_text.replace("**", "*")
        reply_text = re.sub(r'\n{3,}', '\n\n', reply_text).strip()
        db.log_chat_message(from_number, "outbound", reply_text)
        
        # Send image to Meta API if one was requested
        image_url = None
        if image_file:
            if image_file.startswith("http://") or image_file.startswith("https://"):
                image_url = image_file
            else:
                clean_img = image_file.strip()
                if not any(clean_img.lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp", ".gif"]):
                    if os.path.exists(os.path.join("static", "images", f"{clean_img}.jpg")):
                        clean_img = f"{clean_img}.jpg"
                    elif os.path.exists(os.path.join("static", "images", f"{clean_img}.png")):
                        clean_img = f"{clean_img}.png"
                    else:
                        clean_img = f"{clean_img}.jpg"
                
                local_path = os.path.join("static", "images", clean_img)
                if os.path.exists(local_path):
                    base_url = os.environ.get("BASE_URL", "https://whatsapp-bot-4ukk.onrender.com")
                    image_url = f"{base_url}/static/images/{clean_img}"
                else:
                    logger.warning(f"Image file '{clean_img}' not found on disk at {local_path}. Omitting image to prevent Meta 404 error.")
                    image_url = None
            
        send_whatsapp_message(from_number, reply_text, image_url=image_url, show_menu=menu_match, show_categories_menu=cat_match)
    except Exception as e:
        logger.error(f"Error in background task: {e}")

@router.post("/webhook")
async def whatsapp_webhook(request: Request, background_tasks: BackgroundTasks):
    """Handles incoming WhatsApp messages from Meta API."""
    try:
        body = await request.json()
        
        if body.get("object") != "whatsapp_business_account":
            return Response(status_code=404)
            
        for entry in body.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                
                # Log Meta delivery statuses (Sent, Delivered, Read, Failed)
                if "statuses" in value and value["statuses"]:
                    for status in value["statuses"]:
                        status_name = status.get("status")
                        recipient = status.get("recipient_id")
                        if status_name == "failed":
                            errors = status.get("errors", [])
                            logger.error(f"Meta delivery FAILED for recipient {recipient}: {errors}")
                        else:
                            logger.info(f"Meta delivery status for {recipient}: {status_name}")
                
                # We process incoming messages
                if "messages" in value and value["messages"]:
                    msg = value["messages"][0]
                    from_number = msg.get("from")
                    msg_type = msg.get("type")
                    
                    contacts = value.get("contacts", [])
                    profile_name = contacts[0].get("profile", {}).get("name", "Sir/Mam") if contacts else "Sir/Mam"
                    
                    incoming_msg = ""
                    if msg_type == "text":
                        incoming_msg = msg.get("text", {}).get("body", "").strip()
                    elif msg_type == "interactive":
                        interactive = msg.get("interactive", {})
                        if interactive.get("type") == "list_reply":
                            incoming_msg = interactive.get("list_reply", {}).get("title", "").strip()
                        elif interactive.get("type") == "button_reply":
                            incoming_msg = interactive.get("button_reply", {}).get("title", "").strip()
                    elif msg_type == "button":
                        # Template Message Quick Reply button payload from Meta
                        btn_obj = msg.get("button", {})
                        incoming_msg = btn_obj.get("text") or btn_obj.get("payload") or ""
                        incoming_msg = incoming_msg.strip()
                    
                    if not incoming_msg:
                        continue
                        
                    # Process Message in Background
                    background_tasks.add_task(process_incoming_message, from_number, incoming_msg, profile_name)
                    
        return Response(status_code=200)
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return Response(status_code=500)

