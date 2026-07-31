from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, RedirectResponse, StreamingResponse
from pydantic import BaseModel
import db
import ai
import re
import json
import auth
import io
import config_manager
from datetime import datetime

router = APIRouter()

class TestChatMessage(BaseModel):
    phone: str
    message: str
    profile_name: str = "Tester"

class ManagerMessagePayload(BaseModel):
    phone: str
    message: str


@router.get("/dashboard")
def get_dashboard(request: Request):
    if not auth.verify_auth(request):
        return RedirectResponse(url="/login")
    return FileResponse("templates/dashboard.html")

@router.get("/test-chat")
def get_test_chat(request: Request):
    if not auth.verify_auth(request):
        return RedirectResponse(url="/login")
    return FileResponse("templates/test_chat.html")

@router.post("/api/test-chat")
def api_test_chat(msg: TestChatMessage, request: Request):
    """Bypasses Meta API and interacts directly with AI for testing."""
    auth.require_auth(request)
    incoming_msg = msg.message.strip()
    if not incoming_msg:
        return {"error": "Message is empty"}
        
    db.log_chat_message(msg.phone, "inbound", incoming_msg)
    
    ai_response = ai.get_ai_response(msg.phone, msg.profile_name)
    reply_text = ai_response
    image_file = None
    
    submit_match = re.search(r'\[LEAD_SUBMIT:\s*(\{.*?\})\s*\]', ai_response, re.DOTALL)
    status_match = "[LEAD_STATUS_CHECK]" in ai_response
    image_match = re.search(r'\[IMAGE:\s*(.+?)\s*\]', ai_response)
    
    if image_match:
        image_file = image_match.group(1).strip()
        reply_text = re.sub(r'\[IMAGE:\s*.+?\s*\]', '', reply_text).strip()

    if submit_match:
        try:
            lead_data = json.loads(submit_match.group(1))
            # Validate required fields
            if not lead_data.get("name") or not lead_data.get("product"):
                raise ValueError("Missing required lead fields: name and product")
            lead_id = db.create_lead(
                phone=msg.phone,
                name=lead_data.get("name", "Unknown")[:200],
                company=lead_data.get("company", "Individual")[:200],
                email=lead_data.get("email", "")[:200],
                location=lead_data.get("location", "Unknown")[:200],
                product_interest=lead_data.get("product", "Unknown")[:200],
                quantity=lead_data.get("quantity", "Unknown")[:100],
                requirements=f"Captured via AI chatbot. Qty: {lead_data.get('quantity')}. Loc: {lead_data.get('location')}."
            )
            cleaned_text = re.sub(r'\[LEAD_SUBMIT:\s*\{.*?\}\s*\]', '', ai_response, flags=re.DOTALL).strip()
            success_msg = "🎉 *Inquiry Submitted Successfully!*\n\nOur sales representatives are reviewing your requirements and will reach out shortly."
            reply_text = f"{cleaned_text}\n\n{success_msg}" if cleaned_text else success_msg
        except Exception:
            reply_text = "I encountered an error submitting your quote request. Please try again."
            
    elif status_match:
        lead = db.get_lead_by_phone(msg.phone)
        cleaned_text = ai_response.replace("[LEAD_STATUS_CHECK]", "").strip()
        if lead:
            reply_text = f"{cleaned_text}\n\n📄 *Inquiry #{lead['id']} Status:* {lead['status']}" if cleaned_text else f"📄 *Inquiry #{lead['id']} Status:* {lead['status']}"
        else:
            reply_text = f"{cleaned_text}\n\n❌ No active inquiry found." if cleaned_text else "❌ No active inquiry found."

    reply_text = reply_text.replace("**", "*")
    reply_text = re.sub(r'\n{3,}', '\n\n', reply_text).strip()
    db.log_chat_message(msg.phone, "outbound", reply_text)
    
    return {"reply": reply_text, "image": image_file}

