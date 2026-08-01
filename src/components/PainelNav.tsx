"use client";

// O menu da área da equipe.
//
// É client component por dois motivos: destacar onde a pessoa está (usePathname
// só existe no cliente) e, no celular, virar uma barra fininha lateral só de
// ícone + rótulo, em vez da faixa que rolava de lado e ficava ruim de usar.
// O mesmo markup serve pros dois: o CSS é que troca a arrumação (ver painel.css).

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Ícones pequenos do menu. Traço só, 20px, pra ler bem no ícone da barra. */
const svg = (d: React.ReactNode) => (
  <svg
    className="painel-nav-icone"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {d}
  </svg>
);

const ITENS = [
  {
    href: "/painel",
    rotulo: "Campanha",
    icone: svg(
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </>
    ),
  },
  {
    href: "/painel/pedidos",
    rotulo: "Pedidos",
    icone: svg(
      <>
        <path d="M3 7.5 12 3l9 4.5v9L12 21 3 16.5z" />
        <path d="M3 7.5 12 12l9-4.5M12 12v9" />
      </>
    ),
  },
  {
    href: "/painel/extrato",
    rotulo: "Extrato",
    icone: svg(
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M9 9h7M9 13h7M9 17h4" />
      </>
    ),
  },
  {
    href: "/painel/ferramentas",
    rotulo: "Ferramentas",
    icone: svg(
      <>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </>
    ),
  },
  {
    href: "/painel/campanhas",
    rotulo: "Campanhas",
    icone: svg(
      <>
        <path d="M12 3 3 7.5 12 12l9-4.5z" />
        <path d="M3 12l9 4.5 9-4.5M3 16.5 12 21l9-4.5" />
      </>
    ),
  },
  {
    href: "/painel/acessos",
    rotulo: "Acessos",
    icone: svg(
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
        <path d="M16 5.5a3 3 0 0 1 0 5.8M17.5 20a5.5 5.5 0 0 0-3-4.9" />
      </>
    ),
  },
];

export default function PainelNav() {
  const aqui = usePathname();

  /** A ação atual é a raiz do painel; a página de uma ação também mora nela. */
  function ativo(href: string): boolean {
    if (href === "/painel") return aqui === "/painel" || aqui.startsWith("/painel/acao");
    return aqui === href || aqui.startsWith(href + "/");
  }

  return (
    <nav className="painel-nav" aria-label="Seções do painel">
      <span className="painel-nav-grupo">
        {ITENS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`painel-nav-item${ativo(item.href) ? " ativo" : ""}`}
            aria-current={ativo(item.href) ? "page" : undefined}
          >
            {item.icone}
            <span className="painel-nav-rotulo">{item.rotulo}</span>
          </Link>
        ))}
      </span>

      {/* "Ver a página" fica à parte: leva pra fora do painel, pro site público,
          então não é uma aba do menu e não recebe o destaque de item atual. */}
      <Link href="/" target="_blank" className="painel-nav-sair">
        {svg(
          <>
            <path d="M14 4h6v6" />
            <path d="M20 4 11 13" />
            <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
          </>
        )}
        <span className="painel-nav-rotulo">Ver site</span>
      </Link>
    </nav>
  );
}
