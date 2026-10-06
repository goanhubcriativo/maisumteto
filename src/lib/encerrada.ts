// A campanha foi encerrada pela organização.
//
// Enquanto ENCERRADA for true, o site PÚBLICO para de arrecadar: a home aparece
// finalizada, a página de cada ação some com o formulário, e a API de pagamento
// recusa (a trava de verdade, pra ninguém pagar por um link antigo). O painel da
// equipe segue normal: eles ainda veem extrato, pedidos e lançam na mão.
//
// É um interruptor só: virar para false devolve o site ao normal.

export const CAMPANHA_ENCERRADA = true;

/** O valor total a mostrar na barra, já que a campanha fechou (R$ 3.579,00). */
export const TOTAL_ENCERRADA_CENTAVOS = 357900;

/** Telefone da equipe de arrecadação, pra quem ainda quiser contribuir. */
export const TELEFONE_EQUIPE = "(41) 99774.9827";

/** O texto da faixa azul de aviso. */
export const AVISO_ENCERRADA = `Essa plataforma foi encerrada. Para contribuir com essa campanha, entre em contato com a equipe de arrecadação pelo telefone ${TELEFONE_EQUIPE}.`;
