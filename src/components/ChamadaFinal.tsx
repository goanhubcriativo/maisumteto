// O pedido no fim da página.
//
// A página terminava na lista de quem contribuiu e caía direto no rodapé. Quem
// leu tudo, se convenceu e chegou até ali não tinha para onde clicar: precisava
// rolar de volta ao topo. Fechar sem pedir é o erro mais caro de uma página de
// doação, porque desperdiça exatamente quem estava mais pronto para doar.
//
// O pedido é o valor que falta, em reais, e nada além disso. Já tentei fazer
// ele falar em etapa de obra ("faltam X para fincar o segundo piloti") e estava
// errado: piloti é jargão de quem já viveu um mutirão, e quem chega de fora não
// faz ideia do que seja.

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
  const falta = Math.max(0, metaCentavos - arrecadadoCentavos);

  return (
    <section className="fechamento">
      <div className="container fechamento-corpo">
        {falta > 0 ? (
          <>
            <p className="fechamento-sobre">Falta pouco</p>
            <h2 className="fechamento-titulo">
              {formatarBRL(falta)} separam esta família de uma casa.
            </h2>
            <p className="fechamento-texto">
              {apoiadores > 0 ? (
                <>
                  {apoiadores}{" "}
                  {apoiadores === 1
                    ? "pessoa já colocou dinheiro aqui"
                    : "pessoas já colocaram dinheiro aqui"}
                  . Qualquer valor encurta esse número, e ele só anda com gente
                  entrando.
                </>
              ) : (
                <>
                  Ninguém entrou ainda. A primeira doação é a que tira a casa do papel.
                </>
              )}
            </p>
          </>
        ) : (
          <>
            <p className="fechamento-sobre">Meta alcançada</p>
            <h2 className="fechamento-titulo">A casa está paga.</h2>
            <p className="fechamento-texto">
              {formatarBRL(metaCentavos)} levantados por {apoiadores}{" "}
              {apoiadores === 1 ? "pessoa" : "pessoas"}. Qualquer valor a partir de agora
              vai para a próxima família da fila.
            </p>
          </>
        )}

        <div className="fechamento-acoes">
          <a href="#ajudar" className="botao botao-acento botao-selo">
            Quero doar
          </a>
          <span className="fechamento-nota">PIX na hora, sem cadastro e sem senha.</span>
        </div>
      </div>
    </section>
  );
}
