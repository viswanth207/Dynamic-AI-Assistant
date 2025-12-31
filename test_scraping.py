from backend.data_loader import DataLoader

print("Loading documents from Neuraltrix website...")
docs = DataLoader.load_from_url('https://neuraltrix-ai-v1.vercel.app/')

print(f"\nTotal documents: {len(docs)}")

# Find CEO docs
ceo_docs = [doc for doc in docs if 'CEO' in doc.page_content or 'Deepak' in doc.page_content]
print(f"Documents mentioning CEO/Deepak: {len(ceo_docs)}")

if ceo_docs:
    print("\n=== CEO Document ===")
    print(ceo_docs[0].page_content)
    print(f"\nMetadata: {ceo_docs[0].metadata}")
else:
    print("\n=== Sample Documents ===")
    for i, doc in enumerate(docs[:5]):
        print(f"\nDoc {i}: {doc.page_content[:100]}...")