@router.get("/api/leads")
def get_leads_api(request: Request, status: str = None, search: str = None):
    auth.require_auth(request)
    return db.get_leads(status_filter=status, search_query=search)

@router.get("/api/leads/export")
def export_leads_excel(request: Request):
    auth.require_auth(request)
    from openpyxl import Workbook
    from openpyxl.styles import (
        Font, PatternFill, Alignment, Border, Side
    )
    from openpyxl.utils import get_column_letter

    leads = db.get_leads()

    wb = Workbook()
    ws = wb.active
    ws.title = "KDI Leads"

    # ── Styles ────────────────────────────────────────────────────────────────
    HEADER_FILL   = PatternFill("solid", fgColor="C0521F")   # KDI orange
    HEADER_FONT   = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
    ALT_ROW_FILL  = PatternFill("solid", fgColor="F5F5F5")   # light grey
    WHITE_FILL    = PatternFill("solid", fgColor="FFFFFF")
    CELL_FONT     = Font(name="Calibri", size=10)
    CENTER_ALIGN  = Alignment(horizontal="center", vertical="center", wrap_text=True)
    LEFT_ALIGN    = Alignment(horizontal="left",   vertical="center", wrap_text=True)

    thin = Side(style="thin", color="CCCCCC")
    BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)

    STATUS_COLORS = {
        "New":       "1A73E8",   # blue
        "Contacted": "F9AB00",   # amber
        "Quoted":    "9334E6",   # purple
        "Won":       "1E8E3E",   # green
        "Lost":      "D93025",   # red
        "Partial":   "FA7B17",   # orange
    }

    # ── Headers ───────────────────────────────────────────────────────────────
    headers = [
        "#", "Status", "Name", "Company", "Phone", "Email", "Location",
        "Product Required", "Quantity", "Requirements / Notes",
        "Inquiry Date", "Days Open"
    ]
    ws.append(headers)

    for col_idx, _ in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill   = HEADER_FILL
        cell.font   = HEADER_FONT
        cell.border = BORDER
        cell.alignment = CENTER_ALIGN

    ws.row_dimensions[1].height = 22
    ws.freeze_panes = "A2"   # freeze header row

    # ── Data rows ─────────────────────────────────────────────────────────────
    for row_num, lead in enumerate(leads, start=1):
        status = lead.get("status", "")

        # Robust phone extraction checking multiple possible schema keys
        raw_phone = str(lead.get("phone") or lead.get("phone_number") or lead.get("mobile") or "").strip()
        if raw_phone and not raw_phone.startswith("+"):
            formatted_phone = f"+{raw_phone}"
        else:
            formatted_phone = raw_phone

        # Inquiry date — just the date, no time clutter
        def fmt_date(val):
            if not val:
                return ""
            try:
                return datetime.fromisoformat(val.replace("Z", "+00:00")).strftime("%d %b %Y")
            except Exception:
                return str(val)

        # Days open — how many days since the inquiry was submitted
        def days_open(val):
            if not val:
                return ""
            try:
                created = datetime.fromisoformat(val.replace("Z", "+00:00"))
                delta = (datetime.utcnow().replace(tzinfo=created.tzinfo) - created).days
                return delta
            except Exception:
                return ""

        row_data = [
            row_num,
            status,
            lead.get("name", ""),
            lead.get("company", ""),
            formatted_phone,
            lead.get("email", ""),
            lead.get("location", ""),
            lead.get("product_interest", ""),
            lead.get("quantity", ""),
            lead.get("requirements", ""),
            fmt_date(lead.get("created_at")),
            days_open(lead.get("created_at")),
        ]
        ws.append(row_data)

        excel_row = row_num + 1   # +1 because header is row 1
        row_fill = ALT_ROW_FILL if row_num % 2 == 0 else WHITE_FILL

        # Columns centred: #(1), Status(2), Phone(5), Inquiry Date(11), Days Open(12)
        CENTRE_COLS = {1, 2, 5, 11, 12}

        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=excel_row, column=col_idx)
            cell.border    = BORDER
            cell.alignment = CENTER_ALIGN if col_idx in CENTRE_COLS else LEFT_ALIGN
            cell.font      = CELL_FONT

            # Ensure Phone column (5) is formatted as text so Excel displays it properly
            if col_idx == 5:
                cell.number_format = '@'

            # Status column (col 2) gets colour-coded bold text
            if col_idx == 2 and status in STATUS_COLORS:
                cell.font = Font(name="Calibri", size=10, bold=True,
                                 color=STATUS_COLORS[status])
                cell.fill = WHITE_FILL
            # Days Open (col 12) — highlight if > 3 days with a warm tint
            elif col_idx == 12:
                days = row_data[11]
                if isinstance(days, int) and days > 3:
                    cell.fill = PatternFill("solid", fgColor="FFF3CD")   # soft amber
                    cell.font = Font(name="Calibri", size=10, bold=True, color="7B5800")
                else:
                    cell.fill = row_fill
            else:
                cell.fill = row_fill

        ws.row_dimensions[excel_row].height = 18

    # ── Auto-fit column widths ─────────────────────────────────────────────────
    MIN_WIDTH = 10
    MAX_WIDTH = 45
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            try:
                cell_len = len(str(cell.value)) if cell.value is not None else 0
                max_len = max(max_len, cell_len)
            except Exception:
                pass
        adjusted = min(MAX_WIDTH, max(MIN_WIDTH, max_len + 3))
        ws.column_dimensions[col_letter].width = adjusted

    # ── Stream response ────────────────────────────────────────────────────────
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"KDI_Leads_{datetime.utcnow().strftime('%Y%m%d_%H%M')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.patch("/api/leads/{lead_id}/status")
async def update_lead_status_api(lead_id: int, request: Request):
    auth.require_auth(request)
    payload = await request.json()
    status = payload.get("status")
    ALLOWED_STATUSES = {"New", "Contacted", "Quoted", "Won", "Lost", "Partial"}
    if status not in ALLOWED_STATUSES:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {', '.join(sorted(list(ALLOWED_STATUSES)))}")
    db.update_lead_status(lead_id, status)
    return {"success": True, "lead_id": lead_id, "status": status}

