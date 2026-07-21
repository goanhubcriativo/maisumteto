// Os textos que são da Teto, e não da campanha.
//
// "Sobre a Teto" e "O contrato de Casa Amiga" explicam a organização e o
// modelo, e isso não muda de uma equipe para a outra. Enquanto eram campo do
// formulário, cada equipe tinha que reescrever a mesma coisa do zero, e cada
// versão contava a história de um jeito. Aqui é um texto só, revisado uma vez,
// igual em toda campanha.
//
// ATENÇÃO: este texto ainda PRECISA da revisão da Teto antes de qualquer
// divulgação. Foi escrito pela equipe, não por eles.

export const SOBRE_TETO = `A TETO é uma organização que atua em comunidades onde falta o básico: água encanada, saneamento, piso, parede, telhado. O trabalho não é feito para os moradores, é feito com eles. Cada construção começa por uma conversa com a família e termina com a casa erguida em mutirão, num fim de semana, por voluntários e moradores lado a lado.

A casa emergencial não resolve tudo, e ninguém aqui finge que resolve. Ela tira uma família do chão de terra, do frio e da chuva, e cria o ponto de partida para o resto: documentação, trabalho, escola, a briga por moradia definitiva.

Quem sustenta isso é a doação. Cada casa depende de um grupo de pessoas decidindo que aquela casa vai existir. É exatamente o que está acontecendo aqui.`;

export const SOBRE_CONTRATO = `Um contrato de Casa Amiga é o compromisso de um grupo de até 30 pessoas em bancar uma casa inteira, do começo ao fim.

O grupo assume a meta, se organiza para levantar o valor e acompanha a construção. No fim, a casa tem nome, endereço e uma família morando dentro.

A equipe desta campanha decidiu que não ia só pedir doação: cada um entrou com o que sabe fazer.`;

/** A frase que aparece no Google e no compartilhamento do link. */
export const CHAMADA =
  "Campanha de arrecadação voluntária para erguer uma casa emergencial pela TETO. " +
  "Pagamento por PIX e extrato público.";

/** Quebra o texto em parágrafos, do jeito que a página desenha. */
export function paragrafos(texto: string): string[] {
  return texto
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);
}
