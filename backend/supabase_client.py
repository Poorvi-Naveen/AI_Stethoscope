import os
from dotenv import load_dotenv
from supabase import create_client, Client

env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

supabase: Client | None = None

def init_supabase():
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
            print("Connected to Supabase successfully.")
        except Exception as e:
            print(f"Warning: Failed to connect to Supabase: {e}")
    else:
        print("Notice: Supabase environment variables not fully configured.")

    return supabase

# Initial call to setup the global supabase object
init_supabase()

