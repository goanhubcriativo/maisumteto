// Desenha o texto rico na tela.
//
// Não usa dangerouslySetInnerHTML: cada pedaço vira elemento montado pelo
// React, então não há como o que foi digitado no painel virar código na página
// pública. Linha vazia continua valendo como respiro entre parágrafos.

import type { TextoRico } from "@/lib/textoRico";

export default function TextoRicoView({
  valor,
  className,
}: {
  valor: TextoRico | null | undefined;
  className?: string;
}) {
  if (!valor || valor.linhas.length === 0) return null;

  return (
    <div className={className}>
      {valor.linhas.map((linha, i) => {
        if (linha.length === 0) return <p key={i} className="texto-respiro" />;
        return (
          <p key={i}>
            {linha.map((p, j) => {
              let no: React.ReactNode = p.t;
              if (p.b) no = <strong>{no}</strong>;
              if (p.i) no = <em>{no}</em>;
              return (
                <span key={j} className={p.c ? `tx-${p.c}` : undefined}>
                  {no}
                </span>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}
