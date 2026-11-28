import os
from openai import OpenAI

client = OpenAI(
    base_url="https://api.nusagate.com/v1",
    api_key=os.environ["NUSAGATE_API_KEY_FROM_SECRET_MANAGER"],
)

res = client.chat.completions.create(
    model="glm-5.3-flash",
    messages=[
        {"role": "user", "content": "Halo, perkenalkan dirimu!"}
    ],
)

print(res.choices[0].message.content)
print(res.usage)



export NUSAGATE_API_KEY=$NUSAGATE_API_KEY
sol "jelaskan recursion dalam satu paragraf"

curl https://api.nusagate.com/v1/chat/completions \
  -H "NUSAGATE_API_KEY_FROM_SECRET_MANAGER \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-5.3-flash",
    "messages": [
      { "role": "user", "content": "Halo, perkenalkan dirimu!" }
    ]
  }'




  export NUSAGATE_API_KEY=$NUSAGATE_API_KEY
sol "jelaskan recursion dalam satu paragraf"

export NUSAGATE_API_KEY=$NUSAGATE_API_KEY
sol "jelaskan recursion dalam satu paragraf"

curl -sN https://api.nusagate.com/v1/messages \
  -H "Authorization: Bearer $NUSAGATE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gemini-3.8-flash","max_tokens":100,"stream":true,"messages":[{"role":"user","content":"say hi"}]}' | head -c 400