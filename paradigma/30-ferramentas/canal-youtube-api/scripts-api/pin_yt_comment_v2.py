"""
Fixa o comentário de capítulos no topo do vídeo IDD Ep.1.

Estratégia: perfil Playwright dedicado salvo em .pw_profile/.
- 1ª execução: abre browser visível → faça login no Google → pressione Enter no terminal.
- Execuções seguintes: sessão já salva, sem login.
"""
import sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

VIDEO_ID    = "lNEr7vb0Gyo"
STUDIO_URL  = f"https://studio.youtube.com/video/{VIDEO_ID}/comments"
PROFILE_DIR = str(Path(__file__).parent / ".pw_profile")
YT_STUDIO   = "studio.youtube.com"


def flush_input():
    """Descarta qualquer Enter que ficou no buffer do stdin."""
    import msvcrt
    while msvcrt.kbhit():
        msvcrt.getwch()


def goto_and_wait(page, url: str, settle: float = 6.0) -> str:
    """Navega e aguarda networkidle + settle para o redirect JS completar."""
    try:
        page.goto(url, wait_until="networkidle", timeout=45_000)
    except Exception:
        pass  # timeout de networkidle é normal em SPAs pesados
    time.sleep(settle)
    return page.url


SEARCH_JS = """
() => {
    // Percorre shadow DOM recursivamente procurando o texto
    function walk(root, text) {
        if (!root) return null;
        const all = root.querySelectorAll('*');
        for (const el of all) {
            const t = el.textContent || '';
            if (t.includes(text) && el.children.length === 0) return el;
            if (el.shadowRoot) {
                const f = walk(el.shadowRoot, text);
                if (f) return f;
            }
        }
        return null;
    }
    const el = walk(document, 'NDICE DE CAP');
    return el ? {found: true, tag: el.tagName, text: el.textContent.slice(0,80)} : {found: false};
}
"""

CLICK_OPTIONS_JS = """
() => {
    // Encontra ytcp-comment-item que contém o comentário e clica em #options-button
    function walk(root) {
        if (!root) return null;
        const items = root.querySelectorAll('ytcp-comment-item');
        for (const item of items) {
            if ((item.textContent || '').includes('NDICE DE CAP')) {
                const btn = item.querySelector('#options-button') ||
                            (item.shadowRoot && item.shadowRoot.querySelector('#options-button'));
                if (btn) { btn.click(); return true; }
            }
            if (item.shadowRoot) {
                const r = walk(item.shadowRoot);
                if (r) return r;
            }
        }
        // Busca mais ampla
        for (const el of root.querySelectorAll('*')) {
            if (el.shadowRoot) {
                const r = walk(el.shadowRoot);
                if (r) return r;
            }
        }
        return null;
    }
    return walk(document);
}
"""

CLICK_PIN_JS = """
() => {
    // Clica no item de menu "Fixar" ou "Pin"
    function walk(root) {
        if (!root) return null;
        const all = root.querySelectorAll('*');
        for (const el of all) {
            const t = (el.textContent || '').trim().toLowerCase();
            if ((t === 'fixar comentário' || t === 'fixar' || t === 'pin comment' || t === 'pin')
                && el.offsetParent !== null) {
                el.click();
                return true;
            }
            if (el.shadowRoot) {
                const r = walk(el.shadowRoot);
                if (r) return r;
            }
        }
        return null;
    }
    return walk(document);
}
"""


def find_comment(page) -> bool:
    print("Buscando comentario via shadow DOM JS...")
    for attempt in range(20):
        result = page.evaluate(SEARCH_JS)
        if result.get("found"):
            print(f"  Encontrado na tentativa {attempt+1}: {result.get('tag')} | {result.get('text')}")
            return True
        page.mouse.wheel(0, 800)
        time.sleep(1.5)
    # Debug: salva screenshot
    page.screenshot(path="yt_debug.png")
    print("  Screenshot salvo: yt_debug.png")
    return False


def pin_comment(page):
    print("  Clicando em opcoes (shadow DOM JS)...")
    page.evaluate(CLICK_OPTIONS_JS)
    time.sleep(1.5)

    print("  Clicando em 'Fixar' (shadow DOM JS)...")
    page.evaluate(CLICK_PIN_JS)
    time.sleep(1.5)

    # Confirma diálogo se aparecer (pode estar no DOM normal)
    for label in ["Fixar", "Pin", "Confirmar", "Confirm", "OK"]:
        try:
            btn = page.get_by_role("button", name=label).first
            if btn.is_visible(timeout=2_000):
                btn.click()
                print(f"  Confirmado com '{label}'.")
                break
        except Exception:
            pass

    time.sleep(2)
    page.screenshot(path="yt_after_pin.png")
    print("SUCESSO! Comentario fixado. Screenshot: yt_after_pin.png")


