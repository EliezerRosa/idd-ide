"""Script Mestre para encadear a conclusão do Vídeo 2 e processar Vídeos 3 e 4
100% Voz Antônio Neural (Edge-TTS)
- Sem lacunas mortas (cadência respiratória suave de 0.45s a 0.6s)
- Sincronização cirúrgica com exibição dos slides/telas
- Zero ruído analógico / microfone antigo
"""

import sys
import time
import subprocess
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

PROD = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt")
PYTHON = PROD / ".venv" / "Scripts" / "python.exe"
MASTER_SCRIPT = PROD / "pipeline_neural_master.py"

def wait_for_video(v_num, timeout_minutes=180):
    final_file = PROD / f"Refrigeracao_IDD_Video_{v_num}_100_Neural.mp4"
    print(f"\n[AGUARDANDO] Monitorando conclusão do Vídeo {v_num} ({final_file.name})...", flush=True)
    t0 = time.time()
    while True:
        if final_file.exists() and final_file.stat().st_size > 50 * 1024 * 1024:
            size_mb = final_file.stat().st_size / (1024 * 1024)
            print(f"[CONCLUÍDO] Vídeo {v_num} gerado com sucesso! Tamanho: {size_mb:.1f} MB", flush=True)
            return True
        
        elapsed_min = (time.time() - t0) / 60
        if elapsed_min > timeout_minutes:
            print(f"[ERRO] Timeout aguardando Vídeo {v_num} após {elapsed_min:.1f} minutos.", flush=True)
            return False
            
        time.sleep(10)

def run_video(v_num):
    print(f"\n==================================================", flush=True)
    print(f"DISPARANDO PIPELINE 100% NEURAL PARA VÍDEO {v_num}", flush=True)
    print(f"==================================================", flush=True)
    cmd = [str(PYTHON), "-u", str(MASTER_SCRIPT), str(v_num)]
    res = subprocess.run(cmd)
    if res.returncode != 0:
        print(f"[FALHA] Execução do Vídeo {v_num} falhou com código {res.returncode}.", flush=True)
        return False
    return True

def main():
    print("Iniciando Orquestrador dos Episódios 100% Antônio Neural...", flush=True)
    
    # 1. Espera Vídeo 2 terminar (já em execução)
    if not (PROD / "Refrigeracao_IDD_Video_2_100_Neural.mp4").exists():
        if not wait_for_video(2):
            sys.exit(1)
    else:
        print("[CACHE] Vídeo 2 100% Neural já concluído!", flush=True)

    # 2. Executa Vídeo 3
    if not (PROD / "Refrigeracao_IDD_Video_3_100_Neural.mp4").exists():
        ok = run_video(3)
        if not ok:
            sys.exit(1)
    else:
        print("[CACHE] Vídeo 3 100% Neural já concluído!", flush=True)

    # 3. Executa Vídeo 4
    if not (PROD / "Refrigeracao_IDD_Video_4_100_Neural.mp4").exists():
        ok = run_video(4)
        if not ok:
            sys.exit(1)
    else:
        print("[CACHE] Vídeo 4 100% Neural já concluído!", flush=True)

    print("\n==================================================", flush=True)
    print("TODOS OS VÍDEOS (2, 3 e 4) REMASTERIZADOS COM SUCESSO!", flush=True)
    print("100% Voz Antônio Neural | Zero Ruído Residual | Sincronismo Cirúrgico", flush=True)
    print("==================================================", flush=True)

if __name__ == "__main__":
    main()
