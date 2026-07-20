// A obra em etapas, escrita por extenso.
//
// O desenho da casa dá a emoção; esta trilha dá a conta. Juntos respondem a
// pergunta que faz alguém doar: "o que exatamente o meu dinheiro compra agora?".
//
// A etapa da vez fica maior e carrega o valor que falta, porque ela é o pedido.
// As já pagas continuam na tela, e não somem: elas são a prova de que a campanha
// anda, e prova de movimento convence mais do que promessa.

import {
  ETAPAS,
  custoDaEtapa,
  faltaParaEtapa,
  percentual,
  proximaEtapa,
} from "@/lib/obra";
import { formatarBRL } from "@/lib/dinheiro";
import Revelar from "@/components/Revelar";

interface Props {
  arrecadadoCentavos: number;
  metaCentavos: number;
}

export default function EtapasDaObra({ arrecadadoCentavos, metaCentavos }: Props) {
  const pct = percentual(arrecadadoCentavos, metaCentavos);
  const proxima = proximaEtapa(pct);
  const feitas = ETAPAS.filter((e) => pct >= e.em).length;

  return (
    <section className="secao" id="etapas">
      <div className="secao-cabeca">
        <h2 className="secao-titulo">As etapas da obra</h2>
        <p className="secao-intro">
          O contrato de {formatarBRL(metaCentavos)} dividido no que ele constrói.{" "}
          {feitas > 0 ? (
            <>
              <strong>
                {feitas} {feitas === 1 ? "etapa já está paga" : "etapas já estão pagas"}
              </strong>
              {proxima ? <> e a próxima é {proxima.nome}.</> : "."}
            </>
          ) : (
            <>A primeira é {ETAPAS[0].nome}.</>
          )}
        </p>
      </div>

      <ol className="trilha">
        {ETAPAS.map((etapa, i) => {
          const paga = pct >= etapa.em;
          const agora = proxima?.chave === etapa.chave;
          const falta = faltaParaEtapa(etapa, arrecadadoCentavos, metaCentavos);

          return (
            <Revelar
              como="li"
              key={etapa.chave}
              atraso={Math.min(i * 45, 400)}
              className={`etapa${paga ? " etapa-paga" : ""}${agora ? " etapa-agora" : ""}`}
            >
              <span className="etapa-marca" aria-hidden="true">
                {paga ? (
                  <svg viewBox="0 0 24 24" className="etapa-visto">
                    <path
                      d="M5 12.5 L10 17.5 L19 7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>

              <span className="etapa-corpo">
                <span className="etapa-nome">{etapa.curto}</span>
                <span className="etapa-valor">
                  {paga ? (
                    "pago"
                  ) : agora ? (
                    <>faltam {formatarBRL(falta)}</>
                  ) : (
                    formatarBRL(custoDaEtapa(etapa, metaCentavos))
                  )}
                </span>
              </span>

              {/* O leitor de tela recebe a frase inteira: a trilha visual sozinha
                  viraria uma sequência de números soltos. */}
              <span className="apenas-leitor">
                {etapa.curto}:{" "}
                {paga
                  ? "etapa paga."
                  : agora
                    ? `etapa da vez, faltam ${formatarBRL(falta)} para ${etapa.nome}.`
                    : `ainda não alcançada, fecha em ${formatarBRL(custoDaEtapa(etapa, metaCentavos))}.`}
              </span>
            </Revelar>
          );
        })}
      </ol>

      <p className="trilha-nota">
        Esta é a forma como a equipe repartiu a própria meta para mostrar o avanço da
        obra. Não é uma tabela de preços da Teto: o que vem do contrato é o total de{" "}
        {formatarBRL(metaCentavos)}.
      </p>
    </section>
  );
}
