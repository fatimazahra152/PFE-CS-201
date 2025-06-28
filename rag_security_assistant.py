import os
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.document_loaders import DirectoryLoader, TextLoader, PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain.chains import RetrievalQA

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
# Directory where your knowledge base files (txt, pdf) are stored
DATA_DIR = "knowledge_base"
# Directory where ChromaDB will persist its vector store
CHROMA_DB_DIR = "chroma_db"

# OpenAI model names
EMBEDDING_MODEL_NAME = "text-embedding-ada-002"
LLM_MODEL_NAME = "gpt-4o" # Recommended for strong performance; gpt-3.5-turbo is a cheaper alternative

# Text splitting parameters
CHUNK_SIZE = 1000      # Max characters in a chunk
CHUNK_OVERLAP = 200    # Overlap to maintain context between chunks

# Retrieval parameters
TOP_K_RETRIEVAL = 3 # Number of relevant chunks to retrieve

# --- Step 1: Load Documents ---
def load_documents(directory):
    """
    Loads documents from the specified directory.
    Supports .txt and .pdf files.
    """
    print(f"Loading documents from {directory}...")
    
    all_docs = []

    # Loader for text files (ensuring it looks for *.txt)
    txt_loader = DirectoryLoader(
        directory,
        glob="**/*.txt",  # Corrected glob pattern to look for any .txt file recursively
        loader_cls=TextLoader,
        recursive=True
    )
    
    # Loader for PDF files (you'll need `pip install pypdf` for this to work)
    pdf_loader = DirectoryLoader(
        directory,
        glob="**/*.pdf",  # Corrected glob pattern to look for any .pdf file recursively
        loader_cls=PyPDFLoader,
        recursive=True
    )
    
    # Combine documents from both loaders
    try:
        all_docs.extend(txt_loader.load())
    except Exception as e:
        print(f"Warning: Could not load text files from {directory}. Error: {e}")
    
    try:
        all_docs.extend(pdf_loader.load())
    except Exception as e:
        print(f"Warning: Could not load PDF files from {directory}. Error: {e}")

    if not all_docs:
        print(f"No documents loaded. Please ensure '{directory}' exists and contains .txt or .pdf files.")

    print(f"Loaded {len(all_docs)} documents.")
    return all_docs

# --- Step 2: Split Documents into Chunks ---
def split_documents(documents):
    """
    Splits loaded documents into smaller, manageable chunks.
    """
    print("Splitting documents into chunks...")
    # RecursiveCharacterTextSplitter is good for maintaining semantic coherence
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,      
        chunk_overlap=CHUNK_OVERLAP,    
        length_function=len,
        add_start_index=True,
    )
    chunks = text_splitter.split_documents(documents)
    print(f"Split into {len(chunks)} chunks.")
    return chunks

# --- Step 3: Create Embeddings and Store in Vector DB ---
def create_vector_store(chunks, db_directory):
    """
    Creates or loads a Chroma vector store from chunks.
    Embeddings are generated using OpenAI's embedding model.
    """
    embeddings = OpenAIEmbeddings(model=EMBEDDING_MODEL_NAME)

    # Check if the Chroma DB already exists and has data
    # (Checking for directory existence AND if it's not empty)
    if os.path.exists(db_directory) and len(os.listdir(db_directory)) > 0:
        print(f"Loading existing Chroma DB from {db_directory}...")
        vector_store = Chroma(persist_directory=db_directory, embedding_function=embeddings)
        print("Chroma DB loaded.")
    else:
        print(f"Creating new Chroma DB at {db_directory}...")
        # Ensure the directory exists before persisting
        os.makedirs(db_directory, exist_ok=True)
        vector_store = Chroma.from_documents(
            documents=chunks,
            embedding=embeddings,
            persist_directory=db_directory
        )
        print("Chroma DB created and persisted.")
    return vector_store

# --- Step 4: Set up the RAG Chain ---
def setup_rag_chain(vector_store, llm_model_name):
    """
    Sets up the Retrieval Augmented Generation (RAG) chain.
    """
    llm = ChatOpenAI(model_name=llm_model_name, temperature=0.2) # Lower temperature for factual answers

    # Create a retriever from the vector store
    # `search_kwargs={"k": TOP_K_RETRIEVAL}` means retrieve the top N most relevant chunks
    retriever = vector_store.as_retriever(search_kwargs={"k": TOP_K_RETRIEVAL})

    # Create the RAG chain
    # 'stuff' chain type combines all retrieved documents into one prompt for the LLM
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff", 
        retriever=retriever,
        return_source_documents=True # Return the source chunks for transparency
    )
    print("RAG chain setup complete.")
    return qa_chain

# --- Main Execution Flow ---
if __name__ == "__main__":
    # Ensure Chroma DB directory exists
    os.makedirs(CHROMA_DB_DIR, exist_ok=True)

    # 1. Load documents
    documents = load_documents(DATA_DIR)
    if not documents:
        print("No documents found or loaded. The RAG assistant will not have knowledge to retrieve.")
        print("Please ensure your 'knowledge_base' directory contains .txt or .pdf files.")
        # Exit or handle gracefully if no documents are loaded
        exit() 

    # 2. Split documents into chunks
    chunks = split_documents(documents)

    # 3. Create/Load Vector Store
    # This step will create/embed new documents if the DB is empty.
    # For updating, you'd need a more sophisticated indexing strategy.
    vector_store = create_vector_store(chunks, CHROMA_DB_DIR)

    # 4. Setup RAG Chain
    qa_assistant = setup_rag_chain(vector_store, LLM_MODEL_NAME)

    print("\nSecurity RAG Assistant is ready! Ask your questions about vulnerabilities or sensitive data.")
    print("Type 'exit' to quit.")

    while True:
        query = input("\nYour question: ")
        if query.lower() == 'exit':
            print("Exiting assistant.")
            break

        print("Searching and generating answer...")
        try:
            response = qa_assistant.invoke({"query": query})
            print("\n--- Assistant's Answer ---")
            print(response["result"])

            if response.get("source_documents"):
                print("\n--- Sources ---")
                for i, doc in enumerate(response["source_documents"]):
                    # Extract just the filename from the source path
                    source_name = doc.metadata.get('source', 'Unknown Source').split(os.sep)[-1] 
                    page_number = doc.metadata.get('page', 'N/A')
                    print(f"Source {i+1}: {source_name}, Page: {page_number}")
                    # Uncomment the line below if you want to see a snippet of the retrieved content
                    # print(f"  Content snippet: {doc.page_content[:200]}...") 
            print("-------------------------")

        except Exception as e:
            print(f"An error occurred: {e}")
            print("Please ensure your OPENAI_API_KEY is correctly set in your .env file and you have internet access.")
            print("If the error persists, check your LangChain and OpenAI documentation.")