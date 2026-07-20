// A pagina publica da campanha, so o desenho.
//
// Nao toca no banco de proposito: recebe tudo pronto por props. Isso deixa a
// mesma tela ser alimentada pelo Postgres (src/app/c/[slug]) ou por dados de
// exemplo (src/app/previa), e e o que permite mexer no visual sem subir banco.
//
// Ordem da pagina: cabecalho, faixa de apresentacao, menu, a caixa grande de
// arrecadacao (com o grafico de origem do dinheiro), as formas de ajudar,
// as duas colunas sobre a Teto e o contrato, e quem contribuiu.

import Link from "next/link";
import { formatarBRL, formatarBRLCurto } from "@/lib/dinheiro";
import { IconeDaAcao, IconeCasa, rotuloDoTipo } from "@/components/icones";
import Blocos from "@/components/Blocos";
import ObraDaCasa from "@/components/ObraDaCasa";
import ListaDeApoiadores from "@/components/ListaDeApoiadores";
import { corDe, estiloDaCor } from "@/lib/paleta";
import type { Bloco } from "@/lib/blocos";
import type { AcaoNaVitrine, ApoiadorRecente } from "@/lib/vitrine";

export interface DadosDaCampanha {
  slug: string;
  titulo: string;
  resumo: string | null;
  historia: string | null;
  capaUrl: string | null;
  prazo: Date | null;
  /** O periodo da construcao, ex.: "Dezembro de 2026". */
  periodo?: string | null;
  /** Quem toca a arrecadacao, ex.: "Higor Bernardino - Luan Cantele". */
  equipeArrecadacao?: string | null;
  sede?: string | null;
  sobreTeto?: string | null;
  sobreContrato?: string | null;
  equipe: { nome: string; recebedorRotulo: string | null };
}

export interface ResumoDaCampanha {
  liquidoCentavos: number;
  metaCentavos: number;
  percentual: number;
  custoCentavos: number;
  taxaCentavos: number;
  repassadoCentavos: number;
  saldoARepassarCentavos: number;
  ultimoRepasseEm: Date | null;
  apoiadores: number;
}

/* Cor do que sobra: as doacoes avulsas, que nao pertencem a acao nenhuma e por
   isso nao tem cor propria pra herdar. */
const COR_AVULSA = "#4480a6";

function dataPorExtenso(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

function dataCurta(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
}

/** "há 3h", "ontem", "há 5 dias". Vago de proposito: a hora exata nao importa. */
function quandoRelativo(d: Date | null): string {
  if (!d) return "";
  const horas = Math.floor((Date.now() - d.getTime()) / 36e5);
  if (horas < 1) return "agora há pouco";
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  return dataCurta(d);
}

/** Dias que faltam. Negativo vira zero: prazo vencido nao conta pra tras. */
function diasRestantes(prazo: Date | null): number | null {
  if (!prazo) return null;
  return Math.max(0, Math.ceil((prazo.getTime() - Date.now()) / 864e5));
}

function primeiraLetra(nome: string): string {
  return nome.trim().charAt(0).toUpperCase() || "?";
}

/** Doacao tem valor livre, entao nao carrega etiqueta de preco. */
function precoDaAcao(acao: AcaoNaVitrine): string {
  if (acao.precoCentavos == null) return "Você escolhe o valor";
  return formatarBRL(acao.precoCentavos);
}

function textoDaEtiqueta(acao: AcaoNaVitrine): string {
  if (acao.motivo === "ESGOTADO") return "Esgotado";
  if (acao.motivo === "ENCERRADA") return "Encerrada";
  if (acao.motivo === "AINDA_NAO_ABRIU") return "Em breve";
  return rotuloDoTipo[acao.tipo] ?? "Ação";
}

/** "em 12 de agosto" / "amanhã" / "hoje", pro aviso do que ainda vai abrir. */
function quandoAbre(data: Date | null | undefined): string {
  if (!data) return "em breve";
  const dias = Math.ceil((data.getTime() - Date.now()) / 864e5);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias <= 14) return `em ${dias} dias`;
  return `em ${data.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}`;
}

