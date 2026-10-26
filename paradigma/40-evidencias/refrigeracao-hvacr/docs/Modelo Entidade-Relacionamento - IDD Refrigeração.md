# Modelo Entidade-Relacionamento: IDD Refrigeração

Este diagrama lógico mapeia as entidades necessárias para suportar a operação técnica de manutenção, PMOC e corretivas, mantendo o histórico térmico e legal dos equipamentos.

```mermaid
erDiagram
    TENANT ||--o{ CLIENTE : "possui"
    TENANT ||--o{ TECNICO : "emprega"
    
    CLIENTE ||--o{ LOCAL_INSTALACAO : "possui"
    CLIENTE ||--o{ CONTRATO : "assina"
    
    LOCAL_INSTALACAO ||--o{ EQUIPAMENTO : "abriga"
    CONTRATO ||--o{ EQUIPAMENTO : "cobre"
    
    EQUIPAMENTO ||--o{ ORDEM_SERVICO : "alvo de"
    TECNICO ||--o{ ORDEM_SERVICO : "executa"
    
    ORDEM_SERVICO ||--o| LAUDO_PMOC : "gera"
    ORDEM_SERVICO ||--o{ MEDICAO_TECNICA : "contem"
    
    EQUIPAMENTO {
        uuid id PK
        uuid local_id FK
        string qr_code_id "Identificador único da etiqueta"
        string categoria "Ex: Split, Chiller, Câmara Fria"
        string fabricante
        string modelo
        int capacidade_btu
        string tipo_fluido "Ex: R410A, R404A"
        string tensao "Ex: 220V, 380V"
    }

    ORDEM_SERVICO {
        uuid id PK
        uuid equipamento_id FK
        uuid tecnico_id FK
        string tipo "Preventiva (PMOC), Corretiva, Instalação"
        string status "Agendada, Em_Atendimento, Concluida"
        datetime data_agendamento
        datetime data_conclusao
        text relato_cliente
        text diagnostico_tecnico
        string foto_antes_url
        string foto_depois_url
        string assinatura_cliente_url
    }

    MEDICAO_TECNICA {
        uuid id PK
        uuid ordem_servico_id FK
        float pressao_sucao_psi "Baixa Pressão"
        float pressao_descarga_psi "Alta Pressão"
        float temp_insuflamento_c
        float temp_retorno_c
        float corrente_operacao_a
        float superaquecimento_calculado
        float subresfriamento_calculado
    }

    LAUDO_PMOC {
        uuid id PK
        uuid ordem_servico_id FK
        boolean filtro_higienizado
        boolean dreno_desobstruido
        boolean bandeja_limpa
        boolean serpentina_higienizada
        boolean vazamento_detectado
        float gas_recolhido_kg "Sustentabilidade/Norma"
        float gas_adicionado_kg "Sustentabilidade/Norma"
        string status_conformidade "Conforme, Requer_Acao"
    }
    
    CONTRATO {
        uuid id PK
        uuid cliente_id FK
        date data_inicio
        date data_fim
        int frequencia_pmoc_meses "Ex: 1, 3, 6"
        boolean ativo
    }
```
