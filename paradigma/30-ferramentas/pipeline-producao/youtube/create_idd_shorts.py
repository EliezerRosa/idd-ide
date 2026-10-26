import os, subprocess
from pathlib import Path

OUT_DIR = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt\shorts_idd")
OUT_DIR.mkdir(parents=True, exist_ok=True)

V1 = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt\Refrigeracao_IDD_Video_1_Narrador.mp4")
V2 = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt\Refrigeracao_IDD_Video_2_Remasterizado.mp4")
V3 = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt\Refrigeracao_IDD_Video_3_Remasterizado.mp4")
V4 = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt\Refrigeracao_IDD_Video_4_Remasterizado.mp4")
VM = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt\Melissa_IDD_Como_uma_leiga_criou_um_CRM.mp4")

SHORTS_CONFIG = [
    {
        "id": "short_01_softwares_falham",
        "src": V1,
        "title": "Por que softwares de manutenção falham na Refrigeração? #Shorts #IDD",
        "start": 3960.5,
        "duration": 34.0,
        "badge": "PARADIGMA IDD · REFRIGERAÇÃO",
        "hook": "POR QUE SOFTWARES FALHAM?"
    },
    {
        "id": "short_02_regras_inviolaveis",
        "src": V1,
        "title": "A Regra Inviolável do PMOC e Termodinâmica #Shorts #Engenharia",
        "start": 4022.0,
        "duration": 31.5,
        "badge": "COMPLIANCE & TERMODINÂMICA",
        "hook": "REGRAS INVIOLÁVEIS DO PMOC"
    },
    {
        "id": "short_03_artefato_mais_alta_ordem",
        "src": V1,
        "title": "A Intenção Humana é o Artefato de Mais Alta Ordem #Shorts #IDD",
        "start": 62.0,
        "duration": 32.0,
        "badge": "PARADIGMA IDD · CONCEITO",
        "hook": "A INTENÇÃO VEM PRIMEIRO"
    },
    {
        "id": "short_04_aumentar_nao_automatizar",
        "src": V1,
        "title": "Aumentar, NÃO Automatizar: O Papel Humano com IA #Shorts #IA",
        "start": 162.0,
        "duration": 33.5,
        "badge": "FILOSOFIA IDD · IA AUTÔNOMA",
        "hook": "O HUMANO NO CENTRO"
    },
    {
        "id": "short_05_melissa_leiga_criou_crm",
        "src": VM,
        "title": "Como uma Leiga Criou um CRM Completo com IA #Shorts #IDD",
        "start": 0.0,
        "duration": 26.5,
        "badge": "CASO REAL · PARADIGMA IDD",
        "hook": "LEIGA CRIOU UM CRM COM IA"
    },
    {
        "id": "short_06_regime_pre_intencao",
        "src": V2,
        "title": "O Regime de Pré-Intenção: Como Guiar a IA Sem Código #Shorts #IDD",
        "start": 40.0,
        "duration": 32.0,
        "badge": "PARADIGMA IDD · EPISÓDIO 2",
        "hook": "REGIME DE PRÉ-INTENÇÃO"
    },
    {
        "id": "short_07_idd_na_pratica_do_zero",
        "src": V3,
        "title": "Construindo App de Refrigeração do Zero com IDD #Shorts #PMOC",
        "start": 54.0,
        "duration": 34.0,
        "badge": "PARADIGMA IDD · EPISÓDIO 3",
        "hook": "DO ZERO COM PARADIGMA IDD"
    },
    {
        "id": "short_08_ciclo_fechado_validacao",
        "src": V4,
        "title": "Validação pela Experiência: Fechando o Ciclo do IDD #Shorts #Tech",
        "start": 12.0,
        "duration": 31.0,
        "badge": "PARADIGMA IDD · EPISÓDIO 4",
        "hook": "VALIDAR PELA EXPERIÊNCIA"
    }
]

def render_short(cfg):
    out_mp4 = OUT_DIR / f"{cfg['id']}.mp4"
    if out_mp4.exists() and out_mp4.stat().st_size > 100000:
        print(f"[PULANDO] {cfg['id']} já existe ({out_mp4.stat().st_size / (1024*1024):.1f} MB)")
        return out_mp4
    print(f"\n--- Gerando: {cfg['id']} ---")
    print(f"Corte: {cfg['start']}s ({cfg['duration']}s)")

    # Filtro FFmpeg ultra-rápido para Shorts 9:16 (1080x1920):
    # Fundo desfocado via downscale/upscale (60+ fps) + Vídeo nítido centralizado + Box estilizado
    font_bold = "C\\:/Windows/Fonts/arialbd.ttf"
    font_regular = "C\\:/Windows/Fonts/arial.ttf"
    vf = (
        "[0:v]split=2[bg_in][fg_in];"
        "[bg_in]scale=108:192:force_original_aspect_ratio=increase,crop=108:192,boxblur=2:1,scale=1080:1920:flags=bicubic[bg];"
        "[fg_in]scale=1080:-1[fg];"
        "[bg][fg]overlay=(W-w)/2:(H-h)/2[merged];"
        f"[merged]drawbox=y=160:color=black@0.70:width=iw:height=180:t=fill,"
        f"drawtext=fontfile='{font_bold}':text='{cfg['badge']}':fontcolor=0x38bdf8:fontsize=28:x=(w-text_w)/2:y=185,"
        f"drawtext=fontfile='{font_bold}':text='{cfg['hook']}':fontcolor=white:fontsize=46:x=(w-text_w)/2:y=235[v]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(cfg["start"]),
        "-t", str(cfg["duration"]),
        "-i", str(cfg.get("src", V1)),
        "-filter_complex", vf,
        "-map", "[v]",
        "-map", "0:a:0",
        "-c:v", "libx264",
        "-preset", "faster",
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-filter:a", "loudnorm=I=-14:LRA=7:TP=-1.5",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "48000",
        "-movflags", "+faststart",
        str(out_mp4)
    ]

    subprocess.run(cmd, check=True)
    print(f"[OK] Short gerado com sucesso: {out_mp4.name} ({out_mp4.stat().st_size / (1024*1024):.1f} MB)")
    return out_mp4

def main():
    print("==================================================")
    print("GERANDO SHORTS PROGRAMÁTICOS (1080x1920 - 9:16)")
    print("==================================================")
    for c in SHORTS_CONFIG:
        render_short(c)
    print("\nTodos os 4 Shorts de refrigeração IDD foram criados com sucesso!")

if __name__ == "__main__":
    main()
