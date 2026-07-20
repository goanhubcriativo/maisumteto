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
  /** Cor cheia: botao, barra preenchida, numero em destaque. */
  forte: string;
  /** Fundo levissimo, pra chapar atras de icone e etiqueta. */
  fundo: string;
  /** Borda do fundo leve. */
  borda: string;
}

export const PALETA: CorDaPaleta[] = [
  {
    id: "teto",
    nome: "Azul Teto",
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

/**
 * Sugestao de cor por tipo de acao.
 *
 * Nao e regra, e ponto de partida: a acao ja nasce com uma cor que combina com
 * o que ela e, e a pessoa troca se quiser. Escolher cor numa lista de oito e
 * facil; escolher do zero, sem referencia, e que trava.
 */
export const COR_SUGERIDA: Record<string, string> = {
  DOACAO: "teto",
  RIFA: "ocre",
  BINGO: "vinho",
  PRODUTO: "roxo",
  EVENTO: "terra",
  COLETA: "campo",
  LEILAO: "grafite",
  BOLAO: "campo",
  OUTRO: "teto",
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
    ["--acao-fundo" as string]: c.fundo,
    ["--acao-borda" as string]: c.borda,
  };
}
