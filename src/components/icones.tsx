// Iconografia das acoes.
//
// Tracado, nao emoji: o emoji muda de desenho em cada aparelho e puxa a pagina
// pra cara de app generico. Aqui todos seguem o mesmo contrato (24x24,
// currentColor, traco 1.6) pra parecerem uma familia, nao um ajuntamento.

import type { ReactElement } from "react";

interface Props {
  className?: string;
}

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Doacao: mao oferecendo. */
export function IconeDoacao({ className }: Props) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M3 13.5c1.6-1 3-.7 4.2.3l2.3 2h3.1c.9 0 1.6.7 1.6 1.5s-.7 1.5-1.6 1.5H9.6" />
      <path d="M7.2 16.9 4.6 21" />
      <path d="M12.6 17.3h2.7c1 0 1.9-.4 2.6-1.1l2.6-2.6c.7-.7.7-1.7 0-2.3-.6-.6-1.6-.6-2.3 0l-2.1 2" />
      <path d="M12 8.6 9.9 6.7a2 2 0 0 1 2.8-2.8l-.7.7.7-.7a2 2 0 0 1 2.8 2.8L13 8.6a.7.7 0 0 1-1 0Z" />
    </svg>
  );
}

/** Bolao: bola. */
export function IconeBolao({ className }: Props) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7.4 3.6 2.6-1.4 4.3H9.8L8.4 10 12 7.4Z" />
      <path d="M12 3v4.4M20.6 10l-5 0M18.6 18.6l-4.4-4.3M5.4 18.6l4.4-4.3M3.4 10l5 0" />
    </svg>
  );
}

/** Rifa: bilhete picotado. */
export function IconeRifa({ className }: Props) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M3 8.5V6.8c0-.5.4-.8.8-.8h16.4c.4 0 .8.3.8.8v1.7a2 2 0 0 0 0 7v1.7c0 .5-.4.8-.8.8H3.8a.8.8 0 0 1-.8-.8v-1.7a2 2 0 0 0 0-7Z" />
      <path d="M9.4 9.2v5.6" strokeDasharray="1.6 2" />
    </svg>
  );
}

/** Produto: camiseta. */
export function IconeProduto({ className }: Props) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M8.6 3.5 4 5.6l1.6 4 2-.7V20c0 .3.2.5.5.5h7.8c.3 0 .5-.2.5-.5V8.9l2 .7 1.6-4-4.6-2.1" />
      <path d="M8.6 3.5a3.4 3.4 0 0 0 6.8 0" />
    </svg>
  );
}

/** Evento: calendario. */
export function IconeEvento({ className }: Props) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <rect x="3.2" y="5.2" width="17.6" height="15.6" rx="1.6" />
      <path d="M3.2 9.8h17.6M8 3.2v3.4M16 3.2v3.4" />
      <path d="M7.4 13.6h3v3h-3z" />
    </svg>
  );
}

/**
 * A casinha do logo da Teto: a que mora dentro do "O" de TETO.
 *
 * Preenchida, nao de traco: e a marca, nao um icone de interface. Vem em duas
 * pecas, igual ao original (o corpo com o telhado e a barra da base soltas).
 * Herda a cor de quem chama por currentColor.
 */
export function IconeCasa({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 4.3 21 12.6h-3.5v4.2h-11v-4.2H3z" />
      <rect x="6.5" y="18.1" width="11" height="1.9" rx="0.5" />
    </svg>
  );
}

/** Doacao recorrente: o ciclo que se repete. */
export function IconeRecorrente({ className }: Props) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M20.4 12a8.4 8.4 0 0 1-14.6 5.7" />
      <path d="M3.6 12a8.4 8.4 0 0 1 14.6-5.7" />
      <path d="M18.2 2.9v3.4h-3.4M5.8 21.1v-3.4h3.4" />
    </svg>
  );
}

/** Bingo: a cartela. */
export function IconeBingo({ className }: Props) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <rect x="3.2" y="4.2" width="17.6" height="15.6" rx="1.6" />
      <path d="M3.2 9.4h17.6M9 9.4v10.4M15 9.4v10.4" />
      <circle cx="6.1" cy="12.6" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="16.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Coleta: o cofrinho levado pra rua. */
export function IconeColeta({ className }: Props) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M20.4 13.2c0 3.5-3.3 6.4-7.4 6.4-1 0-1.9-.2-2.8-.5l-3.5 1.4.6-2.5a6 6 0 0 1-1.7-4.8c0-3.5 3.3-6.4 7.4-6.4s7.4 2.9 7.4 6.4Z" />
      <path d="M13 4.2v3.6" />
      <path d="M10.9 13.2h4.2M13 11.1v4.2" />
    </svg>
  );
}

/** Leilao: o martelo. */
export function IconeLeilao({ className }: Props) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M4.4 20.6h8.8" />
      <path d="M10.4 5.6 15.8 3.2l5.2 5.2-2.4 5.4z" />
      <path d="m13.4 8.6-7 7" />
      <path d="M5.2 14.4 8.4 17.6" />
    </svg>
  );
}

/** Outro: marreta, o gesto de mutirao. */
export function IconeOutro({ className }: Props) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="m3.6 20.4 8.2-8.2" />
      <path d="M11 8.4 15.6 3.8a1 1 0 0 1 1.4 0l3.2 3.2a1 1 0 0 1 0 1.4L15.6 13a1 1 0 0 1-1.4 0L11 9.8a1 1 0 0 1 0-1.4Z" />
    </svg>
  );
}

// React 19 tirou o namespace JSX global: o tipo do elemento vem de react.
const porTipo: Record<string, (p: Props) => ReactElement> = {
  DOACAO: IconeDoacao,
  DOACAO_RECORRENTE: IconeRecorrente,
  BOLAO: IconeBolao,
  RIFA: IconeRifa,
  BINGO: IconeBingo,
  PRODUTO: IconeProduto,
  EVENTO: IconeEvento,
  COLETA: IconeColeta,
  LEILAO: IconeLeilao,
  OUTRO: IconeOutro,
};

/** Escolhe o icone pelo tipo da acao. Tipo desconhecido cai no generico. */
export function IconeDaAcao({ tipo, className }: { tipo: string; className?: string }) {
  const Icone = porTipo[tipo] ?? IconeOutro;
  return <Icone className={className} />;
}

// Precisa cobrir TODO tipo do catalogo: o que faltar aqui cai no generico
// "Ação" e a etiqueta do cartao deixa de dizer o que aquilo e.
export const rotuloDoTipo: Record<string, string> = {
  DOACAO: "Doação",
  DOACAO_RECORRENTE: "Recorrente",
  BOLAO: "Bolão",
  RIFA: "Rifa",
  BINGO: "Bingo",
  PRODUTO: "Produto",
  EVENTO: "Evento",
  COLETA: "Coleta",
  LEILAO: "Leilão",
  OUTRO: "Ação",
};
