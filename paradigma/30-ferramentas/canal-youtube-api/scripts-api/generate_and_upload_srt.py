"""
generate_and_upload_srt.py
Gera arquivo SRT do vídeo IDD Ep.1 a partir do script.json + WAVs,
depois faz upload como legenda para o YouTube via API.
"""

import json
import os
import struct
import wave
from pathlib import Path
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# ── Config ────────────────────────────────────────────────────────────────────
_SCRIPT_DIR      = Path(__file__).resolve().parent
_SEGREDOS_DIR    = _SCRIPT_DIR / ".." / "segredos"
_EP1_OUTPUT      = _SCRIPT_DIR / ".." / ".." / "04 - Acervo de Episódios" / "Ep01 - O que é IDD" / "idd_p1_output"
TOKEN_FILE       = str(_SEGREDOS_DIR / "token_youtube.json")
TOKEN_FILE_CAP   = str(_SEGREDOS_DIR / "token_youtube_captions.json")
SCOPES           = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.force-ssl",
]
CLIENT_SECRETS   = str(_SEGREDOS_DIR / "client_secrets.json")
VIDEO_ID    = "lNEr7vb0Gyo"
SCRIPT_JSON = str(_EP1_OUTPUT / "script.json")
AUDIO_DIR   = _EP1_OUTPUT / "audio"
SRT_PT_OUT  = str(_EP1_OUTPUT / "captions_pt.srt")
SRT_EN_OUT  = str(_EP1_OUTPUT / "captions_en.srt")

# Gap entre falas (ms) — mesmo valor usado na montagem do vídeo
GAP_MS = 300


# ── Helpers ───────────────────────────────────────────────────────────────────

def wav_duration_ms(path: Path) -> int:
    """Retorna duração do WAV em milissegundos (sem dependências externas)."""
    try:
        with wave.open(str(path), "rb") as w:
            frames = w.getnframes()
            rate   = w.getframerate()
            return int(frames / rate * 1000)
    except Exception:
        return 0


def ms_to_srt(ms: int) -> str:
    """Converte milissegundos para formato SRT HH:MM:SS,mmm."""
    h  = ms // 3_600_000; ms -= h * 3_600_000
    m  = ms //    60_000; ms -= m *    60_000
    s  = ms //     1_000; ms -= s *     1_000
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def build_srt(entries: list[dict], lang: str) -> str:
    """Gera string SRT completa. lang = 'pt' ou 'en'."""
    lines = []
    for i, e in enumerate(entries, start=1):
        start = ms_to_srt(e["start_ms"])
        end   = ms_to_srt(e["end_ms"])
        text  = e[lang].strip()
        lines.append(f"{i}\n{start} --> {end}\n{text}\n")
    return "\n".join(lines)


# ── Auth ──────────────────────────────────────────────────────────────────────

def get_credentials():
    """Retorna credenciais com escopos youtube + youtube.force-ssl.
    Usa token_youtube_captions.json para não sobrescrever o token principal.
    Se ausente/inválido, abre fluxo OAuth interativo.
    """
    from google_auth_oauthlib.flow import InstalledAppFlow

    creds = None
    if os.path.exists(TOKEN_FILE_CAP):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE_CAP, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow  = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE_CAP, "w") as f:
            f.write(creds.to_json())
    return creds


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    # 1) Ler script
    with open(SCRIPT_JSON, encoding="utf-8") as f:
        script = json.load(f)

    print(f"Script: {len(script)} linhas")

    # 2) Construir timeline — mesmo algoritmo de create_idd_shorts.py
    cursor_ms = 0
    entries = []
    for item in script:
        idx  = item["id"]  # 1-based
        wav  = AUDIO_DIR / f"line_{idx:04d}.wav"
        dur  = wav_duration_ms(wav)
        if dur == 0:
            print(f"  ⚠ WAV ausente ou corrompido: {wav.name} — pulando")
            continue
        start_ms = cursor_ms
        end_ms   = cursor_ms + dur
        entries.append({
            "start_ms": start_ms,
            "end_ms":   end_ms,
            "pt":       item["pt"],
            "en":       item["en"],
            "speaker":  item["speaker"],
        })
        cursor_ms = end_ms + GAP_MS

    total_s = cursor_ms // 1000
    print(f"Timeline: {total_s // 60}:{total_s % 60:02d} total ({len(entries)} entradas)")

    # 3) Gerar SRT PT-BR
    srt_pt = build_srt(entries, "pt")
    with open(SRT_PT_OUT, "w", encoding="utf-8") as f:
        f.write(srt_pt)
    print(f"✅ SRT PT-BR gerado: {SRT_PT_OUT}")

    # 4) Gerar SRT EN
    srt_en = build_srt(entries, "en")
    with open(SRT_EN_OUT, "w", encoding="utf-8") as f:
        f.write(srt_en)
    print(f"✅ SRT EN gerado:    {SRT_EN_OUT}")

    # 5) Upload para YouTube
    print("\n── Fazendo upload das legendas ──────────────────────")
    creds   = get_credentials()
    youtube = build("youtube", "v3", credentials=creds)

    # Deletar legendas existentes (evita duplicatas)
    existing = youtube.captions().list(part="snippet", videoId=VIDEO_ID).execute()
    for cap in existing.get("items", []):
        lang_code = cap["snippet"]["language"]
        cap_id    = cap["id"]
        youtube.captions().delete(id=cap_id).execute()
        print(f"  🗑 Legenda existente removida: {lang_code} ({cap_id})")

    def upload_caption(srt_path: str, lang: str, name: str):
        body = {
            "snippet": {
                "videoId":  VIDEO_ID,
                "language": lang,
                "name":     name,
                "isDraft":  False,
            }
        }
        media = MediaFileUpload(srt_path, mimetype="application/octet-stream", resumable=False)
        resp  = youtube.captions().insert(part="snippet", body=body, media_body=media).execute()
        cap_id = resp["id"]
        print(f"  ✅ Legenda {lang} ({name}) publicada — ID: {cap_id}")

    upload_caption(SRT_PT_OUT, "pt-BR", "Português (Brasil)")
    upload_caption(SRT_EN_OUT, "en",    "English")

    print("\nConcluído!")


if __name__ == "__main__":
    main()
