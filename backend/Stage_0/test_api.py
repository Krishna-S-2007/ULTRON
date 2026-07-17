import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

# Retrieve API key from environment variable
API_KEY = os.getenv("FREELLM_API_KEY", "your_api_key_here")
BASE_URL = "http://localhost:3001/v1/chat/completions"

TEST_MODELS = [
    "gemini-3.5-flash",
    "nemotron-3-nano-30b-reasoning",
    "nemotron-3-super-120b"
]

async def test_model(model_name: str):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": "You are a helpful assistant. Respond with the word 'ACK' followed by your model name."},
            {"role": "user", "content": "Hello!"}
        ],
        "temperature": 0.0
    }
    
    print(f"Testing model: {model_name}...")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(BASE_URL, headers=headers, json=payload)
            if response.status_code == 200:
                data = response.json()
                reply = data["choices"][0]["message"]["content"]
                print(f"[OK] Success! Response from {model_name}: {reply.strip()}")
                return True
            else:
                print(f"[FAIL] Failed! Status Code: {response.status_code} | Body: {response.text}")
                return False
    except Exception as e:
        print(f"[ERROR] Exception testing {model_name}: {e}")
        return False

async def main():
    if API_KEY == "your_api_key_here":
        print("⚠️  Warning: Please set FREELLM_API_KEY in your .env file first!")
        return
        
    print(f"Using Base URL: {BASE_URL}")
    print(f"Using API Key: {API_KEY[:16]}...")
    print("-" * 50)
    
    for model in TEST_MODELS:
        await test_model(model)
        print("-" * 50)

if __name__ == "__main__":
    asyncio.run(main())
