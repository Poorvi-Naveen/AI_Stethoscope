import os
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

logger = logging.getLogger("stethai")

# Check multiple potential .env paths for seamless execution from root or backend
_env_candidates = [
    os.path.join(os.path.dirname(__file__), ".env"),
    os.path.join(os.getcwd(), ".env"),
    os.path.join(os.path.dirname(__file__), "..", ".env"),
    os.path.join(os.getcwd(), "backend", ".env"),
]
for _candidate in _env_candidates:
    if os.path.exists(_candidate):
        load_dotenv(dotenv_path=_candidate)
        break
else:
    load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_KEY")
    or os.getenv("VITE_SUPABASE_ANON_KEY")
)

supabase: Client | None = None

def init_supabase() -> Client | None:
    """
    Ensures the Supabase client is initialized.
    Returns the client if successful, otherwise None.
    """
    global supabase
    if supabase is not None:
        return supabase

    if SUPABASE_URL and SUPABASE_KEY:
        try:
            supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
            logger.info("Connected to Supabase successfully.")
        except Exception as e:
            logger.warning("Failed to connect to Supabase: %s", e)
    else:
        logger.warning("Notice: Supabase environment variables not fully configured.")

    return supabase

# Initial call to setup the global supabase object
init_supabase()
