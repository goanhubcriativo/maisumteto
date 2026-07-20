// A cor da bolinha de cada pessoa.
//
// Todas iguais deixavam a lista com cara de tabela exportada. Sortear daria uma
// cor diferente a cada recarregamento, e quem voltasse na página não se
// reconheceria. Então a cor sai do próprio nome: é sempre a mesma para a mesma
// pessoa, sem guardar nada.
//
// Vive aqui, e não dentro de um componente, porque a lista de apoiadores e as
// bolinhas de prova social da capa precisam dar a MESMA cor para a mesma
// pessoa. Duas cópias divergiriam no primeiro ajuste.

const CORES = [
  "#0092dd",
  "#0d5fa6",
  "#12704a",
  "#1f7a8c",
  "#3b82bf",
  "#0f6d8c",
  "#155e75",
];

export function corDoNome(nome: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < nome.length; i++) {
    h = Math.imul(h ^ nome.charCodeAt(i), 0x01000193) >>> 0;
  }
  // Espalha os bits altos antes do resto. Sem esta mistura, um hash simples
  // deixa nomes parecidos na mesma cor e a lista aparece em blocos repetidos.
  h ^= h >>> 15;
  h = Math.imul(h, 0x2545f491) >>> 0;
  // O >>> 0 no fim NÃO é enfeite: XOR devolve inteiro COM SINAL, e um h
  // negativo daria índice negativo e cor indefinida.
  h = (h ^ (h >>> 13)) >>> 0;
  return CORES[h % CORES.length];
}
