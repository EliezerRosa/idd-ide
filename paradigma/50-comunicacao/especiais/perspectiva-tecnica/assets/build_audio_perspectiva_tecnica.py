"""Gera os áudios neurais e a timeline do Especial de Perspectiva Técnica do IDD:
IDD Paradigma — Perspectiva Técnica: Avaliação Isenta & Os 5 Pilares de Formalização
"""

import asyncio
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path
import numpy as np
import edge_tts

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração\motion_graphics_renderer\idd_perspectiva_tecnica_assets")
AUDIO_DIR = BASE_DIR / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICE_ELIEZER = "pt-BR-AntonioNeural"
VOICE_LEIGO = "pt-BR-FranciscaNeural"

SCRIPT_LINES = [
    # SLIDE 1: Diagnóstico Isento
    {
        "index": 0,
        "speaker": "leigo",
        "actor": "Interlocutora Técnica",
        "who": "leigo",
        "voice": VOICE_LEIGO,
        "slide": 1,
        "text": "Eliézer, o Paradigma IDD já provou sua maturidade conceitual unindo ontologia, IA neuro-simbólica e comando epistêmico. Mas fazendo uma avaliação estritamente técnica e sem nenhuma condescendência: o que ainda falta para o IDD deixar de ser um quadro pioneiro e se tornar um padrão de engenharia global e adotado pela indústria, como o DDD ou o LLVM?"
    },
    {
        "index": 1,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "who": "eliezer",
        "voice": VOICE_ELIEZER,
        "slide": 1,
        "text": "Excelente provocação! Para a indústria e a academia adotarem o IDD em escala global, precisamos formalizar cinco pilares fundamentais de engenharia de software: uma Intent IR canônica, provadores formais SMT integrados no pipeline, diff semântico constitucional, sagas transacionais atômicas e um benchmark reprodutível. Vamos destrinchar cada um deles!"
    },

    # SLIDE 2: MCP & Antigravity vs IDD
    {
        "index": 2,
        "speaker": "leigo",
        "actor": "Interlocutora Técnica",
        "who": "leigo",
        "voice": VOICE_LEIGO,
        "slide": 2,
        "text": "Perfeito! No Slide dois, vemos a comparação direta com o ecossistema do Model Context Protocol, o MCP da Anthropic, e ferramentas como o Antigravity. Onde essa abordagem converge e onde ela difere radicalmente do IDD?"
    },
    {
        "index": 3,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "who": "eliezer",
        "voice": VOICE_ELIEZER,
        "slide": 2,
        "text": "A convergência está na orquestração: ambos usam agentes e chamadas de ferramentas. Mas a divergência é abissal! O MCP é a infraestrutura de tubulação, o encanamento mecânico para conectar o LLM ao sistema operacional. Já o IDD é a engenharia de controle ontológico: ele decide o que tem validade epistêmica e bloqueia qualquer mutação que viole as invariantes de negócio antes de tocar o banco de dados!"
    },

    # SLIDE 3: Pilar 1 - Intent IR Canônica
    {
        "index": 4,
        "speaker": "leigo",
        "actor": "Interlocutora Técnica",
        "who": "leigo",
        "voice": VOICE_LEIGO,
        "slide": 3,
        "text": "E veja no Slide três o primeiro pilar que está faltando: a especificação canônica da Intent IR! Hoje o mercado vive de 'Vibe Coding', tentando programar com prompts em linguagem natural solta, onde o modelo acerta na terça e erra na sexta-feira."
    },
    {
        "index": 5,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "who": "eliezer",
        "voice": VOICE_ELIEZER,
        "slide": 3,
        "text": "Exatamente! Prompts em prosa são frágeis e oscilam. Assim como o LLVM revolucionou a computação com uma Representação Intermediária, o IDD necessita de uma IDL formalizada: uma Árvore Sintática Abstrata do domínio, onde guardas, invariantes e mutações são declaradas de forma determinística e compiláveis para qualquer banco ou linguagem."
    },

    # SLIDE 4: Pilar 2 - Provadores Formais e SMT Solvers
    {
        "index": 6,
        "speaker": "leigo",
        "actor": "Interlocutora Técnica",
        "who": "leigo",
        "voice": VOICE_LEIGO,
        "slide": 4,
        "text": "No Slide quatro chegamos ao segundo pilar: a morte do assert_equal! Por que testes unitários tradicionais baseados em amostragem finita não dão conta da inteligência artificial generativa?"
    },
    {
        "index": 7,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "who": "eliezer",
        "voice": VOICE_ELIEZER,
        "slide": 4,
        "text": "Porque testes por amostragem cobrem pontos isolados, enquanto a IA explora um espaço infinito de alucinação. O IDD adota o Raciocínio Automatizado, o mesmo padrão que a AWS e a Microsoft usam com o solver Z3 e Dafny: nós não rodamos amostras, provamos matematicamente que para qualquer entrada possível as invariantes de domínio se mantêm invioláveis!"
    },

    # SLIDE 5: Pilar 3 - Engenharia Constitucional & Diff Semântico
    {
        "index": 8,
        "speaker": "leigo",
        "actor": "Interlocutora Técnica",
        "who": "leigo",
        "voice": VOICE_LEIGO,
        "slide": 5,
        "text": "E no Slide cinco abordamos a Engenharia Constitucional e o Diff Semântico. Por que ferramentas veneradas como o Git são totalmente cegas para a inteligência artificial?"
    },
    {
        "index": 9,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "who": "eliezer",
        "voice": VOICE_ELIEZER,
        "slide": 5,
        "text": "O Git compara apenas caracteres em linhas de texto ASCII: ele não entende cardinalidade, herança ou integridade relacional. No IDD, a Ontologia de Domínio é a Constituição da empresa. A Máquina de Diff compara grafos ontológicos, aplicando a Classificação Tripartida: adições simples passam direto, mas rupturas estruturais exigem o padrão Expand and Contract e a aprovação humana soberana!"
    },

    # SLIDE 6: Pilar 4 - Ação Atômica & Sagas
    {
        "index": 10,
        "speaker": "leigo",
        "actor": "Interlocutora Técnica",
        "who": "leigo",
        "voice": VOICE_LEIGO,
        "slide": 6,
        "text": "No Slide seis temos o quarto pilar: a Teoria da Ação Atômica e as Sagas de Domínio! Qual é o maior perigo de um agente autônomo realizando mutações comportamentais sem controle de transação?"
    },
    {
        "index": 11,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "who": "eliezer",
        "voice": VOICE_ELIEZER,
        "slide": 6,
        "text": "O pesadelo da meia-transação! O agente debita o valor, o microserviço dá timeout e o sistema fica inconsistente. O IDD resolve isso com o Protocolo Canônico em Quatro Fases: Guarda com fail-fast, Mutação isolada e idempotente, Selagem com log de auditoria append-only e Ação Compensatória pré-declarada simétrica. Zero estado órfão!"
    },

    # SLIDE 7: Pilar 5 - Benchmark IDD
    {
        "index": 12,
        "speaker": "leigo",
        "actor": "Interlocutora Técnica",
        "who": "leigo",
        "voice": VOICE_LEIGO,
        "slide": 7,
        "text": "E no Slide sete vemos o quinto pilar: o Benchmark Canônico do IDD! Por que os benchmarks de mercado como SWE-bench ou HumanEval não são suficientes para validar a confiabilidade em sistemas reais?"
    },
    {
        "index": 13,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "who": "eliezer",
        "voice": VOICE_ELIEZER,
        "slide": 7,
        "text": "Porque eles medem apenas se o código gerado passa em dois ou três testes pontuais. O benchmark do IDD submete o sistema a mil mutações consecutivas de domínio complexo, comparando o Vibe Coding direto com o compilador IDD. O objetivo é provar empiricamente para a comunidade científica alucinação de domínio rigorosamente zero!"
    },

    # SLIDE 8: A Linhagem Histórica
    {
        "index": 14,
        "speaker": "leigo",
        "actor": "Interlocutora Técnica",
        "who": "leigo",
        "voice": VOICE_LEIGO,
        "slide": 8,
        "text": "E no Slide oito relembramos a linhagem histórica de setenta e nove anos que sustenta o IDD: desde o Memex de Vannevar Bush em 1945, Wiener, Licklider, a histórica demonstração de Douglas Engelbart em 1968, até Alan Kay e a computação orientada a objetos vivos!"
    },
    {
        "index": 15,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "who": "eliezer",
        "voice": VOICE_ELIEZER,
        "slide": 8,
        "text": "Essa linhagem é o nosso solo epistemológico! O IDD não é um modismo passageiro de prompts: é a consolidação de oito décadas de luta pela amplificação da inteligência humana, garantindo que o engenheiro mantenha o leme do software enquanto a máquina assume a força bruta mecânica."
    },

    # SLIDE 9: Matriz de Hashtags & Visibilidade
    {
        "index": 16,
        "speaker": "leigo",
        "actor": "Interlocutora Técnica",
        "who": "leigo",
        "voice": VOICE_LEIGO,
        "slide": 9,
        "text": "E para quem quer acompanhar e discutir esse ecossistema, o Slide nove apresenta a nossa estratégia de descoberta e a matriz oficial de hashtags do canal, conectando as dores práticas do Vibe Coding aos grandes debates de ponta da computação!"
    },
    {
        "index": 17,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "who": "eliezer",
        "voice": VOICE_ELIEZER,
        "slide": 9,
        "text": "Com certeza! Convidamos engenheiros seniores, arquitetos e pesquisadores de conferências como ICSE, FSE e POPL a se conectarem. A discussão sobre métodos formais, invariantes e IA confiável é a fronteira mais urgente da nossa disciplina."
    },

    # SLIDE 10: O Chamado & Conclusão
    {
        "index": 18,
        "speaker": "leigo",
        "actor": "Interlocutora Técnica",
        "who": "leigo",
        "voice": VOICE_LEIGO,
        "slide": 10,
        "text": "Sensacional! E no Slide dez fechamos com a grande mensagem: a programação manual de sintaxe virou commodity. O verdadeiro valor do engenheiro nos próximos cinquenta anos reside na clareza epistemológica e no rigor das intenções!"
    },
    {
        "index": 19,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "who": "eliezer",
        "voice": VOICE_ELIEZER,
        "slide": 10,
        "text": "Perfeito! A intenção governa, a inteligência artificial compila e o ser humano arbitra. Inscreva-se no canal, compartilhe essa visão e venha construir conosco as catedrais inabaláveis da Engenharia de Software 3.0!"
    }
]

