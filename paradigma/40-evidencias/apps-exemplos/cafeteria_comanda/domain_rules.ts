/**
 * ==============================================================================
 * APP CAFETERIA & PADARIA - REGRAS DE DOMÍNIO E MÁQUINA DE ESTADOS (IDD)
 * Correspondência: Intenção -> Invariante -> UML -> Código
 * ==============================================================================
 */

export type StatusComanda = 'RECEBIDO' | 'EM_PREPARO' | 'PRONTO' | 'ENTREGUE' | 'CANCELADO';

export interface ItemPedido {
  produtoId: string;
  nome: string;
  quantidade: number;
  precoUnitarioCentavos: number;
}

export class ComandaDominio {
  public id: string;
  public numeroMesa: number;
  public status: StatusComanda;
  public itens: ItemPedido[];
  public descontoCentavos: number;
  public pago: boolean;

  constructor(id: string, numeroMesa: number) {
    if (numeroMesa <= 0) {
      throw new Error("INVARIANTE VIOLADA: Número de mesa deve ser positivo.");
    }
    this.id = id;
    this.numeroMesa = numeroMesa;
    this.status = 'RECEBIDO';
    this.itens = [];
    this.descontoCentavos = 0;
    this.pago = false;
  }

  public adicionarItem(item: ItemPedido): void {
    if (this.status !== 'RECEBIDO') {
      throw new Error("INVARIANTE VIOLADA: Itens só podem ser adicionados enquanto a comanda está em RECEBIDO.");
    }
    if (item.quantidade <= 0) {
      throw new Error("INVARIANTE VIOLADA: Quantidade do item deve ser maior que zero.");
    }
    this.itens.push(item);
  }

  public aplicarDescontoCupom(valorCentavos: number): void {
    const subtotal = this.calcularSubtotalCentavos();
    if (valorCentavos > subtotal) {
      throw new Error("INVARIANTE VIOLADA: O desconto não pode ser superior ao valor do pedido.");
    }
    this.descontoCentavos = valorCentavos;
  }

  public calcularSubtotalCentavos(): number {
    return this.itens.reduce((acc, it) => acc + (it.precoUnitarioCentavos * it.quantidade), 0);
  }

  public calcularTotalFinalCentavos(): number {
    const total = this.calcularSubtotalCentavos() - this.descontoCentavos;
    if (total < 0) throw new Error("INVARIANTE VIOLADA: Total final não pode ser negativo.");
    return total;
  }

  public transicionarPara(novoStatus: StatusComanda): void {
    const transicoesValidas: Record<StatusComanda, StatusComanda[]> = {
      'RECEBIDO': ['EM_PREPARO', 'CANCELADO'],
      'EM_PREPARO': ['PRONTO', 'CANCELADO'],
      'PRONTO': ['ENTREGUE'],
      'ENTREGUE': [],
      'CANCELADO': []
    };

    if (!transicoesValidas[this.status].includes(novoStatus)) {
      throw new Error(`INVARIANTE VIOLADA: Transição proibida de ${this.status} para ${novoStatus}.`);
    }

    // Invariante de Entrega: Só entrega se a comanda foi paga
    if (novoStatus === 'ENTREGUE' && !this.pago) {
      throw new Error("INVARIANTE DE PAGAMENTO VIOLADA: Impossível entregar comanda não liquidada no caixa!");
    }

    this.status = novoStatus;
  }

  public registrarPagamento(): void {
    this.pago = true;
  }
}
