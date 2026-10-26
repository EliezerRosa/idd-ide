import asyncio
import os
import sys
import json
import subprocess
from pathlib import Path
import edge_tts

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

VOICES = {
    'eliezer': 'pt-BR-AntonioNeural',
    'leigo': 'pt-BR-FranciscaNeural',
    'ia': 'pt-BR-ThalitaNeural'
}

VOICE_CONFIG = {
    'eliezer': {'rate': '+0%', 'pitch': '+0Hz'},
    'leigo': {'rate': '+3%', 'pitch': '+0Hz'},
    'ia': {'rate': '+4%', 'pitch': '+0Hz'}
}

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
ASSETS_DIR = BASE_DIR / "producao_yt" / "barbearia_assets"
AUDIO_DIR = ASSETS_DIR / "audio_completo_barbearia"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# 23 FALAS PROFUNDAS E RICAS SOBRE O DOMÍNIO DA BARBEARIA & SALÃO VIP
DIALOGUE = [
    {
        "id": "b01_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "stage": "mer",
        "action": "point_header",
        "text": "Olá a todos os inscritos e entusiastas de engenharia de software do nosso canal! Sejam muito bem-vindos a mais uma sessão magna de homologação de domínio no Paradigma IDD! Hoje, eu, a nossa Usuária Leiga e a IA Compilador vamos dissecar toda a arquitetura de dados e regras de negócio do nosso aplicativo para Barbearia e Salão VIP, construído com foco em zero conflito de horários e governança da Lei do Salão Parceiro."
    },
    {
        "id": "b02_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "stage": "mer",
        "action": "listen",
        "text": "Eliézer, quem cuida de salão ou frequenta barbearia sabe bem o estresse: você agenda para cortar o cabelo no sábado de manhã, chega no horário e tem outro cliente na cadeira! Sem falar no barbeiro que anota os cortes num caderninho amassado e no final do mês briga com o dono por causa do cálculo de comissões e impostos!"
    },
    {
        "id": "b03_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "stage": "mer",
        "action": "point_invariants_top",
        "text": "Exatamente, Leiga! Esse atrito ocorre porque planilhas e calendários comuns tratam o agendamento como um texto livre. No Paradigma IDD, nós modelamos o agendamento como uma alocação atômica de recurso temporal com Invariante de Slot Único e segregação financeira da Lei treze mil trezentos e cinquenta e dois. Eliézer, compartilhe o nosso MER Canônico para vermos essa blindagem."
    },
    {
        "id": "b04_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "stage": "mer",
        "action": "point_profissional",
        "text": "Vejam no topo do modelo: a entidade PROFISSIONAL credencia os barbeiros, cabeleireiros e especialistas do estabelecimento. Cada profissional possui sua chave Pix homologada e seu percentual de comissão contratual. Já a entidade CLIENTE guarda o histórico, frequência e canal de comunicação via WhatsApp."
    },
    {
        "id": "b05_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "stage": "mer",
        "action": "listen",
        "text": "E como o sistema garante matematicamente que dois clientes não consigam marcar o mesmo barbeiro no mesmo horário pelo aplicativo?"
    },
    {
        "id": "b06_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "stage": "mer",
        "action": "point_agendamento",
        "text": "Observem a entidade AGENDAMENTO: além dos ponteiros de chave estrangeira, ela calcula a janela exata de início e fim baseada na duração do SERVICO. A nossa primeira Invariante Universal estabelece que para um mesmo profissional, os intervalos de tempo confirmados devem ser mutuamente disjuntos. O banco de dados rejeita qualquer interseção temporal."
    },
    {
        "id": "b07_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "stage": "mer",
        "action": "point_comanda_salao",
        "text": "E quando o cliente senta na cadeira, o agendamento transita para EM_ATENDIMENTO e abre automaticamente a COMANDA_SALAO. Se durante o corte o cliente decidir fazer uma barba terapia ou consumir uma cerveja artesanal e uma pomada modeladora, esses itens entram na comanda vinculados ao profissional executor."
    },
    {
        "id": "b08_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "stage": "mer",
        "action": "listen",
        "text": "Isso é ótimo! Mas me explica uma coisa, IA: como fica a divisão do dinheiro para o salão não pagar imposto sobre o dinheiro que é do barbeiro?"
    },
    {
        "id": "b09_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "stage": "mer",
        "action": "point_lei_salao",
        "text": "Essa é uma das maiores inovações do nosso modelo: a entidade PARTILHA_COMISSAO_LEI_SALAO! Em conformidade com a Lei do Salão Parceiro, cada serviço realizado é decomposto de forma imutável: a cota do salão e a cota do profissional parceiro. O salão emite nota fiscal apenas sobre a sua fatia, evitando a bitributação injusta."
    },
    {
        "id": "b10_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "stage": "mer",
        "action": "point_pagamento_salao",
        "text": "E com integridade contábil estrita: a soma das duas cotas é identicamente igual ao valor bruto pago pelo cliente. No momento em que o PAGAMENTO_SALAO é confirmado via Pix ou Cartão, a comanda atinge quitação integral e a cadeira é liberada para a próxima reserva."
    },
    {
        "id": "b11_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "stage": "uml",
        "action": "switch_to_uml_cliente",
        "text": "Vamos transitar agora para o Modelo UML Dinâmico! Iniciamos pela Visão do Cliente VIP: em poucos toques no celular, ele escolhe o barbeiro de sua preferência, seleciona o serviço, visualiza os horários disponíveis e recebe na hora uma mensagem de confirmação no WhatsApp com o arquivo de calendário integrado."
    },
    {
        "id": "b12_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "stage": "uml",
        "action": "point_whatsapp_ics",
        "text": "Que praticidade! O cliente já coloca o lembrete direto no celular e se precisar reagendar, o aplicativo avisa a antecedência mínima permitida para não prejudicar o barbeiro!"
    },
    {
        "id": "b13_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "stage": "uml",
        "action": "switch_to_uml_barbeiro",
        "text": "Exato! Agora mudamos o foco para a Visão do Barbeiro ou Profissional Parceiro. No próprio smartphone, o barbeiro visualiza a sua esteira do dia. Ao receber o cliente na cadeira, ele inicia o atendimento com um toque, adiciona produtos consumidos e visualiza em tempo real o saldo acumulado de suas comissões diárias."
    },
    {
        "id": "b14_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "stage": "uml",
        "action": "point_cadeira_atendimento",
        "text": "Essa transparência elimina cem por cento das desconfianças entre os profissionais e a gerência. Cada serviço executado possui rastreabilidade atômica, registrando quem cortou, quem fez a barba e qual taxa contratual foi aplicada."
    },
    {
        "id": "b15_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "stage": "uml",
        "action": "listen",
        "text": "E para o cliente que chega de surpresa da rua sem horário marcado, como a recepção encaixa ele no sistema?"
    },
    {
        "id": "b16_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "stage": "uml",
        "action": "switch_to_uml_gestor",
        "text": "A recepção dispõe do caso de uso de abertura de comanda de balcão direta. O sistema identifica na hora quais profissionais estão com a cadeira ociosa no momento. E na Visão do Gestor, o painel consolida os repasses da Lei do Salão Parceiro e dispara lotes de pagamento Pix automatizados para os profissionais."
    },
    {
        "id": "b17_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "stage": "uml",
        "action": "scroll_to_classes_barbearia",
        "text": "Navegando mais abaixo, apresentamos o nosso Diagrama de Classes no padrão OMG Standard. Observem a classe Agendamento com o método defensivo validarConflitoHorario, e a classe ComandaSalao operando em conjunto com PartilhaComissao, encapsulando métodos de apuração de cotas e emissão fiscal."
    },
    {
        "id": "b18_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "stage": "uml",
        "action": "point_classes_barbearia",
        "text": "A classe PartilhaComissao gera a chave da nota fiscal de serviço substituta e aciona o webhook bancário para repasse imediato ou programado da cota do profissional, atendendo plenamente à legislação tributária federal."
    },
    {
        "id": "b19_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "stage": "uml",
        "action": "scroll_to_statechart_barbearia",
        "text": "E no encerramento visual, contemplamos o Statechart da Cadeira. Desde o estado SOLICITADO, passando por CONFIRMADO, o atendimento ativo na cadeira com serviços e produtos adicionais, até a conferência no caixa, pagamento Pix e encerramento com cadeira livre para a próxima experiência VIP."
    },
    {
        "id": "b20_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "stage": "uml",
        "action": "point_statechart_cadeira",
        "text": "Caso o cliente não compareça no prazo de quinze minutos, o sistema aciona a transição para NO_SHOW, liberando imediatamente a cadeira e aplicando as políticas de taxa de reserva se houver sinal pré-pago."
    },
    {
        "id": "b21_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "stage": "uml",
        "action": "approve_barbearia",
        "text": "Eliézer e IA, este sistema de Barbearia e Salão VIP é perfeito! Ele valoriza o tempo do cliente, traz paz de espírito para os barbeiros com comissões transparentes e protege o dono do salão com a Lei do Salão Parceiro. Como representante da comunidade de usuários, o domínio está cem por cento aprovado com louvor!"
    },
    {
        "id": "b22_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "stage": "uml",
        "action": "conclude_barbearia",
        "text": "Pelo Compilador IDD, todos os teoremas de não-sobreposição de intervalos temporais, segregação de cotas e estabilidade de estados foram verificados formalmente. O domínio de Barbearia e Salão VIP está plenamente certificado para a esteira autônoma de código."
    },
    {
        "id": "b23_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "stage": "uml",
        "action": "farewell_barbearia",
        "text": "Espetacular! Com o fechamento deste episódio, homologamos com total sucesso as playlists oficiais do IDD na Prática: Refrigeração, Racha de Pix, Cafeteria e Barbearia! Convidamos todos a maratonar todas as nossas séries, curtir, compartilhar e acompanhar os próximos passos da nossa comunidade. Muito obrigado a todos e até a próxima!"
    }
]