/**
 * Monta as fatias do grafico: uma por acao que rendeu, da maior pra menor.
 *
 * Acao no vermelho (custo pago, nada vendido) fica de fora: fatia negativa nao
 * existe em barra. Ela continua no cartao dela, com o valor real.
 */
/**
 * Monta as fatias do grafico: uma por acao que rendeu, da maior pra menor.
 *
 * Cada fatia usa a COR DA PROPRIA ACAO, a mesma do cartao dela la embaixo. E o
 * que faz o grafico virar legenda de si mesmo: bateu o olho na fatia ocre, sabe
 * na hora que veio da rifa, sem precisar ler nada.
 *
 * Acao no vermelho (custo pago, nada vendido) fica de fora: fatia negativa nao
 * existe em barra. Ela continua no cartao dela, com o valor real.
 */
function fatiasDoGrafico(vitrine: AcaoNaVitrine[], liquidoTotal: number) {
  const fatias = vitrine
    .filter((a) => a.liquidoCentavos > 0)
    .map((a) => ({
      nome: a.titulo,
      valor: a.liquidoCentavos,
      cor: corDe(a.cor).forte,
    }))
    .sort((a, b) => b.valor - a.valor);

  // O que sobra sao as doacoes que nao pertencem a nenhuma acao (o "chorinho"
  // que vem junto de outros pedidos). Sem isso a soma das fatias nao bateria
  // com o total, e o grafico contaria uma historia diferente do numero grande.
  const somaFatias = fatias.reduce((t, f) => t + f.valor, 0);
  const resto = liquidoTotal - somaFatias;
  if (resto > 0) {
    fatias.push({ nome: "Doações avulsas", valor: resto, cor: COR_AVULSA });
  }

  return fatias.sort((a, b) => b.valor - a.valor);
}

/**
 * A regua da barra de cada acao.
 *
 * Ordem dos denominadores:
 *  1. Meta propria da acao, quando ela tem uma.
 *  2. O estoque, para acao ja encerrada sem meta propria (ver abaixo).
 *  3. O que ainda falta pra fechar o contrato. Sem meta propria, a pergunta que
 *     uma acao ABERTA responde e "o quanto dela fecharia o buraco que sobrou".
 *
 * Por que encerrada nao usa o buraco do contrato: o buraco e uma medida do
 * futuro, e acao encerrada nao tem futuro. Um bingo que lotou apareceria como
 * "7% dos R$ 10 mil que faltam", ou seja, um fracasso em algo que ele nunca
 * tentou fazer. Contra o proprio estoque, ele aparece pelo que foi: esgotado.
 *
 * Sem nenhum dos tres nao ha barra: inventar denominador daria uma barra bonita
 * que nao mede nada.
 */
function reguaDaAcao(acao: AcaoNaVitrine, faltaNoContrato: number) {
  // O valor mostrado e sempre o real, mesmo negativo: acao que so gastou ate
  // agora aparece no vermelho com a barra vazia, que e a verdade.
  const feito = formatarBRLCurto(acao.liquidoCentavos);

  const porEstoque = () => {
    if (!acao.estoqueTotal || acao.estoqueTotal <= 0 || acao.restante === null) return null;
    const vendidos = acao.estoqueTotal - acao.restante;
    return {
      pct: Math.max(0, Math.min(100, (vendidos / acao.estoqueTotal) * 100)),
      feito: String(vendidos),
      total: `de ${acao.estoqueTotal} vendidos`,
    };
  };

  if (acao.metaCentavos && acao.metaCentavos > 0) {
    return {
      pct: Math.max(0, Math.min(100, (acao.liquidoCentavos / acao.metaCentavos) * 100)),
      feito,
      total: `de ${formatarBRLCurto(acao.metaCentavos)}`,
    };
  }

  if (!acao.disponivel) return porEstoque();

  if (faltaNoContrato > 0) {
    return {
      pct: Math.max(0, Math.min(100, (acao.liquidoCentavos / faltaNoContrato) * 100)),
      feito,
      // Diz qual e o denominador, senao o percentual fica sem significado.
      total: `dos ${formatarBRLCurto(faltaNoContrato)} que faltam`,
    };
  }

  return porEstoque();
}

