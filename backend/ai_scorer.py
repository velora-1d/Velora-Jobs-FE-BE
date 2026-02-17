"""
AI Client - Multi-Model Support for Velora Jobs.
Supports 4 AI specialists:
1. GPT-4o-mini: Fast lead scoring
2. DeepSeek-R1: Strategic analytics & reasoning
3. Kimi-K2: Deep web scraping & enrichment
4. GLM-4: Creative campaign copywriting
"""
import os
import json
from typing import Optional, Literal
from dotenv import load_dotenv

load_dotenv()

# AI provider config from env
AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_BASE_URL = os.getenv("AI_BASE_URL", "https://api.openai.com/v1")
DEFAULT_SCORER_MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")


async def call_ai(
    prompt: str,
    model: Literal["gpt-4o-mini", "deepseek-r1", "kimi-k2", "glm-4"] = "gpt-4o-mini",
    temperature: float = 0.2,
    max_tokens: int = 500,
) -> dict:
    """
    Generic AI caller supporting multiple models.
    Returns: {"success": bool, "content": str, "error": str}
    """
    if not AI_API_KEY:
        return {"success": False, "content": "", "error": "AI_API_KEY not configured"}

    try:
        import httpx

        # Map model names to actual API model identifiers
        model_map = {
            "gpt-4o-mini": "gpt-4o-mini",
            "deepseek-r1": "deepseek-r1-250528",
            "kimi-k2": "kimi-k2-250905",
            "glm-4": "glm-4-7-251222",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{AI_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {AI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model_map.get(model, model),
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
            )

            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"].strip()
                return {"success": True, "content": content, "error": ""}
            else:
                return {
                    "success": False,
                    "content": "",
                    "error": f"API returned {response.status_code}",
                }

    except Exception as e:
        return {"success": False, "content": "", "error": str(e)}


async def score_lead(
    title: str,
    company: str,
    description: str,
    has_website: bool = True,
    category: str = "",
) -> dict:
    """
    Score a lead using GPT-4o-mini (fast & cheap).
    Returns: {"score": int, "reason": str}
    """
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

    result = await call_ai(prompt, model="gpt-4o-mini", temperature=0.2, max_tokens=150)

    if result["success"]:
        try:
            content = result["content"]
            # Clean JSON if AI adds markdown blocks
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()

            parsed = json.loads(content)
            return {
                "score": min(max(int(parsed.get("score", 50)), 0), 100),
                "reason": parsed.get("reason", "Analisis AI selesai."),
            }
        except:
            pass

    # Fallback to keyword scoring
    return keyword_score(title, description, has_website, category)


async def analyze_briefing(stats: dict) -> str:
    """
    Generate AI Mission Briefing using DeepSeek-R1 (reasoning specialist).
    Returns: Strategic advice text (Indonesian).
    """
    prompt = f"""Kamu adalah AI strategist untuk Velora Jobs, sebuah agensi tech yang fokus pada:
1. Aplikasi Manajemen (untuk Sekolah & Pesantren)
2. Website Development (untuk UMKM tanpa website)

Berikut data dashboard hari ini:
- Total Leads: {stats.get('total_leads', 0)}
- Total Prospects: {stats.get('total_prospects', 0)}
- Leads Contacted: {stats.get('contacted', 0)}
- Deals Won: {stats.get('won', 0)}
- Active Campaigns: {stats.get('active_campaigns', 0)}
- Messages Sent: {stats.get('total_sent', 0)}
- Messages Failed: {stats.get('total_failed', 0)}

Berikan "Mission Briefing" singkat (maksimal 3 kalimat) yang berisi:
1. Insight utama dari data ini
2. Rekomendasi strategi untuk hari ini

Jawab dalam Bahasa Indonesia, langsung tanpa pembukaan."""

    result = await call_ai(prompt, model="deepseek-r1", temperature=0.7, max_tokens=300)

    if result["success"]:
        return result["content"]
    else:
        return "AI Briefing tidak tersedia saat ini."


async def enrich_web_data(website_url: str, business_name: str) -> dict:
    """
    Deep-dive analysis of a website using Kimi-K2 (large context specialist).
    Returns: {"emails": [], "keywords": [], "pain_points": str}
    """
    prompt = f"""Kamu adalah AI web analyst. Analisis website berikut untuk mencari informasi tersembunyi:

Website: {website_url}
Business Name: {business_name}

Tugas:
1. Cari email address yang mungkin ada di halaman (format: email@domain.com)
2. Identifikasi 3-5 keyword utama yang menggambarkan bisnis ini
3. Tentukan "pain point" atau masalah yang mungkin mereka hadapi (1 kalimat)

Respond ONLY with valid JSON:
{{
  "emails": ["email1@example.com"],
  "keywords": ["keyword1", "keyword2"],
  "pain_points": "Deskripsi masalah mereka"
}}

CATATAN: Jika tidak menemukan email, return array kosong. Jika tidak bisa akses website, return data kosong."""

    result = await call_ai(prompt, model="kimi-k2", temperature=0.3, max_tokens=800)

    if result["success"]:
        try:
            content = result["content"]
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()

            return json.loads(content)
        except:
            pass

    return {"emails": [], "keywords": [], "pain_points": "Tidak dapat menganalisis website."}


async def generate_campaign_template(
    target_category: str, service_type: str, tone: str = "professional"
) -> str:
    """
    Generate creative WhatsApp campaign template using GLM-4 (copywriting specialist).
    Returns: Message template with {name}, {company} placeholders.
    """
    prompt = f"""Kamu adalah copywriter expert untuk WhatsApp marketing.

Tugas: Buat template pesan WhatsApp untuk campaign Velora Jobs dengan detail:
- Target: {target_category} (contoh: Pesantren, Sekolah, UMKM)
- Service: {service_type} (contoh: Aplikasi Manajemen, Website Development)
- Tone: {tone} (professional/casual/friendly)

Syarat:
1. Maksimal 3 paragraf pendek
2. Gunakan placeholder {{name}} dan {{company}}
3. Harus persuasif tapi tidak pushy
4. Akhiri dengan CTA (Call to Action) yang jelas
5. Bahasa Indonesia yang natural

Langsung tulis template-nya tanpa penjelasan tambahan."""

    result = await call_ai(prompt, model="glm-4", temperature=0.8, max_tokens=400)

    if result["success"]:
        return result["content"]
    else:
        return "Halo {name} dari {company},\n\nKami dari Velora Jobs ingin membantu meningkatkan efisiensi operasional Anda.\n\nTertarik diskusi lebih lanjut?"


def _detect_recipient_type(category: str, company: str, name: str) -> str:
    """
    Detect recipient type from category/company/name keywords.
    Returns: 'islamic', 'school', or 'business'
    """
    text = f"{category} {company} {name}".lower()

    islamic_keywords = [
        "pesantren", "pondok", "madrasah", "tahfidz", "tahfiz",
        "islamic", "islami", "masjid", "musholla", "quran",
        "al-", "al ", "darul", "darus", "baitul", "nurul",
        "yayasan islam", "tpa", "tpq", "mts", "mtsn", "man ",
    ]
    school_keywords = [
        "sekolah", "sma ", "smk ", "smp ", "sd ", "tk ",
        "sman", "smkn", "smpn", "sdn", "akademi", "universitas",
        "politeknik", "kampus", "lembaga pendidikan", "bimbel",
        "kursus", "les ", "pendidikan", "paud",
    ]

    for kw in islamic_keywords:
        if kw in text:
            return "islamic"
    for kw in school_keywords:
        if kw in text:
            return "school"
    return "business"


def _get_time_greeting() -> str:
    """
    Get time-appropriate greeting based on WIB (UTC+7).
    """
    from datetime import datetime, timezone, timedelta
    wib = timezone(timedelta(hours=7))
    hour = datetime.now(wib).hour

    if 5 <= hour < 11:
        return "Selamat Pagi"
    elif 11 <= hour < 15:
        return "Selamat Siang"
    elif 15 <= hour < 18:
        return "Selamat Sore"
    else:
        return "Selamat Malam"


async def generate_personalized_message(recipient_data: dict, tone: str = "professional") -> str:
    """
    Generate highly personalized WhatsApp message using GLM-4.
    Context-aware: adapts greeting, problem, and solution based on
    recipient type (Islamic/School/Business) and time of day.
    Uses SPPSD flow: Salam → Perkenalan → Problem → Solusi → Diskusi.
    """
    biz_name = recipient_data.get("name") or recipient_data.get("title") or "{name}"
    biz_company = recipient_data.get("company") or "{company}"
    has_website = recipient_data.get("has_website", True)
    category = recipient_data.get("category", "")
    address = recipient_data.get("address", "")
    rating = recipient_data.get("rating")

    # ── 1. Detect recipient type ──
    rtype = _detect_recipient_type(category, biz_company, biz_name)
    time_greeting = _get_time_greeting()

    # ── 2. Build contextual greeting ──
    if rtype == "islamic":
        greeting_instruction = (
            "Gunakan salam Islami: 'Assalamu'alaikum Warahmatullahi Wabarakatuh' "
            "karena penerima adalah lembaga pesantren/islami."
        )
        sapaan = "Ustadz/Ustadzah"
    elif rtype == "school":
        greeting_instruction = (
            f"Gunakan salam formal: '{time_greeting}, Bapak/Ibu' "
            "karena penerima adalah lembaga pendidikan umum."
        )
        sapaan = "Bapak/Ibu"
    else:
        greeting_instruction = (
            f"Gunakan salam bisnis: '{time_greeting}, Bapak/Ibu' "
            "karena penerima adalah pelaku usaha/UMKM."
        )
        sapaan = "Bapak/Ibu"

    # ── 3. Build problem hook ──
    if rtype == "islamic":
        if not has_website:
            problem_hook = (
                "Saat ini banyak wali santri mencari informasi pesantren secara online. "
                "Tanpa website resmi, calon santri potensial bisa terlewat."
            )
        else:
            problem_hook = (
                "Administrasi pesantren yang masih manual — data santri, pembayaran SPP, "
                "absensi — menghabiskan waktu yang seharusnya bisa untuk kegiatan ta'lim."
            )
        solution_hook = (
            "Kami di Velora Jobs menyediakan Sistem Manajemen Pesantren yang mencakup "
            "website resmi, database santri, pembayaran digital, dan laporan otomatis."
        )
    elif rtype == "school":
        if not has_website:
            problem_hook = (
                "Di era digital, orang tua mencari informasi sekolah lewat internet. "
                "Tanpa website profesional, sekolah kehilangan kesempatan menarik siswa baru."
            )
        else:
            problem_hook = (
                "Administrasi manual — raport, absensi, data siswa — sering memakan "
                "waktu guru yang seharusnya bisa fokus mengajar."
            )
        solution_hook = (
            "Kami di Velora Jobs menyediakan Sistem Manajemen Sekolah lengkap — "
            "website resmi, e-Raport, database siswa, dan dashboard administrasi."
        )
    else:
        if not has_website:
            problem_hook = (
                "Saya perhatikan bisnis Anda belum memiliki website resmi. "
                "Padahal 87% konsumen memeriksa kehadiran online sebelum memutuskan membeli."
            )
        elif rating and float(rating) < 4.0:
            problem_hook = (
                f"Saya melihat rating Google Maps bisnis Anda saat ini {rating}/5. "
                "Dengan strategi reputasi digital yang tepat, rating ini bisa meningkat signifikan."
            )
        else:
            problem_hook = (
                "Banyak pelanggan potensial di sekitar lokasi Anda yang mungkin "
                "belum mengetahui produk/jasa yang ditawarkan secara online."
            )
        solution_hook = (
            "Kami di Velora Jobs menyediakan solusi digital lengkap — "
            "website profesional, optimasi Google Maps & SEO, serta sistem CRM "
            "untuk meningkatkan penjualan dan efisiensi operasional."
        )

    # ── 4. Build AI prompt with SPPSD structure ──
    prompt = f"""Kamu adalah Sales Specialist senior di Velora Jobs.
Tugas: Buat pesan pembuka WhatsApp yang SANGAT personal, sopan, dan persuasif.

═══ DATA PENERIMA ═══
- Nama kontak: {biz_name}
- Instansi/Perusahaan: {biz_company}
- Kategori: {category or "Umum"}
- Lokasi: {address or "Indonesia"}
- Tipe penerima: {"Pesantren/Lembaga Islami" if rtype == "islamic" else "Sekolah/Pendidikan" if rtype == "school" else "UMKM/Bisnis"}
- Punya Website: {"Ya" if has_website else "Tidak"}
- Rating Google: {rating if rating else "N/A"}

═══ INSTRUKSI SALAM ═══
{greeting_instruction}

═══ STRUKTUR PESAN (WAJIB IKUTI URUTAN INI) ═══

1. **SALAM** — {greeting_instruction}
2. **PERKENALAN** — "Perkenalkan, saya dari tim Velora Jobs..."
   - Sebutkan bahwa kita specialist di bidang yang relevan
3. **PROBLEM** — Sampaikan masalah ini dengan empati:
   "{problem_hook}"
   - Jangan terkesan menggurui, tapi tunjukkan kepedulian
4. **SOLUSI** — Tawarkan solusi ini secara ringkas:
   "{solution_hook}"
   - Fokus pada manfaat, bukan fitur teknis
5. **DISKUSI (CTA)** — Ajak diskusi ringan:
   "Apakah {sapaan} bersedia meluangkan waktu 10 menit untuk diskusi singkat?"

═══ ATURAN PENULISAN ═══
- Bahasa Indonesia yang natural, sopan, dan persuasif
- Gunakan sapaan "{sapaan}" untuk menyapa
- Sebutkan nama instansi/perusahaan agar tidak terlihat spam
- Maksimal 5 paragraf pendek (sesuai struktur di atas)
- Jangan pakai emoji berlebihan, maksimal 1-2 emoji relevan
- Tone: {"formal & penuh ta'dzim/hormat" if rtype == "islamic" else "formal & profesional" if rtype == "school" else "semi-formal, friendly tapi sopan"}

Langsung tulis pesannya saja tanpa penjelasan tambahan."""

    result = await call_ai(prompt, model="glm-4", temperature=0.7, max_tokens=600)

    if result["success"]:
        return result["content"]

    # ── Fallback: structured message without AI ──
    if rtype == "islamic":
        salam = "Assalamu'alaikum Warahmatullahi Wabarakatuh"
    else:
        salam = f"{time_greeting}, {sapaan}"

    return (
        f"{salam}\n\n"
        f"Perkenalkan, saya dari tim Velora Jobs. "
        f"Kami adalah specialist di bidang solusi digital untuk "
        f"{'lembaga pendidikan Islam' if rtype == 'islamic' else 'lembaga pendidikan' if rtype == 'school' else 'pelaku usaha'}.\n\n"
        f"{problem_hook}\n\n"
        f"{solution_hook}\n\n"
        f"Apakah {sapaan} bersedia meluangkan waktu 10 menit untuk diskusi singkat? "
        f"Jazakallahu khairan 🙏" if rtype == "islamic" else
        f"{salam}\n\n"
        f"Perkenalkan, saya dari tim Velora Jobs. "
        f"Kami adalah specialist di bidang solusi digital untuk "
        f"{'lembaga pendidikan' if rtype == 'school' else 'pelaku usaha'}.\n\n"
        f"{problem_hook}\n\n"
        f"{solution_hook}\n\n"
        f"Apakah {sapaan} bersedia meluangkan waktu 10 menit untuk diskusi singkat? "
        f"Terima kasih atas waktunya 🙏"
    )


async def generate_proposal_content(lead_data: dict) -> dict:
    """
    Generate professional proposal sections using GLM-4.
    Returns: {"summary": str, "offerings": list, "pricing_strategy": str}
    """
    title = lead_data.get("title", lead_data.get("name", "Potential Client"))
    company = lead_data.get("company", "Your Company")
    description = lead_data.get("description", "")
    has_website = lead_data.get("has_website", True)

    prompt = f"""Kamu adalah Business Consultant di Velora Jobs.
Tugas: Buat draf proposal profesional untuk calon klien berikut.

Klien: {title} @ {company}
Detail Kebutuhan/Konteks: {description}
Status Website: {"Sudah punya website" if has_website else "Belum punya website"}

Velora Jobs menawarkan:
1. Web Development Pro (React/Next.js) - Fokus estetika premium & SEO.
2. Sistem Manajemen (Sekolah/Pesantren) - Fokus efisiensi & database.

Buat konten dalam Bahasa Indonesia dengan format JSON:
{{
  "summary": "1 paragraf ringkasan eksekutif yang persuasif.",
  "offerings": ["3-4 poin layanan yang paling relevan untuk klien ini"],
  "pricing_strategy": "Saran strategi harga (Entry/Mid/Premium) dalam 1 kalimat."
}}

Respond ONLY with valid JSON."""

    result = await call_ai(prompt, model="glm-4", temperature=0.5, max_tokens=1000)
    
    if result["success"]:
        try:
            content = result["content"]
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            return json.loads(content)
        except:
            pass

    return {
        "summary": f"Kami ingin menawarkan solusi digital terbaik untuk meningkatkan skalabilitas {company}.",
        "offerings": [
            "Pembuatan Website Profesional",
            "Sistem Manajemen Berbasis Cloud",
            "Optimasi Search Engine (SEO)"
        ],
        "pricing_strategy": "Strategi harga fleksibel berdasarkan skala implementasi."
    }


def keyword_score(
    title: str, description: str, has_website: bool = True, category: str = ""
) -> dict:
    """
    Fallback: simple keyword-based scoring based on Velora Jobs rules.
    """
    text = f"{title} {description} {category}".lower()
    score = 50

    # Rule 1: High priority for Schools/Pesantren
    if any(
        kw in text
        for kw in [
            "sekolah",
            "pesantren",
            "pondok",
            "yayasan",
            "sd",
            "smp",
            "sma",
            "smk",
        ]
    ):
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
