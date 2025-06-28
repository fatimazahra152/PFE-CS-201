from langchain_openai import ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from python_backend.config import MODEL_NAME # Import the model name from config

def setup_qa_chain(vectorstore):
    """
    Sets up a RetrievalQA chain for question answering.
    """
    llm = ChatOpenAI(model_name=MODEL_NAME, temperature=0.7)

    # Define a prompt template for your RAG chain
    # This guides the LLM on how to use the retrieved context
    prompt_template = """You are an AI assistant designed to provide accurate and concise answers based on the provided context.
If the answer cannot be found in the context, clearly state "I don't have enough information to answer that question based on the provided documents." Do not make up information.

Context:
{context}

Question:
{question}

Answer:
"""
    PROMPT = PromptTemplate(
        template=prompt_template, input_variables=["context", "question"]
    )

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff", # 'stuff' combines all documents into one prompt
        retriever=vectorstore.as_retriever(),
        return_source_documents=True, # Optional: return the source documents used
        chain_type_kwargs={"prompt": PROMPT}
    )
    print("RAG QA chain setup complete.")
    return qa_chain