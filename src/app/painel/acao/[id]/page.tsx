import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import CampoDeImagem from "@/components/CampoDeImagem";
import { revalidatePath } from "next/cache";
import {
  adicionarBloco,
  alternarBloco,
  apagarAcao,
  buscarAcao,
  campanhaAtual,
  listarAcoes,
  listarBlocos,
  moverBloco,
  publicarAcao,
  removerBloco,
  salvarAcao,
  salvarBloco,
} from "@/lib/repositorio";
import { receitaDe } from "@/lib/catalogo";
import { definicaoDe, type TipoBloco } from "@/lib/blocos";
import { PALETA } from "@/lib/paleta";
import { formatarBRL, formatarBRLCurto, paraCentavos } from "@/lib/dinheiro";
import EditorDeBlocos, { lerConteudoDoFormulario } from "@/components/EditorDeBlocos";
import { IconeDaAcao } from "@/components/icones";

export const dynamic = "force-dynamic";

/**
 * Date -> "AAAA-MM-DD", que e o que <input type="date"> entende.
 *
 * Usa os getters LOCAIS, nunca toISOString(). No Brasil (UTC-3), converter pra
 * ISO joga a data pro dia anterior: 09/08 00:00 local vira 08/08 21:00 em UTC, e
 * o campo voltaria com um dia a menos toda vez que a pessoa salvasse.
 */
