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


async def score_lead(title: str, company: str, description: str, openai_key: str = None) -> dict:
    """
    Score a lead using AI.
    Returns a dict with 'score' (0-100) and 'reason' (string).
    Falls back to keyword scoring if AI is unavailable.
    
    API key priority: env var AI_API_KEY > openai_key param (legacy)
    """
    api_key = AI_API_KEY or openai_key or ""
    if not api_key:
        return keyword_score(title, description)

    try:
        import httpx

        prompt = f"""You are an AI lead qualifier for a freelance web developer.
Analyze this job posting and rate how likely it is a good match (0-100).

Job Title: {title}
Company: {company}
Description: {description}

Respond ONLY with valid JSON:
{{"score": <0-100>, "reason": "<one sentence why>"}}"""

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
                    "temperature": 0.3,
                    "max_tokens": 100,
                },
            )

            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                result = json.loads(content)
                return {
                    "score": min(max(int(result.get("score", 50)), 0), 100),
                    "reason": result.get("reason", "AI analysis complete."),
                }
            else:
                print(f"[AI] API returned {response.status_code}, falling back.")
                return keyword_score(title, description)

    except Exception as e:
        print(f"[AI] Error: {e}, using fallback scorer.")
        return keyword_score(title, description)


def keyword_score(title: str, description: str) -> dict:
    """
    Fallback: simple keyword-based scoring.
    """
    text = f"{title} {description}".lower()

    high_value = ["react", "next.js", "nextjs", "typescript", "fullstack", "full-stack", "frontend", "node"]
    mid_value = ["python", "javascript", "web", "developer", "engineer", "remote"]
    low_value = ["intern", "junior", "unpaid", "volunteer"]

    score = 50  # base
    for kw in high_value:
        if kw in text:
            score += 8
    for kw in mid_value:
        if kw in text:
            score += 4
    for kw in low_value:
        if kw in text:
            score -= 15

    score = min(max(score, 0), 100)

    if score >= 75:
        reason = "Strong keyword match for target skills."
    elif score >= 50:
        reason = "Moderate relevance detected."
    else:
        reason = "Low relevance or mismatched role."

    return {"score": score, "reason": reason}
