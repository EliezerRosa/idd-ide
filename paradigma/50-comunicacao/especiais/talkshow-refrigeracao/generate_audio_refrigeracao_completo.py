import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path
import edge_tts

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
OUT_DIR = BASE_DIR / "producao_yt" / "refrigeracao_talkshow"
AUDIO_DIR = OUT_DIR / "audio_completo"
OUT_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICES = {
    "eliezer": "pt-BR-AntonioNeural",
    "leigo": "pt-BR-ThalitaMultilingualNeural",
    "ia": "pt-BR-FranciscaNeural"
}

# ROTEIRO APROFUNDADO DO TALK SHOW: HOMOLOGAÇÃO COMPLETA DO DOMÍNIO IDD REFRIGERAÇÃO
# Focado 100% no aplicativo, nas regras de campo, termodinâmica, compliance e comportamento.
DIALOGUES = [
    # --- ATO 1: ABERTURA DO TALK SHOW & O DESAFIO DA REFRIGERAÇÃO COMERCIAL ---
    {
        "id": "c01_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "mer_slide",
        "slideNum": 1,
        "action": "point_title",
        "text": "Olá a todos da nossa comunidade no YouTube! Sejam muito bem-vindos ao talk show especial de homologação da nossa solução de Refrigeração Comercial e PMOC no Paradigma IDD! Hoje, eu, a nossa Usuária Leiga e a IA Compilador vamos debater e validar cada detalhe do modelo antes de compilar o aplicativo."
    },
    {
        "id": "c02_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "stage": "mer_slide",
        "slideNum": 1,
        "action": "listen",
        "text": "Eliézer, quando nós começamos, eu achava que fazer um aplicativo de manutenção era só criar um formulário para o mecânico anotar peças trocadas. Mas quando vi a realidade de câmaras frigoríficas de supermercados, ar-condicionado de hospitais e as exigências sanitárias, entendi que um sistema amador gera prejuízos milionários e multas pesadas!"
    },
    {
        "id": "c03_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "stage": "mer_slide",
        "slideNum": 1,
        "action": "point_invariants",
        "text": "Exatamente, Leiga! No Paradigma IDD nós não aceitamos achismos. O software de refrigeração precisa nascer blindado por invariantes físicas e regulatórias. Eliézer, conduza a bancada através da nossa modelagem de dados para vermos como essa inteligência foi ancorada nas tabelas relacionais."
    },

    # --- ATO 2: SLIDE 2 - FUNDAÇÃO TERRITORIAL: TENANT, CLIENTE & LOCAL ---
    {
        "id": "c04_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "mer_slide",
        "slideNum": 2,
        "action": "navigate_slide_2",
        "text": "Vamos começar pelo Slide 2: a fundação territorial do aplicativo. O sistema opera em multitenancy rigoroso com a tabela Tenant, garantindo que os dados de uma empresa de manutenção nunca se misturem com outra. E observem a tabela Local de Instalação: ela mapeia a hierarquia física real com filial, prédio, andar e sala técnica."
    },
    {
        "id": "c05_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "stage": "mer_slide",
        "slideNum": 2,
        "action": "point_local",
        "text": "Isso resolve uma dor gigantesca em campo! Muitas vezes o técnico chega num shopping ou num prédio corporativo de trinta andares e perde duas horas só procurando onde está a condensadora do cliente."
    },
    {
        "id": "c06_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "stage": "mer_slide",
        "slideNum": 2,
        "action": "rule_isolation",
        "text": "E no banco de dados, a invariante de isolamento impede que qualquer máquina seja cadastrada órfã, sem vínculo estrito com um local físico e um contrato ativo."
    },

    # --- ATO 3: SLIDE 3 - O CORAÇÃO DO SISTEMA: EQUIPAMENTO & QR CODE ---
    {
        "id": "c07_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "mer_slide",
        "slideNum": 3,
        "action": "navigate_slide_3",
        "text": "Avançando para o Slide 3, temos a alma do aplicativo: a entidade EQUIPAMENTO. Cada ar-condicionado, chiller ou câmara fria possui uma chave natural imutável: o QR Code fixado na carcaça. O mecânico aponta a câmera e tem acesso instantâneo aos dados de placa: fabricante, modelo, capacidade em BTUs, tensão elétrica e o fluido refrigerante de fábrica."
    },
    {
        "id": "c08_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "stage": "mer_slide",
        "slideNum": 3,
        "action": "question_gas",
        "text": "E se o técnico for atender uma máquina que usa gás ecológico R410A e por engano tentar colocar o gás antigo R22?"
    },
    {
        "id": "c09_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "stage": "mer_slide",
        "slideNum": 3,
        "action": "point_gas_rule",
        "text": "O aplicativo rejeita na hora! A Invariante de Compatibilidade Química cruza o tipo de fluido cadastrado na máquina com o insumo selecionado pelo mecânico. Misturar óleos sintéticos POE com óleos minerais destrói compressores scroll e nosso modelo impede esse erro por design."
    },

    # --- ATO 4: SLIDE 4 - MOTOR DE CAMPO: ORDEM DE SERVIÇO & FECHAMENTO ---
    {
        "id": "c10_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "mer_slide",
        "slideNum": 4,
        "action": "navigate_slide_4",
        "text": "No Slide 4, examinamos a ORDEM DE SERVIÇO. O aplicativo atende tanto chamados corretivos emergenciais quanto manutenções preventivas programadas. Observem os campos de segurança jurídica: fotos obrigatórias de antes e depois do serviço e coleta de assinatura na tela do smartphone."
    },
    {
        "id": "c11_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "stage": "mer_slide",
        "slideNum": 4,
        "action": "point_signature",
        "text": "Isso elimina aquela velha dor de cabeça do cliente dizer que o técnico não foi ao local ou deixou o equipamento sujo! Com as fotos datadas e a assinatura, o comprovante já segue direto para o WhatsApp do síndico."
    },

    # --- ATO 5: SLIDE 5 - FÍSICA DOS FLUIDOS & INVARIANTE TERMODINÂMICA ---
    {
        "id": "c12_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "mer_slide",
        "slideNum": 5,
        "action": "navigate_slide_5",
        "text": "Agora chegamos ao ponto mais crítico de engenharia: o Slide 5 com a tabela MEDICAO_TECNICA. É aqui que o aplicativo se diferencia de qualquer software genérico. Nós segregamos a medição em uma entidade associativa 1 para N para permitir medições de diagnóstico inicial e medições de pós-reparo."
    },
    {
        "id": "c13_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "stage": "mer_slide",
        "slideNum": 5,
        "action": "point_delta_t",
        "text": "Vejam as grandezas físicas capturadas: temperatura de insuflamento, temperatura de retorno e o cálculo automático do Delta T. Se a diferença térmica for menor que 8 graus Celsius em splits convencionais, o sistema dispara alerta de baixo rendimento térmico. E reparem na nossa Invariante Termodinâmica Fundamental destacada na tarja inferior: em qualquer compressor por compressão mecânica, a pressão de descarga deve ser estritamente maior que a pressão de sucção!"
    },
    {
        "id": "c14_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "stage": "mer_slide",
        "slideNum": 5,
        "action": "point_manifold",
        "text": "E se o técnico não estiver com o manifold analógico ou digital naquele dia, ele fica travado sem conseguir fechar a ordem de serviço básica de limpeza?"
    },
    {
        "id": "c15_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "mer_slide",
        "slideNum": 5,
        "action": "explain_optional_fields",
        "text": "Excelente pergunta, Leiga! As pressões de sucção e descarga são campos técnicos não bloqueantes para manutenções simples, mas tornam-se de preenchimento estrito caso o técnico declare intervenção no circuito de gás ou troca de compressor."
    },

    # --- ATO 6: SLIDE 6 - COMPLIANCE REGULATÓRIO: LAUDO PMOC & LEI 13.589 ---
    {
        "id": "c16_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "mer_slide",
        "slideNum": 6,
        "action": "navigate_slide_6",
        "text": "No Slide 6, apresentamos a blindagem sanitária da tabela LAUDO_PMOC. Aqui nós cumprimos integralmente as exigências da Lei Federal 13.589 de 2018 e da Portaria 3.523 da Anvisa. Cada máquina recebe a verificação explícita dos quatro pilares sanitários: filtro higienizado, dreno desobstruído, bandeja limpa e serpentina descontaminada com bactericida."
    },
    {
        "id": "c17_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "stage": "mer_slide",
        "slideNum": 6,
        "action": "point_environmental_balance",
        "text": "E não para por aí: o aplicativo implementa o Balanço Ecológico de Fluidos Refrigerantes, exigido pelo Protocolo de Montreal e pelo IBAMA. O técnico registra o gás recolhido para regeneração e o gás virgem adicionado, gerando rastreabilidade total contra emissões nocivas na atmosfera."
    },

    # --- ATO 7: SLIDE 7 - RECORRÊNCIA, CONTRATOS & MAPA INTEGRADO ---
    {
        "id": "c18_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "mer_slide",
        "slideNum": 7,
        "action": "navigate_slide_7",
        "text": "No Slide 7, vemos a sustentabilidade financeira da empresa de manutenção com a tabela CONTRATOS. Com a automação integrada, todo dia primeiro de cada mês um processo em segundo plano gera automaticamente todas as ordens de serviço preventivas do PMOC para as máquinas sob contrato, garantindo receita recorrente e zero esquecimentos."
    },
    {
        "id": "c19_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "stage": "mer_slide",
        "slideNum": 7,
        "action": "transition_to_uml",
        "text": "Que visão espetacular das tabelas e regras! Agora, Eliézer e IA, como tudo isso ganha vida quando o mecânico pega o celular no bolso e o cliente síndico acompanha a operação?"
    },

    # --- ATO 8: TRANSIÇÃO PARA O UML INTERATIVO - CASOS DE USO DO MECÂNICO ---
    {
        "id": "c20_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "uml_app",
        "action": "switch_to_uml_mecanico",
        "text": "Transitamos agora para a modelagem de comportamento: o Modelo UML Vivo do nosso aplicativo! Vejam: selecionamos a perspectiva do Mecânico de Campo. Observem a elipse central: o Caso de Uso 16 de Sincronização em Modo Offline-First. Em casas de máquinas e subsolos blindados sem internet, o aplicativo armazena tudo no banco local e sincroniza assim que detecta conectividade."
    },
    {
        "id": "c21_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "uml_app",
        "action": "pan_use_cases",
        "text": "Acompanhem os fluxos de inclusão e extensão: o Caso de Uso 01 escaneia o QR Code, dispara o checklist sanitário no Caso de Uso 05, registra as medições termodinâmicas no Caso de Uso 07 e, se o mecânico identificar uma válvula ou capacitor queimado, o Caso de Uso 14 permite solicitar a peça diretamente do estoque móvel do furgão!"
    },

    # --- ATO 9: PERSPECTIVA DO GESTOR & AUDITORIA PMOC NO UML ---
    {
        "id": "c22_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "stage": "uml_app",
        "action": "switch_to_uml_gestor",
        "text": "E para o dono da empresa e o engenheiro mecânico responsável técnico? O que eles acompanham no painel?"
    },
    {
        "id": "c23_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "uml_app",
        "action": "point_gestor_flow",
        "text": "Alternamos para a perspectiva do Gestor de Contratos e Responsável Técnico! Aqui vemos o despacho inteligente de ordens de serviço por competência no Caso de Uso 13, a auditoria sanitária com o fiscal no Caso de Uso 19 e o disparo automático do comprovante em PDF no WhatsApp do cliente em menos de 90 segundos."
    },

    # --- ATO 10: DIAGRAMA DE CLASSES OMG & MÁQUINA DE ESTADOS CRIPTOGRÁFICA ---
    {
        "id": "c24_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "uml_app",
        "action": "scroll_to_classes",
        "text": "Descendo para a Seção 2 do UML, temos o Diagrama de Classes Canônico no padrão formal da OMG! Vejam os três compartimentos rigorosos: a classe Equipamento com atributos privados encapsulados e métodos públicos como validarCompatibilidadeGas e calcularRendimentoTermico. E a classe MedicaoTecnica com os métodos puros de cálculo de Superaquecimento e validação de invariantes."
    },
    {
        "id": "c25_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "stage": "uml_app",
        "action": "scroll_to_statechart",
        "text": "E na Seção 3, observem a Máquina de Estados da Ordem de Serviço! O ciclo de vida não permite atalhos: parte de RASCUNHO, transita para AGENDADA apenas se o equipamento estiver ativo e o técnico habilitado. Em campo, o estado EM_ATENDIMENTO encapsula o sub-fluxo estrito: Check-in por QR Code, Coleta de Medições, Registro de Fotos e Coleta de Assinatura. E ao transitar para CONCLUIDA, o sistema gera o Hash SHA-256 criptográfico, tornando o laudo auditável e imutável contra fraudes retroativas!"
    },

    # --- ATO 11: HOMOLOGAÇÃO UNÂNIME & ENCERRAMENTO ---
    {
        "id": "c26_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "stage": "uml_app",
        "action": "conclude_review",
        "text": "Que aula de engenharia e clareza de produto! Agora eu entendo perfeitamente como o aplicativo funciona de ponta a ponta, protegendo o técnico, o cliente e a saúde pública. Como validadora de domínio, o modelo de Refrigeração está cem por cento aprovado para ir para produção!"
    },
    {
        "id": "c27_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "stage": "uml_app",
        "action": "approve_architecture",
        "text": "Invariantes termodinâmicas verificadas, normalização formal em 3FN consolidada e contratos de estado matematicamente comprovados. A arquitetura de software está plenamente homologada para a compilação autônoma de código em Supabase e Flutter!"
    },
    {
        "id": "c28_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "stage": "uml_app",
        "action": "final_farewell",
        "text": "Excelente! Esse é o verdadeiro coração do Paradigma IDD: construir software com rigor científico, eliminando retrabalho antes mesmo da primeira linha de código ser digitada. Deixe seu like, inscreva-se no canal IDD na Prática e prepare-se: no próximo episódio, nossa esteira autônoma compila o aplicativo completo no ar! Até lá!"
    }
]