async def synthesize_speech(text, voice_id, config, out_path):
    communicate = edge_tts.Communicate(
        text=text,
        voice=voice_id,
        rate=config['rate'],
        pitch=config['pitch']
    )
    mp3_path = str(out_path).replace('.wav', '.mp3')
    await communicate.save(mp3_path)

    cmd = [
        'ffmpeg', '-y', '-i', mp3_path,
        '-af', 'highpass=f=60,lowpass=f=12000,volume=1.35',
        '-ar', '48000', '-ac', '1',
        str(out_path)
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    if os.path.exists(mp3_path):
        os.remove(mp3_path)

def get_audio_duration(file_path):
    cmd = [
        'ffprobe', '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        str(file_path)
    ]
    out = subprocess.check_output(cmd).decode('utf-8').strip()
    return float(out)

def create_silence(duration_sec, out_path):
    cmd = [
        'ffmpeg', '-y', '-f', 'lavfi',
        '-i', f'anullsrc=r=48000:cl=mono',
        '-t', str(duration_sec),
        str(out_path)
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

async def main():
    print("=" * 80)
    print("🎙️ GERANDO ÁUDIO NEURAL TALK SHOW COMPLETO — BARBEARIA & SALÃO VIP (MER & UML)")
    print("   Total de Intervenções Ricas: 23 Falas Ativas")
    print("=" * 80)

    silence_060 = AUDIO_DIR / "silence_060s.wav"
    silence_080 = AUDIO_DIR / "silence_080s.wav"
    create_silence(0.60, silence_060)
    create_silence(0.80, silence_080)

    timeline_items = []
    current_time = 0.8

    concat_list = [f"file '{silence_080}'"]

    for idx, item in enumerate(DIALOGUE):
        print(f"[{idx+1}/{len(DIALOGUE)}] Sintetizando {item['id']} ({item['actor']})...")
        out_wav = AUDIO_DIR / f"{item['id']}.wav"
        await synthesize_speech(item['text'], VOICES[item['who']], VOICE_CONFIG[item['who']], out_wav)

        dur = get_audio_duration(out_wav)
        start_sec = current_time
        end_sec = current_time + dur

        timeline_items.append({
            "index": idx,
            "id": item["id"],
            "who": item["who"],
            "actor": item["actor"],
            "avatar": item["who"],
            "stage": item["stage"],
            "action": item["action"],
            "text": item["text"],
            "wav": str(out_wav),
            "startSec": round(start_sec, 3),
            "durSec": round(dur, 3),
            "endSec": round(end_sec, 3)
        })

        concat_list.append(f"file '{out_wav}'")
        concat_list.append(f"file '{silence_060}'")
        current_time = end_sec + 0.60
        print(f"       Duração: {dur:.2f}s | Início: {start_sec:.2f}s -> Fim: {end_sec:.2f}s")

    total_duration = current_time + 2.0
    print(f"\nDuração Total do Talk Show da Barbearia: {total_duration:.2f}s (~{total_duration/60:.1f} min)")

    timeline_path = ASSETS_DIR / "timeline_barbearia_talkshow.json"
    with open(timeline_path, "w", encoding="utf-8") as f:
        json.dump({"projectName": "IDD_Barbearia_TalkShow_MER_UML", "totalDurationSec": round(total_duration, 2), "items": timeline_items}, f, indent=2, ensure_ascii=False)
    print(f"[OK] Timeline da Barbearia salva em: {timeline_path}")

    concat_txt_path = ASSETS_DIR / "audio_concat_barbearia.txt"
    with open(concat_txt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(concat_list))

    raw_voice_path = ASSETS_DIR / "raw_voice_master_barbearia.wav"
    cmd_concat = [
        'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
        '-i', str(concat_txt_path),
        '-c', 'copy',
        str(raw_voice_path)
    ]
    subprocess.run(cmd_concat, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    print("\nMontando Trilha Sonora Master Completa com EBU R128 (-14 LUFS)...")
    possible_music = [
        Path(r"C:\Antigravity - IDD Refrigeração\producao_yt\assets\music_talkshow.mp3"),
        Path(r"C:\Antigravity - IDD Refrigeração\producao_yt\refrigeracao_talkshow\master_soundtrack_completo.wav")
    ]
    bg_music = None
    for pm in possible_music:
        if pm.exists():
            bg_music = pm
            break

    master_soundtrack_path = ASSETS_DIR / "master_soundtrack_barbearia.wav"

    if bg_music:
        filter_complex = (
            f"[1:a]aloop=loop=-1:size=2e+09,volume=0.12,lowpass=f=3500[bg];"
            f"[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2,"
            f"loudnorm=I=-14:LRA=11:TP=-1.5[out]"
        )
        cmd_mix = [
            'ffmpeg', '-y',
            '-i', str(raw_voice_path),
            '-i', str(bg_music),
            '-filter_complex', filter_complex,
            '-map', '[out]',
            '-ar', '48000',
            str(master_soundtrack_path)
        ]
    else:
        cmd_mix = [
            'ffmpeg', '-y',
            '-i', str(raw_voice_path),
            '-af', 'loudnorm=I=-14:LRA=11:TP=-1.5',
            '-ar', '48000',
            str(master_soundtrack_path)
        ]

    subprocess.run(cmd_mix, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    size_mb = master_soundtrack_path.stat().st_size / (1024 * 1024)
    print(f"\n[OK] Trilha Sonora Master da Barbearia Finalizada: {master_soundtrack_path}")
    print(f"     Tamanho: {size_mb:.1f} MB | Loudness: -14 LUFS\n")

if __name__ == "__main__":
    asyncio.run(main())
