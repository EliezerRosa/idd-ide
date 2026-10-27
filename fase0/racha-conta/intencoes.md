# Intenções — racha-conta

> Uma intenção por linha, no formato `- **INT-001** <frase>`, em EARS adaptado ao português.
> Termos de domínio entre colchetes duplos: [[Termo]] (devem existir em dicionario.json).
> Moldes: "O/A <sujeito> deve <resposta>." · "Quando <gatilho>, o/a <sujeito> deve ..." ·
> "Enquanto <estado>, ..." · "Se <condição>, então o/a <sujeito> deve ..." · "Onde <característica>, ..."
> Exemplo: `- **INT-001** Quando o cliente confirma o pedido, o [[Sistema]] deve registrar a venda.`
> Nada entra aqui sem decisão humana registrada em decisoes.md.
- **INT-001** O aplicativo deve dividir o preço de cada [[ItemConsumido]] somente entre os participantes que consumiram esse [[ItemConsumido]].
- **INT-003** O aplicativo deve exibir a cada [[Participante]] o valor exato da própria [[Cota]].
- **INT-004** O aplicativo deve permitir que cada [[Participante]] pague a própria [[Cota]] por Pix Copia e Cola ou QR Code para a [[ChavePix]] do [[ResponsavelMesa]].
- **INT-005** Quando o [[ResponsavelMesa]] cria a [[Mesa]], o aplicativo deve exigir a [[ChavePix]] do [[ResponsavelMesa]].
