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
import Revelar from "@/components/Revelar";
import ChamadaFinal from "@/components/ChamadaFinal";
import Numero from "@/components/Numero";
import { corDoNome } from "@/lib/cor-do-nome";
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
  capaFoco?: string | null;
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

/**
 * O titulo em caixa alta com a ULTIMA palavra destacada.
 *
 * E o tratamento do titulo da referencia ("NEXT GEN TOP NOTCH *BUSINESS*
 * SOLUTION"). Destacar a ultima palavra e uma regra generica que cai bem na
 * maioria dos titulos de campanha, que costumam terminar no que importa:
 * "Um TETO, um RECOMECO" vira "UM TETO, UM **RECOMECO**".
 */
function tituloComDestaque(titulo: string) {
  const partes = titulo.trim().split(/\s+/);
  if (partes.length < 2) return titulo;
  const ultima = partes.pop() as string;
  return (
    <>
      {partes.join(" ")} <em>{ultima}</em>
    </>
  );
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
  destacado = false,
}: {
  acao: AcaoNaVitrine;
  campanhaSlug: string;
  faltaNoContrato: number;
  /** O unico cartao macico da grade. E a acao que a equipe quer que voce abra. */
  destacado?: boolean;
}) {
  const regua = reguaDaAcao(acao, faltaNoContrato);
  const aindaVaiAbrir = acao.motivo === "AINDA_NAO_ABRIU";

  // Um cartao macico no meio de brancos, como na referencia. Colorir TODOS
  // deixou a grade pesada e sem hierarquia: quando tudo grita, nada chama.
  const tom = destacado ? "acao-tom-cor" : "acao-tom-claro";

  const rotulo = (rotuloDoTipo[acao.tipo] ?? "Ação").toUpperCase();

  /* A faixinha torta atravessando o topo do cartao, com o tipo da acao correndo
     de lado. Passa das bordas de proposito: e o que faz ela parecer pregada POR
     CIMA da caixa, e nao mais uma linha dentro dela.

     Fica FORA do conteudo porque nas acoes "em breve" o conteudo e borrado, e
     filter cria bloco de contencao pra posicionamento absoluto: dentro dele a
     fita encolhia pra dentro do cartao e saia borrada junto. */
  const fita = (
    <span className="fita" aria-hidden="true">
      <span className="fita-trilho">
        {[0, 1].map((copia) => (
          <span className="fita-metade" key={copia}>
            {Array.from({ length: 6 }, (_, i) => (
              <span className="fita-item" key={i}>
                {rotulo}
              </span>
            ))}
          </span>
        ))}
      </span>
    </span>
  );

  const conteudo = (
    <>

      {/* A foto da acao, quando existe. Sem foto o cartao NAO fica menor nem
          esquisito: o icone assume o topo, que e o desenho que ja existia. */}
      {acao.capaUrl ? (
        <span
          className="acao-capa"
          style={{ backgroundImage: `url(${JSON.stringify(acao.capaUrl)})` }}
          aria-hidden="true"
        >
          <span className="acao-icone acao-icone-sobre">
            <IconeDaAcao tipo={acao.tipo} />
          </span>
        </span>
      ) : null}

      <span className="acao-topo">
        {!acao.capaUrl && (
          <span className="acao-icone">
            <IconeDaAcao tipo={acao.tipo} />
          </span>
        )}
        <span className="acao-titulo">{acao.titulo}</span>
      </span>
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
        <span className="acao-mais">
          {acao.disponivel ? "Participar" : "Ver como foi"}
        </span>
      </div>
    </>
  );

  const estilo = estiloDaCor(acao.cor);

  // Ainda vai abrir: o conteudo aparece borrado, com um selo por cima. E de
  // proposito que apareca em vez de sumir. Mostra que a equipe tem plano, cria
  // expectativa, e faz quem chegou hoje voltar no dia que abrir.
  if (aindaVaiAbrir) {
    return (
      <div className={`acao em-breve ${tom}`} style={estilo}>
        {fita}
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
      className={`acao ${tom}${acao.disponivel ? "" : " indisponivel"}`}
      style={estilo}
    >
      {fita}
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

  // O cartao macico vai pra primeira acao ABERTA: e a que a pessoa pode usar
  // agora. Se nao houver nenhuma aberta, a grade fica toda branca, e tudo bem.
  const idDestacada = vitrine.find((a) => a.disponivel)?.id ?? null;

  return (
    <>
      {/* Um filete de cor, so pra marcar o alto da pagina. Antes carregava
          informacao que ja aparece embaixo, e competia com o cabecalho. */}
      <div className="filete" aria-hidden="true" />

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

          <nav className="topo-nav">
            <a href="#sobre-teto">Sobre a Teto</a>
            <a href="#arrecadacao">Sobre a arrecadação</a>
            <a href="#ajudar">Como ajudar</a>
            <a href="#contribuiu">Quem contribuiu</a>
          </nav>

          <div className="topo-lado">
            <span className="topo-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-teto.png" alt="TETO" />
            </span>
          </div>
        </div>
      </header>

      {/* A capa.
          Fotografica e arredondada, como a referencia. O titulo e da equipe; a
          linha embaixo dele e o PEDIDO, e o pedido fala de familia e nao de
          etapa de obra: quem chega de fora nao sabe o que e um piloti. */}
      {/* O heroi da referencia NAO e um painel encaixotado: e faixa inteira, e
          a foto DISSOLVE no fundo escuro, sem borda. O recorte suave e feito
          com mask-image, que e o que faz a pessoa da foto parecer estar dentro
          da pagina em vez de colada num quadrinho. */}
      <section className="capa">
        {campanha.capaUrl ? (
          <div
            className="capa-foto"
            style={{
              backgroundImage: `url(${JSON.stringify(campanha.capaUrl)})`,
              backgroundPosition: campanha.capaFoco ?? "50% 50%",
            }}
            role="img"
            aria-label="Foto da equipe de arrecadação"
          />
        ) : (
          <div className="capa-foto capa-foto-vazia" aria-hidden="true">
            <svg viewBox="0 0 240 180" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M30 92 L120 30 L210 92" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M52 84 V150 H188 V84" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="104" y="106" width="32" height="44" rx="2" />
              <rect x="146" y="102" width="28" height="24" rx="2" />
              <path d="M20 150 H220" strokeLinecap="round" opacity=".5" />
            </svg>
          </div>
        )}

        <div className="container capa-corpo">
          {/* Duas colunas ancoradas na base: o alto da foto fica livre, que e
              onde costuma estar o rosto das pessoas. */}
          <div className="capa-colunas">
            <div className="capa-col">
              <p className="capa-etiqueta">Campanha de arrecadação voluntária</p>
              <h1 className="capa-titulo">{tituloComDestaque(campanha.titulo)}</h1>
            </div>

            <div className="capa-col capa-col-lado">
              {resumo.apoiadores > 0 && (
                <p className="capa-prova">
                  <span className="prova-bolhas" aria-hidden="true">
                    {apoiadoresRecentes.slice(0, 4).map((a) => (
                      <span key={a.id} style={{ background: corDoNome(a.nome) }}>
                        {a.anonimo ? "?" : a.nome.trim().charAt(0).toUpperCase()}
                      </span>
                    ))}
                  </span>
                  <span>
                    <strong>{resumo.apoiadores}</strong>{" "}
                    {resumo.apoiadores === 1 ? "pessoa já doou" : "pessoas já doaram"}
                  </span>
                </p>
              )}

              <div className="capa-botoes">
                <a href="#ajudar" className="botao botao-acento botao-selo">
                  Quero doar
                </a>
                <span className="capa-aparte">
                  <span className="capa-aparte-texto">
                    <em>Ainda faltam</em>
                    <strong>{formatarBRL(falta)}</strong>
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* A barra de arrecadacao sobe POR CIMA da capa. Ela e o numero que
          decide se a pessoa doa, entao nao pode ficar perdida no meio da
          pagina: fica na emenda, onde o olho ja esta. */}
      <section className="placar" id="arrecadacao">
        <div className="container placar-caixa">
          <div className="placar-topo">
            <div className="placar-forte">
              <Numero className="placar-valor" valor={arrecadado} formato="brl" />
              <span className="placar-de">
                de {formatarBRL(resumo.metaCentavos)}, o custo da casa
              </span>
            </div>
            <span className="placar-pct">{Math.floor(resumo.percentual)}%</span>
          </div>

          <div
            className="placar-barra"
            role="img"
            aria-label={`${Math.floor(resumo.percentual)} por cento da meta`}
          >
            {fatias.map((f) => (
              <span
                key={f.nome}
                className="placar-fatia"
                style={{
                  width: `${(f.valor / resumo.metaCentavos) * 100}%`,
                  background: f.cor,
                }}
                title={`${f.nome}: ${formatarBRL(f.valor)}`}
              />
            ))}
          </div>

          {/* A legenda mora aqui, colada na barra que ela explica. Antes a
              barra aparecia duas vezes na pagina, identica, com a legenda so na
              segunda: quem via a primeira nao sabia o que eram as faixas. */}
          {fatias.length > 0 && (
            <div className="placar-legenda">
              {fatias.map((f) => (
                <span key={f.nome} className="placar-legenda-item">
                  <span className="placar-legenda-cor" style={{ background: f.cor }} />
                  <span className="placar-legenda-nome">{f.nome}</span>
                  <strong>{formatarBRL(f.valor)}</strong>
                </span>
              ))}
            </div>
          )}

          <div className="placar-pes">
            <span>
              <strong>{resumo.apoiadores}</strong>{" "}
              {resumo.apoiadores === 1 ? "pessoa" : "pessoas"}
            </span>
            <span>
              <strong>{vitrine.length}</strong>{" "}
              {vitrine.length === 1 ? "ação" : "ações"}
            </span>
            {dias !== null && (
              <span>
                <strong>{dias}</strong> {dias === 1 ? "dia restante" : "dias restantes"}
              </span>
            )}
            <span className="placar-falta">
              faltam <strong>{formatarBRL(falta)}</strong>
            </span>
          </div>
        </div>
      </section>

      <main className="corpo">
        <div className="container">
          {/* Formas de ajudar.
              O titulo mora DENTRO da grade, como primeira celula, no lugar de
              ocupar uma faixa inteira em cima. Ganha uma linha de altura e a
              secao passa a ler como um bloco so. */}
          <section className="secao secao-ajudar" id="ajudar">
            {vitrine.length === 0 ? (
              <>
                <div className="secao-cabeca">
                  <p className="rotulo-secao">Formas de ajudar</p>
                  <h2 className="secao-titulo">Escolha o seu jeito de entrar nessa</h2>
                </div>
                <div className="vazio">A equipe ainda está montando as ações desta campanha.</div>
              </>
            ) : (
              <div className="acoes">
                <div className="acoes-cabeca">
                  <p className="rotulo-secao">Formas de ajudar</p>
                  <h2 className="secao-titulo">Escolha o seu jeito de entrar nessa!</h2>
                  <p className="secao-intro">
                    A equipe de arrecadação decidiu realizar algumas ações especiais para dar
                    mais opções de colaboração além da forma tradicional, que é entrar e doar
                    um valor. Você pode olhar nos blocos ao lado e escolher a melhor forma
                    para contribuir com esse projeto.
                  </p>
                  <p className="acoes-instrucao">Escolha como contribuir</p>
                </div>

                {vitrine.map((acao, i) => (
                  <Revelar key={acao.id} atraso={Math.min(i * 70, 420)} className="acao-berco">
                    <CartaoAcao
                      acao={acao}
                      campanhaSlug={campanha.slug}
                      faltaNoContrato={falta}
                      destacado={acao.id === idDestacada}
                    />
                  </Revelar>
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

      <ChamadaFinal
        arrecadadoCentavos={arrecadado}
        metaCentavos={resumo.metaCentavos}
        apoiadores={resumo.apoiadores}
      />

      {/* Um rodape so: quem toca a arrecadacao de um lado, a entrada do painel
          do outro. Dois rodapes empilhados era leitura minha, nao pedido. */}
      <footer className="rodape">
        <div className="container rodape-linha">
          <span className="rodape-equipe">
            <em className="rodape-rotulo">Equipe de arrecadação</em>
            <strong>
              {campanha.equipeArrecadacao ?? campanha.sede ?? "TETO Paraná"}
            </strong>
          </span>

          <Link href="/entrar" className="rodape-entrar">
            Área da equipe
          </Link>
        </div>
      </footer>
    </>
  );
}
