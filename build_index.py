import os
import sys

# --- ADD THESE LINES AT THE VERY TOP ---
# Get the absolute path of the current script's directory (python_backend)
current_script_dir = os.path.dirname(os.path.abspath(__file__))
# Get the project root directory by going up one level from python_backend
project_root = os.path.join(current_script_dir, '..')
# Add the project root to sys.path
sys.path.insert(0, project_root)
# --- END ADDITION ---

from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS

# Now these imports should work because project_root is in sys.path
from python_backend.data_loader import load_documents, split_documents
from python_backend.config import EMBEDDING_MODEL_NAME, FAISS_INDEX_DIR, KNOWLEDGE_BASE_DIR

def build_faiss_index():
    """
    Loads documents, splits them, creates embeddings,
    builds a FAISS index, and saves it locally.
    """
    print("Building FAISS index...")

    # 1. Load documents
    documents = load_documents(KNOWLEDGE_BASE_DIR)
    if not documents:
        print(f"No documents found in {KNOWLEDGE_BASE_DIR}. Please add documents and try again.")
        return

    # 2. Split documents into chunks
    chunks = split_documents(documents)
    if not chunks:
        print("No chunks generated from documents. Check document content or splitting parameters.")
        return

    # 3. Create OpenAI Embeddings object
    embeddings = OpenAIEmbeddings(model=EMBEDDING_MODEL_NAME)

    # 4. Create FAISS index from chunks and embeddings
    faiss_vector_store = FAISS.from_documents(chunks, embeddings)
    print("FAISS index created.")

    # 5. Save FAISS index locally
    faiss_vector_store.save_local(FAISS_INDEX_DIR)
    print(f"FAISS index built and saved to directory: {FAISS_INDEX_DIR}")

if __name__ == "__main__":
    build_faiss_index()