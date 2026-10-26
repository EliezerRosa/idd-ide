/**
 * ==============================================================================
 * APP BARBEARIA PERFEITA - REGRAS DE DOMÍNIO E MÁQUINA DE ESTADOS (IDD)
 * Correspondência direta: Intenção -> Invariante -> UML -> Código
 * ==============================================================================
 */

export type StatusAgendamento = 
  | 'RESERVADO'
  | 'CONFIRMADO'
  | 'NA_CADEIRA'
  | 'CONCLUIDO'
  | 'CANCELADO';

export interface ServicoItem {
  id: string;
  nome: string;
  duracaoMinutos: number;
  precoCentavos: number;
}

export class AgendamentoDominio {
  public id: string;
  public profissionalId: string;
  public clienteId: string;
  public dataHoraInicio: Date;
  public dataHoraFim: Date;
  public status: StatusAgendamento;
  public itens: ServicoItem[];
  public comissaoPercentual: number;

  constructor(
    id: string,
    profissionalId: string,
    clienteId: string,
    dataHoraInicio: Date,
    comissaoPercentual: number
  ) {
    // INVARIANTE 1: Comissão válida
    if (comissaoPercentual < 0 || comissaoPercentual > 100) {
      throw new Error("INVARIANTE VIOLADA: Comissão deve estar entre 0% e 100%.");
    }

    this.id = id;
    this.profissionalId = profissionalId;
    this.clienteId = clienteId;
    this.dataHoraInicio = dataHoraInicio;
    this.comissaoPercentual = comissaoPercentual;
    this.itens = [];
    this.status = 'RESERVADO';
    this.dataHoraFim = new Date(dataHoraInicio.getTime());
  }

  /**
   * Amarração UML: Caso de Uso "Adicionar Serviço ao Agendamento"
   * Invariante: A data de término deve ser a soma da duração de todos os itens
   */
  public adicionarServico(servico: ServicoItem): void {
    if (this.status !== 'RESERVADO') {
      throw new Error("INVARIANTE VIOLADA: Não é permitido adicionar serviços após a confirmação.");
    }
    this.itens.push(servico);
    this.recalcularHorarioFim();
  }

  private recalcularHorarioFim(): void {
    const totalMinutos = this.itens.reduce((acc, item) => acc + item.duracaoMinutos, 0);
    this.dataHoraFim = new Date(this.dataHoraInicio.getTime() + totalMinutos * 60000);
  }

  /**
   * Amarração MER: Cálculo do Valor Total e Comissão
   * Invariante Matemática: Total = Soma dos itens; Comissão = Total * %
   */
  public calcularValores(): { valorTotalCentavos: number; comissaoProfissionalCentavos: number } {
    if (this.itens.length === 0) {
      throw new Error("INVARIANTE VIOLADA: O agendamento deve conter ao menos 1 serviço.");
    }

    const valorTotalCentavos = this.itens.reduce((acc, item) => acc + item.precoCentavos, 0);
    const comissaoProfissionalCentavos = Math.round(valorTotalCentavos * (this.comissaoPercentual / 100));

    return { valorTotalCentavos, comissaoProfissionalCentavos };
  }

  /**
   * Amarração UML: Diagrama de Máquina de Estados
   * Transições Estritas: RESERVADO -> CONFIRMADO -> NA_CADEIRA -> CONCLUIDO
   */
  public transicionarPara(novoStatus: StatusAgendamento): void {
    const transicoesValidas: Record<StatusAgendamento, StatusAgendamento[]> = {
      'RESERVADO': ['CONFIRMADO', 'CANCELADO'],
      'CONFIRMADO': ['NA_CADEIRA', 'CANCELADO'],
      'NA_CADEIRA': ['CONCLUIDO'],
      'CONCLUIDO': [], // Estado terminal imutável
      'CANCELADO': []  // Estado terminal
    };

    const permitidos = transicoesValidas[this.status];
    if (!permitidos.includes(novoStatus)) {
      throw new Error(`INVARIANTE DE MÁQUINA DE ESTADOS VIOLADA: Transição ilegal de ${this.status} para ${novoStatus}.`);
    }

    // Invariante de Conclusão: Só conclui se houver itens válidos
    if (novoStatus === 'CONCLUIDO' && this.itens.length === 0) {
      throw new Error("INVARIANTE VIOLADA: Impossível concluir agendamento sem serviços executados.");
    }

    this.status = novoStatus;
  }
}
