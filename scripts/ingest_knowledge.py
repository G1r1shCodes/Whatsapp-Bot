from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore
from supabase.client import Client, create_client
import os
import sys

# Add parent dir to path to import logger
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from logger import get_logger

logger = get_logger(__name__)

KNOWLEDGE_FILE = "data/kdi_knowledge.txt"

# Helper to load .env variables manually
def load_env():
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip()

def ingest():
    if not os.path.exists(KNOWLEDGE_FILE):
        logger.error(f"Error: {KNOWLEDGE_FILE} not found.")
        return

    load_env()
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("Error: SUPABASE_URL or SUPABASE_KEY not found in environment.")
        return

    logger.info("Loading documents...")
    loader = TextLoader(KNOWLEDGE_FILE, encoding="utf-8")
    documents = loader.load()

    logger.info("Splitting text into chunks...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ".", " ", ""],
        length_function=len
    )
    docs = text_splitter.split_documents(documents)
    logger.info(f"Split into {len(docs)} chunks.")

    logger.info("Initializing FastEmbed embeddings (lightweight)...")
    embeddings = FastEmbedEmbeddings()

    logger.info("Connecting to Supabase Vector Store...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    logger.info("Uploading documents to Supabase...")
    vectorstore = SupabaseVectorStore.from_documents(
        docs,
        embeddings,
        client=supabase,
        table_name="documents",
        query_name="match_documents"
    )
    logger.info("Ingestion complete!")

if __name__ == "__main__":
    ingest()
