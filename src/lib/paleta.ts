// A paleta das acoes.
//
// A regra do construtor continua valendo: quem monta a pagina nao escolhe cor
// livre. Mas cor nenhuma deixa tudo igual, e um bolao precisa ter cara de bolao,
// nao de formulario. O meio-termo e este: uma lista fechada de cores, todas
// testadas contra o branco e todas com contraste suficiente pra texto por cima.
//
// A cor pinta a ACAO (o cartao, a barra, o icone, a pagina dela), nunca a
// plataforma nem o cabecalho da campanha. Assim a identidade da Teto continua
// mandando na moldura, e a personalidade fica no conteudo.
//
// Toda cor daqui foi conferida com contraste >= 4.5:1 contra branco, que e o
// minimo pra texto normal ser legivel (WCAG AA). Ver testes/paleta.js.

export interface CorDaPaleta {
  id: string;
  nome: string;
  /**
   * O tom que aguenta TEXTO: cor de letra sobre branco e fundo de bloco com
   * letra branca por cima. Por isso passa em 4.5:1 contra o branco, sem exceção.
   */
  forte: string;
  /**
   * O tom da identidade, usado só onde a cor é mancha e nunca carrega texto:
   * a bolinha do seletor, a fatia do gráfico, o preenchimento da barra.
   *
   * Existe por causa do azul do logo. Ele é claro demais para segurar texto
   * (3,4:1 contra o branco), mas é ele que a pessoa reconhece como a cor da
   * Teto. Separar os dois papéis deixa a marca aparecer onde ela é só cor, e
   * mantém a leitura garantida onde há palavra escrita.
   *
   * Nas outras cores é igual ao forte, e aí não muda nada.
   */
  marca?: string;
  /** Fundo levissimo, pra chapar atras de icone e etiqueta. */
  fundo: string;
  /** Borda do fundo leve. */
  borda: string;
}

export const PALETA: CorDaPaleta[] = [
  {
    id: "logo",
    nome: "Azul Teto",
    forte: "#0a6ea9",
    marca: "#0092dd", // o azul do arquivo do logo
    fundo: "rgba(0, 146, 221, 0.08)",
    borda: "rgba(0, 146, 221, 0.18)",
  },
  {
    id: "teto",
    nome: "Azul",
    forte: "#0d5fa6",
    fundo: "rgba(0, 146, 221, 0.07)",
    borda: "rgba(0, 146, 221, 0.16)",
  },
  {
    id: "mar",
    nome: "Azul profundo",
    forte: "#074973",
    fundo: "rgba(7, 73, 115, 0.07)",
    borda: "rgba(7, 73, 115, 0.16)",
  },
  {
    id: "campo",
    nome: "Verde campo",
    forte: "#12704a",
    fundo: "rgba(18, 112, 74, 0.07)",
    borda: "rgba(18, 112, 74, 0.18)",
  },
  {
    id: "terra",
    nome: "Terracota",
    forte: "#a2452c",
    fundo: "rgba(162, 69, 44, 0.07)",
    borda: "rgba(162, 69, 44, 0.18)",
  },
  {
    id: "ocre",
    nome: "Ocre",
    forte: "#8a5a13",
    fundo: "rgba(138, 90, 19, 0.08)",
    borda: "rgba(138, 90, 19, 0.2)",
  },
  {
    id: "vinho",
    nome: "Vinho",
    forte: "#8d2f4e",
    fundo: "rgba(141, 47, 78, 0.07)",
    borda: "rgba(141, 47, 78, 0.18)",
  },
  {
    id: "roxo",
    nome: "Roxo",
    forte: "#5b3a8e",
    fundo: "rgba(91, 58, 142, 0.07)",
    borda: "rgba(91, 58, 142, 0.18)",
  },
  {
    id: "grafite",
    nome: "Grafite",
    forte: "#37474f",
    fundo: "rgba(55, 71, 79, 0.06)",
    borda: "rgba(55, 71, 79, 0.16)",
  },
];

export const COR_PADRAO = PALETA[0];

export function corDe(id: string | null | undefined): CorDaPaleta {
  return PALETA.find((c) => c.id === id) ?? COR_PADRAO;
}

/** O tom de mancha da cor: identidade quando existe, senão o mesmo forte. */
export function marcaDe(id: string | null | undefined): string {
  const c = corDe(id);
  return c.marca ?? c.forte;
}

/**
 * Sugestao de cor por tipo de acao.
 *
 * Nao e regra, e ponto de partida: a acao ja nasce com uma cor que combina com
 * o que ela e, e a pessoa troca se quiser. Escolher cor numa lista de oito e
 * facil; escolher do zero, sem referencia, e que trava.
 */
export const COR_SUGERIDA: Record<string, string> = {
  DOACAO: "logo",
  RIFA: "ocre",
  BINGO: "vinho",
  PRODUTO: "roxo",
  EVENTO: "terra",
  COLETA: "campo",
  LEILAO: "grafite",
  BOLAO: "campo",
  OUTRO: "logo",
};

/**
 * As variaveis CSS que a cor injeta. Ficam num objeto de estilo em linha, no
 * elemento da acao, entao o CSS continua sem saber quais cores existem: ele so
 * usa var(--acao-forte) e a cor certa chega de fora.
 */
export function estiloDaCor(id: string | null | undefined): React.CSSProperties {
  const c = corDe(id);
  return {
    ["--acao-forte" as string]: c.forte,
    ["--acao-marca" as string]: c.marca ?? c.forte,
    ["--acao-fundo" as string]: c.fundo,
    ["--acao-borda" as string]: c.borda,
  };
}