function paraCampoData(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** "AAAA-MM-DD" -> meia-noite LOCAL daquele dia. */
function daCaixaDeData(texto: string): Date | null {
  const t = texto.trim();
  if (!t) return null;
  // Sem o "T00:00:00", o JavaScript le a data como UTC e o dia escorrega.
  const d = new Date(`${t}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Em que pe a acao esta, em uma palavra, pro topo da tela. */
function situacao(acao: { rascunho: boolean; motivo: string | null; disponivel: boolean }) {
  if (acao.rascunho) return "Rascunho";
  if (acao.motivo === "AINDA_NAO_ABRIU") return "Em breve";
  if (acao.motivo === "ESGOTADO") return "Esgotada";
  if (acao.motivo === "ENCERRADA") return "Encerrada";
  return "No ar";
}

/**
 * Fica FORA do componente de proposito.
 *
 * O Next serializa o escopo que cada "use server" enxerga, e funcao comum
 * declarada dentro do componente entra nesse escopo e quebra a serializacao
 * ("Functions cannot be passed directly to Client Components"). No escopo do
 * modulo ela nao e capturada, e o mesmo auxiliar serve a todas as acoes.
 */
function recarregar(acaoId: string) {
  revalidatePath(`/painel/acao/${acaoId}`);
  revalidatePath("/painel");
  revalidatePath("/");
}

export default async function EditarAcao({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ novo?: string; salvo?: string }>;
}) {
  const { id } = await params;
  const { novo, salvo } = await searchParams;

  const acao = await buscarAcao(id);
  if (!acao) notFound();

  const receita = receitaDe(acao.tipo);
  const campanha = await campanhaAtual();
  const blocos = await listarBlocos({ tipo: "acao", id: acao.id });
  const alvo = { tipo: "acao" as const, id: acao.id };
  // As server actions abaixo so podem capturar valores simples do escopo. Por
  // isso o id e o titulo saem do objeto antes, em vez de usar `acao` la dentro.
  const acaoId = acao.id;
  const tituloAtual = acao.titulo;

  // Quais cores as OUTRAS acoes ja usam.
  //
  // Guarda so o conjunto, e nao mais de quem e cada uma: dizer "ja usada por
  // Rifa do churrasco" em cada bolinha enchia a tela de nome de acao e virava
  // uma segunda lista de acoes dentro do seletor de cor. O aviso que importa e
  // um so, embaixo, e sobre a cor escolhida.
  const coresOcupadas = new Set<string>();
  for (const outra of await listarAcoes(campanha.id)) {
    if (outra.id === acaoId) continue;
    coresOcupadas.add(outra.cor ?? "teto");
  }

  async function salvarBasico(dados: FormData) {
    "use server";

    // Campo vazio vira null, e nao Invalid Date: uma data invalida em `abreEm`
    // faria a acao ficar presa em "em breve" pra sempre.
    const dataOuNulo = (nome: string) => daCaixaDeData(String(dados.get(nome) ?? ""));

    await salvarAcao(acaoId, {
      titulo: String(dados.get("titulo") ?? "").trim() || tituloAtual,
      descricao: String(dados.get("descricao") ?? "").trim() || null,
      precoCentavos: paraCentavos(String(dados.get("preco") ?? "")),
      metaCentavos: paraCentavos(String(dados.get("meta") ?? "")),
      cor: String(dados.get("cor") ?? "") || undefined,
      capaUrl: String(dados.get("capa") ?? "").trim() || null,
      abreEm: dataOuNulo("abreEm"),
      fechaEm: dataOuNulo("fechaEm"),
    });

    // Nao precisa recalcular nada aqui: o repositorio deriva o estado ("no ar",
    // "em breve", "esgotada") na leitura, a partir das datas e do estoque.
    recarregar(acaoId);
    redirect(`/painel/acao/${acaoId}?salvo=1`);
  }

  async function publicar(dados: FormData) {
    "use server";
    await publicarAcao(acaoId, dados.get("publicar") === "1");
    recarregar(acaoId);
  }

  async function apagar() {
    "use server";
    await apagarAcao(acaoId);
    revalidatePath("/painel");
    revalidatePath("/");
    redirect("/painel");
  }

  const acoesDoEditor = {
    adicionar: async (dados: FormData) => {
      "use server";
      await adicionarBloco(alvo, String(dados.get("tipo")) as TipoBloco);
      recarregar(acaoId);
    },
    salvar: async (dados: FormData) => {
      "use server";
      const blocoId = String(dados.get("id"));
      const bloco = (await listarBlocos(alvo)).find((b) => b.id === blocoId);
      if (!bloco) return;
      await salvarBloco(blocoId, lerConteudoDoFormulario(bloco.tipo as TipoBloco, dados));
      recarregar(acaoId);
    },
    mover: async (dados: FormData) => {
      "use server";
      await moverBloco(alvo, String(dados.get("id")), String(dados.get("direcao")) as "cima" | "baixo");
      recarregar(acaoId);
    },
    alternar: async (dados: FormData) => {
      "use server";
      await alternarBloco(String(dados.get("id")));
      recarregar(acaoId);
    },
    remover: async (dados: FormData) => {
      "use server";
      await removerBloco(alvo, String(dados.get("id")));
      recarregar(acaoId);
    },
  };

  return (
    <div className="painel-largura">
      <div className="painel-topo-acoes">
        <Link href="/painel" className="painel-voltar">
          Voltar para a campanha
        </Link>

        {/* Ver antes de publicar. Acao em rascunho ou marcada pra abrir no
            futuro nao e clicavel na pagina publica, entao sem este link a
            equipe so descobria o erro de texto depois de ja estar no ar. */}
        <a
          className="botao botao-contorno botao-pequeno"
          href={`/c/${campanha.slug}/${acao.slug}?previa=1`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Ver prévia da página
        </a>
      </div>

      {novo && (
        <div className="aviso-bom">
          <strong>Ação criada.</strong> A página dela já nasceu montada com os blocos típicos de{" "}
          {receita?.nome.toLowerCase() ?? "ação"}. Ajuste o texto e publique quando estiver pronta.
        </div>
      )}

      {salvo && (
        <p className="aviso-salvo" role="status">
          Alterações salvas.
        </p>
      )}

      <div className="painel-cabeca">
        <div className="receita-cabeca">
          <span className="receita-icone">
            <IconeDaAcao tipo={acao.tipo} />
          </span>
          <div>
            <span className="painel-sobre">{receita?.nome ?? acao.tipo}</span>
            <h1>{acao.titulo}</h1>
            <p className="painel-intro">
              {situacao(acao)}
              {acao.motivo === "AINDA_NAO_ABRIU" && acao.abreEm
                ? `, abre em ${paraCampoData(acao.abreEm).split("-").reverse().join("/")}`
                : ""}{" "}
              · {formatarBRLCurto(acao.liquidoCentavos)} arrecadados
              {acao.estoqueTotal != null &&
                ` · ${acao.restante ?? 0} de ${acao.estoqueTotal} restantes`}
            </p>
          </div>
        </div>

        {/* Publicado NAO e o mesmo que no ar: uma acao publicada com abertura
            marcada pro mes que vem ja esta publicada, so nao abriu. Por isso o
            botao olha `rascunho`, e nao `disponivel`. */}
        <form action={publicar}>
          <input type="hidden" name="publicar" value={acao.rascunho ? "1" : "0"} />
          <button
            className={`botao ${acao.rascunho ? "botao-primario" : "botao-contorno"}`}
            type="submit"
          >
            {acao.rascunho ? "Publicar ação" : "Voltar para rascunho"}
          </button>
        </form>
      </div>

      <section className="painel-cartao">
        <h2 className="formulario-secao">O básico</h2>
        <form action={salvarBasico} className="formulario">
          <label className="campo">
            <span className="campo-rotulo">Nome</span>
            <input className="campo-entrada" name="titulo" defaultValue={acao.titulo} />
          </label>

          <label className="campo">
            <span className="campo-rotulo">Descrição</span>
            <textarea
              className="campo-entrada"
              name="descricao"
              rows={4}
              defaultValue={acao.descricao ?? ""}
            />
          </label>

          <div className="campo-dupla">
            <label className="campo">
              <span className="campo-rotulo">Preço</span>
              <input
                className="campo-entrada"
                name="preco"
                inputMode="decimal"
                defaultValue={
                  acao.precoCentavos != null
                    ? (acao.precoCentavos / 100).toFixed(2).replace(".", ",")
                    : ""
                }
                placeholder="valor livre"
              />
            </label>

            <label className="campo">
              <span className="campo-rotulo">Meta desta ação</span>
              <input
                className="campo-entrada"
                name="meta"
                inputMode="decimal"
                defaultValue={
                  acao.metaCentavos != null
                    ? (acao.metaCentavos / 100).toFixed(2).replace(".", ",")
                    : ""
                }
                placeholder="usa o que falta no contrato"
              />
            </label>
          </div>

          <h2 className="formulario-secao">Quando fica no ar</h2>
          <p className="campo-ajuda" style={{ margin: "-8px 0 16px" }}>
            Dá para deixar a campanha inteira montada e ir soltando aos poucos. Até a data de
            abertura, a ação aparece na página borrada, com o selo <strong>Em breve</strong>. Ela
            abre sozinha no dia.
          </p>

          <div className="campo-dupla">
            <label className="campo">
              <span className="campo-rotulo">Abre em</span>
              <input
                className="campo-entrada"
                name="abreEm"
                type="date"
                defaultValue={acao.abreEm ? paraCampoData(acao.abreEm) : ""}
              />
              <span className="campo-ajuda">Vazio: já abre assim que publicar.</span>
            </label>

            <label className="campo">
              <span className="campo-rotulo">Fecha em</span>
              <input
                className="campo-entrada"
                name="fechaEm"
                type="date"
                defaultValue={acao.fechaEm ? paraCampoData(acao.fechaEm) : ""}
              />
              <span className="campo-ajuda">Vazio: fica aberta até a campanha acabar.</span>
            </label>
          </div>

          <h2 className="formulario-secao">Cara da ação</h2>

          <fieldset className="campo escolha-cor">
            <legend className="campo-rotulo">Cor de destaque</legend>
            <span className="campo-ajuda" style={{ marginTop: 0, marginBottom: 10 }}>
              Pinta o cartão desta ação e a fatia dela no gráfico da campanha. É o que deixa
              claro, de bater o olho, de onde veio cada parte do dinheiro.
            </span>
            <div className="cores">
              {PALETA.map((c) => (
                <label key={c.id} className="cor" title={c.nome}>
                  <input
                    type="radio"
                    name="cor"
                    value={c.id}
                    defaultChecked={(acao.cor ?? "teto") === c.id}
                  />
                  {/* A bolinha mostra o tom de identidade da cor, que e o mesmo
                      que vai pintar a fatia dela no grafico da campanha. */}
                  <span className="cor-bolha" style={{ background: c.marca ?? c.forte }} />
                  <span className="cor-nome">{c.nome}</span>
                </label>
              ))}
            </div>
            {coresOcupadas.has(acao.cor ?? "teto") && (
              <p className="cor-aviso">
                Outra ação já usa esta cor. No gráfico da campanha as duas ficam com a mesma
                fatia, e aí a cor deixa de dizer de onde veio o dinheiro. Vale escolher outra.
              </p>
            )}
          </fieldset>

          <CampoDeImagem
            name="capa"
            valorInicial={acao.capaUrl}
            rotulo="Foto da ação"
            ajuda="Aparece no alto do cartão desta ação, em preto e branco com um véu azul."
          />

          {/* Principal e em tamanho cheio: como secundario pequeno no fim de um
              formulario longo, ele parecia controle acessorio e o Higor nao o
              encontrou. */}
          <button className="botao botao-primario" type="submit">
            Salvar ação
          </button>
        </form>
      </section>

      {receita && Object.keys(acao.config).length > 0 && (
        <section className="painel-cartao">
          <h2 className="formulario-secao">Detalhes de {receita.nome.toLowerCase()}</h2>
          <dl className="config-lista">
            {receita.campos.map((campo) => {
              const valor = acao.config[campo.chave];
              if (valor == null || valor === "" || (Array.isArray(valor) && valor.length === 0)) {
                return null;
              }
              // Campo de dinheiro e guardado em centavos: sem formatar, R$ 14,00
              // apareceria como "1400" e a pessoa acharia que digitou errado.
              const texto = Array.isArray(valor)
                ? valor.join(", ")
                : typeof valor === "boolean"
                  ? valor
                    ? "Sim"
                    : "Não"
                  : campo.tipo === "dinheiro" && typeof valor === "number"
                    ? formatarBRL(valor)
                    : String(valor);

              return (
                <div key={campo.chave}>
                  <dt>{campo.rotulo}</dt>
                  <dd>{texto}</dd>
                </div>
              );
            })}
          </dl>
        </section>
      )}

      <div className="painel-secao-cabeca">
        <h2>A página desta ação</h2>
      </div>
      <p className="painel-intro" style={{ marginBottom: 18 }}>
        Monte a página empilhando blocos. Você escreve o conteúdo; o visual segue o padrão da Teto
        sozinho.
      </p>

      {/* Nao ha previa embutida aqui de proposito. Ela mostrava os blocos fora
          da pagina de verdade (sem topo, sem cor, sem o resto), entao respondia
          "como esta ficando" com uma resposta que nao era a pagina. Quem quer
          ver como ficou usa o "Ver prévia da página", la em cima, que abre a
          coisa real. */}
      <EditorDeBlocos blocos={blocos} acoes={acoesDoEditor} />

      <form action={apagar} className="zona-perigo">
        <div>
          <strong>Apagar esta ação</strong>
          <span>
            Some da página e do painel. Some também o que ela já arrecadou nos relatórios.
          </span>
        </div>
        <button className="botao botao-perigo" type="submit">
          Apagar
        </button>
      </form>
    </div>
  );
}
