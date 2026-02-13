"""
Multi-Source Lead Scraper for Velora Jobs.
Scrapes jobs, freelance gigs, and local business prospects.

Sources:
- LinkedIn (International + Local Jobs)
- Upwork (International Freelance)
- Indeed (International + Local Jobs)
- Glints (Southeast Asia / Indonesia)
- Google Maps (Local Business: UMKM, Sekolah, Pesantren)
"""

import asyncio
from playwright.async_api import async_playwright
import random
from urllib.parse import quote


STEALTH_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
VIEWPORT = {"width": 1920, "height": 1080}


class JobScraper:
    def __init__(self, headless=True, cookie: str = None, proxy: str = None, safe_mode: bool = False):
        self.headless = headless
        self.cookie = cookie
        self.proxy = proxy
        self.safe_mode = safe_mode

    async def _launch_browser(self, playwright):
        """Launch a stealth browser instance."""
        launch_opts = {"headless": self.headless}
        if self.proxy:
            launch_opts["proxy"] = {"server": self.proxy}
        
        # Slower typing/interaction in safe mode
        if self.safe_mode:
            launch_opts["slow_mo"] = 100
            
        return await playwright.chromium.launch(**launch_opts)

    async def _scroll_page(self, page, times=3):
        """Scroll page to load lazy content."""
        for _ in range(times):
            await page.evaluate("window.scrollBy(0, 800)")
            # Longer random delays for safe mode
            delay = random.uniform(2.0, 5.0) if self.safe_mode else random.uniform(0.5, 1.2)
            await asyncio.sleep(delay)

    # ──────────────────────────────────────────────
    # MAIN ENTRY POINT
    # ──────────────────────────────────────────────

    async def scrape_all(self, keywords: str, location: str, sources: list = None, limit: int = 10):
        """
        Scrape from all enabled sources.
        sources: list of source names. If None, scrapes all.
        limit: Max leads PER SOURCE to retrieve.
        """
        if sources is None:
            sources = ["linkedin", "upwork", "indeed", "glints", "gmaps"]

        all_leads = []
        source_map = {
            "linkedin": self.scrape_linkedin,
            "upwork": self.scrape_upwork,
            "indeed": self.scrape_indeed,
            "glints": self.scrape_glints,
            "gmaps": self.scrape_gmaps,
        }

        for source_name in sources:
            scraper_fn = source_map.get(source_name)
            if scraper_fn:
                try:
                    print(f"\n{'='*50}")
                    print(f"[{source_name.upper()}] Starting scrape (Limit: {limit}, Safe: {self.safe_mode})...")
                    print(f"{'='*50}")
                    leads = await scraper_fn(keywords, location, limit)
                    all_leads.extend(leads)
                    print(f"[{source_name.upper()}] Got {len(leads)} leads.")
                    
                    if self.safe_mode:
                        await asyncio.sleep(random.uniform(5.0, 10.0))  # Break between sources
                        
                except Exception as e:
                    print(f"[{source_name.upper()}] FAILED: {e}")

        print(f"\n[TOTAL] {len(all_leads)} leads from {len(sources)} sources.")
        return all_leads

    # ──────────────────────────────────────────────
    # 1. LINKEDIN
    # ──────────────────────────────────────────────

    async def scrape_linkedin(self, keywords: str, location: str, limit: int = 10):
        leads = []
        async with async_playwright() as p:
            browser = await self._launch_browser(p)
            context = await browser.new_context(user_agent=STEALTH_UA, viewport=VIEWPORT)

            if self.cookie:
                await context.add_cookies([{
                    "name": "li_at",
                    "value": self.cookie,
                    "domain": ".linkedin.com",
                    "path": "/",
                    "httpOnly": True,
                    "secure": True,
                }])
                print("[LINKEDIN] Authenticated mode (cookie).")

            page = await context.new_page()
            url = f"https://www.linkedin.com/jobs/search?keywords={quote(keywords)}&location={quote(location)}"
            print(f"[LINKEDIN] {url}")

            try:
                await page.goto(url, timeout=60000)
                try:
                    await page.wait_for_selector(".jobs-search__results-list, .scaffold-layout__list", timeout=15000)
                except Exception:
                    await asyncio.sleep(3)

                await self._scroll_page(page)
                job_cards = await page.query_selector_all("li")

                for card in job_cards[:limit]:
                    try:
                        title_el = await card.query_selector("h3")
                        company_el = await card.query_selector("h4")
                        location_el = await card.query_selector(".job-search-card__location")
                        link_el = await card.query_selector("a")
                        desc_el = await card.query_selector(".job-search-card__snippet, p")

                        if title_el and company_el:
                            leads.append({
                                "title": (await title_el.inner_text()).strip(),
                                "company": (await company_el.inner_text()).strip(),
                                "location": (await location_el.inner_text()).strip() if location_el else "Remote",
                                "url": await link_el.get_attribute("href") if link_el else "",
                                "source": "LinkedIn",
                                "description": (await desc_el.inner_text()).strip() if desc_el else "",
                            })
                    except Exception:
                        continue
            except Exception as e:
                print(f"[LINKEDIN] Error: {e}")

            await browser.close()
        return leads

    # ──────────────────────────────────────────────
    # 2. UPWORK (International Freelance)
    # ──────────────────────────────────────────────

    async def scrape_upwork(self, keywords: str, location: str = "", limit: int = 10):
        leads = []
        async with async_playwright() as p:
            browser = await self._launch_browser(p)
            context = await browser.new_context(user_agent=STEALTH_UA, viewport=VIEWPORT)
            page = await context.new_page()

            url = f"https://www.upwork.com/nx/search/jobs/?q={quote(keywords)}&sort=recency"
            print(f"[UPWORK] {url}")

            try:
                await page.goto(url, timeout=60000)
                try:
                    await page.wait_for_selector("[data-test='job-tile-list']", timeout=15000)
                except Exception:
                    await asyncio.sleep(3)

                await self._scroll_page(page)
                tiles = await page.query_selector_all("article[data-test='SearchResult']")
                if not tiles:
                    tiles = await page.query_selector_all("section.up-card-section")

                print(f"[UPWORK] Found {len(tiles)} tiles.")

                for tile in tiles[:limit]:
                    try:
                        title_el = await tile.query_selector("h2 a, a.up-n-link")
                        desc_el = await tile.query_selector("p, span[data-test='job-description-text']")
                        budget_el = await tile.query_selector("[data-test='budget'], .up-popper-trigger span")

                        if title_el:
                            title = (await title_el.inner_text()).strip()
                            href = await title_el.get_attribute("href") or ""
                            full_url = f"https://www.upwork.com{href}" if href.startswith("/") else href
                            description = (await desc_el.inner_text()).strip() if desc_el else ""
                            budget = (await budget_el.inner_text()).strip() if budget_el else ""

                            leads.append({
                                "title": title,
                                "company": f"Upwork Client" + (f" ({budget})" if budget else ""),
                                "location": "Remote (Global)",
                                "url": full_url,
                                "source": "Upwork",
                                "description": description[:300],
                            })
                    except Exception:
                        continue
            except Exception as e:
                print(f"[UPWORK] Error: {e}")

            await browser.close()
        return leads

    # ──────────────────────────────────────────────
    # 3. INDEED (International + Local)
    # ──────────────────────────────────────────────

    async def scrape_indeed(self, keywords: str, location: str, limit: int = 10):
        leads = []
        async with async_playwright() as p:
            browser = await self._launch_browser(p)
            context = await browser.new_context(user_agent=STEALTH_UA, viewport=VIEWPORT)
            page = await context.new_page()

            url = f"https://www.indeed.com/jobs?q={quote(keywords)}&l={quote(location)}&sort=date"
            print(f"[INDEED] {url}")

            try:
                await page.goto(url, timeout=60000)
                try:
                    await page.wait_for_selector(".job_seen_beacon, .jobsearch-ResultsList", timeout=15000)
                except Exception:
                    await asyncio.sleep(3)

                await self._scroll_page(page)
                cards = await page.query_selector_all(".job_seen_beacon, .resultContent")
                print(f"[INDEED] Found {len(cards)} cards.")

                for card in cards[:limit]:
                    try:
                        title_el = await card.query_selector("h2 a, .jobTitle a")
                        company_el = await card.query_selector("[data-testid='company-name'], .companyName")
                        location_el = await card.query_selector("[data-testid='text-location'], .companyLocation")
                        desc_el = await card.query_selector(".job-snippet, .underShelfFooter")

                        if title_el:
                            title = (await title_el.inner_text()).strip()
                            href = await title_el.get_attribute("href") or ""
                            full_url = f"https://www.indeed.com{href}" if href.startswith("/") else href

                            leads.append({
                                "title": title,
                                "company": (await company_el.inner_text()).strip() if company_el else "Unknown",
                                "location": (await location_el.inner_text()).strip() if location_el else location,
                                "url": full_url,
                                "source": "Indeed",
                                "description": (await desc_el.inner_text()).strip() if desc_el else "",
                            })
                    except Exception:
                        continue
            except Exception as e:
                print(f"[INDEED] Error: {e}")

            await browser.close()
        return leads

    # ──────────────────────────────────────────────
    # 4. GLINTS (Southeast Asia / Indonesia)
    # ──────────────────────────────────────────────

    async def scrape_glints(self, keywords: str, location: str = "Indonesia", limit: int = 10):
        leads = []
        async with async_playwright() as p:
            browser = await self._launch_browser(p)
            context = await browser.new_context(user_agent=STEALTH_UA, viewport=VIEWPORT)
            page = await context.new_page()

            url = f"https://glints.com/id/opportunities/jobs/explore?keyword={quote(keywords)}&country=ID&sortBy=LATEST"
            print(f"[GLINTS] {url}")

            try:
                await page.goto(url, timeout=60000)
                try:
                    await page.wait_for_selector("[class*='JobCard'], [class*='job-card']", timeout=15000)
                except Exception:
                    await asyncio.sleep(3)

                await self._scroll_page(page, times=4)
                cards = await page.query_selector_all("[class*='JobCard'], [class*='ExploreCard'], a[href*='/opportunities/jobs/']")
                print(f"[GLINTS] Found {len(cards)} cards.")

                for card in cards[:limit]:
                    try:
                        title_el = await card.query_selector("h2, [class*='JobTitle'], [class*='job-title']")
                        company_el = await card.query_selector("[class*='CompanyName'], [class*='company-name'], span")
                        location_el = await card.query_selector("[class*='Location'], [class*='location']")
                        link_el = card if (await card.get_attribute("href")) else await card.query_selector("a")

                        if title_el:
                            title = (await title_el.inner_text()).strip()
                            href = await link_el.get_attribute("href") if link_el else ""
                            full_url = f"https://glints.com{href}" if href and href.startswith("/") else href

                            leads.append({
                                "title": title,
                                "company": (await company_el.inner_text()).strip() if company_el else "Glints Employer",
                                "location": (await location_el.inner_text()).strip() if location_el else "Indonesia",
                                "url": full_url,
                                "source": "Glints",
                                "description": "",
                            })
                    except Exception:
                        continue
            except Exception as e:
                print(f"[GLINTS] Error: {e}")

            await browser.close()
        return leads


    # ──────────────────────────────────────────────
    # 5. GOOGLE MAPS (Local Business Prospecting)
    # ──────────────────────────────────────────────

    # ──────────────────────────────────────────────
    # 5. GOOGLE MAPS (Local Business Prospecting)
    # ──────────────────────────────────────────────

    async def scrape_gmaps(self, keywords: str, location: str, limit: int = 10):
        """
        Scrape Google Maps for local businesses.
        Great for finding UMKM, Sekolah, Pesantren that need digital services.
        """
        leads = []
        async with async_playwright() as p:
            browser = await self._launch_browser(p)
            context = await browser.new_context(user_agent=STEALTH_UA, viewport=VIEWPORT)
            page = await context.new_page()

            query = f"{keywords} {location}"
            url = f"https://www.google.com/maps/search/{quote(query)}"
            print(f"[GMAPS] {url}")

            try:
                await page.goto(url, timeout=60000)

                # Wait for results panel
                try:
                    await page.wait_for_selector("div[role='feed'], div.Nv2PK", timeout=15000)
                except Exception:
                    print("[GMAPS] Waiting for results...")
                    await asyncio.sleep(5)

                # Scroll the results panel to load more
                feed = await page.query_selector("div[role='feed']")
                if feed:
                    for _ in range(5):
                        await feed.evaluate("el => el.scrollBy(0, 500)")
                        await asyncio.sleep(random.uniform(1.0, 2.0))

                # Grab listing cards
                cards = await page.query_selector_all("div.Nv2PK")
                if not cards:
                    cards = await page.query_selector_all("a[href*='/maps/place/']")

                print(f"[GMAPS] Found {len(cards)} listings.")

                for card in cards[:limit]:
                    try:
                        # Try to get name
                        name_el = await card.query_selector(".qBF1Pd, .fontHeadlineSmall")
                        if not name_el:
                            name_el = await card.query_selector("span.OSrXXb")

                        # Rating / review count (indicates established business)
                        rating_el = await card.query_selector(".MW4etd")
                        review_el = await card.query_selector(".UY7F9")

                        # Address
                        addr_el = await card.query_selector(".W4Efsd:last-child .W4Efsd span:nth-child(2), .W4Efsd")

                        # Category (e.g., "Pesantren", "Sekolah Dasar")
                        cat_el = await card.query_selector(".W4Efsd:first-child .W4Efsd span:nth-child(2)")

                        # Phone
                        phone_el = await card.query_selector("span.UsdlK")

                        # Website link
                        website_el = await card.query_selector("a[data-value='Website'], a[href*='http']:not([href*='google'])")

                        # Get the Maps link
                        link_el = await card.query_selector("a.hfpxzc")

                        if name_el:
                            name = (await name_el.inner_text()).strip()
                            rating = (await rating_el.inner_text()).strip() if rating_el else ""
                            reviews = (await review_el.inner_text()).strip() if review_el else ""
                            address = (await addr_el.inner_text()).strip() if addr_el else location
                            category = (await cat_el.inner_text()).strip() if cat_el else ""
                            phone = (await phone_el.inner_text()).strip() if phone_el else ""
                            has_website = website_el is not None
                            maps_url = await link_el.get_attribute("href") if link_el else ""

                            # Build description with business info
                            desc_parts = []
                            if category:
                                desc_parts.append(f"Kategori: {category}")
                            if rating:
                                desc_parts.append(f"Rating: {rating}")
                            if reviews:
                                desc_parts.append(f"Ulasan: {reviews}")
                            if phone:
                                desc_parts.append(f"Telp: {phone}")
                            desc_parts.append(f"Website: {'Ada' if has_website else 'BELUM ADA ⭐'}")

                            leads.append({
                                "title": name,
                                "company": category or "Local Business",
                                "location": address,
                                "url": maps_url or "",
                                "source": "Google Maps",
                                "description": " | ".join(desc_parts),
                                "has_website": has_website,
                                "phone": phone,
                            })
                    except Exception:
                        continue

            except Exception as e:
                print(f"[GMAPS] Error: {e}")

            await browser.close()

        # Sort: businesses WITHOUT websites first (hotter leads)
        leads.sort(key=lambda x: x.get("has_website", True))
        print(f"[GMAPS] {len(leads)} businesses found. {sum(1 for l in leads if not l.get('has_website', True))} without website (hot leads!).")
        return leads


# Testing lokal
if __name__ == "__main__":
    scraper = JobScraper(headless=False)
    results = asyncio.run(scraper.scrape_all("Pondok Pesantren", "Jawa Timur", ["gmaps"], limit=5))
    for r in results:
        print(f"  [{r['source']}] {r['title']} | {r.get('description', '')}")
