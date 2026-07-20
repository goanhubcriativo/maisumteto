import Link from "next/link";
import { ferramentas, rotuloEsforco } from "@/lib/catalogo";
import { formatarBRLCurto } from "@/lib/dinheiro";
import { IconeDaAcao } from "@/components/icones";

export const metadata = { title: "Caixa de ferramentas · Casa Amiga" };

export default function CaixaDeFerramentas() {
  const receitas = ferramentas();

  return (
    <div className="painel-largura">
      <div className="painel-cabeca">
        <div>
          <span className="painel-sobre">Caixa de ferramentas</span>
          <h1>O que a equipe vai fazer?</h1>
          <p className="painel-intro">
            Cada ferramenta já vem pronta: sabe o que perguntar, como calcular o custo e com que
            cara a página nasce. Você escolhe e personaliza.
          </p>
        </div>
      </div>

      <div className="ferramentas">
        {receitas.map((r) => (
          <Link key={r.tipo} href={`/painel/nova/${r.tipo}`} className="ferramenta">
            <span className="ferramenta-icone">
              <IconeDaAcao tipo={r.tipo} />
            </span>

            <span className="ferramenta-nome">{r.nome}</span>
            <span className="ferramenta-chamada">{r.chamada}</span>
            <p className="ferramenta-desc">{r.descricao}</p>

            <span className="ferramenta-pe">
              <span className="ferramenta-esforco" title="Quanto dá de trabalho">
                {"•".repeat(r.esforco)}
                <span className="ferramenta-esforco-texto">{rotuloEsforco(r.esforco)}</span>
              </span>
              {r.rendeTipico && (
                <span className="ferramenta-rende">
                  rende {formatarBRLCurto(r.rendeTipico.de)} a {formatarBRLCurto(r.rendeTipico.ate)}
                </span>
              )}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
