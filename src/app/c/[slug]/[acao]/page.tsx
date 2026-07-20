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
import {
  apoiadoresDaAcao,
  buscarAcao,
  campanhaAtual,
  listarBlocos,
  resultadoDaAcao,
} from "@/lib/repositorio";
import { resumoCampanha } from "@/lib/extrato";
import { receitaDe } from "@/lib/catalogo";
import { formatarBRL, formatarBRLCurto } from "@/lib/dinheiro";
import { corDe, estiloDaCor } from "@/lib/paleta";
import { IconeCasa, IconeDaAcao, rotuloDoTipo } from "@/components/icones";
import Blocos from "@/components/Blocos";
import FormularioDeApoio from "@/components/FormularioDeApoio";

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

/**
 * Como chamar uma participacao, por tipo de acao.
 *
 * "58 participacoes" nao diz nada; "58 palpites" conta a historia. O numero e o
 * mesmo, mas a palavra certa e o que faz alguem entender o que aconteceu ali.
 */
function rotuloParticipacao(tipo: string, quantos: number): string {
  const um = quantos === 1;
  return (
    {
      BOLAO: um ? "palpite" : "palpites",
      RIFA: um ? "número vendido" : "números vendidos",
      BINGO: um ? "cartela vendida" : "cartelas vendidas",
      PRODUTO: um ? "unidade vendida" : "unidades vendidas",
      EVENTO: um ? "ingresso vendido" : "ingressos vendidos",
      LEILAO: um ? "lance vencedor" : "lances vencedores",
    }[tipo] ?? (um ? "participação" : "participações")
  );
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

  // Acabou = encerrada ou esgotada. Nesses dois casos a pagina deixa de ser
  // convite e vira prestacao de contas: quanto rendeu, quanta gente entrou,
  // como foi. E o que as pessoas procuram depois, e o que ensina quem vai
  // organizar a proxima.
  const acabou = acao.motivo === "ENCERRADA" || acao.motivo === "ESGOTADO";

  const [campanha, blocos, resultado, quemEntrou] = await Promise.all([
    campanhaAtual(),
    listarBlocos({ tipo: "acao", id: acao.id }),
    acabou ? resultadoDaAcao(acao.id) : null,
    acabou ? apoiadoresDaAcao(acao.id) : [],
  ]);

  if (campanha.slug !== slug) notFound();

  const resumo = await resumoCampanha(campanha.id);
  const receita = receitaDe(acao.tipo);
  const cor = corDe(acao.cor);
  const falta = Math.max(0, resumo.metaCentavos - Math.max(0, resumo.liquidoCentavos));

  // Mesma regua do cartao: meta propria, senao o que falta no contrato.
  const meta = acao.metaCentavos && acao.metaCentavos > 0 ? acao.metaCentavos : falta;

  // Os atalhos de valor saem da configuração da ação (a equipe define na criação).
  // Sem eles, quem não sabe quanto dar trava na hora de escolher.
  // Quantas cobrancas cabem ate a campanha acabar. E o que transforma
  // "R$ 20 por mes" em "R$ 160 no total", que e o numero que a pessoa precisa
  // ver antes de assumir um compromisso.
  const fim = acao.fechaEm ?? campanha.prazo;
  const diasAteOFim = fim ? Math.max(0, Math.ceil((fim.getTime() - Date.now()) / 864e5)) : 0;

  // Sem prazo definido nao da pra dizer quantas cobrancas serao, e chutar "1"
  // seria pior do que nao dizer: a pessoa acharia que e cobranca unica.
  const parcelasAte =
    diasAteOFim > 0
      ? {
          SEMANAL: Math.max(1, Math.floor(diasAteOFim / 7)),
          MENSAL: Math.max(1, Math.floor(diasAteOFim / 30)),
        }
      : undefined;
  const periodicidades = String(acao.config?.periodicidades ?? "AMBAS");

  const sugeridosCrus = acao.config?.valoresSugeridos;
  const valoresSugeridos = Array.isArray(sugeridosCrus)
    ? sugeridosCrus.map((v) => Number(String(v).replace(/\D/g, ""))).filter((n) => n > 0)
    : [20, 50, 100, 200];
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

          {/* O fechamento da acao, so quando ela ja acabou. */}
          {acabou && resultado && (
            <section className="resultado">
              <div className="resultado-cabeca">
                <h2>Como foi</h2>
                <p>
                  Esta ação está encerrada. Fica no ar para quem quiser ver o
                  resultado e para servir de ideia na próxima.
                </p>
              </div>

              <div className="resultado-numeros">
                <div>
                  <span className="numero">{formatarBRL(resultado.brutoCentavos)}</span>
                  <span className="resultado-rotulo">arrecadados</span>
                </div>
                <div>
                  <span className="numero">{resultado.apoiadores}</span>
                  <span className="resultado-rotulo">
                    {resultado.apoiadores === 1 ? "pessoa entrou" : "pessoas entraram"}
                  </span>
                </div>
                {resultado.participacoes > 0 && (
                  <div>
                    <span className="numero">{resultado.participacoes}</span>
                    <span className="resultado-rotulo">
                      {rotuloParticipacao(acao.tipo, resultado.participacoes)}
                    </span>
                  </div>
                )}
                <div>
                  <span className="numero" style={{ color: cor.forte }}>
                    {formatarBRL(resultado.liquidoCentavos)}
                  </span>
                  <span className="resultado-rotulo">foram para a casa</span>
                </div>
              </div>

              {/* A conta aberta: bruto menos o que saiu. Sem isso, "arrecadou X
                  e foram Y para a casa" pareceria pegadinha. */}
              {(resultado.custoCentavos > 0 || resultado.taxaCentavos > 0) && (
                <p className="resultado-conta">
                  Dos {formatarBRL(resultado.brutoCentavos)} que entraram,{" "}
                  {resultado.custoCentavos > 0 && (
                    <>
                      <strong>{formatarBRL(resultado.custoCentavos)}</strong> foram o custo da
                      ação{resultado.taxaCentavos > 0 ? " e " : ". "}
                    </>
                  )}
                  {resultado.taxaCentavos > 0 && (
                    <>
                      <strong>{formatarBRL(resultado.taxaCentavos)}</strong> ficaram na taxa do
                      PIX.{" "}
                    </>
                  )}
                  O resto foi inteiro para a casa.
                </p>
              )}

              {quemEntrou.length > 0 && (
                <div className="resultado-gente">
                  <p className="cartao-titulo">Quem entrou nessa</p>
                  <div className="nomes">
                    {quemEntrou.map((a) => (
                      <span key={a.id} className={`nome${a.anonimo ? " calmo" : ""}`}>
                        {a.nome}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Formulário e passos LADO A LADO. Os passos são curtos e cabem
              folgado na coluna que sobrava, e ficam onde a dúvida aparece: na
              hora de preencher. Empilhados, o "como funciona" ia parar longe
              demais do momento em que ele resolve alguma coisa. */}
          {!acabou && (
            <section className="participar-grade">
              <div className="participar-caixa">
                <h2 className="participar-titulo">
                  {acao.tipo === "DOACAO" ? "Fazer uma doação" : "Participar"}
                </h2>
                <FormularioDeApoio
                  acaoId={acao.id}
                  tipo={acao.tipo}
                  periodicidades={periodicidades}
                  parcelasAte={parcelasAte}
                  precoCentavos={acao.precoCentavos}
                  restante={acao.restante}
                  valoresSugeridos={valoresSugeridos}
                  corForte={cor.forte}
                />
              </div>

              {receita && receita.comoParticipar.length > 0 && (
                <aside className="participar-passos">
                  <h2 className="participar-titulo">Como funciona</h2>
                  <ol>
                    {receita.comoParticipar.map((passo, i) => (
                      <li key={i}>
                        <span className="passo-n" style={{ background: cor.forte }}>
                          {i + 1}
                        </span>
                        <span>{passo}</span>
                      </li>
                    ))}
                  </ol>
                </aside>
              )}
            </section>
          )}

          {/* Encerrada não tem formulário, mas ainda vale contar como era. */}
          {acabou && receita && receita.comoParticipar.length > 0 && (
            <section className="secao-passos">
              <h2 className="secao-titulo">Como funcionava</h2>
              <ol className="passos-faixa">
                {receita.comoParticipar.map((passo, i) => (
                  <li key={i}>
                    <span className="passo-n" style={{ background: cor.forte }}>
                      {i + 1}
                    </span>
                    <span>{passo}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {blocos.some((b) => b.visivel) && (
            <section className="secao-conteudo">
              <Blocos
                blocos={blocos}
                ctx={{
                  arrecadadoCentavos: acao.liquidoCentavos,
                  metaCentavos: meta,
                  prazo: acao.fechaEm,
                }}
              />
            </section>
          )}

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
