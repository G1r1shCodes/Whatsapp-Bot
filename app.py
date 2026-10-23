from fastapi import FastAPI, Request, Response
import db

# Initialize Database on Startup
db.init_db()

app = FastAPI(title="KDI Power AI WhatsApp Assistant")

from routes import whatsapp, dashboard
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, FileResponse, HTMLResponse, JSONResponse
import os
import json
import auth

# Create static directories if they don't exist
os.makedirs("static/css", exist_ok=True)
os.makedirs("static/js", exist_ok=True)
os.makedirs("templates", exist_ok=True)

# Mount static folder
app.mount("/static", StaticFiles(directory="static"), name="static")

# Serve catalogue PDF
@app.get("/catalogue/CATALOUGE.pdf")
async def serve_catalogue():
    catalogue_path = os.path.join("data", "raw_catalogues", "CATALOUGE.pdf")
    if os.path.exists(catalogue_path):
        return FileResponse(catalogue_path, media_type="application/pdf", filename="KDI_Power_Catalogue.pdf")
    return JSONResponse({"error": "Catalogue not found"}, status_code=404)

@app.get("/")
async def root():
    return RedirectResponse(url="/dashboard")

@app.get("/health")
async def health_check():
    """Public endpoint for cron jobs to keep the service awake."""
    return JSONResponse({"status": "ok", "message": "Service is awake"})

@app.get("/health/db")
async def health_db():
    """Diagnostic endpoint to verify live Supabase connectivity."""
    import httpx
    if not db.SUPABASE_URL or not db.SUPABASE_KEY:
        return JSONResponse({
            "status": "error",
            "message": "SUPABASE_URL or SUPABASE_KEY missing in environment",
            "url_set": bool(db.SUPABASE_URL),
            "key_set": bool(db.SUPABASE_KEY)
        }, status_code=500)

    url = f"{db.SUPABASE_URL}/rest/v1/leads"
    headers = {
        "apikey": db.SUPABASE_KEY,
        "Authorization": f"Bearer {db.SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url, headers=headers, params={"limit": 1})
            is_ok = resp.status_code == 200
            data = resp.json() if is_ok else None
            return JSONResponse({
                "status": "ok" if is_ok else "error",
                "status_code": resp.status_code,
                "configured_url": db.SUPABASE_URL,
                "leads_found": len(data) if isinstance(data, list) else 0,
                "response": resp.text[:200]
            }, status_code=200 if is_ok else 502)
    except Exception as e:
        return JSONResponse({
            "status": "exception",
            "error_type": type(e).__name__,
            "error_message": str(e),
            "configured_url": db.SUPABASE_URL
        }, status_code=500)


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse("static/images/kdi-logo-90x90.png")

@app.get("/login")
async def login_page():
    return HTMLResponse(content=auth.LOGIN_PAGE_HTML)

@app.post("/api/login")
async def api_login(request: Request):
    body = await request.json()
    password = body.get("password", "")
    
    if not auth.DASHBOARD_SECRET:
        # No secret set — auto-login (dev mode)
        response = JSONResponse({"success": True})
        return response
    
    if password == auth.DASHBOARD_SECRET:
        response = JSONResponse({"success": True})
        response.set_cookie(
            key=auth.COOKIE_NAME,
            value=auth._hash_secret(auth.DASHBOARD_SECRET),
            httponly=True,
            samesite="lax",
            max_age=86400 * 7,  # 7 days
        )
        return response
    
    return JSONResponse({"error": "Invalid password"}, status_code=401)

# Include Routers
app.include_router(whatsapp.router)
app.include_router(dashboard.router)