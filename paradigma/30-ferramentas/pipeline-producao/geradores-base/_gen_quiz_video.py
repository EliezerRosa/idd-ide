"""
Quiz IDD — Pipeline de Vídeo com Avatar Realístico
====================================================
Fluxo:
  1. Gemini TTS → gera WAVs de cada fala (narrador apresenta pergunta + resposta)
  2. fal.ai SadTalker → foto do Eliezer + WAV → MP4 lip-sync por segmento
  3. ffmpeg → monta vídeo final com telas de pergunta + avatar falante

Uso:
    python _gen_quiz_video.py --phase audio      # só gera WAVs
    python _gen_quiz_video.py --phase avatar     # só gera clips MP4 avatar
    python _gen_quiz_video.py --phase assemble   # só monta vídeo final
    python _gen_quiz_video.py                    # roda tudo
"""

import argparse
import json
import os
import sys
import time
import wave
import textwrap
from pathlib import Path

# ── env ──────────────────────────────────────────────────────────────────────
def load_env():
    env_file = Path(__file__).parent / '.env'
    if env_file.exists():
        for line in env_file.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, _, v = line.partition('=')
                os.environ[k.strip()] = v.strip().strip('"').strip("'")

load_env()

GEMINI_KEY = os.environ.get('GEMINI_API_KEY', '')
FAL_KEY    = os.environ.get('FAL_KEY', '')

QUIZ_DIR   = Path(__file__).parent / 'idd_quiz_video'
AUDIO_DIR  = QUIZ_DIR / 'audio'
AVATAR_DIR = QUIZ_DIR / 'avatar_clips'
FINAL_DIR  = QUIZ_DIR / 'final'
ELIEZER_PHOTO = Path(__file__).parent / 'eliezer_photo.jpg'  # Você coloca aqui

QUIZ_JSON  = Path(__file__).parent / 'idd_quiz_questions.json'

QUIZ_DIR.mkdir(exist_ok=True)
AUDIO_DIR.mkdir(exist_ok=True)
AVATAR_DIR.mkdir(exist_ok=True)
FINAL_DIR.mkdir(exist_ok=True)

# ── CARREGAR PERGUNTAS ───────────────────────────────────────────────────────
questions = json.loads(QUIZ_JSON.read_text(encoding='utf-8'))['questions']

# ── SCRIPTS DE FALA ─────────────────────────────────────────────────────────
def build_scripts():
    """Retorna lista de {slug, text, voice} para geração de áudio."""
    scripts = []
    
    # Boas-vindas
    scripts.append({
        'slug': '00_welcome',
        'voice': 'Charon',
        'text': (
            "Olá! Sou Eliezer Rosa, criador do Intent-Driven Development. "
            "Este quiz testa seus conhecimentos sobre os dois primeiros episódios da série IDD. "
            "São 10 perguntas — 5 do Episódio 1 e 5 do Episódio 2. "
            "Vou apresentar cada pergunta, dar um tempo para reflexão, e depois revelar a resposta correta com explicação. "
            "Vamos começar!"
        )
    })
    
    for q in questions:
        qid = q['id']
        ep  = q['episode']
        prefix = f"Pergunta {qid}, do Episódio {ep}. "
        
        # Narração da pergunta
        options_text = '. '.join([f"Opção {k}: {v}" for k, v in q['options'].items()])
        scripts.append({
            'slug': f'q{qid:02d}_pergunta',
            'voice': 'Charon',
            'text': prefix + q['question'] + '. ' + options_text
        })
        
        # Revelação da resposta correta
        scripts.append({
            'slug': f'q{qid:02d}_resposta',
            'voice': 'Charon',
            'text': (
                f"A resposta correta é a opção {q['correct']}. "
                f"{q['explanation_correct']}"
            )
        })
    
    # Transição Ep1 → Ep2
    scripts.append({
        'slug': '05_transicao_ep2',
        'voice': 'Charon',
        'text': (
            "Excelente! Você completou as cinco perguntas do Episódio 1. "
            "Agora entramos no Episódio 2, que aborda a distinção entre Comando Epistêmico e Comando Operacional. "
            "A analogia do voo Air France 447 é central aqui. Prepare-se para as próximas cinco perguntas!"
        )
    })
    
    # Encerramento
    scripts.append({
        'slug': '99_encerramento',
        'voice': 'Charon',
        'text': (
            "E assim encerramos o quiz dos dois primeiros episódios do IDD. "
            "Lembre-se: o IDD não é apenas uma metodologia técnica, é uma mudança de paradigma. "
            "A intenção é o artefato primário. Você retém o Comando Epistêmico — o quê e o porquê. "
            "A IA executa o Comando Operacional — o como. "
            "Nos vemos no próximo episódio. Obrigado!"
        )
    })
    
    return scripts

