#!/usr/bin/env python3
"""
PERSONA GENERATOR — Tier 1
Takes business info JSON, generates a full AI persona with photos via MiniMax.
Usage: python3 generate-persona.py <business-config.json>
"""

import json, sys, os, re, time, urllib.request, urllib.error

MINIMAX_API_KEY = os.environ.get("MINIMAX_API_KEY", "")
OUTPUT_DIR = "/tmp/persona-output"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def minimax_chat(system_prompt, user_message, max_tokens=3000, temperature=0.9):
    """Call MiniMax M2.7 chat completion."""
    payload = json.dumps({
        "model": "MiniMax-M2.7",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        "max_tokens": max_tokens,
        "temperature": temperature
    }).encode()

    req = urllib.request.Request(
        "https://api.minimax.io/v1/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {MINIMAX_API_KEY}",
            "Content-Type": "application/json"
        }
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read())

    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    content = re.sub(r'<think>[\s\S]*?</think>\s*', '', content).strip()
    content = content.replace("**", "")
    return content


def minimax_image(prompt, aspect_ratio="1:1", n=1, subject_ref_url=None):
    """Call MiniMax image-01 generation."""
    payload = {
        "model": "image-01",
        "prompt": prompt[:1500],
        "aspect_ratio": aspect_ratio,
        "n": n,
        "response_format": "url",
        "prompt_optimizer": True
    }
    if subject_ref_url:
        payload["subject_reference"] = [{"type": "character", "image_file": subject_ref_url}]

    req = urllib.request.Request(
        "https://api.minimax.io/v1/image_generation",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {MINIMAX_API_KEY}",
            "Content-Type": "application/json"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read())
        urls = data.get("data", {}).get("image_urls", [])
        return urls
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"   Image API error: {e.code} — {body[:200]}")
        return []