async def gen_tts_file(text: str, voice: str, out_wav: Path):
    communicate = edge_tts.Communicate(text, voice)
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        await communicate.save(str(tmp_path))
        cmd = [
            "ffmpeg", "-y",
            "-i", str(tmp_path),
            "-ar", "48000",
            "-ac", "1",
            str(out_wav)
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    finally:
        if tmp_path.exists():
            tmp_path.unlink()

def get_wav_duration_and_samples(wav_path: Path):
    with wave.open(str(wav_path), 'rb') as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        n_frames = wf.getnframes()
        frames = wf.readframes(n_frames)
        dur = n_frames / framerate
        samples = np.frombuffer(frames, dtype=np.int16)
        return dur, samples, framerate

async def main():
    print("=" * 80)
    print("🎙️ GERANDO ÁUDIOS NEURAIS E TIMELINE PARA O ESPECIAL DE PERSPECTIVA TÉCNICA")
    print("=" * 80)

    timeline_items = []
    current_time = 1.0  # 1s de respiro inicial
    all_audio_segments = []

    for item in SCRIPT_LINES:
        idx = item["index"]
        voice = item["voice"]
        text = item["text"]
        speaker = item["speaker"]
        actor = item["actor"]
        who = item["who"]
        slide = item["slide"]

        out_wav = AUDIO_DIR / f"seg_{idx:02d}_{speaker}.wav"
        print(f"[{idx+1:02d}/{len(SCRIPT_LINES):02d}] Sintetizando {actor} (Slide {slide})...")
        await gen_tts_file(text, voice, out_wav)

        dur, samples, rate = get_wav_duration_and_samples(out_wav)

        start_sec = current_time
        end_sec = current_time + dur

        timeline_items.append({
            "index": idx,
            "speaker": speaker,
            "actor": actor,
            "who": who,
            "slide": slide,
            "text": text,
            "startSec": round(start_sec, 3),
            "endSec": round(end_sec, 3),
            "durationSec": round(dur, 3)
        })

        all_audio_segments.append(samples)

        # Adiciona 0.4s de silêncio natural entre falas
        pause_samples = np.zeros(int(rate * 0.45), dtype=np.int16)
        all_audio_segments.append(pause_samples)
        current_time = end_sec + 0.45

    # 1.5s de silêncio final
    current_time += 1.5
    final_audio = np.concatenate(all_audio_segments)

    master_wav = BASE_DIR / "master_soundtrack_perspectiva_tecnica.wav"
    with wave.open(str(master_wav), 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(48000)
        wf.writeframes(final_audio.tobytes())

    total_dur = len(final_audio) / 48000
    print("\n" + "=" * 80)
    print(f"✅ SUCESSO! ÁUDIO MASTER CONCATENADO:")
    print(f"📁 Arquivo: {master_wav}")
    print(f"⏱️ Duração Total: {total_dur:.2f}s (~{total_dur/60:.2f} min)")

    timeline_data = {
        "title": "IDD Paradigma — Perspectiva Técnica: Avaliação Isenta & Os 5 Pilares de Formalização",
        "totalDurationSec": round(total_dur, 2),
        "items": timeline_items
    }

    timeline_file = BASE_DIR / "video_perspectiva_tecnica_timeline.json"
    with open(timeline_file, "w", encoding="utf-8") as f:
        json.dump(timeline_data, f, indent=2, ensure_ascii=False)

    print(f"📄 Timeline Gravada em: {timeline_file}")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(main())
