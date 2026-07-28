import os
import urllib.parse
import json
import time
import re
import db
import warnings
import prompts
import httpx
import warnings
import prompts
from collections import defaultdict
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
GROQ_MODELS = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"]
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

    # --- Products: Only inject relevant products (or top 4 fallback) ---
    all_products = db.get_all_products()
    products_txt = ""
    # Filter products by keyword match to keep prompt lean
    relevant_products = [
        p for p in all_products
        if not last_msg_clean
        or any(kw in last_msg_clean for kw in [
            p.get('name', '').lower(),
            p.get('category', '').lower(),
            p.get('conductor', '').lower(),
            p.get('size', '').lower(),
        ])
    ] or all_products
    
    # Limit to top 4 items and ultra-compact formatting to stay below 6000 TPM limit
    relevant_products = relevant_products[:4]

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

    system_prompt = prompts.get_system_prompt(
        retrieved_context=retrieved_context,
        products_txt=products_txt,
        images_txt=images_txt,
        profile_name=profile_name,
        conversation_start=conversation_start,
    )

    messages = [{"role": "system", "content": system_prompt}]
    
    # Append conversation history (limit to last 4 messages to stay lean)
    for msg in history[-4:]:
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


