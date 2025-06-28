import os
from dotenv import load_dotenv

# Construct the absolute path to the .env file.
# It assumes .env is in the project root, one directory up from config.py
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(CURRENT_DIR, '..')
env_file_path = os.path.join(PROJECT_ROOT, '.env')

# --- DEBUG BLOCK: Verify .env file path and content ---
print(f"DEBUG: Attempting to load .env from: {env_file_path}")
if os.path.exists(env_file_path):
    try:
        with open(env_file_path, 'r') as f:
            content = f.read()
            print("DEBUG: Content of .env file:")
            print(content)
    except Exception as e:
        print(f"DEBUG: Could not read .env file content: {e}")
else:
    print("DEBUG: .env file DOES NOT EXIST at the expected path.")
# --- END DEBUG BLOCK ---

# Load environment variables from .env file, forcing override of existing ones
load_dotenv(env_file_path, override=True)

# --- Required Configurations ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# --- DEBUG PRINT: Confirm loaded API Key ---
print(f"DEBUG: OPENAI_API_KEY loaded: {OPENAI_API_KEY}")
# --- END DEBUG PRINT ---

EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "text-embedding-ada-002")

# Uncomment the MODEL_NAME below to enable it.
# This is the OpenAI chat model used for the RAG chain.
MODEL_NAME = os.getenv("MODEL_NAME", "gpt-3.5-turbo") # Uncommented this line

# The directory where FAISS will save and load its index files
FAISS_INDEX_DIR_RELATIVE = os.getenv("FAISS_INDEX_DIR", "./faiss_index")
# The directory where your source documents (e.g., PDFs, text files) are stored
KNOWLEDGE_BASE_DIR_RELATIVE = os.getenv("KNOWLEDGE_BASE_DIR", "./knowledge_base")

# Convert relative paths to absolute paths based on project root
FAISS_INDEX_DIR = os.path.abspath(os.path.join(PROJECT_ROOT, FAISS_INDEX_DIR_RELATIVE))
KNOWLEDGE_BASE_DIR = os.path.abspath(os.path.join(PROJECT_ROOT, KNOWLEDGE_BASE_DIR_RELATIVE))

# Create directories if they don't exist
os.makedirs(FAISS_INDEX_DIR, exist_ok=True)
os.makedirs(KNOWLEDGE_BASE_DIR, exist_ok=True)

print(f"Config loaded: FAISS_INDEX_DIR={FAISS_INDEX_DIR}, KNOWLEDGE_BASE_DIR={KNOWLEDGE_BASE_DIR}")