# ── FASE 1: GERAR ÁUDIOS VIA GEMINI TTS ─────────────────────────────────────
def phase_audio():
    from google import genai
    from google.genai import types as gtypes
    
    if not GEMINI_KEY:
        print("❌  GEMINI_API_KEY não encontrada no .env")
        sys.exit(1)
    
    client = genai.Client(api_key=GEMINI_KEY)
    scripts = build_scripts()
    
    print(f'\n═══ Fase 1: Gerando {len(scripts)} áudios via Gemini TTS ═══\n')
    
    # Tenta Flash primeiro, fallback para Pro
    tts_models = ['models/gemini-2.5-flash-preview-tts', 'models/gemini-2.5-pro-preview-tts']
    
    def raw_pcm_to_wav(raw: bytes, out_path: Path, sample_rate: int = 24000):
        with wave.open(str(out_path), 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)  # 16-bit
            wf.setframerate(sample_rate)
            wf.writeframes(raw)
    
    def tts_call(text, voice, model):
        resp = client.models.generate_content(
            model=model,
            contents=text,
            config=gtypes.GenerateContentConfig(
                response_modalities=['AUDIO'],
                speech_config=gtypes.SpeechConfig(
                    voice_config=gtypes.VoiceConfig(
                        prebuilt_voice_config=gtypes.PrebuiltVoiceConfig(voice_name=voice)
                    )
                )
            )
        )
        return resp.candidates[0].content.parts[0].inline_data.data
    
    for s in scripts:
        out_path = AUDIO_DIR / f"{s['slug']}.wav"
        if out_path.exists():
            print(f"  ⏭ {s['slug']}.wav já existe")
            continue
        
        print(f"  🎤 {s['slug']}...", end=' ', flush=True)
        
        last_err = None
        for model in tts_models:
            try:
                raw = tts_call(s['text'], s['voice'], model)
                raw_pcm_to_wav(raw, out_path)
                kb = out_path.stat().st_size // 1024
                print(f'✅ ({kb}KB, {model.split("/")[-1]})')
                time.sleep(1.5)  # respeitar rate limit
                last_err = None
                break
            except Exception as e:
                last_err = e
                if '429' in str(e) or 'EXHAUSTED' in str(e):
                    print(f'\n  ⚠️  Quota {model.split("/")[-1]} esgotada, tentando próximo...')
                    continue
                else:
                    print(f'\n  ❌ Erro inesperado: {e}')
                    raise
        
        if last_err:
            print(f'\n  ❌ Todos os modelos TTS falharam: {last_err}')
            print('  ℹ️  Tente rodar novamente em ~24h quando a quota resetar.')
            sys.exit(1)
    
    print('\n✅ Todos os áudios gerados!')

