import os
from dotenv import load_dotenv
from supabase import create_client, Client
import logging

logger = logging.getLogger("stethai")
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Initialize as None to prevent import-time crashes
supabase: Client = None

def init_supabase():
    """Initialize the Supabase client globally."""
    global supabase
    if supabase is not None:
        return supabase

    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("Supabase environment variables (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY) are missing")
        return None

    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized successfully.")
        return supabase
    except Exception as e:
        logger.error("Failed to initialize Supabase client: %s", e)
        return None