function CartaoAcao({
  acao,
  campanhaSlug,
  faltaNoContrato,
}: {
  acao: AcaoNaVitrine;
  campanhaSlug: string;
  faltaNoContrato: number;
}) {
  const regua = reguaDaAcao(acao, faltaNoContrato);
  const aindaVaiAbrir = acao.motivo === "AINDA_NAO_ABRIU";

  const conteudo = (
    <>
      <span className="acao-icone">
        <IconeDaAcao tipo={acao.tipo} />
      </span>

      <span className="acao-titulo">{acao.titulo}</span>
      <span className="acao-preco">{precoDaAcao(acao)}</span>

      {acao.descricao && <p className="acao-desc">{acao.descricao}</p>}

      {regua && (
        <div className="acao-regua">
          <div className="acao-barra">
            <div className="acao-barra-fill" style={{ width: `${regua.pct}%` }} />
          </div>
          <div className="acao-numeros">
            <span className="acao-rendeu">{regua.feito}</span>
            <span>{regua.total}</span>
          </div>
        </div>
      )}

      <div className="acao-pe">
        <span
          className={`etiqueta${
            acao.motivo === "ESGOTADO" ? " esgotado" : acao.disponivel ? "" : " encerrada"
          }`}
        >
          {textoDaEtiqueta(acao)}
        </span>

        {/* Escassez so aparece quando e verdade e quando ainda da tempo. */}
        {acao.disponivel && acao.restante !== null && acao.restante <= 10 && (
          <span>{acao.restante === 1 ? "resta 1" : `restam ${acao.restante}`}</span>
        )}
      </div>
    </>
  );

  const estilo = estiloDaCor(acao.cor);

  // Ainda vai abrir: o conteudo aparece borrado, com um selo por cima. E de
  // proposito que apareca em vez de sumir. Mostra que a equipe tem plano, cria
  // expectativa, e faz quem chegou hoje voltar no dia que abrir.
  if (aindaVaiAbrir) {
    return (
      <div className="acao em-breve" style={estilo}>
        <span className="acao-borrado" aria-hidden="true">
          {conteudo}
        </span>
        <span className="acao-selo">
          <span className="acao-selo-rotulo">Em breve</span>
          <span className="acao-selo-quando">abre {quandoAbre(acao.abreEm)}</span>
        </span>
        {/* O conteudo borrado esta escondido de leitor de tela; este resumo e o
            que ele le, senao a acao viraria um bloco mudo. */}
        <span className="apenas-leitor">
          {acao.titulo}: abre {quandoAbre(acao.abreEm)}.
        </span>
      </div>
    );
  }

  // Encerrada e esgotada CONTINUAM clicáveis: a página delas vira o resultado
  // (quanto rendeu, quanta gente entrou, como foi). Muita gente procura isso
  // depois que acabou, e é o que dá ideia para quem vai organizar a próxima.
  return (
    <Link
      href={`/c/${campanhaSlug}/${acao.slug}`}
      className={`acao${acao.disponivel ? "" : " indisponivel"}`}
      style={estilo}
    >
      {conteudo}
    </Link>
  );
}