@router.delete("/api/leads/clear-all")
def clear_all_leads_api(request: Request):
    """Deletes all leads and chat history from Supabase database."""
    auth.require_auth(request)
    db.request_supabase("leads", "DELETE", params={"id": "gt.0"})
    db.request_supabase("chat_history", "DELETE", params={"id": "gt.0"})
    return {"success": True, "message": "All leads and chat history have been cleared."}

@router.delete("/api/leads/{lead_id}")
def delete_lead_api(lead_id: int, request: Request):
    """Deletes a single lead and its chat history by lead ID."""
    auth.require_auth(request)
    db.delete_lead(lead_id)
    return {"success": True, "lead_id": lead_id, "message": "Lead deleted successfully."}

@router.get("/api/leads/{phone}/history")
def get_lead_history_api(phone: str, request: Request):
    auth.require_auth(request)
    return db.get_chat_history(phone)

@router.post("/api/leads/send-message")
async def send_manager_message_api(payload: ManagerMessagePayload, request: Request):
    """Allows a manager/admin to send a direct WhatsApp reply to a customer."""
    auth.require_auth(request)
    msg_text = payload.message.strip()
    if not msg_text:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")
    
    phone = payload.phone.strip()
    if not phone:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Phone number is required.")

    # 1. Send via WhatsApp Meta Cloud API
    from routes.whatsapp import send_whatsapp_message
    try:
        send_whatsapp_message(to_phone=phone, text=f"👤 *Marketing Manager:* {msg_text}")
    except RuntimeError as re_err:
        from fastapi import HTTPException
        if "24H_WINDOW_EXPIRED" in str(re_err):
            raise HTTPException(
                status_code=400,
                detail="Meta 24-hour messaging window expired. Click 'Chat on WhatsApp Web' button above to send a direct message."
            )
        raise HTTPException(status_code=400, detail=str(re_err))
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Failed to send WhatsApp message: {str(e)}")

    # 2. Log in chat history DB as outbound message
    db.log_chat_message(phone, "outbound", f"👤 *Marketing Manager:* {msg_text}")

    # 3. Auto-update lead status to "Contacted" if it was "New" or "Partial"
    lead = db.get_lead_by_phone(phone)
    if lead and lead.get("status") in ["New", "Partial"]:
        db.update_lead_status(lead["id"], "Contacted")

    return {"success": True, "message": "Message sent via WhatsApp successfully."}


