"use client";

// O menu da área da equipe.
//
// É client component por um motivo só: destacar onde a pessoa está. Sem a marca
// do item atual, um menu é um punhado de links soltos, e foi o que ele parecia.
// usePathname só existe no cliente, daí a diretiva.

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/painel", rotulo: "Campanha" },
  { href: "/painel/extrato", rotulo: "Extrato" },
  { href: "/painel/ferramentas", rotulo: "Caixa de ferramentas" },
  { href: "/painel/acessos", rotulo: "Acessos" },
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
            {item.rotulo}
          </Link>
        ))}
      </span>

      {/* "Ver a página" fica à parte: leva pra fora do painel, pro site público,
          então não é uma aba do menu e não recebe o destaque de item atual. */}
      <Link href="/" target="_blank" className="painel-nav-sair">
        Ver a página
      </Link>
    </nav>
  );
}
