/**
 * ==============================================================================
 * APP RACHA DE CONTA & PIX - REGRAS DE DOMÍNIO E SOMA ZERO (IDD)
 * Correspondência: Intenção -> Invariante -> UML -> Código
 * ==============================================================================
 */

export type StatusMesa = 'ABERTA' | 'EM_RATEIO' | 'AGUARDANDO_PAGAMENTO' | 'LIQUIDADA';

export interface ItemConsumido {
  id: string;
  descricao: string;
  precoCentavos: number;
  consumidoresIds: string[];
}

export interface Participante {
  id: string;
  nome: string;
  valorAPagarCentavos: number;
  pago: boolean;
}

export class MesaRachaDominio {
  public id: string;
  public titulo: string;
  public taxaServicoPercentual: number;
  public status: StatusMesa;
  public participantes: Map<string, Participante>;
  public itens: ItemConsumido[];

  constructor(id: string, titulo: string, taxaServicoPercentual: number = 10.0) {
    this.id = id;
    this.titulo = titulo;
    this.taxaServicoPercentual = taxaServicoPercentual;
    this.status = 'ABERTA';
    this.participantes = new Map();
    this.itens = [];
  }

  public adicionarParticipante(id: string, nome: string): void {
    if (this.status !== 'ABERTA') throw new Error("INVARIANTE: Novos participantes só na mesa ABERTA.");
    this.participantes.set(id, { id, nome, valorAPagarCentavos: 0, pago: false });
  }

  public adicionarItem(id: string, descricao: string, precoCentavos: number, consumidoresIds: string[]): void {
    if (consumidoresIds.length === 0) {
      throw new Error("INVARIANTE VIOLADA: Todo item deve ter ao menos 1 consumidor associado.");
    }
    for (const cId of consumidoresIds) {
      if (!this.participantes.has(cId)) {
        throw new Error(`INVARIANTE VIOLADA: Consumidor ${cId} não pertence a esta mesa.`);
      }
    }
    this.itens.push({ id, descricao, precoCentavos, consumidoresIds });
  }

  /**
   * CÁLCULO DA INVARIANTE DA SOMA ZERO COM DISTRIBUIÇÃO JUSTA DE CENTAVOS
   */
  public calcularRateioJusto(): void {
    // 1. Zerar saldos
    for (const part of this.participantes.values()) {
      part.valorAPagarCentavos = 0;
    }

    // 2. Distribuir itens
    for (const item of this.itens) {
      const n = item.consumidoresIds.length;
      const cotaBase = Math.floor(item.precoCentavos / n);
      let restoCentavos = item.precoCentavos % n;

      for (const cId of item.consumidoresIds) {
        const p = this.participantes.get(cId)!;
        p.valorAPagarCentavos += cotaBase;
        // Distribuir resto de centavos para garantir soma zero
        if (restoCentavos > 0) {
          p.valorAPagarCentavos += 1;
          restoCentavos--;
        }
      }
    }

    // 3. Aplicar taxa de serviço proporcional sem quebrar a soma zero:
    //    arredonda o TOTAL uma única vez e reparte os centavos pelo maior resto
    //    (arredondar pessoa a pessoa fazia a soma divergir do total — ex.: R$ 10,00 / 3 com 10%).
    const partes = Array.from(this.participantes.values());
    const subtotal = partes.reduce((acc, p) => acc + p.valorAPagarCentavos, 0);
    if (subtotal === 0) return;
    const totalComTaxa = this.totalComTaxaCentavos();
    const cotas = partes.map(p => {
      const exata = (p.valorAPagarCentavos * totalComTaxa) / subtotal;
      return { p, base: Math.floor(exata), resto: exata - Math.floor(exata) };
    });
    let sobra = totalComTaxa - cotas.reduce((acc, c) => acc + c.base, 0);
    cotas.sort((a, b) => b.resto - a.resto || a.p.id.localeCompare(b.p.id));
    for (const c of cotas) {
      c.p.valorAPagarCentavos = c.base + (sobra > 0 ? 1 : 0);
      if (sobra > 0) sobra--;
    }
  }

  /** Total da mesa com taxa de serviço, arredondado uma única vez. */
  public totalComTaxaCentavos(): number {
    const subtotal = this.itens.reduce((acc, i) => acc + i.precoCentavos, 0);
    return Math.round((subtotal * (100 + this.taxaServicoPercentual)) / 100);
  }

  /**
   * CHECAGEM EM TEMPO DE EXECUÇÃO DA INVARIANTE DA SOMA ZERO
   */
  public validarInvarianteSomaZero(totalEsperadoCentavos: number): boolean {
    const somaCalculada = Array.from(this.participantes.values())
      .reduce((acc, p) => acc + p.valorAPagarCentavos, 0);

    // Margem de erro permitida: ZERO centavos
    if (somaCalculada !== totalEsperadoCentavos) {
      throw new Error(`INVARIANTE DA SOMA ZERO VIOLADA: Total esperado ${totalEsperadoCentavos} != Soma calculada ${somaCalculada}`);
    }
    return true;
  }
}
