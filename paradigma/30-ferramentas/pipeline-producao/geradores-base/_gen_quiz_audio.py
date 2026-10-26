"""
Gera áudios TTS via Gemini 2.5 Pro Preview TTS
para as falas do avatar no quiz IDD
"""
import json, os, wave, struct
from pathlib import Path

env_file = Path(r'C:\Antigravity - RVM Designações') / '.env'
if env_file.exists():
    for line in env_file.read_text().splitlines():
        if '=' in line and not line.startswith('#'):
            k, _, v = line.partition('=')
            os.environ.setdefault(k.strip(), v.strip())

from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ['GEMINI_API_KEY'])

BASE = Path(r'C:\Antigravity - RVM Designações')
QUIZ_FILE = BASE / 'idd_quiz_questions.json'
AUDIO_DIR = BASE / 'idd_quiz_audio'
AUDIO_DIR.mkdir(exist_ok=True)

with open(QUIZ_FILE, encoding='utf-8') as f:
    quiz = json.load(f)

def raw_pcm_to_wav(raw: bytes, out_path: Path, sample_rate=24000, channels=1, bits=16):
    with wave.open(str(out_path), 'wb') as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(bits // 8)
        wf.setframerate(sample_rate)
        wf.writeframes(raw)

def tts(text: str, slug: str, voice: str = 'Charon', model: str = 'models/gemini-2.5-flash-preview-tts'):
    out_path = AUDIO_DIR / f'{slug}.wav'
    if out_path.exists():
        print(f'  ⏭ {slug}.wav já existe')
        return
    print(f'  🎤 {slug}...', end=' ', flush=True)
    resp = client.models.generate_content(
        model=model,
        contents=text,
        config=types.GenerateContentConfig(
            response_modalities=['AUDIO'],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice)
                )
            ),
        ),
    )
    audio_data = resp.candidates[0].content.parts[0].inline_data.data
    raw_pcm_to_wav(audio_data, out_path)
    size_kb = out_path.stat().st_size // 1024
    print(f'✅ ({size_kb}KB)')

# ── Falas do avatar ────────────────────────────────────────────
# Eliezer = Charon (voz grave/madura masculina)
# IA = Aoede (voz feminina fluida)

print('\n═══ Gerando áudios do avatar ═══\n')

# Boas-vindas
tts(
    "Bem-vindo ao Quiz IDD! Sou Eliezer Rosa, criador do Intent-Driven Development. "
    "Vamos testar seus conhecimentos sobre os dois primeiros episódios da nossa série. "
    "São 10 perguntas: 5 do Episódio 1 sobre o que é IDD, e 5 do Episódio 2 sobre Comando Epistêmico e Operacional. "
    "Vamos lá!",
    'welcome', voice='Charon'
)

# Transição Ep1 → Ep2
tts(
    "Excelente! Você completou as perguntas do primeiro episódio. "
    "Agora vamos para o Episódio 2, onde exploramos a distinção entre Comando Epistêmico e Operacional. "
    "Prepare-se!",
    'transition_ep2', voice='Charon'
)

# Final — aprovado
tts(
    "Parabéns! Você demonstrou um sólido entendimento do IDD. "
    "Lembre-se: o objetivo não é apenas saber os conceitos, mas incorporá-los na sua prática diária. "
    "A intenção é o artefato primário. Até o próximo episódio!",
    'final_pass', voice='Charon'
)

# Final — pode melhorar
tts(
    "Bom esforço! O IDD é um paradigma profundo, e cada revisão aprofunda a compreensão. "
    "Recomendo rever os episódios com atenção. A separação entre comando epistêmico e operacional é o coração de tudo. "
    "Você consegue! Tente novamente.",
    'final_fail', voice='Charon'
)

# Explicações de acerto e dicas de erro para cada pergunta
for q in quiz['questions']:
    qid = q['id']
    tts(q['explanation_correct'], f'q{qid}_correct', voice='Charon')
    tts(q['hint_wrong'], f'q{qid}_wrong', voice='Aoede')

print(f'\n✅ Todos os áudios gerados em {AUDIO_DIR}')
print(f'   Total: {len(list(AUDIO_DIR.glob("*.wav")))} arquivos')
