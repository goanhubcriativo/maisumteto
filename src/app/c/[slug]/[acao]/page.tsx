// A pagina de uma acao.
//
// E pra onde vai quem clica num cartao da vitrine. Mostra o que a equipe montou
// no construtor (os blocos), quanto a acao ja rendeu e o que ela e.
//
// O botao de participar ainda nao existe porque o PIX nao esta ligado. Em vez de
// um botao que nao faz nada, a pagina diz a verdade: "ainda nao da pra pagar por
// aqui, fale com a equipe". Botao morto em pagina de doacao queima confianca.

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { buscarAcao, campanhaAtual, listarBlocos } from "@/lib/repositorio";
import { resumoCampanha } from "@/lib/extrato";
import { receitaDe } from "@/lib/catalogo";
import { formatarBRL, formatarBRLCurto } from "@/lib/dinheiro";
import { corDe, estiloDaCor } from "@/lib/paleta";
import { IconeCasa, IconeDaAcao, rotuloDoTipo } from "@/components/icones";
import Blocos from "@/components/Blocos";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string; acao: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { acao: slugDaAcao } = await params;
  const acao = await buscarAcao(slugDaAcao);
  if (!acao) return { title: "Ação não encontrada" };
  return {
    title: `${acao.titulo} · Casa Amiga`,
    description: acao.descricao ?? undefined,
  };
}

function dataCurta(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
}

export default async function PaginaDaAcao({ params }: Props) {
  const { slug, acao: slugDaAcao } = await params;

  const acao = await buscarAcao(slugDaAcao);
  if (!acao) notFound();

  // Rascunho nao tem pagina publica: se tivesse, bastaria adivinhar o endereco
  // pra ver o que a equipe ainda esta preparando.
  if (acao.rascunho) notFound();

  const [campanha, blocos] = await Promise.all([
    campanhaAtual(),
    listarBlocos({ tipo: "acao", id: acao.id }),
  ]);

  if (campanha.slug !== slug) notFound();

  const resumo = await resumoCampanha(campanha.id);
  const receita = receitaDe(acao.tipo);
  const cor = corDe(acao.cor);
  const falta = Math.max(0, resumo.metaCentavos - Math.max(0, resumo.liquidoCentavos));

  // Mesma regua do cartao: meta propria, senao o que falta no contrato.
  const meta = acao.metaCentavos && acao.metaCentavos > 0 ? acao.metaCentavos : falta;
  const pct = meta > 0 ? Math.max(0, Math.min(100, (acao.liquidoCentavos / meta) * 100)) : 0;

  return (
    <div style={estiloDaCor(acao.cor)}>
      <header className="topo">
        <div className="container topo-linha">
          <Link href="/" className="marca">
            <span className="marca-sinal">
              <IconeCasa />
            </span>
            <span className="marca-texto">
              Casa Amiga
              <em>{campanha.sede ?? "Teto Paraná"}</em>
            </span>
          </Link>
          <span className="topo-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-teto.png" alt="TETO" />
          </span>
        </div>
      </header>

      {/* A faixa usa a cor da acao, e nao o azul da campanha: e o que faz a
          pagina da rifa parecer da rifa, sem sair da identidade da Teto. */}
      <section className="hero acao-hero">
        <div className="container">
          <Link href="/" className="acao-voltar">
            Voltar para a campanha
          </Link>

          <span className="selo-acao">{rotuloDoTipo[acao.tipo] ?? "Ação"}</span>
          <h1 className="hero-titulo">{acao.titulo}</h1>
          {acao.descricao && <p className="acao-hero-desc">{acao.descricao}</p>}
        </div>
      </section>

      <main className="corpo">
        <div className="container">
          <section className="grande">
            <div className="grande-topo">
              <div>
                <div className="grande-valor" style={{ color: cor.forte }}>
                  {formatarBRL(Math.max(0, acao.liquidoCentavos))}
                </div>
                <div className="grande-rotulo">
                  já foram desta ação para a casa
                  {meta > 0 && (
                    <>
                      , de <strong>{formatarBRLCurto(meta)}</strong>
                    </>
                  )}
                </div>
              </div>

              <div className="grande-lado">
                {acao.precoCentavos != null && (
                  <div>
                    <div className="grande-apoio">{formatarBRL(acao.precoCentavos)}</div>
                    <div className="grande-apoio-rotulo">por unidade</div>
                  </div>
                )}
                {acao.estoqueTotal != null && (
                  <div>
                    <div className="grande-apoio">{acao.restante ?? 0}</div>
                    <div className="grande-apoio-rotulo">
                      de {acao.estoqueTotal} disponíveis
                    </div>
                  </div>
                )}
                {acao.fechaEm && (
                  <div>
                    <div className="grande-apoio">{dataCurta(acao.fechaEm)}</div>
                    <div className="grande-apoio-rotulo">até quando dá</div>
                  </div>
                )}
              </div>
            </div>

            {meta > 0 && (
              <>
                <div className="grafico">
                  <div
                    className="grafico-fatia"
                    style={{ width: `${pct}%`, background: cor.forte }}
                  />
                </div>
                <div className="grafico-regua">
                  <span>
                    <strong>{Math.floor(pct)}%</strong> da meta desta ação
                  </span>
                </div>
              </>
            )}
          </section>

          <div className="acao-conteudo">
            <div>
              {blocos.some((b) => b.visivel) ? (
                <Blocos
                  blocos={blocos}
                  ctx={{
                    arrecadadoCentavos: acao.liquidoCentavos,
                    metaCentavos: meta,
                    prazo: acao.fechaEm,
                  }}
                />
              ) : (
                <p className="vazio">A equipe ainda está montando esta página.</p>
              )}
            </div>

            <aside className="acao-lado">
              {/* Enquanto o PIX nao esta ligado, a pagina diz a verdade em vez
                  de mostrar um botao que nao leva a lugar nenhum. */}
              <div className="cartao">
                <p className="cartao-titulo">Como participar</p>
                <p className="acao-aviso">
                  O pagamento pelo site ainda está sendo ligado. Por enquanto, fale com a equipe{" "}
                  <strong>{campanha.equipeArrecadacao ?? campanha.equipe.nome}</strong> para
                  participar desta ação.
                </p>
              </div>

              {receita && (
                <div className="cartao cartao-azul">
                  <p className="cartao-titulo">Como funciona</p>
                  <ol className="acao-passos">
                    {receita.comoFunciona.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ol>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      <footer className="rodape">
        <div className="container rodape-linha">
          <span>
            <strong>{campanha.equipe.nome}</strong> · {campanha.sede ?? "TETO Paraná"}
          </span>
          <span className="rodape-links">
            <Link href="/">Ver a campanha inteira</Link>
            <Link href="/entrar" className="rodape-entrar">
              Área da equipe
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
