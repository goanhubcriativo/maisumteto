// A faixa torta que atravessa a página, correndo de lado.
//
// São duas camadas sobrepostas e inclinadas em sentidos opostos: a de trás na
// cor da campanha, a da frente no azul principal. A inclinação é o que tira a
// faixa da cara de "menu" e dá movimento antes mesmo de a animação começar.
//
// Serve de respiro entre a capa e as formas de ajudar, e já anuncia o que vem:
// os tipos de contribuição que a equipe montou.

import { rotuloDoTipo } from "@/components/icones";

interface Props {
  /** Os tipos de ação da campanha, na ordem em que aparecem. */
  tipos: string[];
  /** Cor da camada de trás. Sai da campanha, não é fixa no código. */
  corDeFundo?: string;
}

export default function FaixaCorrida({ tipos, corDeFundo }: Props) {
  const rotulos = [...new Set(tipos.map((t) => rotuloDoTipo[t] ?? "Ação"))];
  if (rotulos.length === 0) return null;

  // O trilho carrega a lista DUAS vezes. A animação desloca metade dele, então
  // no fim do ciclo a segunda cópia está exatamente onde a primeira começou e
  // a emenda não aparece.
  const trilho = [...rotulos, ...rotulos, ...rotulos, ...rotulos];

  return (
    <div className="faixa" aria-hidden="true">
      <div
        className="faixa-camada faixa-fundo"
        style={corDeFundo ? { background: corDeFundo } : undefined}
      />
      <div className="faixa-camada faixa-frente">
        <div className="faixa-trilho">
          {[0, 1].map((copia) => (
            <div className="faixa-metade" key={copia}>
              {trilho.map((r, i) => (
                <span className="faixa-item" key={`${copia}-${i}`}>
                  {r}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
