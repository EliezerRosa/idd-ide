"""
Fixa o comentário de capítulos no topo do vídeo IDD Ep.1.
Copia os arquivos essenciais do perfil Chrome para um dir temporário
e lança Playwright com esse perfil — sem precisar fechar Chrome.
"""
import shutil, time, tempfile, os
from pathlib import Path
from playwright.sync_api import sync_playwright

VIDEO_ID   = "lNEr7vb0Gyo"
STUDIO_URL = f"https://studio.youtube.com/video/{VIDEO_ID}/comments"

CHROME_PROFILE = Path(r"C:\Users\Eliez\AppData\Local\Google\Chrome\User Data\Default")
# Arquivos necessários para autenticação e cookies
COPY_FILES = ["Cookies", "Login Data", "Local State"]


def copy_profile(tmp_dir: Path):
    """Copia apenas os arquivos de autenticação do perfil Chrome."""
    default_dir = tmp_dir / "Default"
    default_dir.mkdir(parents=True, exist_ok=True)
    # Local State fica um nível acima de Default
    local_state_src = CHROME_PROFILE.parent / "Local State"
    shutil.copy2(local_state_src, tmp_dir / "Local State")
    for fname in COPY_FILES[:-1]:  # Cookies + Login Data vão dentro de Default
        src = CHROME_PROFILE / fname
        if src.exists():
            shutil.copy2(src, default_dir / fname)
    print(f"  Perfil copiado para {tmp_dir}")


def find_and_pin(page) -> bool:
    print("Buscando comentário…")
    for attempt in range(18):
        candidates = page.get_by_text("📌 ÍNDICE DE CAPÍTULOS", exact=False)
        if candidates.count() > 0:
            candidates.first.scroll_into_view_if_needed()
            print(f"  Encontrado na tentativa {attempt+1}.")
            return True
        page.mouse.wheel(0, 900)
        time.sleep(1.5)
    return False


def main():
    tmp_dir = Path(tempfile.mkdtemp(prefix="chrome_yt_"))
    try:
        print("Copiando perfil Chrome…")
        copy_profile(tmp_dir)

        with sync_playwright() as p:
            ctx = p.chromium.launch_persistent_context(
                str(tmp_dir),
                channel="chrome",          # usa o Chrome instalado
                headless=False,
                args=["--profile-directory=Default", "--no-first-run"],
            )
            page = ctx.new_page()
            print(f"Navegando para {STUDIO_URL}")
            page.goto(STUDIO_URL, wait_until="domcontentloaded", timeout=40_000)
            time.sleep(4)

            title = page.title()
            print(f"  Página: {title}")

            if "studio.youtube" not in page.url:
                print("❌ Redirecionado para login — faça login no browser aberto e pressione Enter.")
                input()
                page.goto(STUDIO_URL, wait_until="domcontentloaded", timeout=40_000)
                time.sleep(4)

            found = find_and_pin(page)
            if not found:
                print("❌ Comentário não encontrado. Feche manualmente após verificar.")
                input("Enter para fechar…")
                ctx.close()
                return

            comment_el = page.get_by_text("📌 ÍNDICE DE CAPÍTULOS", exact=False).first
            comment_el.hover()
            time.sleep(0.8)

            # Botão ⋮ dentro do componente que contém o comentário
            options = page.locator("ytcp-comment-item").filter(
                has=page.get_by_text("📌 ÍNDICE DE CAPÍTULOS", exact=False)
            ).locator("#options-button")
            if options.count() == 0:
                options = page.locator("#options-button").first

            print("Clicando em ⋮…")
            options.click()
            time.sleep(1)

            pin_item = page.get_by_text("Fixar comentário", exact=False).or_(
                page.get_by_text("Pin comment", exact=False)
            ).first
            print("Clicando em 'Fixar comentário'…")
            pin_item.click()
            time.sleep(1.5)

            for label in ["Fixar", "Pin", "Confirmar", "Confirm", "OK"]:
                try:
                    btn = page.get_by_role("button", name=label).first
                    if btn.is_visible(timeout=2000):
                        btn.click()
                        print(f"  Confirmado com '{label}'.")
                        break
                except Exception:
                    pass

            time.sleep(2)
            print("✅ Comentário fixado com sucesso!")
            ctx.close()
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()


