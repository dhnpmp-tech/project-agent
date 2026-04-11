#!/bin/bash
# ============================================================
# PERSONA GENERATOR — Tier 1
# Takes business info, generates a full AI persona with photos
# Usage: ./generate-persona.sh <business-config.json>
# ============================================================

set -euo pipefail

CONFIG_FILE="${1:?Usage: ./generate-persona.sh <business-config.json>}"
MINIMAX_API_KEY="${MINIMAX_API_KEY:?Set MINIMAX_API_KEY env var}"
SUPABASE_URL="https://sybzqktipimbmujtowoz.supabase.co"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY env var}"
OUTPUT_DIR="/tmp/persona-output"

mkdir -p "$OUTPUT_DIR"

echo "=== PERSONA GENERATOR ==="
echo "Config: $CONFIG_FILE"
echo ""

# ---- STEP 1: Generate the persona text via MiniMax M2.7 ----
echo "[1/4] Generating persona text..."

BUSINESS_INFO=$(cat "$CONFIG_FILE")

PERSONA_PROMPT=$(cat << 'PROMPT_END'
You are a creative writer specializing in character creation. Your job is to create a deeply realistic, vivid persona for an AI agent that will represent a business on WhatsApp.

The persona must feel like a REAL PERSON — not a character sheet. Write in FIRST PERSON as if this person is introducing themselves to a close friend. Include:

1. **Name and identity** — Full name, age, nationality, where they live
2. **Origin story** — Where they grew up, family, formative experiences. Be SPECIFIC — street names, neighborhood details, sensory memories (smells, sounds, textures)
3. **Education** — Actual schools, degrees, mentors who shaped them, what they learned that matters
4. **Career path** — Every job that led to this one, what they loved and hated about each, why they moved on
5. **How they got THIS job** — The specific moment they found this business, why it clicked, what made them stay
6. **Relationships at work** — How they feel about the owner, coworkers, regulars. Use real dynamics — teasing, respect, inside jokes
7. **Personal life** — Family now, relationship status, where they live, hobbies, dreams, what they do on days off
8. **Personality quirks** — At least 6 specific, memorable habits or traits. NOT generic ("friendly") — specific ("taps the table twice before placing a dish, a habit from their hotel days they can't shake")
9. **How they handle situations** — Birthday, complaint, first-timer, returning regular, sad guest, big group, proposals/celebrations. Write these as natural reactions, not rules.
10. **HOW THEY TALK** — This is the most important section. Give 8-10 example WhatsApp messages they would ACTUALLY send. These should capture their voice, their slang, their emoji usage, their sentence structure. This is what makes the AI sound like THEM.

The persona should be 800-1200 words. Write it as flowing first-person narrative with a "HOW I TALK" section at the end with example messages.

Make the persona feel ALIVE. Give them contradictions, passions, small obsessions, a dream they're working toward. They should feel like someone you'd want to grab coffee with.

IMPORTANT: The persona must be appropriate for the business type and location. A luxury spa persona is different from a street food persona. Match the energy.
PROMPT_END
)

# Build the full prompt with business context
FULL_PROMPT="Create a persona for this business:\n\n$(echo "$BUSINESS_INFO" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2))")\n\n${PERSONA_PROMPT}"

# Call MiniMax M2.7
PERSONA_RESPONSE=$(curl -s -X POST "https://api.minimax.io/v1/chat/completions" \
  -H "Authorization: Bearer $MINIMAX_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "
import json, sys
prompt = open('$CONFIG_FILE').read()
system = '''$PERSONA_PROMPT'''
user_msg = 'Create a persona for this business:\n\n' + prompt
payload = {
    'model': 'MiniMax-M2.7',
    'messages': [
        {'role': 'system', 'content': system},
        {'role': 'user', 'content': user_msg}
    ],
    'max_tokens': 3000,
    'temperature': 0.9
}
print(json.dumps(payload))
")")

