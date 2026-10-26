"""Captura todos screenshots dos 3 tours (e03/e04 pulados)."""
import asyncio
import os
from playwright.async_api import async_playwright

URL = "https://rvm-designacoes-antigravity.vercel.app/?portal=publisher-form&token=4f27a2f40d244dc478574d22e2148bf227f2"
OUT_DIR = r"c:\Antigravity - RVM Designações\tour_screens"
os.makedirs(OUT_DIR, exist_ok=True)
VIEW = {"width": 1280, "height": 720}


async def shot(page, name):
    await page.wait_for_timeout(800)
    await page.screenshot(path=os.path.join(OUT_DIR, f"{name}.png"), full_page=False)
    print(f"  ✓ {name}.png")


async def advance(page, n=1):
    for _ in range(n):
        await page.keyboard.press("ArrowRight")
        await page.wait_for_timeout(400)


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport=VIEW, locale="pt-BR")
        page = await ctx.new_page()
        await page.add_init_script("""
            window.speechSynthesis = { speak(){}, cancel(){}, pause(){}, resume(){},
                paused:false, speaking:false, pending:false, getVoices(){return [];},
                addEventListener(){}, removeEventListener(){} };
        """)
        await page.goto(URL.split('?')[0], wait_until="domcontentloaded")
        await page.evaluate("() => { try { localStorage.clear(); sessionStorage.clear(); } catch(e){} }")
        await page.goto(URL, wait_until="networkidle")
        await page.wait_for_timeout(1500)

        # Tour 1
        print("Tour 1")
        await page.keyboard.press("Escape"); await page.wait_for_timeout(300)
        await page.locator('[data-tour="btn-tutorial"]').first.click()
        await page.wait_for_timeout(1000)
        for i in range(1, 14):
            await shot(page, f"p{i:02d}")
            if i < 13: await advance(page)
        await page.keyboard.press("Escape"); await page.wait_for_timeout(600)

        # Tour 2 — só e01,e02,e05,e06
        print("Tour 2")
        await page.locator('[data-tour="btn-events"]').first.click()
        await page.wait_for_timeout(1200)
        await page.keyboard.press("Escape"); await page.wait_for_timeout(400)
        # botão de help dentro do modal — escopo pelo dialog
        modal = page.locator('div[role="dialog"], [data-tour="ev-title"]').first
        # Clica botão tutorial dentro do modal por título
        await page.locator('button[title="Ver tutorial guiado deste modal"]').first.click()
        await page.wait_for_timeout(900)
        await shot(page, "e01")
        await advance(page); await shot(page, "e02")
        await advance(page, 3)  # pula 3 e 4, vai para 5
        await shot(page, "e05")
        await advance(page); await shot(page, "e06")
        await page.keyboard.press("Escape"); await page.wait_for_timeout(600)

        # Tour 3
        print("Tour 3")
        for label in ["Criar Novo Evento", "Novo Evento", "+ Novo"]:
            try:
                btn = page.get_by_role("button", name=label, exact=False)
                if await btn.count() > 0:
                    await btn.first.click()
                    print(f"  Clicou: {label}")
                    break
            except Exception: pass
        await page.wait_for_timeout(1500)
        for i in range(1, 13):
            await shot(page, f"f{i:02d}")
            if i < 12: await advance(page)

        await browser.close()
        print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