def download_image(url, filename):
    """Download image to OUTPUT_DIR."""
    path = os.path.join(OUTPUT_DIR, filename)
    try:
        urllib.request.urlretrieve(url, path)
        size = os.path.getsize(path)
        print(f"   Saved: {filename} ({size:,} bytes)")
        return path
    except Exception as e:
        print(f"   Download failed: {e}")
        return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 generate-persona.py <business-config.json>")
        sys.exit(1)

    config_path = sys.argv[1]
    with open(config_path) as f:
        config = json.load(f)

    print("=== PERSONA GENERATOR ===")
    print(f"Business: {config.get('business_name', 'Unknown')}")
    print()

    # ---- STEP 1: Generate persona text ----
    print("[1/4] Generating persona text...")

    system_prompt = """You are a creative writer specializing in character creation. Create a deeply realistic, vivid persona for an AI agent that will represent a business on WhatsApp.

Write in FIRST PERSON as if this person is introducing themselves. Include:

1. Full name, age, nationality, where they live
2. Origin story — where they grew up, family, formative sensory memories (smells, sounds, specific streets)
3. Education — actual school names, degrees, mentors, what they learned that stuck
4. Career path — every job, what they loved/hated, why they moved on
5. How they found THIS job — the specific moment, why it clicked
6. Work relationships — owner, coworkers, regulars. Real dynamics, teasing, inside jokes
7. Personal life — family, relationship, home, hobbies, dreams, days off
8. 6+ specific quirks — NOT generic ("friendly") but specific habits and traits
9. How they handle: birthdays, complaints, first-timers, regulars, sad guests, big groups, celebrations
10. HOW I TALK — 8-10 example WhatsApp messages capturing their exact voice, slang, emoji style

Write 800-1200 words. Flowing first-person narrative with HOW I TALK section at the end.
Make them ALIVE — contradictions, passions, small obsessions, a dream they're saving for.
Match the energy to the business type and culture."""

    user_msg = f"Create a persona for this business:\n\n{json.dumps(config, indent=2)}"

    voice_prompt = minimax_chat(system_prompt, user_msg, max_tokens=3000, temperature=0.9)

    voice_path = os.path.join(OUTPUT_DIR, "voice_prompt.txt")
    with open(voice_path, "w") as f:
        f.write(voice_prompt)

    print(f"   Generated: {len(voice_prompt):,} chars")
    print(f"   Preview: {voice_prompt[:150]}...")
    print()

    # ---- STEP 2: Extract visual description ----
    print("[2/4] Extracting visual description...")

    visual_desc = minimax_chat(
        "You create detailed physical descriptions for AI-generated portraits. Be specific about ethnicity, age, hair, build, clothing style. Output ONLY the description, nothing else. One paragraph.",
        f"Based on this persona, describe what this person looks like physically:\n\n{voice_prompt[:2000]}",
        max_tokens=200,
        temperature=0.7
    )

    visual_path = os.path.join(OUTPUT_DIR, "visual_description.txt")
    with open(visual_path, "w") as f:
        f.write(visual_desc)

    print(f"   Visual: {visual_desc[:120]}...")
    print()

    # ---- STEP 3: Generate headshots ----
    print("[3/4] Generating headshots...")

    headshot_prompt = f"{visual_desc}. Professional WhatsApp profile photo, warm genuine smile, looking directly at camera. Natural soft lighting, slightly blurred background. High quality portrait photography, 85mm lens, shallow depth of field. Approachable, warm, professional."

    headshot_urls = minimax_image(headshot_prompt, aspect_ratio="1:1", n=2)
    print(f"   Generated {len(headshot_urls)} headshots")

    for i, url in enumerate(headshot_urls):
        download_image(url, f"headshot_{i+1}.jpg")

    primary_headshot = headshot_urls[0] if headshot_urls else None
    time.sleep(3)  # Rate limit buffer

    # ---- STEP 4: Generate lifestyle photos ----
    print("[4/4] Generating lifestyle photos...")

    activities_text = minimax_chat(
        "Extract 4 photo scene descriptions from this persona. Each should be a specific lifestyle moment. Output ONLY 4 lines, one scene per line. Each line is a detailed image prompt. No numbering.",
        voice_prompt[:2000],
        max_tokens=400,
        temperature=0.8
    )

    activities = [a.strip() for a in activities_text.split("\n") if a.strip() and len(a.strip()) > 20][:4]

    with open(os.path.join(OUTPUT_DIR, "activities.txt"), "w") as f:
        f.write("\n".join(activities))

    for i, activity in enumerate(activities):
        activity = re.sub(r'^[\d.)]+\s*', '', activity)
        print(f"   Photo {i+1}: {activity[:70]}...")

        # Try with subject reference first
        urls = []
        if primary_headshot:
            urls = minimax_image(
                f"{activity}. Candid photography, natural lighting, warm tones, lifestyle editorial.",
                aspect_ratio="4:3",
                n=1,
                subject_ref_url=primary_headshot
            )

        # Fallback without subject reference
        if not urls:
            print("   Falling back to description-based generation...")
            urls = minimax_image(
                f"{visual_desc} {activity}. Candid photography, natural lighting, warm tones.",
                aspect_ratio="4:3",
                n=1
            )

        if urls:
            download_image(urls[0], f"lifestyle_{i+1}.jpg")

        time.sleep(3)  # Rate limit

    # ---- SUMMARY ----
    print()
    print("=== PERSONA GENERATION COMPLETE ===")
    print(f"Output: {OUTPUT_DIR}/")
    print()

    files = os.listdir(OUTPUT_DIR)
    for f in sorted(files):
        path = os.path.join(OUTPUT_DIR, f)
        size = os.path.getsize(path)
        print(f"  {f} ({size:,} bytes)")

    print()
    print("Voice prompt preview:")
    print("-" * 60)
    print(voice_prompt[:500])
    print("...")
    print("-" * 60)

    # Save full output as JSON for Supabase
    output = {
        "voice_prompt": voice_prompt,
        "visual_description": visual_desc,
        "headshot_urls": headshot_urls,
        "activities": activities,
        "config": config
    }
    output_path = os.path.join(OUTPUT_DIR, "persona_output.json")
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nFull output saved to: {output_path}")


if __name__ == "__main__":
    main()
