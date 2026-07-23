// Texto com um pouco de formatação: negrito, itálico, cor e quebra de linha.
//
// O que fica guardado NÃO é HTML. É uma lista de linhas, e cada linha é uma
// lista de pedaços com bandeirinhas (negrito, itálico, cor). O motivo é
// segurança: guardar HTML escrito no navegador e depois jogar na página pública
// abriria a porta pra script injetado, e aí precisaria de um limpador de HTML
// pra confiar. Com pedaços, o que sai na tela são elementos que o React monta,
// e não existe caminho pra tag nenhuma virar código.
//
// A cor é um NOME, nunca um valor. "acao" vira a cor da ação (ocre, vinho, o
// que for), então trocar a cor da ação depois muda o texto junto, em vez de
// deixar um roxo velho preso no meio do parágrafo.

export type CorDeTexto = "preto" | "azul" | "acao";

export const CORES_DE_TEXTO: { valor: CorDeTexto; rotulo: string }[] = [
  { valor: "preto", rotulo: "Preto" },
  { valor: "azul", rotulo: "Azul Teto" },
  { valor: "acao", rotulo: "Cor da ação" },
];

export interface PedacoDeTexto {
  /** O texto em si. */
  t: string;
  b?: boolean;
  i?: boolean;
  c?: CorDeTexto;
}

export type LinhaDeTexto = PedacoDeTexto[];

export interface TextoRico {
  linhas: LinhaDeTexto[];
}

const NOMES: CorDeTexto[] = ["preto", "azul", "acao"];

/**
 * Lê o que veio do banco (JSON solto) e devolve só o que tem a forma certa.
 * Qualquer defeito vira null, e quem chama cai no texto simples.
 */
export function lerTextoRico(bruto: unknown): TextoRico | null {
  if (!bruto || typeof bruto !== "object") return null;
  const linhasCruas = (bruto as { linhas?: unknown }).linhas;
  if (!Array.isArray(linhasCruas)) return null;

  const linhas: LinhaDeTexto[] = [];
  for (const linha of linhasCruas) {
    if (!Array.isArray(linha)) continue;
    const pedacos: LinhaDeTexto = [];
    for (const p of linha) {
      if (!p || typeof p !== "object") continue;
      const t = (p as { t?: unknown }).t;
      if (typeof t !== "string" || t === "") continue;
      const c = (p as { c?: unknown }).c;
      pedacos.push({
        t,
        ...((p as { b?: unknown }).b === true ? { b: true } : {}),
        ...((p as { i?: unknown }).i === true ? { i: true } : {}),
        ...(typeof c === "string" && NOMES.includes(c as CorDeTexto)
          ? { c: c as CorDeTexto }
          : {}),
      });
    }
    linhas.push(pedacos);
  }

  return linhas.length > 0 ? { linhas } : null;
}

/** O mesmo texto sem formatação. Serve pro cartão, pro resumo e pra busca. */
export function textoSimples(rico: TextoRico | null | undefined): string {
  if (!rico) return "";
  return rico.linhas
    .map((linha) => linha.map((p) => p.t).join(""))
    .join("\n")
    .trim();
}

/** Texto antigo (sem formatação) vira texto rico, quebrando por linha. */
export function deTextoSimples(texto: string): TextoRico | null {
  const limpo = (texto ?? "").replace(/\r\n?/g, "\n");
  if (!limpo.trim()) return null;
  return { linhas: limpo.split("\n").map((l) => (l ? [{ t: l }] : [])) };
}

/** Se não sobrou nenhuma letra, é vazio (linha em branco não conta). */
export function textoRicoVazio(rico: TextoRico | null | undefined): boolean {
  return textoSimples(rico).length === 0;
}
