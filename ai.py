import os
import time
import re
import db
import httpx
import warnings
import prompts
from logger import get_logger

logger = get_logger(__name__)

# Suppress some of the verbose langchain warnings

warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", category=UserWarning)

def load_env():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip()

# Load env variables on module import
load_env()

GROQ_API_RAW = os.environ.get("GROQ_API", "")
GROQ_API_KEYS = [k.strip() for k in re.split(r'[,;\s]+', GROQ_API_RAW) if k.strip()]
GROQ_MODELS = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "groq/compound-mini"]

# Deterministic out-of-scope guard: obvious non-KDI requests are declined
# before the LLM is called, so the model never gets a chance to answer or
# hallucinate an answer to them. The decline phrase MUST match the prompt.
OUT_OF_SCOPE_REPLY = (
    "I am the KDI Power assistant, and I can only help you with our electrical cables, "
    "wires, and quotes. Let me know if you need product information!"
)

OUT_OF_SCOPE_PATTERNS = [
    # Coding / programming / homework
    r"\bleetcode\b", r"\bpython\b", r"\bjava(script)?\b", r"\bc\+\+\b", r"\bc#\b",
    r"\bsql\b", r"\bhtml\b", r"\bregex\b", r"\bprogram(ming|mer)?\b", r"\balgorithm",
    r"\bsyntax\b", r"\bdebug", r"\bcompile", r"\bhomework\b",
    r"\bcode (snippet|solution|problem|challenge|question)\b",
    r"write (a |me )?(code|program|script|function|algorithm)",
    r"\bsolve (this |the )?(problem|question|equation|math)",
    # General knowledge / lifestyle
    r"\bweather\b", r"\bmovie(s)?\b", r"\bsong(s)?\b", r"\brecipe", r"\btranslate",
    r"\bresume\b", r"\bcover letter\b", r"\bessay\b", r"\bhoroscope\b", r"\bstory(ies)?\b",
    r"\bnews (today|headlines)\b",
    # Travel itineraries / bookings
    r"\bitinerary\b", r"\bitenary\b", r"\bflight (booking|ticket|reservation)\b",
    r"\bhotel (booking|reservation)\b",
]
SUPABASE_URL = os.environ.get("SUPABASE_URL")

SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

http_client = httpx.Client(timeout=15.0)


# Initialize Vector DB globally to avoid reloading models per request
try:
    from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
    from langchain_community.vectorstores import SupabaseVectorStore
    from supabase.client import Client, create_client
    
    # threads=1 limits ONNX runtime memory footprint to avoid 512MB limit on Render
    embeddings = FastEmbedEmbeddings(threads=1)
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    vectorstore = SupabaseVectorStore(
        client=supabase,
        embedding=embeddings,
        table_name="documents",
        query_name="match_documents"
    )
except Exception as e:
    logger.warning(f"Could not initialize Supabase vectorstore. {e}")
    vectorstore = None


