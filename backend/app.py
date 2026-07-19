import streamlit as st
import requests
from pathlib import Path

st.set_page_config(page_title="RAG Q&A with ChromaDB", layout="wide")

API_URL = "http://localhost:8000"

st.title("🔍 Enterprise RAG Q&A System")
st.markdown("Upload documents → Ask questions → Get cited answers")

# ─── Sidebar: File Upload ───
with st.sidebar:
    st.header("📁 Upload Documents")
    
    uploaded_file = st.file_uploader(
        "Choose a file",
        type=["pdf", "txt", "md"],
        help="PDF, TXT, or Markdown files supported"
    )
    
    if uploaded_file is not None:
        file_size = len(uploaded_file.getvalue()) / 1024  # KB
        st.caption(f"Size: {file_size:.1f} KB")
        
        if st.button("🚀 Ingest into ChromaDB", type="primary"):
            with st.spinner("Processing document..."):
                try:
                    files = {"file": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}
                    response = requests.post(f"{API_URL}/upload", files=files)
                    
                    if response.status_code == 200:
                        result = response.json()
                        st.success(f"✅ Ingested successfully!")
                        st.metric("Chunks Created", result["chunks_ingested"])
                        st.metric("Total in DB", result["total_documents"])
                        st.caption(f"File: {result['filename']}")
                    else:
                        st.error(f"Error: {response.json().get('detail', 'Unknown error')}")
                        
                except Exception as e:
                    st.error(f"Failed: {str(e)}")
    
    st.divider()
    
    # Stats
    if st.button("📊 Refresh Stats"):
        try:
            stats = requests.get(f"{API_URL}/stats").json()
            st.metric("Total Documents", stats["total_documents"])
        except:
            st.error("API not running")
    
    st.divider()
    st.caption("Powered by ChromaDB + OpenAI + LangChain")

# ─── Main: Ask Questions ───
st.header("❓ Ask a Question")

# Show if documents exist
try:
    stats = requests.get(f"{API_URL}/stats").json()
    if stats["total_documents"] == 0:
        st.warning("⚠️ No documents in database. Upload a file first!")
except:
    pass

question = st.text_input(
    "Your question:",
    placeholder="e.g., What was our Q3 revenue?",
    disabled=False
)

col1, col2, col3 = st.columns([2, 1, 1])
with col2:
    use_hybrid = st.toggle("Hybrid Search", value=True)
with col3:
    top_k = st.slider("Top K", 1, 10, 5)

if st.button("🔍 Get Answer", type="primary", disabled=not question):
    with st.spinner("Retrieving with ChromaDB..."):
        try:
            response = requests.post(
                f"{API_URL}/ask",
                json={
                    "question": question,
                    "top_k": top_k,
                    "use_hybrid": use_hybrid
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Metrics row
                m1, m2, m3, m4 = st.columns(4)
                m1.metric("Method", result["retrieval_method"])
                m2.metric("Confidence", result["confidence"].upper())
                m3.metric("Sources", len(result["sources"]))
                m4.metric("Model", "GPT-4o-mini")
                
                # Answer
                st.markdown("---")
                st.markdown("### 📝 Answer")
                st.markdown(result["answer"])
                
                # Sources
                with st.expander(f"📚 Sources ({len(result['sources'])})"):
                    for i, source in enumerate(result["sources"], 1):
                        st.markdown(f"**{i}.** `{source['source']}`")
                        if source.get("page") and source["page"] != "N/A":
                            st.caption(f"Page: {source['page']}")
                
            elif response.status_code == 404:
                st.warning("No relevant documents found. Try uploading relevant files first.")
            else:
                st.error(f"Error: {response.json().get('detail', 'Unknown error')}")
                
        except requests.ConnectionError:
            st.error("❌ Cannot connect to API. Is it running on port 8000?")
        except Exception as e:
            st.error(f"Error: {str(e)}")

st.divider()
st.caption("Built with ChromaDB + LangChain + OpenAI | Evaluated with ragas")