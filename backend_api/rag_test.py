import os
from dotenv import load_dotenv
from langchain_community.document_loaders import TextLoader
from langchain_qdrant import QdrantVectorStore
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

# 1. API යතුර පද්ධතියට ලබා දීම
load_dotenv()
if "GOOGLE_API_KEY" not in os.environ:
    print("Error: GOOGLE_API_KEY not found in .env file!")
    exit()

print("Loading knowledge base...")
# 2. දෝෂ කේත ගොනුව කියවීම
loader = TextLoader("knowledge/dtc_codes.txt")
docs = loader.load()

print("Creating Vector Database in memory...")
# 3. Vector Database ස්ථාපනය කිරීම (නිවැරදි Embedding ආකෘතිය)
embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-2")
vector_store = QdrantVectorStore.from_documents(
    docs,
    embeddings,
    location=":memory:", 
    collection_name="vehicle_knowledge"
)

# 4. AI ආකෘතිය සූදානම් කිරීම (ඔබගේ යතුරට අදාළ නිවැරදි Generation ආකෘතිය)
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.3)

# 5. System Prompt සැකසීම
system_prompt = (
    "You are an expert automotive diagnostic assistant. "
    "Use ONLY the provided context to answer the user's question. "
    "If the answer is not in the context, say 'I do not have enough information based on the manual'.\n\n"
    "Context:\n{context}"
)
prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "{input}"),
])

# 6. RAG දාමය නිර්මාණය කිරීම
retriever = vector_store.as_retriever(search_kwargs={"k": 1})
question_answer_chain = create_stuff_documents_chain(llm, prompt)
rag_chain = create_retrieval_chain(retriever, question_answer_chain)

# 7. AI ක්‍රියාකාරීත්වය පරීක්ෂා කිරීම
question = "What should I do if my car has a P0301 code? What are the safety risks?"
print(f"\nQuestion: {question}")
print("Thinking...\n")

try:
    response = rag_chain.invoke({"input": question})
    print("--------------------------------------------------")
    print(f"AI Answer: \n{response['answer']}")
    print("--------------------------------------------------")
except Exception as e:
    print(f"An error occurred: {e}")