def get_ai_response(phone, profile_name):
    # Fetch chat history
    history = db.get_chat_history(phone)

    # Determine the last inbound user message
    last_msg = ""
    inbound_history = [m for m in history if m["direction"] == "inbound"]
    if inbound_history:
        last_msg = inbound_history[-1]["body"].strip().lower()

    last_msg_clean = re.sub(r'[^\w\s]', '', last_msg).strip()

    # Hard stop: deterministically decline obvious out-of-domain requests so the
    # LLM never gets a chance to answer (or hallucinate an answer to) them.
    if last_msg:
        if any(re.search(p, last_msg) for p in OUT_OF_SCOPE_PATTERNS):
            return OUT_OF_SCOPE_REPLY

    greeting_words = {"hi", "hello", "hey", "hii", "helo", "yoo", "greetings", "dear", "sup", "hi there", "hello there", "good morning", "good evening", "good afternoon", "namaste", "namaskar", "pranam", "start"}
    is_greeting = last_msg_clean in greeting_words

    # conversation_start = True means this is the very first message (no prior history)
    # OR user sent a greeting (restart flow)
    is_first_message = len(inbound_history) <= 1
    conversation_start = is_first_message or is_greeting

    if conversation_start:
        # Trim history to just the most recent message — no need for context on greetings
        history = history[-1:]

    # --- RAG: Retrieve relevant chunks for the user's query ---
    retrieved_context = ""
    if not conversation_start and last_msg_clean and vectorstore is not None:
        try:
            docs = vectorstore.similarity_search(last_msg, k=2)
            if docs:
                raw_context = "\n".join(doc.page_content for doc in docs)
                # Clean up raw website UI button/navigation phrases
                phrases_to_remove = [
                    r"(?i)get\s+best\s+quote",
                    r"(?i)request\s+callback",
                    r"(?i)get\s+latest\s+price",
                    r"(?i)yes!\s+i\s+am\s+interested",
                    r"(?i)add\s+to\s+inquiry",
                    r"(?i)send\s+inquiry",
                ]
                cleaned = raw_context
                for pattern in phrases_to_remove:
                    cleaned = re.sub(pattern, "", cleaned)
                # Clean up double linebreaks or trailing whitespace
                cleaned = "\n".join(line.strip() for line in cleaned.split("\n") if line.strip())
                retrieved_context = cleaned[:500]  # Keep lean to conserve tokens
        except Exception as e:
            logger.error(f"Vector search error: {e}")

    # --- Products: Only inject relevant products (or top 6 fallback) ---
    all_products = db.get_all_products()
    products_txt = ""

    # Normalize the query to handle compact cable notation like "3.5cx70sqmm" or "3.5c x 70"
    # Expand to multiple variant tokens for better matching
    normalized_query = last_msg_clean
    # Tokenize: split on common separators, keep numeric+unit parts
    query_tokens = re.split(r'[\s\-_/,]+', last_msg_clean)
    # Also add a de-x version: "3.5cx70" -> "3.5c 70"
    query_tokens += re.split(r'x', last_msg_clean)
    # Strip "sqmm" / "sq" variants to get bare numeric size tokens
    query_tokens = [re.sub(r'sq\s*mm', '', t).strip() for t in query_tokens]
    query_tokens = [t for t in query_tokens if t]

    def product_matches_query(p):
        if not last_msg_clean:
            return True
        search_fields = [
            p.get('name', '').lower(),
            p.get('category', '').lower(),
            p.get('conductor', '').lower(),
            p.get('size', '').lower(),
            str(p.get('core', '')),
        ]
        full_text = " ".join(search_fields)
        # Check each query token against full product text
        for token in query_tokens:
            if token and token in full_text:
                return True
        # Also check the raw normalized query
        if normalized_query and normalized_query in full_text:
            return True
        return False

    def rank_product(p):
        score = 0
        q = last_msg_clean
        p_name = p.get('name', '').lower()
        p_size = str(p.get('size', '')).lower()
        p_core = str(p.get('core', '')).lower()
        
        # Core count matching
        if "1c" in q or "single core" in q or "1 core" in q:
            if p_core == "1" or "1c" in p_name:
                score += 50
            elif "3.5c" in p_name or "3c" in p_name or "4c" in p_name:
                score -= 30
        elif "3.5c" in q or "3.5 core" in q:
            if p_core == "3.5" or "3.5c" in p_name:
                score += 50
            elif "1c" in p_name or "3c" in p_name:
                score -= 30

        # Conductor size matching
        sizes_in_query = re.findall(r'\b(\d+)\b', q)
        for num in sizes_in_query:
            if num == p_size.replace("sq mm", "").strip() or f"{num} sq" in p_name or f"{num}sq" in p_name:
                score += 40

        # HT Cable Penalty if not explicitly asked for HT
        if "ht" not in q and "11kv" not in q and "33kv" not in q:
            if "ht" in p_name or "11kv" in p_name or "33kv" in p_name:
                score -= 50

        return score

    matching_products = [p for p in all_products if product_matches_query(p)] or all_products
    matching_products.sort(key=rank_product, reverse=True)
    relevant_products = matching_products[:6]

    for p in relevant_products:
        products_txt += f"🔹 *{p['name']}* ({p['category']}): ~INR {p['price_per_meter']}/m | Specs: {p['conductor']} {p['size']}\n"

    # --- Available images ---
    images_txt = ""
    try:
        image_files = os.listdir("data/images")
        valid_images = [f for f in image_files if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        if valid_images:
            images_txt = "\n".join(valid_images[:6])
    except Exception as e:
        logger.error(f"Error reading images directory: {e}")

    # Fetch existing partial lead to inject remembered fields into prompt context
    captured_lead_info = ""
    existing_lead = db.get_lead_by_phone(phone)
    if existing_lead:
        captured_fields = []
        if existing_lead.get("name") and existing_lead.get("name") != "Unknown":
            captured_fields.append(f"Name: {existing_lead['name']}")
        if existing_lead.get("company") and existing_lead.get("company") != "Unknown":
            captured_fields.append(f"Company: {existing_lead['company']}")
        if existing_lead.get("email") and existing_lead.get("email") not in ["Unknown", ""]:
            captured_fields.append(f"Email: {existing_lead['email']}")
        if existing_lead.get("location") and existing_lead.get("location") != "Unknown":
            captured_fields.append(f"Delivery Location: {existing_lead['location']}")
        if existing_lead.get("product_interest") and existing_lead.get("product_interest") != "Unknown":
            captured_fields.append(f"Product: {existing_lead['product_interest']}")
        if existing_lead.get("quantity") and existing_lead.get("quantity") != "Unknown":
            captured_fields.append(f"Quantity: {existing_lead['quantity']}")
            
        if captured_fields:
            captured_lead_info = "\n".join([f"🔹 {f}" for f in captured_fields])

    system_prompt = prompts.get_system_prompt(
        retrieved_context=retrieved_context,
        products_txt=products_txt,
        images_txt=images_txt,
        profile_name=profile_name,
        conversation_start=conversation_start,
        captured_lead_info=captured_lead_info,
    )

    messages = [{"role": "system", "content": system_prompt}]
    
    # Append conversation history (extended to last 10 messages to preserve context)
    for msg in history[-10:]:
        role = "user" if msg["direction"] == "inbound" else "assistant"
        content = msg["body"]
        if "[LEAD_SUBMIT:" in content:
            content = "Your inquiry has been submitted successfully."
        elif "[LEAD_STATUS_CHECK]" in content:
            content = "Checking your lead status..."
        messages.append({"role": role, "content": content})
        
    if not GROQ_API_KEYS:
        print("GROQ_API is missing. Returning mock AI response.")
        time.sleep(0.5)
        return "*(Mock AI Response)* Hello! I see you are testing the KDI Power Bot. We currently have *1.5 sq mm House Wire* and *2.5 sq mm Power Cable* in stock. Let me know if you need a quote or have any other questions!"

    url = "https://api.groq.com/openai/v1/chat/completions"
    
    # Try multi-key rotation and model fallback for ultimate 429 resilience
    for model_name in GROQ_MODELS:
        payload = {
            "model": model_name,
            "messages": messages,
            "temperature": 0.5
        }
        
        for key_idx, api_key in enumerate(GROQ_API_KEYS):
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
                "User-Agent": "Mozilla/5.0"
            }
            
            retries = 2
            delay = 1.0
            
            for attempt in range(retries):
                try:
                    response = http_client.post(url, json=payload, headers=headers)
                    response.raise_for_status()
                    res_data = response.json()
                    return res_data["choices"][0]["message"]["content"]
                except httpx.HTTPStatusError as he:
                    if he.response.status_code == 429:
                        # Parse Retry-After header if provided by Groq
                        retry_after = he.response.headers.get("retry-after")
                        wait_sec = float(retry_after) if (retry_after and retry_after.replace('.', '', 1).isdigit()) else delay
                        wait_sec = min(wait_sec, 3.0)
                            
                        # If we have multiple keys, immediately switch key instead of sleeping long
                        if len(GROQ_API_KEYS) > 1 and key_idx < len(GROQ_API_KEYS) - 1:
                            logger.warning(f"Rate limited (429) on Groq key {key_idx+1}. Rotating to next API key immediately...")
                            break  # Break retry loop to try next API key
                        elif attempt < retries - 1:
                            logger.warning(f"Rate limited (429) by Groq ({model_name}). Retrying in {wait_sec}s (attempt {attempt+1}/{retries})...")
                            time.sleep(wait_sec)
                            delay *= 1.5
                            continue
                    logger.error(f"Groq API HTTPStatusError {he.response.status_code}: {he.response.text}")
                    break
                except Exception as e:
                    logger.error(f"Unexpected error calling Groq API: {e}")
                    break

    return "Sorry, I am experiencing a temporary technical issue. Please try again shortly or contact KDI Power support directly at +91-9205333843."