VIDEO_ID   = "lNEr7vb0Gyo"
COMMENT_ID = "UgyYJrDitaPFYE7tBLB4AaABAg"  # "📌 ÍNDICE DE CAPÍTULOS"
STUDIO_URL = f"https://studio.youtube.com/video/{VIDEO_ID}/comments"


def get_chrome_cookies():
    """Extrai cookies do YouTube/.google.com do Chrome atual."""
    jar = browser_cookie3.chrome(domain_name=".youtube.com")
    jar2 = browser_cookie3.chrome(domain_name=".google.com")
    cookies = []
    for c in list(jar) + list(jar2):
        cookies.append({
            "name":    c.name,
            "value":   c.value,
            "domain":  c.domain,
            "path":    c.path,
            "secure":  bool(c.secure),
            "httpOnly": False,
            "sameSite": "None",
        })
    print(f"  {len(cookies)} cookies extraídos do Chrome.")
    return cookies


def find_and_pin(page):
    """Encontra o comentário e pina. Retorna True se sucesso."""
    print("Buscando comentário…")
    for attempt in range(15):
        # Tenta localizar pelo texto
        candidates = page.get_by_text("📌 ÍNDICE DE CAPÍTULOS", exact=False)
        if candidates.count() > 0:
            candidates.first.scroll_into_view_if_needed()
            print(f"  Encontrado na tentativa {attempt+1}.")
            return True
        page.mouse.wheel(0, 900)
        time.sleep(1.5)
    return False


def main():
    print("Extraindo cookies do Chrome…")
    cookies = get_chrome_cookies()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        ctx = browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        ctx.add_cookies(cookies)

        page = ctx.new_page()
        print(f"Navegando para {STUDIO_URL}")
        page.goto(STUDIO_URL, wait_until="domcontentloaded", timeout=40_000)
        time.sleep(4)

        # Verifica se está logado (YouTube Studio mostra o título do canal)
        title = page.title()
        print(f"  Título da página: {title}")
        if "studio.youtube" not in page.url:
            print("❌ Redirecionado para login — cookies podem ter expirado.")
            print("   Faça login manualmente no browser que abrirá e pressione Enter aqui.")
            input()
            page.goto(STUDIO_URL, wait_until="domcontentloaded", timeout=40_000)
            time.sleep(4)

        found = find_and_pin(page)
        if not found:
            print("❌ Comentário não encontrado. Verifique manualmente.")
            input("Pressione Enter para fechar…")
            ctx.close(); browser.close()
            return

        # Hover no item do comentário para aparecer o menu ⋮
        comment_el = page.get_by_text("📌 ÍNDICE DE CAPÍTULOS", exact=False).first
        comment_el.hover()
        time.sleep(0.8)

        # Botão de opções (⋮) – YouTube Studio usa ytcp-comment-item
        # O botão fica em #options-button dentro do componente pai
        options = page.locator("ytcp-comment-item").filter(
            has=page.get_by_text("📌 ÍNDICE DE CAPÍTULOS", exact=False)
        ).locator("#options-button")

        if options.count() == 0:
            # Fallback: qualquer #options-button visível próximo
            options = page.locator("#options-button").first

        print("Clicando no menu ⋮…")
        options.click()
        time.sleep(1)

        # Procura item "Fixar" no menu dropdown
        pin_item = page.get_by_text("Fixar comentário", exact=False).or_(
            page.get_by_text("Pin comment", exact=False)
        ).first
        print("Clicando em 'Fixar comentário'…")
        pin_item.click()
        time.sleep(1.5)

        # Confirma diálogo se aparecer
        for label in ["Fixar", "Pin", "Confirmar", "Confirm"]:
            try:
                btn = page.get_by_role("button", name=label).first
                if btn.is_visible(timeout=2000):
                    btn.click()
                    print(f"  Confirmado com botão '{label}'.")
                    break
            except Exception:
                pass

        time.sleep(2)
        print("✅ Pronto! Comentário fixado.")
        ctx.close()
        browser.close()


if __name__ == "__main__":
    main()

