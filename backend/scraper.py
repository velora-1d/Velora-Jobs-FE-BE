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
    def __init__(self, headless=True, cookie: str = None, proxy: str = None, safe_mode: bool = False, log_callback=None, interrupt_event=None):
        self.headless = headless
        self.cookie = cookie
        self.proxy = proxy
        self.safe_mode = safe_mode
        self.log_callback = log_callback
        self.interrupt_event = interrupt_event

    def _log(self, msg: str):
        if self.log_callback:
            self.log_callback(msg)
        else:
            print(msg)

    def _check_interrupt(self):
        if self.interrupt_event and self.interrupt_event.is_set():
            raise asyncio.CancelledError("Scraper interrupted by user")

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
            self._check_interrupt()
            scraper_fn = source_map.get(source_name)
            if scraper_fn:
                try:
                    self._log(f"--- [{source_name.upper()}] Starting (Limit: {limit}) ---")
                    leads = await scraper_fn(keywords, location, limit)
                    all_leads.extend(leads)
                    self._log(f"✅ [{source_name.upper()}] Collected {len(leads)} leads.")
                    
                    if self.safe_mode:
                        self._log(f"⏳ Safe mode: Resting 5-10s...")
                        await asyncio.sleep(random.uniform(5.0, 10.0))
                        
                except asyncio.CancelledError:
                    self._log(f"🛑 Scraper stopped at {source_name.upper()}")
                    raise
                except Exception as e:
                    self._log(f"❌ [{source_name.upper()}] FAILED: {str(e)}")

        self._log(f"🏁 DONE: Found {len(all_leads)} total leads from {len(sources)} sources.")
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
                self._log(f"[LINKEDIN] Navigating to search URL...")
                await page.goto(url, timeout=60000)
                try:
                    await page.wait_for_selector(".jobs-search__results-list, .scaffold-layout__list, .jobs-search-results-list", timeout=15000)
                    self._log(f"[LINKEDIN] Page loaded. Parsing cards...")
                except Exception:
                    self._log(f"[LINKEDIN] Timeout waiting for selector, trying scroll...")
                    await asyncio.sleep(3)

                await self._scroll_page(page)
                job_cards = await page.query_selector_all("li")
                self._log(f"[LINKEDIN] Found {len(job_cards)} potential cards.")

                for i, card in enumerate(job_cards[:limit]):
                    self._check_interrupt()
                    try:
                        title_el = await card.query_selector("h3")
                        company_el = await card.query_selector("h4")
                        location_el = await card.query_selector(".job-search-card__location")
                        link_el = await card.query_selector("a")
                        desc_el = await card.query_selector(".job-search-card__snippet, p")

                        if title_el and company_el:
                            title = (await title_el.inner_text()).strip()
                            self._log(f"[LINKEDIN] -> Processing: {title}")
                            leads.append({
                                "title": title,
                                "company": (await company_el.inner_text()).strip(),
                                "location": (await location_el.inner_text()).strip() if location_el else "Remote",
                                "url": await link_el.get_attribute("href") if link_el else "",
                                "source": "LinkedIn",
                                "description": (await desc_el.inner_text()).strip() if desc_el else "",
                            })
                    except Exception:
                        continue
            except Exception as e:
                self._log(f"[LINKEDIN] Error: {str(e)}")

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
                self._log(f"[UPWORK] Navigating to search URL...")
                await page.goto(url, timeout=60000)
                try:
                    await page.wait_for_selector("[data-test='job-tile-list'], .up-card-section", timeout=15000)
                    self._log(f"[UPWORK] Results loaded.")
                except Exception:
                    await asyncio.sleep(3)

                await self._scroll_page(page)
                tiles = await page.query_selector_all("article[data-test='SearchResult'], section.up-card-section")
                self._log(f"[UPWORK] Found {len(tiles)} listings.")

                for tile in tiles[:limit]:
                    self._check_interrupt()
                    try:
                        title_el = await tile.query_selector("h2 a, a.up-n-link, [data-test='job-tile-title'] a")
                        desc_el = await tile.query_selector("p, span[data-test='job-description-text']")
                        budget_el = await tile.query_selector("[data-test='budget'], .up-popper-trigger span")

                        if title_el:
                            title = (await title_el.inner_text()).strip()
                            self._log(f"[UPWORK] -> Processing: {title[:40]}...")
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
                self._log(f"[UPWORK] Error: {str(e)}")

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
    # 5. GOOGLE MAPS (Local Business Prospecting — Deep Scraping)
    # ──────────────────────────────────────────────

    async def scrape_gmaps(self, keywords: str, location: str, limit: int = 10):
        """
        Deep-scrape Google Maps for local businesses.
        Clicks into EACH listing to extract full contact info (phone, email, website).
        ONLY returns prospects that have a phone number (WA filter).
        Returns data shaped for the `prospects` table.
        """
        prospects = []
        async with async_playwright() as p:
            browser = await self._launch_browser(p)
            context = await browser.new_context(user_agent=STEALTH_UA, viewport=VIEWPORT)
            page = await context.new_page()

            query = f"{keywords} {location}"
            url = f"https://www.google.com/maps/search/{quote(query)}"

            try:
                self._log(f"[GMAPS] 🔍 Deep searching: '{query}'...")
                await page.goto(url, timeout=60000)

                # Wait for results panel
                try:
                    await page.wait_for_selector("div[role='feed'], div.Nv2PK, .fontHeadlineSmall", timeout=15000)
                    self._log(f"[GMAPS] Results loaded. Scrolling for more...")
                except Exception:
                    self._log(f"[GMAPS] Waiting for results to appear...")
                    await asyncio.sleep(5)

                # Scroll the results panel to load more listings
                feed = await page.query_selector("div[role='feed']")
                if feed:
                    scroll_rounds = max(5, limit // 3)  # Scale scrolling to requested limit
                    for i in range(scroll_rounds):
                        self._check_interrupt()
                        await feed.evaluate("el => el.scrollBy(0, 800)")
                        await asyncio.sleep(random.uniform(1.0, 2.0))

                # Grab listing cards
                cards = await page.query_selector_all("div.Nv2PK")
                if not cards:
                    cards = await page.query_selector_all("a[href*='/maps/place/']")

                total_cards = len(cards)
                target = min(total_cards, limit)
                self._log(f"[GMAPS] Found {total_cards} listings. Will deep-inspect {target}.")

                skipped_no_phone = 0

                for idx, card in enumerate(cards[:target]):
                    self._check_interrupt()
                    try:
                        # --- Step 1: Get name from card ---
                        name_el = await card.query_selector(".qBF1Pd, .fontHeadlineSmall")
                        if not name_el:
                            name_el = await card.query_selector("span.OSrXXb")
                        if not name_el:
                            continue

                        name = (await name_el.inner_text()).strip()
                        self._log(f"[GMAPS] [{idx+1}/{target}] 🔎 Inspecting: {name}")

                        # --- Step 2: Click the card to open detail panel ---
                        link_el = await card.query_selector("a.hfpxzc")
                        if link_el:
                            await link_el.click()
                        else:
                            await card.click()

                        # Wait for detail panel to load
                        await asyncio.sleep(random.uniform(2.0, 3.5))

                        # --- Step 3: Extract data from detail panel ---
                        phone = ""
                        email = ""
                        website = ""
                        address = ""
                        category = ""
                        rating = None
                        review_count = None
                        maps_url = page.url  # Current URL is the place URL

                        # Phone — look for phone button/link in the detail panel
                        phone_buttons = await page.query_selector_all("button[data-tooltip*='phone'], button[data-item-id*='phone'], a[data-item-id*='phone']")
                        if phone_buttons:
                            for pb in phone_buttons:
                                aria = await pb.get_attribute("aria-label") or ""
                                if aria:
                                    # Extract digits from aria-label like "Phone: 0812-3456-7890"
                                    phone_match = aria.replace("Phone:", "").replace("Telepon:", "").strip()
                                    if phone_match:
                                        phone = phone_match
                                        break
                        
                        # Fallback: look for phone in text elements
                        if not phone:
                            all_buttons = await page.query_selector_all("button[data-item-id]")
                            for btn in all_buttons:
                                item_id = await btn.get_attribute("data-item-id") or ""
                                if "phone" in item_id.lower():
                                    aria = await btn.get_attribute("aria-label") or ""
                                    phone = aria.replace("Phone:", "").replace("Telepon:", "").strip()
                                    break

                        # ⭐ FILTER: Skip if no phone
                        if not phone:
                            self._log(f"[GMAPS]    ❌ No phone → SKIP")
                            skipped_no_phone += 1
                            # Go back to results list
                            back_btn = await page.query_selector("button[aria-label='Back'], button[jsaction*='back']")
                            if back_btn:
                                await back_btn.click()
                            else:
                                await page.go_back()
                            await asyncio.sleep(random.uniform(1.0, 2.0))
                            continue

                        # Website
                        website_buttons = await page.query_selector_all("a[data-item-id*='authority'], a[data-item-id*='website']")
                        if website_buttons:
                            for wb in website_buttons:
                                href = await wb.get_attribute("href") or ""
                                if href and "google" not in href:
                                    website = href
                                    break

                        # Address
                        addr_buttons = await page.query_selector_all("button[data-item-id*='address'], button[data-item-id='oloc']")
                        if addr_buttons:
                            for ab in addr_buttons:
                                aria = await ab.get_attribute("aria-label") or ""
                                address = aria.replace("Address:", "").replace("Alamat:", "").strip()
                                if address:
                                    break
                        
                        if not address:
                            address = location

                        # Category
                        cat_el = await page.query_selector("button[jsaction*='category'] span, .DkEaL")
                        if cat_el:
                            category = (await cat_el.inner_text()).strip()
                        
                        if not category:
                            # Try from the header area
                            cat_buttons = await page.query_selector_all("button.DkEaL")
                            if cat_buttons:
                                category = (await cat_buttons[0].inner_text()).strip()

                        # Rating
                        rating_el = await page.query_selector("div.F7nice span[aria-hidden='true']")
                        if rating_el:
                            try:
                                rating = float((await rating_el.inner_text()).strip().replace(",", "."))
                            except (ValueError, TypeError):
                                pass

                        # Review count
                        review_el = await page.query_selector("div.F7nice span[aria-label*='review'], div.F7nice span[aria-label*='ulasan']")
                        if review_el:
                            try:
                                review_text = await review_el.get_attribute("aria-label") or ""
                                # Extract number from "123 reviews" or "123 ulasan"
                                import re
                                nums = re.findall(r'[\d,\.]+', review_text.replace(".", "").replace(",", ""))
                                if nums:
                                    review_count = int(nums[0])
                            except (ValueError, TypeError):
                                pass

                        has_website = bool(website)

                        self._log(f"[GMAPS]    ✅ Phone: {phone} | Web: {'Yes' if has_website else 'No'} | Cat: {category}")

                        prospects.append({
                            "name": name,
                            "category": category or "Local Business",
                            "address": address,
                            "phone": phone,
                            "email": email,
                            "website": website,
                            "has_website": has_website,
                            "rating": rating,
                            "review_count": review_count,
                            "maps_url": maps_url,
                            "source": "Google Maps",
                            "source_keyword": keywords,
                        })

                        # --- Step 4: Go back to results list ---
                        back_btn = await page.query_selector("button[aria-label='Back'], button[jsaction*='back']")
                        if back_btn:
                            await back_btn.click()
                        else:
                            await page.go_back()
                        await asyncio.sleep(random.uniform(1.5, 2.5))

                        # Wait for the feed to reappear
                        try:
                            await page.wait_for_selector("div[role='feed'], div.Nv2PK", timeout=5000)
                        except Exception:
                            await asyncio.sleep(2)

                    except Exception as e:
                        self._log(f"[GMAPS]    ⚠️ Error inspecting listing: {str(e)[:80]}")
                        # Try to recover — go back
                        try:
                            back_btn = await page.query_selector("button[aria-label='Back']")
                            if back_btn:
                                await back_btn.click()
                            else:
                                await page.go_back()
                            await asyncio.sleep(2)
                        except Exception:
                            pass
                        continue

            except Exception as e:
                self._log(f"[GMAPS] ❌ Fatal error: {str(e)}")

            await browser.close()

        # Sort: businesses WITHOUT websites first (hotter prospects)
        prospects.sort(key=lambda x: x.get("has_website", True))
        hot = sum(1 for p in prospects if not p.get("has_website", True))
        self._log(f"[GMAPS] 🏁 {len(prospects)} prospects with phone (skipped {skipped_no_phone} without phone). {hot} without website (hot!)")
        return prospects


# Testing lokal
if __name__ == "__main__":
    scraper = JobScraper(headless=False)
    results = asyncio.run(scraper.scrape_all("Pondok Pesantren", "Jawa Timur", ["gmaps"], limit=5))
    for r in results:
        print(f"  [{r.get('source', 'GMaps')}] {r.get('name', r.get('title', '?'))} | Phone: {r.get('phone', '-')}")