def main():
    Path(PROFILE_DIR).mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            PROFILE_DIR,
            channel="chrome",   # usa o Chrome instalado (trata storage access melhor)
            headless=False,
            viewport={"width": 1280, "height": 900},
            args=[
                "--no-first-run",
                "--disable-blink-features=AutomationControlled",
                # Libera cookies/storage de iframes cross-origin (comments do YT Studio)
                "--disable-features=ThirdPartyStoragePartitioning,StorageAccessAPI",
                "--disable-site-isolation-trials",
                "--disable-web-security",
            ],
        )
        page = ctx.new_page()

        print("Abrindo YouTube Studio (aguardando redirect completar)...")
        current_url = goto_and_wait(page, STUDIO_URL, settle=6)
        print(f"  URL final: {current_url[:90]}")

        if YT_STUDIO not in current_url:
            print("\n==> Faca login no Google na janela aberta.")
            print("==> Navegue ate YouTube Studio -> Comentarios.")
            print("==> Quando estiver na pagina certa, volte aqui e pressione ENTER.")
            flush_input()
            input("==> ENTER para continuar: ")
            current_url = goto_and_wait(page, STUDIO_URL, settle=6)
            print(f"  URL apos login: {current_url[:90]}")

        if YT_STUDIO not in current_url:
            print("Ainda nao esta no Studio. Verifique e tente novamente.")
            flush_input()
            input("ENTER para fechar: ")
            ctx.close()
            return

        # Fecha tooltip de boas-vindas se aparecer (tenta Escape + botão Close)
        try:
            page.keyboard.press("Escape")
            time.sleep(0.5)
        except Exception:
            pass
        try:
            for label in ["Close", "Fechar", "Got it", "Entendi"]:
                try:
                    btn = page.get_by_role("button", name=label).first
                    if btn.is_visible(timeout=2_000):
                        btn.click()
                        print(f"  Tooltip fechado via '{label}'.")
                        time.sleep(1)
                        break
                except Exception:
                    pass
        except Exception:
            pass

        # Remove filtro "Response status: Unresponded" clicando no × do último chip
        # Estrutura: [0] Published, [1] Sort by, [2] Response status: Unresponded ×
        try:
            # Fecha qualquer dropdown aberto antes de interagir
            page.keyboard.press("Escape")
            time.sleep(0.5)

            chips = page.locator("ytcp-chip").all()
            print(f"  Chips encontrados: {len(chips)}")
            removed = False

            # Itera do fim para o início, procurando o chip com ×
            # (chips removíveis têm × e ficam por último)
            for chip in reversed(chips):
                txt = (chip.text_content(timeout=2_000) or "").lower()
                print(f"    chip texto: '{txt.strip()}'")
                if "unrespond" in txt or "response" in txt:
                    box = chip.bounding_box(timeout=2_000)
                    if box:
                        cx = box["x"] + box["width"] - 12
                        cy = box["y"] + box["height"] / 2
                        page.mouse.click(cx, cy)
                        print(f"  Clique no × do chip 'Unresponded' em ({cx:.0f}, {cy:.0f}).")
                        time.sleep(2)
                        removed = True
                        break

            if not removed and len(chips) >= 3:
                # Fallback: clica no último chip (index -1)
                box = chips[-1].bounding_box(timeout=2_000)
                if box:
                    cx = box["x"] + box["width"] - 12
                    cy = box["y"] + box["height"] / 2
                    page.mouse.click(cx, cy)
                    print(f"  Fallback: clique no último chip em ({cx:.0f}, {cy:.0f}).")
                    time.sleep(2)
                    removed = True

            if not removed:
                print("  Nenhum chip de filtro removível encontrado.")
        except Exception as e:
            print(f"  Erro ao remover chip: {e}")

        found = find_comment(page)
        flush_input()
        if not found:
            print("\nComentario nao encontrado. Tente manualmente no YouTube Studio.")
            input("ENTER para fechar: ")
        else:
            pin_comment(page)
            input("\nENTER para fechar o browser: ")

        ctx.close()


if __name__ == "__main__":
    main()