@router.get("/api/dashboard/stats")
def get_stats_api(request: Request):
    auth.require_auth(request)
    leads = db.get_leads()
    
    total_leads = len(leads)
    new_leads = sum(1 for l in leads if l.get("status") == "New")
    contacted_leads = sum(1 for l in leads if l.get("status") == "Contacted")
    quoted_leads = sum(1 for l in leads if l.get("status") == "Quoted")
    won_leads = sum(1 for l in leads if l.get("status") == "Won")
    lost_leads = sum(1 for l in leads if l.get("status") == "Lost")
    
    # Category / Product interest distribution for charts
    categories = {}
    
    # Pre-populate product name to category mapping dynamically
    prod_to_cat = {}
    try:
        # Load categories from catalog products
        all_prods = db.get_all_products()
        for p in all_prods:
            prod_to_cat[p["name"]] = p["category"]
    except Exception:
        pass
        
    for l in leads:
        prod = l.get("product_interest")
        if not prod:
            continue

        cat = prod_to_cat.get(prod)
        if not cat:
            prod_lower = prod.lower()
            if "control" in prod_lower:
                cat = "Control Cables"
            elif "aerial" in prod_lower or "bunched" in prod_lower or "abc" in prod_lower:
                cat = "Aerial Bunched Cable"
            elif "submersible" in prod_lower or "flexible" in prod_lower or "cord" in prod_lower or "trailing" in prod_lower or "rubber" in prod_lower:
                cat = "Rubber Cable"
            elif "thermocouple" in prod_lower or "instrumentation" in prod_lower or "compensating" in prod_lower or "shielded" in prod_lower:
                cat = "Instrumentation Wires"
            elif "house" in prod_lower or "fr" in prod_lower or "wire" in prod_lower or "triple" in prod_lower:
                cat = "House Wires"
            else:
                cat = "Power Cable"

        categories[cat] = categories.get(cat, 0) + 1

    return {
        "total_leads": total_leads,
        "new_leads": new_leads,
        "contacted_leads": contacted_leads,
        "quoted_leads": quoted_leads,
        "won_leads": won_leads,
        "lost_leads": lost_leads,
        "category_distribution": categories
    }

@router.get("/api/products")
def get_products_api(request: Request):
    auth.require_auth(request)
    return db.get_all_products()

@router.patch("/api/products/{product_name}")
async def update_product_api(product_name: str, request: Request):
    auth.require_auth(request)
    payload = await request.json()
    price = payload.get("price")
    stock_status = payload.get("stock_status")
    if price is not None and (not isinstance(price, (int, float)) or price < 0):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Price must be a non-negative number.")
    db.update_product_price_and_stock(product_name, price, stock_status)
    return {"success": True, "product": product_name}

@router.get("/api/settings")
def get_settings_api(request: Request):
    auth.require_auth(request)
    return config_manager.get_config()

@router.put("/api/settings")
async def update_settings_api(request: Request):
    auth.require_auth(request)
    payload = await request.json()
    success = config_manager.save_config(payload)
    if success:
        return {"success": True}
    else:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Failed to save configuration.")