# Extract the persona text
VOICE_PROMPT=$(echo "$PERSONA_RESPONSE" | python3 -c "
import json, sys, re
r = json.load(sys.stdin)
content = r.get('choices', [{}])[0].get('message', {}).get('content', '')
# Remove think tags
content = re.sub(r'<think>[\s\S]*?</think>\s*', '', content).strip()
# Remove markdown bold
content = content.replace('**', '')
print(content)
")

echo "$VOICE_PROMPT" > "$OUTPUT_DIR/voice_prompt.txt"
PROMPT_LENGTH=$(echo "$VOICE_PROMPT" | wc -c | tr -d ' ')
echo "   Generated: $PROMPT_LENGTH chars"

# ---- STEP 2: Extract persona details for image generation ----
echo "[2/4] Extracting visual description..."

# Ask MiniMax to describe what this person looks like
VISUAL_RESPONSE=$(curl -s -X POST "https://api.minimax.io/v1/chat/completions" \
  -H "Authorization: Bearer $MINIMAX_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "
import json
persona = open('$OUTPUT_DIR/voice_prompt.txt').read()
payload = {
    'model': 'MiniMax-M2.7',
    'messages': [
        {'role': 'system', 'content': 'You create detailed physical descriptions for AI-generated portraits. Be specific about ethnicity, age, hair, build, style. Output ONLY the description, nothing else.'},
        {'role': 'user', 'content': 'Based on this persona, describe what this person looks like physically. Include ethnicity, age appearance, hair color/style, eye color, build, typical clothing style, and distinguishing features. Be very specific and visual.\n\nPersona:\n' + persona[:2000]}
    ],
    'max_tokens': 300,
    'temperature': 0.7
}
print(json.dumps(payload))
")")

VISUAL_DESC=$(echo "$VISUAL_RESPONSE" | python3 -c "
import json, sys, re
r = json.load(sys.stdin)
content = r.get('choices', [{}])[0].get('message', {}).get('content', '')
content = re.sub(r'<think>[\s\S]*?</think>\s*', '', content).strip()
print(content)
")

echo "$VISUAL_DESC" > "$OUTPUT_DIR/visual_description.txt"
echo "   Visual: $(echo "$VISUAL_DESC" | head -2)"

# ---- STEP 3: Generate headshot ----
echo "[3/4] Generating headshot..."

# Extract name and business for the prompt
PERSONA_NAME=$(echo "$VOICE_PROMPT" | head -5 | grep -oE "I'm [A-Z][a-z]+ [A-Z][a-z]+" | head -1 | sed 's/I'\''m //')
if [ -z "$PERSONA_NAME" ]; then
  PERSONA_NAME=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE')).get('persona_name', 'the person'))")
fi
echo "   Name: $PERSONA_NAME"

HEADSHOT_PROMPT="Professional WhatsApp profile photo of ${VISUAL_DESC}. Warm genuine smile, looking directly at camera. Natural soft lighting, slightly blurred background of a restaurant/business interior. High quality portrait photography, 85mm lens feel, shallow depth of field. The person looks approachable, warm, and professional."

HEADSHOT_RESPONSE=$(curl -s -X POST "https://api.minimax.io/v1/image_generation" \
  -H "Authorization: Bearer $MINIMAX_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "
import json
payload = {
    'model': 'image-01',
    'prompt': '''$HEADSHOT_PROMPT'''[:1500],
    'aspect_ratio': '1:1',
    'n': 2,
    'response_format': 'url',
    'prompt_optimizer': True
}
print(json.dumps(payload))
")")

echo "$HEADSHOT_RESPONSE" > "$OUTPUT_DIR/headshot_response.json"

# Extract URLs
HEADSHOT_URLS=$(echo "$HEADSHOT_RESPONSE" | python3 -c "
import json, sys
r = json.load(sys.stdin)
urls = r.get('data', {}).get('image_urls', [])
for u in urls:
    print(u)
")

echo "   Headshots generated: $(echo "$HEADSHOT_URLS" | wc -l | tr -d ' ')"

# Download headshots
i=1
HEADSHOT_FILE=""
echo "$HEADSHOT_URLS" | while read url; do
  if [ -n "$url" ]; then
    curl -s -o "$OUTPUT_DIR/headshot_${i}.jpg" "$url"
    echo "   Saved: headshot_${i}.jpg ($(wc -c < "$OUTPUT_DIR/headshot_${i}.jpg" | tr -d ' ') bytes)"
    i=$((i+1))
  fi
done

# Use first headshot as reference for lifestyle photos
HEADSHOT_URL=$(echo "$HEADSHOT_URLS" | head -1)
echo "   Primary headshot URL: ${HEADSHOT_URL:0:80}..."

# ---- STEP 4: Generate lifestyle photos ----
echo "[4/4] Generating lifestyle photos..."

# Extract hobbies/activities from persona
ACTIVITIES_RESPONSE=$(curl -s -X POST "https://api.minimax.io/v1/chat/completions" \
  -H "Authorization: Bearer $MINIMAX_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "
import json
persona = open('$OUTPUT_DIR/voice_prompt.txt').read()
payload = {
    'model': 'MiniMax-M2.7',
    'messages': [
        {'role': 'system', 'content': 'Extract 4 photo scene descriptions from this persona. Each should be a specific lifestyle moment (cooking, at work, hobby, with friends). Output ONLY 4 lines, one scene per line. Each line should be a detailed image generation prompt. No numbering, no labels.'},
        {'role': 'user', 'content': persona[:2000]}
    ],
    'max_tokens': 400,
    'temperature': 0.8
}
print(json.dumps(payload))
")")

ACTIVITIES=$(echo "$ACTIVITIES_RESPONSE" | python3 -c "
import json, sys, re
r = json.load(sys.stdin)
content = r.get('choices', [{}])[0].get('message', {}).get('content', '')
content = re.sub(r'<think>[\s\S]*?</think>\s*', '', content).strip()
print(content)
")

echo "$ACTIVITIES" > "$OUTPUT_DIR/activities.txt"
echo "   Activities extracted"

# Generate lifestyle photos using subject_reference from headshot
PHOTO_NUM=1
while IFS= read -r activity; do
  [ -z "$activity" ] && continue
  activity=$(echo "$activity" | sed 's/^[0-9]*[.)]\s*//' | sed 's/^\*\*//' | sed 's/\*\*$//')

  echo "   Generating lifestyle photo $PHOTO_NUM: $(echo "$activity" | head -c 60)..."

  LIFESTYLE_RESPONSE=$(curl -s -X POST "https://api.minimax.io/v1/image_generation" \
    -H "Authorization: Bearer $MINIMAX_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "
import json
prompt = '''$activity. Candid photography style, natural lighting, warm tones, lifestyle editorial feel.'''
payload = {
    'model': 'image-01',
    'prompt': prompt[:1500],
    'aspect_ratio': '4:3',
    'n': 1,
    'response_format': 'url',
    'prompt_optimizer': True,
    'subject_reference': [{'type': 'character', 'image_file': '$HEADSHOT_URL'}]
}
print(json.dumps(payload))
")")

  LIFESTYLE_URL=$(echo "$LIFESTYLE_RESPONSE" | python3 -c "
import json, sys
r = json.load(sys.stdin)
urls = r.get('data', {}).get('image_urls', [])
if urls: print(urls[0])
else:
    err = r.get('base_resp', {}).get('status_msg', 'unknown error')
    print('ERROR: ' + err, file=sys.stderr)
" 2>&1)

  if [[ "$LIFESTYLE_URL" == ERROR* ]]; then
    echo "   Warning: $LIFESTYLE_URL — generating without subject reference"
    # Fallback without subject_reference
    LIFESTYLE_RESPONSE=$(curl -s -X POST "https://api.minimax.io/v1/image_generation" \
      -H "Authorization: Bearer $MINIMAX_API_KEY" \
      -H "Content-Type: application/json" \
      -d "$(python3 -c "
import json
visual = open('$OUTPUT_DIR/visual_description.txt').read()
prompt = visual + ' ' + '''$activity. Candid photography style, natural lighting, warm tones.'''
payload = {
    'model': 'image-01',
    'prompt': prompt[:1500],
    'aspect_ratio': '4:3',
    'n': 1,
    'response_format': 'url',
    'prompt_optimizer': True
}
print(json.dumps(payload))
")")
    LIFESTYLE_URL=$(echo "$LIFESTYLE_RESPONSE" | python3 -c "
import json, sys
r = json.load(sys.stdin)
urls = r.get('data', {}).get('image_urls', [])
print(urls[0] if urls else '')
")
  fi

  if [ -n "$LIFESTYLE_URL" ] && [[ "$LIFESTYLE_URL" != ERROR* ]]; then
    curl -s -o "$OUTPUT_DIR/lifestyle_${PHOTO_NUM}.jpg" "$LIFESTYLE_URL"
    echo "   Saved: lifestyle_${PHOTO_NUM}.jpg"
  fi

  PHOTO_NUM=$((PHOTO_NUM+1))
  sleep 2  # Rate limit: 10 req/min
done <<< "$ACTIVITIES"

# ---- SUMMARY ----
echo ""
echo "=== PERSONA GENERATION COMPLETE ==="
echo "Output directory: $OUTPUT_DIR"
echo ""
echo "Files:"
ls -la "$OUTPUT_DIR/"
echo ""
echo "Voice prompt preview:"
head -10 "$OUTPUT_DIR/voice_prompt.txt"
echo "..."
echo ""
echo "To deploy: update crawl_data.persona.voice_prompt in Supabase for the client"
