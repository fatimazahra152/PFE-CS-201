import os
import sys

# Get the absolute path of the current script's directory (python_backend)
current_script_dir = os.path.dirname(os.path.abspath(__file__))
# Get the project root directory by going up one level from python_backend
project_root = os.path.join(current_script_dir, '..')
# Add the project root to sys.path
sys.path.insert(0, project_root)

from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from python_backend.config import KNOWLEDGE_BASE_DIR

def load_documents(directory=KNOWLEDGE_BASE_DIR):
    """
    Loads documents from the specified directory.
    Supports PDF and TXT files.
    """
    documents = []
    print(f"DEBUG: Starting document load from: {directory}")
    found_files_count = 0
    for root, dirs, files in os.walk(directory):
        print(f"DEBUG: Walking in directory: {root}")
        print(f"DEBUG: Found directories in {root}: {dirs}") # <--- ADD THIS DEBUG LINE
        print(f"DEBUG: Found files in {root}: {files}")
        for file_name in files:
            file_path = os.path.join(root, file_name)
            found_files_count += 1
            print(f"DEBUG: Processing file: {file_path}")
            if file_name.endswith(".pdf"):
                print(f"Loading PDF: {file_name}")
                loader = PyPDFLoader(file_path)
                documents.extend(loader.load())
            elif file_name.endswith(".txt"):
                print(f"Loading Text: {file_name}")
                try:
                    loader = TextLoader(file_path, encoding='utf-8')
                    loaded_docs = loader.load()
                    if not loaded_docs:
                        print(f"WARNING: TextLoader loaded 0 pages for {file_name}. File might be empty or unreadable.")
                    documents.extend(loaded_docs)
                except Exception as e:
                    print(f"ERROR: Could not load text file {file_name}: {e}")
            else:
                print(f"Skipping unsupported file: {file_name}")
    print(f"DEBUG: Total files found by os.walk: {found_files_count}")
    print(f"Loaded {len(documents)} documents from {directory}.")
    return documents

def split_documents(documents, chunk_size=1000, chunk_overlap=200):
    """
    Splits loaded documents into smaller chunks.
    """
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        add_start_index=True,
    )
    chunks = text_splitter.split_documents(documents)
    print(f"Split documents into {len(chunks)} chunks.")
    return chunks

if __name__ == '__main__':
    print(f"Attempting to load from: {KNOWLEDGE_BASE_DIR}")
    docs = load_documents()
    if docs:
        chunks = split_documents(docs)
        print(f"First chunk content:\n{chunks[0].page_content[:500]}...")
    else:
        print("No documents found to process.")