# ── FASE 2: GERAR CLIPS DE AVATAR VIA FAL.AI SADTALKER ─────────────────────
def phase_avatar():
    if not FAL_KEY:
        print("❌  FAL_KEY não encontrada no .env")
        print("   Obtenha em: https://fal.ai/dashboard/keys")
        print("   Adicione ao .env: FAL_KEY=fal-xxxxxxxx")
        sys.exit(1)
    
    os.environ['FAL_KEY'] = FAL_KEY  # set BEFORE import so fal_client reads the correct key
    import fal_client
    
    if not ELIEZER_PHOTO.exists():
        print(f"❌  Foto não encontrada: {ELIEZER_PHOTO}")
        sys.exit(1)
    
    scripts = build_scripts()
    wavs = [s['slug'] for s in scripts]
    
    print(f'\n═══ Fase 2: Gerando clips de avatar via fal.ai SadTalker ═══\n')
    
    # Upload da foto uma vez
    photo_url_file = QUIZ_DIR / 'eliezer_photo_url.txt'
    if photo_url_file.exists():
        photo_url = photo_url_file.read_text().strip()
        print(f'  📸 Foto já enviada: {photo_url[:60]}...')
    else:
        print('  📤 Enviando foto para fal.ai...', end=' ', flush=True)
        with open(ELIEZER_PHOTO, 'rb') as f:
            photo_url = fal_client.upload(f.read(), content_type='image/jpeg')
        photo_url_file.write_text(photo_url)
        print(f'✅ {photo_url[:60]}...')
    
    for slug in wavs:
        wav_path  = AUDIO_DIR / f'{slug}.wav'
        out_path  = AVATAR_DIR / f'{slug}.mp4'
        
        if not wav_path.exists():
            print(f'  ⏭ {slug}: WAV não existe, pule')
            continue
        
        if out_path.exists():
            print(f'  ⏭ {slug}.mp4 já existe')
            continue
        
        print(f'  🎬 {slug}...', end=' ', flush=True)
        
        # Upload do áudio
        with open(wav_path, 'rb') as f:
            audio_url = fal_client.upload(f.read(), content_type='audio/wav')
        
        # Chamar SadTalker
        result = fal_client.run(
            'fal-ai/sadtalker',
            arguments={
                'source_image_url': photo_url,
                'driven_audio_url': audio_url,
                'preprocess': 'crop',       # crop foca no rosto
                'still_mode': True,         # menos movimento de cabeça = mais formal/profissional
                'use_enhancer': True,       # GFPGAN para upscale do rosto
                'size': 512,                # resolução máxima
                'expression_scale': 1.2,    # expressividade moderada
            }
        )
        
        video_url = result['video']['url']
        
        # Download do vídeo
        import urllib.request
        urllib.request.urlretrieve(video_url, out_path)
        
        kb = out_path.stat().st_size // 1024
        print(f'✅ ({kb}KB)')
    
    print('\n✅ Todos os clips gerados!')

# ── FASE 3: MONTAR VÍDEO FINAL COM FFMPEG ───────────────────────────────────
def phase_assemble():
    import subprocess
    import shutil
    
    # Verificar ffmpeg
    if not shutil.which('ffmpeg'):
        print("❌  ffmpeg não encontrado no PATH")
        print("   Instale via: winget install ffmpeg")
        sys.exit(1)
    
    print('\n═══ Fase 3: Montando vídeo final com ffmpeg ═══\n')
    
    # Checar clips disponíveis
    clips = sorted(AVATAR_DIR.glob('*.mp4'))
    if not clips:
        print('❌  Nenhum clip MP4 encontrado em', AVATAR_DIR)
        sys.exit(1)
    
    print(f'  📦 {len(clips)} clips encontrados')
    
    # Gerar telas de pergunta (PNG via Python + Pillow ou ffmpeg lavfi)
    question_screens = _gen_question_screens()
    
    # Construir lista de arquivos para concat
    parts = []
    scripts = build_scripts()
    slug_list = [s['slug'] for s in scripts]
    
    # Ordem: welcome → [q1 tela pergunta + avatar] → transição → [q6-10] → encerramento
    for slug in slug_list:
        clip = AVATAR_DIR / f'{slug}.mp4'
        if not clip.exists():
            print(f'  ⚠️  clip não encontrado: {slug}.mp4, usando só áudio...')
            # Fallback: cria clip estático com a foto
            _make_still_clip(slug, clip)
        
        # Inserir tela de pergunta antes do avatar falando a pergunta
        if '_pergunta' in slug:
            q_num = int(slug[1:3])
            screen_mp4 = question_screens.get(q_num)
            if screen_mp4:
                parts.append(screen_mp4)
        
        parts.append(clip)
    
    # Concat list
    concat_file = QUIZ_DIR / 'concat_list.txt'
    with open(concat_file, 'w', encoding='utf-8') as f:
        for p in parts:
            f.write(f"file '{str(p).replace(chr(39), chr(39)+chr(92)+chr(39)+chr(39))}'\n")
    
    output_mp4 = FINAL_DIR / 'quiz_idd_avatar.mp4'
    
    cmd = [
        'ffmpeg', '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', str(concat_file),
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-pix_fmt', 'yuv420p',
        str(output_mp4)
    ]
    
    print(f'  🔧 Concatenando {len(parts)} segmentos...')
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print('❌ ffmpeg falhou:')
        print(result.stderr[-2000:])
        sys.exit(1)
    
    mb = output_mp4.stat().st_size / (1024*1024)
    print(f'\n✅ Vídeo final: {output_mp4}')
    print(f'   Tamanho: {mb:.1f} MB')
    
    # Limpar arquivo temporário
    concat_file.unlink(missing_ok=True)


