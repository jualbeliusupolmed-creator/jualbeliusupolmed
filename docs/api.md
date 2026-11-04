import os
from openai import OpenAI

client = OpenAI(
    base_url="https://api.nusagate.com/v1",
    api_key=os.environ["nsk_D1EWG3GWymp2BkQwOIop68jqOHGhAsCt"],
)

res = client.chat.completions.create(
    model="glm-5.3-flash",
    messages=[
        {"role": "user", "content": "Halo, perkenalkan dirimu!"}
    ],
)

print(res.choices[0].message.content)
print(res.usage)



export NUSAGATE_API_KEY=nsk_...
sol "jelaskan recursion dalam satu paragraf"

curl https://api.nusagate.com/v1/chat/completions \
  -H "nsk_D1EWG3GWymp2BkQwOIop68jqOHGhAsCt \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-5.3-flash",
    "messages": [
      { "role": "user", "content": "Halo, perkenalkan dirimu!" }
    ]
  }'




  export NUSAGATE_API_KEY=nsk_H34DnEAm6OloWat3RiqtEeh2mFoCu42Y
sol "jelaskan recursion dalam satu paragraf"

export NUSAGATE_API_KEY=nsk_...
sol "jelaskan recursion dalam satu paragraf"

curl -sN https://api.nusagate.com/v1/messages \
  -H "Authorization: Bearer $nsk_H34DnEAm6OloWat3RiqtEeh2mFoCu42Y" \
  -H "Content-Type: application/json" \
  -d '{"model":"gemini-3.8-flash","max_tokens":100,"stream":true,"messages":[{"role":"user","content":"say hi"}]}' | head -c 400