export default function CampanhaView({
  campanha,
  resumo,
  vitrine,
  apoiadoresRecentes = [],
  blocos = [],
}: {
  campanha: DadosDaCampanha;
  resumo: ResumoDaCampanha;
  vitrine: AcaoNaVitrine[];
  apoiadoresRecentes?: ApoiadorRecente[];
  /** Os blocos montados pela equipe no painel: o microblog da campanha. */
  blocos?: Bloco[];
}) {
  const arrecadado = Math.max(0, resumo.liquidoCentavos);
  const falta = Math.max(0, resumo.metaCentavos - arrecadado);
  const dias = diasRestantes(campanha.prazo);
  const fatias = fatiasDoGrafico(vitrine, arrecadado);

  return (
    <>
      <header className="topo">
        <div className="container topo-linha">
          <Link href={`/c/${campanha.slug}`} className="marca">
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

      {/* A capa. Sem foto, NAO fica um retangulo vazio: entra a planta baixa da
          casa, que e desenho da propria marca. Uma equipe que ainda nao tirou
          foto boa da comunidade continua com um topo que parece intencional. */}
      <section
        className={`hero${campanha.capaUrl ? " hero-com-foto" : ""}`}
        style={
          campanha.capaUrl
            ? { backgroundImage: `url(${JSON.stringify(campanha.capaUrl)})` }
            : undefined
        }
      >
        <div className="container">
          <h1 className="hero-titulo">{campanha.titulo}</h1>

          <p className="hero-linha">
            <span className="parte">
              Arrecadação para: <strong>{campanha.periodo ?? "Dezembro de 2026"}</strong>
            </span>
            {campanha.sede && (
              <>
                <span className="divisor" />
                <span className="parte">
                  Sede: <strong>{campanha.sede}</strong>
                </span>
              </>
            )}
          </p>

          {campanha.equipeArrecadacao && (
            <p className="hero-equipe">
              <span className="hero-equipe-rotulo">Equipe de Arrecadação</span>
              <span className="hero-equipe-nomes">{campanha.equipeArrecadacao}</span>
            </p>
          )}
        </div>
      </section>

      <nav className="menu">
        <div className="container menu-linha">
          <a href="#sobre-teto">Sobre a Teto</a>
          <a href="#arrecadacao">Sobre a arrecadação</a>
          <a href="#ajudar">Formas de ajudar</a>
          <a href="#contribuiu">Quem contribuiu</a>
        </div>
      </nav>

      <main className="corpo">
        <div className="container">
          {/* A caixa grande: o estado da arrecadacao em largura total. */}
          <section className="grande" id="arrecadacao">
            <div className="grande-topo">
              <div>
                <div className="grande-valor">{formatarBRL(arrecadado)}</div>
                <div className="grande-rotulo">
                  arrecadados de <strong>{formatarBRL(resumo.metaCentavos)}</strong>, o custo da casa
                </div>
              </div>

              <div className="grande-lado">
                <div>
                  <div className="grande-apoio">{resumo.apoiadores}</div>
                  <div className="grande-apoio-rotulo">
                    {resumo.apoiadores === 1 ? "pessoa contribuiu" : "pessoas contribuíram"}
                  </div>
                </div>
                {campanha.prazo && (
                  <div>
                    <div className="grande-apoio">{dataPorExtenso(campanha.prazo)}</div>
                    <div className="grande-apoio-rotulo">
                      prazo final
                      {dias !== null ? ` · faltam ${dias} dias` : ""}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* A casa levantando. Vem antes da barra de proposito: primeiro a
                pessoa ve o que o dinheiro VIRA, depois de onde ele veio. */}
            <ObraDaCasa
              arrecadadoCentavos={arrecadado}
              metaCentavos={resumo.metaCentavos}
            />

            <p className="grafico-titulo">De onde veio cada real</p>

            {/* Uma figura, duas respostas: o comprimento diz quanto ja foi
                arrecadado da meta, as fatias dizem de onde veio cada parte. */}
            <div
              className="grafico"
              role="img"
              aria-label={`${formatarBRL(arrecadado)} de ${formatarBRL(resumo.metaCentavos)}, divididos por ação`}
            >
              {fatias.map((f) => (
                <div
                  key={f.nome}
                  className="grafico-fatia"
                  style={{
                    width: `${(f.valor / resumo.metaCentavos) * 100}%`,
                    background: f.cor,
                  }}
                  title={`${f.nome}: ${formatarBRL(f.valor)}`}
                />
              ))}
            </div>

            <div className="grafico-regua">
              <span>
                <strong>{Math.floor(resumo.percentual)}%</strong> da meta
              </span>
              <span>
                {falta > 0 ? (
                  <>
                    faltam <strong>{formatarBRL(falta)}</strong>
                  </>
                ) : (
                  <strong>meta alcançada</strong>
                )}
              </span>
            </div>

            <div className="legenda">
              {fatias.map((f) => (
                <div key={f.nome} className="legenda-item">
                  <span className="legenda-cor" style={{ background: f.cor }} />
                  <span>
                    <span className="legenda-nome">{f.nome}</span>
                    <span className="legenda-valor">{formatarBRL(f.valor)}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Formas de ajudar, 4 por linha. */}
          <section className="secao" id="ajudar">
            <div className="secao-cabeca">
              <h2 className="secao-titulo">Formas de ajudar</h2>
              <p className="secao-intro">
                Cada uma destas ações foi organizada pela equipe e paga o próprio custo antes de
                sobrar para a casa. Os valores ao lado de cada uma são o que já entrou limpo, depois
                do material e da taxa do PIX.
              </p>
            </div>

            {vitrine.length === 0 ? (
              <div className="vazio">A equipe ainda está montando as ações desta campanha.</div>
            ) : (
              <div className="acoes">
                {vitrine.map((acao) => (
                  <CartaoAcao
                    key={acao.id}
                    acao={acao}
                    campanhaSlug={campanha.slug}
                    faltaNoContrato={falta}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Duas colunas: a Teto (60) e o contrato de casa amiga (40). */}
          <section className="secao" id="sobre-teto">
            <div className="duas">
              <div>
                <div className="secao-cabeca">
                  <h2 className="secao-titulo">Sobre a Teto</h2>
                </div>
                <div className="texto">
                  {(campanha.sobreTeto ?? "").split("\n\n").map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>

              <div className="painel-lateral">
                <h2 className="secao-titulo">O contrato de Casa Amiga</h2>
                <div className="texto">
                  {(campanha.sobreContrato ?? "").split("\n\n").map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
                <div className="destaque-numero">
                  <span className="numero">{formatarBRLCurto(resumo.metaCentavos)}</span>
                  <span>é quanto custa erguer uma casa emergencial completa</span>
                </div>
              </div>
            </div>
          </section>

          {/* O que a equipe montou no painel: fotos, vídeo, recados, o que for.
              É aqui que a campanha deixa de ser formulário e vira microblog. */}
          {blocos.some((b) => b.visivel) && (
            <section className="secao" id="montado">
              <Blocos
                blocos={blocos}
                ctx={{
                  arrecadadoCentavos: resumo.liquidoCentavos,
                  metaCentavos: resumo.metaCentavos,
                  apoiadores: resumo.apoiadores,
                  prazo: campanha.prazo,
                }}
              />
            </section>
          )}

          {/* Quem contribuiu. */}
          <section className="secao" id="contribuiu">
            <div className="secao-cabeca">
              <h2 className="secao-titulo">Quem contribuiu</h2>
              <p className="secao-intro">
                {resumo.apoiadores === 1
                  ? "Uma pessoa já entrou nessa."
                  : `${resumo.apoiadores} pessoas já entraram nessa, e todas elas estão aqui.`}
              </p>
            </div>

            {apoiadoresRecentes.length === 0 ? (
              <div className="vazio">Seja a primeira pessoa a entrar nessa.</div>
            ) : (
              <ListaDeApoiadores apoiadores={apoiadoresRecentes} />
            )}
          </section>
        </div>
      </main>

      <footer className="rodape">
        <div className="container rodape-linha">
          <span>
            <strong>{campanha.equipe.nome}</strong> · {campanha.sede ?? "TETO Paraná"}
          </span>
          <span className="rodape-links">
            <span>Pagamentos por PIX · o extrato de cada ação é público</span>
            {/* Entrada do painel. Fica no rodapé de propósito: quem organiza
                precisa achar sem decorar endereço, e quem doa não se distrai. */}
            <Link href="/entrar" className="rodape-entrar">
              Área da equipe
            </Link>
          </span>
        </div>
      </footer>
    </>
  );
}