def _gen_question_screens():
    """Gera telas PNG via Pillow e converte para MP4 com ffmpeg."""
    import subprocess
    from PIL import Image, ImageDraw, ImageFont

    # Fontes Windows (fallback para DejaVu se não achar Arial)
    def _font(path, size):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            return ImageFont.load_default()

    FONT_REG  = r'C:\Windows\Fonts\arial.ttf'
    FONT_BOLD = r'C:\Windows\Fonts\arialbd.ttf'

    screens = {}

    for q in questions:
        qid = q['id']
        screen_mp4 = QUIZ_DIR / f'screen_q{qid:02d}.mp4'
        screen_png = QUIZ_DIR / f'screen_q{qid:02d}.png'

        if screen_mp4.exists():
            screens[qid] = screen_mp4
            continue

        # ── Desenhar PNG ─────────────────────────────────────────
        W, H = 1280, 720
        BG   = (26,  34,  53)       # #1a2235
        ACC  = (99, 102, 241) if q['episode'] == 1 else (14, 165, 233)
        WHITE  = (255, 255, 255)
        LIGHT  = (226, 232, 240)    # #e2e8f0
        MUTED  = (148, 163, 184)    # #94a3b8

        img  = Image.new('RGB', (W, H), BG)
        draw = ImageDraw.Draw(img)

        f28b = _font(FONT_BOLD, 28)
        f22  = _font(FONT_REG,  22)
        f20b = _font(FONT_BOLD, 20)
        f18  = _font(FONT_REG,  18)

        # Barra de destaque superior
        draw.rectangle([0, 0, W, 6], fill=ACC)

        # Header: "Pergunta X/10 — Episódio Y"
        header = f"Pergunta {qid}/10  —  Episódio {q['episode']}"
        bbox = draw.textbbox((0, 0), header, font=f28b)
        tw = bbox[2] - bbox[0]
        draw.text(((W - tw) // 2, 40), header, font=f28b, fill=WHITE)

        # Linha separadora
        draw.rectangle([80, 90, W - 80, 93], fill=ACC)

        # Pergunta (wrap automático)
        q_lines = textwrap.wrap(q['question'], width=60)
        y = 110
        for line in q_lines:
            draw.text((80, y), line, font=f22, fill=LIGHT)
            y += 32

        # Linha separadora leve
        y += 10
        draw.rectangle([80, y, W - 80, y + 1], fill=(50, 60, 80))
        y += 18

        # Opções A–D
        opt_labels = {'A': '🅐', 'B': '🅑', 'C': '🅒', 'D': '🅓'}
        for key, val in q['options'].items():
            text = f"  {key}:  {val}"
            wrapped = textwrap.wrap(text, width=75)
            for wi, wline in enumerate(wrapped):
                draw.text((80, y), wline, font=f18, fill=MUTED)
                y += 26
            y += 4

        img.save(str(screen_png))

        # ── Converter PNG → MP4 (5 s estático) ───────────────────
        cmd = [
            'ffmpeg', '-y',
            '-loop', '1',
            '-i', str(screen_png),
            '-c:v', 'libx264',
            '-t', '5',
            '-pix_fmt', 'yuv420p',
            '-vf', 'scale=1280:720',
            '-r', '25',
            '-an',
            str(screen_mp4)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            screens[qid] = screen_mp4
            screen_png.unlink(missing_ok=True)   # limpa o PNG temporário
            print(f'  📺 Tela Q{qid} gerada')
        else:
            print(f'  ⚠️  Tela Q{qid} falhou: {result.stderr[-200:]}')

    return screens


def _make_still_clip(slug, out_path):
    """Clip de fallback: foto estática com o áudio."""
    import subprocess
    wav = AUDIO_DIR / f'{slug}.wav'
    if not wav.exists() or not ELIEZER_PHOTO.exists():
        return
    
    cmd = [
        'ffmpeg', '-y',
        '-loop', '1', '-i', str(ELIEZER_PHOTO),
        '-i', str(wav),
        '-c:v', 'libx264',
        '-tune', 'stillimage',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-pix_fmt', 'yuv420p',
        '-shortest',
        str(out_path)
    ]
    subprocess.run(cmd, capture_output=True)


# ── MAIN ─────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Pipeline Quiz IDD Vídeo Avatar')
    parser.add_argument('--phase', choices=['audio', 'avatar', 'assemble', 'all'],
                        default='all', help='Fase a executar')
    args = parser.parse_args()
    
    if args.phase in ('audio', 'all'):
        phase_audio()
    if args.phase in ('avatar', 'all'):
        phase_avatar()
    if args.phase in ('assemble', 'all'):
        phase_assemble()
