"""
AI Lead Scorer - Uses AI to analyze and score leads.
Scores each lead based on relevance to the user's service offering.
Config loaded from environment variables (backend/.env).
"""
import os
import json
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# AI provider config from env
AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_BASE_URL = os.getenv("AI_BASE_URL", "https://api.openai.com/v1")
AI_MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")


async def score_lead(title: str, company: str, description: str, has_website: bool = True, category: str = "", openai_key: str = None) -> dict:
    """
    Score a lead using AI with specific business rules:
    - Sekolah/Pesantren: High potential for Management Apps (regardless of website).
    - UMKM/Other: High potential for Web Dev ONLY if has_website is False.
    - Already has website: Low potential for Web Dev.
    """
    api_key = AI_API_KEY or openai_key or ""
    if not api_key:
        return keyword_score(title, description, has_website, category)

    try:
        import httpx

        prompt = f"""You are an expert lead qualifier for 'Velora Jobs', a tech agency.
Your client offers 2 main services:
1. Management Applications (for Schools and Pesantren).
2. Website Development (for UMKM/Businesses without a website).

Analyze this lead and rate it (0-100) based on these STRICT rules:
- If Category is 'Sekolah' or 'Pesantren': Give a HIGH SCORE (90-100) because they need Management Systems, even if they already have a website.
- If it is a regular Business/UMKM AND 'Has Website' is False: Give a HIGH SCORE (80-90) for Website Development services.
- If it is a regular Business/UMKM AND 'Has Website' is True: Give a LOW SCORE (10-30) because they already have a website.

Lead Details:
- Name/Title: {title}
- Category/Company: {company} ({category})
- Description: {description}
- Has Existing Website: {has_website}

Respond ONLY with valid JSON:
{{"score": <0-100>, "reason": "<one sentence explanation in Indonesian>"}}"""

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{AI_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": AI_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2,
                    "max_tokens": 150,
                },
            )

            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"].strip()
                # Clean JSON if AI adds markdown blocks
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                
                result = json.loads(content)
                return {
                    "score": min(max(int(result.get("score", 50)), 0), 100),
                    "reason": result.get("reason", "Analisis AI selesai."),
                }
            else:
                print(f"[AI] API returned {response.status_code}, falling back.")
                return keyword_score(title, description)

    except Exception as e:
        print(f"[AI] Error: {e}, using fallback scorer.")
        return keyword_score(title, description)


def keyword_score(title: str, description: str, has_website: bool = True, category: str = "") -> dict:
    """
    Fallback: simple keyword-based scoring based on Velora Jobs rules.
    """
    text = f"{title} {description} {category}".lower()
    score = 50

    # Rule 1: High priority for Schools/Pesantren
    if any(kw in text for kw in ["sekolah", "pesantren", "pondok", "yayasan", "sd", "smp", "sma", "smk"]):
        score = 95
        reason = "Lead berkategori Sekolah/Pesantren (Prioritas Aplikasi Manajemen)."
    
    # Rule 2: UMKM without website
    elif not has_website:
        score = 85
        reason = "UMKM/Bisnis belum memiliki website (Prioritas Web Dev)."
    
    # Rule 3: Business with website (Lower priority)
    else:
        score = 25
        reason = "Bisnis sudah memiliki website (Prioritas Rendah)."

    return {"score": score, "reason": reason}
