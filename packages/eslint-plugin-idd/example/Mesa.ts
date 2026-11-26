export interface Item {
  nome: string;
  precoCentavos: number;
}

export interface CotaAmigo {
  amigo: string;
  valorCentavos: number;
}

export class Mesa {
  readonly id: string;
  totalCentavos: number = 0;
  status: 'aberta' | 'fechada' = 'aberta';
  fechada_em: string | null = null;
  itens: Item[] = [];

  constructor(id: string) {
    this.id = id;
  }

  /**
   * @intent Mesa.adicionarItem
   * @mutates itens, totalCentavos
   * @readonly id, status, fechada_em
   */
  adicionarItem(nome: string, precoCentavos: number): void {
    if (this.status === 'fechada') {
      throw new Error('Não é possível adicionar itens em mesa fechada');
    }
    if (precoCentavos <= 0) {
      throw new Error('Preço deve ser positivo');
    }
    this.itens.push({ nome, precoCentavos });
    this.totalCentavos += precoCentavos;
  }

  /**
   * @intent Mesa.fechar
   * @mutates status, fechada_em
   * @readonly id, totalCentavos, itens
   */
  fechar(): void {
    if (this.status === 'fechada') {
      throw new Error('Mesa já se encontra fechada');
    }
    this.status = 'fechada';
    this.fechada_em = new Date().toISOString();
  }

  /**
   * @intent Mesa.calcularCotas
   * @mutates nenhum
   * @readonly id, totalCentavos, status, fechada_em, itens
   * @invariant conservacaoCentavos: soma(cotas) == totalCentavos
   */
  calcularCotas(amigos: string[]): CotaAmigo[] {
    if (!amigos || amigos.length === 0) {
      throw new Error('Pelo menos um participante deve ser informado para divisão');
    }

    const n = amigos.length;
    const baseCota = Math.floor(this.totalCentavos / n);
    const resto = this.totalCentavos % n;

    // Distribuição determinística do resto centavo a centavo para os primeiros R amigos
    return amigos.map((amigo, index) => {
      const valorCentavos = baseCota + (index < resto ? 1 : 0);
      return { amigo, valorCentavos };
    });
  }
}