async def generate_speech(text, voice, out_path):
    communicate = edge_tts.Communicate(text, voice, rate="+2%", pitch="+0Hz")
    await communicate.save(out_path)

def get_audio_duration(file_path):
    cmd = [
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration", "-of", "default=noprint_wrappers=1:nokey=1",
        str(file_path)
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
    return float(res.stdout.strip())

async def main():
    print("=" * 80)
    print("🎙️ GERANDO ÁUDIO NEURAL TALK SHOW COMPLETO — IDD REFRIGERAÇÃO (MER & UML)")
    print("   Total de Intervenções Ricas: 28 Falas Ativas")
    print("=" * 80)

    timeline_items = []
    current_time = 0.8  # pequena folga inicial após a vinheta

    for idx, d in enumerate(DIALOGUES):
        seg_id = d["id"]
        who = d["who"]
        voice = VOICES[who]
        wav_path = AUDIO_DIR / f"{seg_id}.wav"
        mp3_path = AUDIO_DIR / f"{seg_id}.mp3"

        print(f"[{idx+1}/{len(DIALOGUES)}] Sintetizando {seg_id} ({d['actor']})...")
        await generate_speech(d["text"], voice, str(mp3_path))

        subprocess.run([
            "ffmpeg", "-y", "-i", str(mp3_path),
            "-ar", "48000", "-ac", "2",
            str(wav_path)
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        if mp3_path.exists():
            mp3_path.unlink()

        dur = get_audio_duration(wav_path)
        item = {
            "index": idx,
            "id": seg_id,
            "who": who,
            "actor": d["actor"],
            "avatar": d["avatar"],
            "stage": d["stage"],
            "slideNum": d.get("slideNum", 1),
            "action": d["action"],
            "text": d["text"],
            "wav": str(wav_path),
            "startSec": round(current_time, 3),
            "durSec": round(dur, 3),
            "endSec": round(current_time + dur, 3)
        }
        timeline_items.append(item)
        print(f"       Duração: {dur:.2f}s | Início: {current_time:.2f}s -> Fim: {current_time + dur:.2f}s")
        current_time += dur + 0.60  # pausa humana natural entre falas

    total_duration = round(current_time + 2.0, 2)
    print(f"\nDuração Total do Talk Show Completo: {total_duration}s (~{(total_duration/60):.1f} min)")

    timeline_path = OUT_DIR / "timeline_completo.json"
    with open(timeline_path, "w", encoding="utf-8") as f:
        json.dump({
            "projectName": "IDD_Refrigeracao_TalkShow_Completo",
            "totalDurationSec": total_duration,
            "items": timeline_items
        }, f, indent=2, ensure_ascii=False)
    print(f"[OK] Timeline completa salva em: {timeline_path}")

    print("\nMontando Trilha Sonora Master Completa com EBU R128 (-14 LUFS)...")
    concat_list_file = OUT_DIR / "audio_concat_completo.txt"
    silence_wav = AUDIO_DIR / "silence_060s.wav"
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
        "-t", "0.60", str(silence_wav)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    initial_silence_wav = AUDIO_DIR / "silence_080s.wav"
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
        "-t", "0.80", str(initial_silence_wav)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    with open(concat_list_file, "w", encoding="utf-8") as f:
        f.write(f"file '{initial_silence_wav.as_posix()}'\n")
        for idx, item in enumerate(timeline_items):
            f.write(f"file '{Path(item['wav']).as_posix()}'\n")
            if idx < len(timeline_items) - 1:
                f.write(f"file '{silence_wav.as_posix()}'\n")

    raw_voice_master = OUT_DIR / "raw_voice_master_completo.wav"
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", str(concat_list_file),
        "-c", "copy", str(raw_voice_master)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    master_audio_path = OUT_DIR / "master_soundtrack_completo.wav"
    synth_ambience = (
        f"aevalsrc=sin(2*PI*130.81*t)*0.012+sin(2*PI*196.00*t)*0.008+sin(2*PI*261.63*t)*0.005:s=48000:d={total_duration}"
    )

    filter_complex = (
        f"{synth_ambience}[bg];"
        "[0:a]asplit=2[v_audio][v_sc];"
        "[bg][v_sc]sidechaincompress=threshold=0.04:ratio=4:attack=50:release=300[bg_ducked];"
        "[bg_ducked][v_audio]amix=inputs=2:weights=0.30 1.0[mixed];"
        "[mixed]loudnorm=I=-14:LRA=7:TP=-1.5[out_audio]"
    )

    subprocess.run([
        "ffmpeg", "-y",
        "-i", str(raw_voice_master),
        "-filter_complex", filter_complex,
        "-map", "[out_audio]",
        "-c:a", "pcm_s16le",
        str(master_audio_path)
    ], check=True)

    print(f"\n[OK] Trilha Sonora Master Completa Finalizada: {master_audio_path}")
    print(f"     Tamanho: {master_audio_path.stat().st_size / (1024*1024):.1f} MB | Loudness: -14 LUFS")

if __name__ == "__main__":
    asyncio.run(main())
