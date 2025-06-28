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

# Now these imports should work
from python_backend.rag_logic import setup_qa_chain
from python_backend.config import EMBEDDING_MODEL_NAME, FAISS_INDEX_DIR

def run_assistant():
    """
    Loads the FAISS index and runs an interactive RAG assistant.
    """
    # Initialize embeddings (needed for FAISS.load_local)
    embeddings = OpenAIEmbeddings(model=EMBEDDING_MODEL_NAME)

    print(f"Loading FAISS index from directory: {FAISS_INDEX_DIR}...")

    # Check if the FAISS index directory exists and contains the necessary files
    expected_faiss_file = os.path.join(FAISS_INDEX_DIR, "index.faiss")
    expected_pkl_file = os.path.join(FAISS_INDEX_DIR, "index.pkl")

    if not os.path.exists(FAISS_INDEX_DIR) or \
       not os.path.exists(expected_faiss_file) or \
       not os.path.exists(expected_pkl_file):
        print("="*50)
        print("ERROR: FAISS index not found or incomplete.")
        print(f"Expected files '{os.path.basename(expected_faiss_file)}' and '{os.path.basename(expected_pkl_file)}'")
        print(f"in directory: '{FAISS_INDEX_DIR}'")
        print("Please run 'python python_backend/build_index.py' first to create the index.")
        print("="*50)
        return

    # Load the FAISS vector store
    faiss_vector_store = FAISS.load_local(FAISS_INDEX_DIR, embeddings, allow_dangerous_deserialization=True)
    print("FAISS index loaded successfully.")

    # Setup the QA chain
    qa_assistant = setup_qa_chain(faiss_vector_store)

    print("\n\n###########################################")
    print("AI RAG Assistant (FAISS) is ready! Ask your question.")
    print("Type 'exit' to quit.")
    print("###########################################\n")

    while True:
        query = input("\nYour question: ")
        if query.lower() == 'exit':
            print("Exiting assistant.")
            break
        elif not query.strip():
            continue

        try:
            result = qa_assistant.invoke({"query": query})

            print("\nAI Answer:")
            print(result["result"])

        except Exception as e:
            print(f"An error occurred: {e}")
            print("Please ensure your OpenAI API key is correct and you have an internet connection.")

if __name__ == "__main__":
    run_assistant()