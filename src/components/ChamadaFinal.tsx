// O pedido no fim da página.
//
// A página terminava na lista de quem contribuiu e caía direto no rodapé. Quem
// leu tudo, se convenceu e chegou até ali não tinha para onde clicar: precisava
// rolar de volta ao topo. Fechar sem pedir é o erro mais caro de uma página de
// doação, porque desperdiça exatamente quem estava mais pronto para doar.
//
// O pedido é o mesmo da obra, e não um "doe agora" genérico: a etapa da vez,
// com o valor que falta para ela.

import { faltaParaEtapa, percentual, proximaEtapa } from "@/lib/obra";
import { formatarBRL } from "@/lib/dinheiro";

interface Props {
  arrecadadoCentavos: number;
  metaCentavos: number;
  apoiadores: number;
}

export default function ChamadaFinal({
  arrecadadoCentavos,
  metaCentavos,
  apoiadores,
}: Props) {
  const pct = percentual(arrecadadoCentavos, metaCentavos);
  const proxima = proximaEtapa(pct);
  const falta = proxima ? faltaParaEtapa(proxima, arrecadadoCentavos, metaCentavos) : 0;

  return (
    <section className="fechamento">
      <div className="container fechamento-corpo">
        {proxima ? (
          <>
            <p className="fechamento-sobre">O próximo passo</p>
            <h2 className="fechamento-titulo">
              Faltam {formatarBRL(falta)} para {proxima.nome}.
            </h2>
            <p className="fechamento-texto">
              {apoiadores > 0 ? (
                <>
                  {apoiadores}{" "}
                  {apoiadores === 1
                    ? "pessoa já colocou dinheiro nesta casa"
                    : "pessoas já colocaram dinheiro nesta casa"}
                  . Falta a sua parte para a obra andar mais um pedaço.
                </>
              ) : (
                <>
                  Ninguém entrou ainda. A primeira doação é a que tira a obra do papel.
                </>
              )}
            </p>
          </>
        ) : (
          <>
            <p className="fechamento-sobre">Obra completa</p>
            <h2 className="fechamento-titulo">A casa está paga.</h2>
            <p className="fechamento-texto">
              A meta de {formatarBRL(metaCentavos)} foi alcançada por {apoiadores}{" "}
              {apoiadores === 1 ? "pessoa" : "pessoas"}. Qualquer valor a partir de agora
              vai para a próxima família da fila.
            </p>
          </>
        )}

        <div className="fechamento-acoes">
          <a href="#ajudar" className="botao botao-claro botao-grande">
            Ver as formas de ajudar
          </a>
          <span className="fechamento-nota">
            PIX na hora, sem cadastro e sem senha.
          </span>
        </div>
      </div>
    </section>
  );
}
