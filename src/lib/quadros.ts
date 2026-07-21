// Os quadros de recorte de foto.
//
// Mora aqui, e nao dentro de CampoDeImagem, de proposito. CampoDeImagem e um
// componente "use client", e valor comum (nao componente) exportado de um
// modulo cliente NAO atravessa a fronteira para o servidor: as telas de painel
// sao server components e recebiam uma referencia de cliente no lugar do array,
// entao `.map` estourava em runtime. Constante compartilhada entre servidor e
// cliente precisa viver num modulo neutro como este.

/** Um quadro de recorte: o nome que aparece e a proporção real da página. */
export interface Quadro {
  /** Vira o nome do campo enviado: `${name}Foco${chave}`. */
  chave: string;
  nome: string;
  /** Proporção no formato do CSS aspect-ratio, ex.: "1425 / 554". */
  proporcao: string;
  valorInicial?: string | null;
}

/** Os dois recortes de verdade da capa da campanha, medidos na página publicada. */
export const QUADROS_DA_CAPA: Omit<Quadro, "valorInicial">[] = [
  { chave: "", nome: "Computador", proporcao: "1425 / 554" },
  { chave: "Mobile", nome: "Celular", proporcao: "375 / 442" },
];

/** O recorte do cartão de uma ação na grade da página. */
export const QUADRO_DA_ACAO: Omit<Quadro, "valorInicial">[] = [
  { chave: "", nome: "Cartão da ação", proporcao: "340 / 132" },
];
