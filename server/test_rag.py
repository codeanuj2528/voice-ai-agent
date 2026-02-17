
import asyncio
import os
import sys

# Add current directory to sys.path to allow imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from services.rag import retrieve_context

async def main():
    query = "round one task video"
    print(f"Testing retrieval for query: '{query}'")
    
    chunks = await retrieve_context(query, top_k=5)
    
    print(f"Retrieved {len(chunks)} chunks")
    for i, chunk in enumerate(chunks, 1):
        print(f"\nChunk {i}:")
        print(f"Source: {chunk.get('source')} (Page {chunk.get('page')})")
        print(f"Content: {chunk.get('content')[:200]}...")

if __name__ == "__main__":
    asyncio.run(main())
