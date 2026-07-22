import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  adicionarBloco,
  alternarBloco,
  apagarAcao,
  buscarAcao,
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
import { exigirLogin, exigirEdicao, campanhaDoPainel } from "@/lib/sessao";
import { lerNumeros, registrarLancamentoManual } from "@/lib/manual";
import { criarOpcao, salvarOpcao, removerOpcao } from "@/lib/opcoes";
import { registrarCustoFixo, custosFixosDaAcao, apagarCustoFixo } from "@/lib/lancamentos";
import CampoDeImagem from "@/components/CampoDeImagem";
import { QUADRO_DA_ACAO } from "@/lib/quadros";
import EditorDeBlocos, { lerConteudoDoFormulario } from "@/components/EditorDeBlocos";
import LancamentoManual from "@/components/LancamentoManual";
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
  searchParams: Promise<{
    novo?: string;
    salvo?: string;
    lancado?: string;
    erro?: string;
    erroOpcao?: string;
    custo?: string;
    erroCusto?: string;
  }>;
}) {
  const { id } = await params;
  const { novo, salvo, lancado, erro, erroOpcao, custo, erroCusto } = await searchParams;

  const usuario = await exigirLogin();
  const acao = await buscarAcao(id);
  if (!acao) notFound();

  const custosFixos = await custosFixosDaAcao(acao.id);

  const receita = receitaDe(acao.tipo);
  const campanha = await campanhaDoPainel();
  const blocos = await listarBlocos({ tipo: "acao", id: acao.id });
  const alvo = { tipo: "acao" as const, id: acao.id };
  // As server actions abaixo so podem capturar valores simples do escopo. Por
  // isso o id e o titulo saem do objeto antes, em vez de usar `acao` la dentro.
  const acaoId = acao.id;
  const tituloAtual = acao.titulo;
  const usuarioId = usuario.id;
  const ehRifa = acao.tipo === "RIFA" && (acao.estoqueTotal ?? 0) > 0;
  const estoqueDaRifa = acao.estoqueTotal ?? 0;
  const valorLivre = acao.precoCentavos == null;
  // Publicar uma ação com abertura marcada pro futuro é programar, não publicar:
  // ela vai pro ar borrada, com o selo "Em breve", e abre sozinha no dia.
  const vaiAbrirNoFuturo = Boolean(acao.abreEm && acao.abreEm.getTime() > Date.now());

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
    await exigirEdicao();

    // Campo vazio vira null, e nao Invalid Date: uma data invalida em `abreEm`
    // faria a acao ficar presa em "em breve" pra sempre.
    const dataOuNulo = (nome: string) => daCaixaDeData(String(dados.get(nome) ?? ""));

    await salvarAcao(acaoId, {
      titulo: String(dados.get("titulo") ?? "").trim() || tituloAtual,
      descricao: String(dados.get("descricao") ?? "").trim() || null,
      precoCentavos: paraCentavos(String(dados.get("preco") ?? "")),
      metaCentavos: paraCentavos(String(dados.get("meta") ?? "")),
      cor: String(dados.get("cor") ?? "") || undefined,
      // Foto e tabela de tamanhos só existem no formulário do PRODUTO. Para os
      // outros tipos os campos não vêm, e aí ficam nulos, que é o certo: o
      // cartão da ação não tem mais foto.
      capaUrl: String(dados.get("capa") ?? "").trim() || null,
      capaFoco: String(dados.get("capaFoco") ?? "").trim() || null,
      tabelaMedidas: String(dados.get("tabelaMedidas") ?? "").trim() || null,
      abreEm: dataOuNulo("abreEm"),
      fechaEm: dataOuNulo("fechaEm"),
    });

    // Nao precisa recalcular nada aqui: o repositorio deriva o estado ("no ar",
    // "em breve", "esgotada") na leitura, a partir das datas e do estoque.
    recarregar(acaoId);
    redirect(`/painel/acao/${acaoId}?salvo=1`);
  }

  async function lancarManual(dados: FormData) {
    "use server";
    await exigirEdicao();

    const r = await registrarLancamentoManual({
      acaoId: acaoId,
      nome: String(dados.get("nome") ?? ""),
      whatsapp: String(dados.get("whatsapp") ?? ""),
      cpf: String(dados.get("cpf") ?? ""),
      anonimo: dados.get("anonimo") === "on",
      quantidade: Number(dados.get("quantidade") ?? 1),
      valorCentavos: paraCentavos(String(dados.get("valor") ?? "")),
      numeros: lerNumeros(String(dados.get("numeros") ?? ""), estoqueDaRifa),
      forma: String(dados.get("forma") ?? ""),
      // Campo vazio vira agora: lançamento sem data seria lançamento sem lugar
      // na linha do tempo do extrato.
      data: daCaixaDeData(String(dados.get("quando") ?? "")) ?? new Date(),
      registradoPorId: usuarioId,
    });

    recarregar(acaoId);
    revalidatePath("/painel/extrato");

    if (!r.ok) {
      redirect(`/painel/acao/${acaoId}?erro=${encodeURIComponent(r.erro)}`);
    }
    redirect(`/painel/acao/${acaoId}?lancado=1`);
  }

  async function publicar(dados: FormData) {
    "use server";
    await exigirEdicao();
    await publicarAcao(acaoId, dados.get("publicar") === "1");
    recarregar(acaoId);
  }

  async function apagar() {
    "use server";
    await exigirEdicao();
    await apagarAcao(acaoId);
    revalidatePath("/painel");
    revalidatePath("/");
    redirect("/painel");
  }

  // Opções de venda: o lote do ingresso, o tamanho da camisa. O preço vem em
  // reais e vira centavos aqui; estoque vazio = ilimitado.
  async function adicionarOpcao(dados: FormData) {
    "use server";
    await exigirEdicao();
    const nome = String(dados.get("nome") ?? "").trim();
    const preco = paraCentavos(String(dados.get("preco") ?? "")) ?? 0;
    if (!nome || preco <= 0) {
      redirect(`/painel/acao/${acaoId}?erroOpcao=${encodeURIComponent("Dê um nome e um preço à opção.")}`);
    }
    const estoque = String(dados.get("estoque") ?? "").trim();
    await criarOpcao(acaoId, {
      nome,
      precoCentavos: preco,
      custoUnitarioCentavos: paraCentavos(String(dados.get("custo") ?? "")) ?? 0,
      estoqueTotal: estoque ? Math.max(0, Math.floor(Number(estoque))) : null,
    });
    recarregar(acaoId);
  }

  async function salvarOpcaoAction(dados: FormData) {
    "use server";
    await exigirEdicao();
    const estoque = String(dados.get("estoque") ?? "").trim();
    await salvarOpcao(String(dados.get("id")), {
      nome: String(dados.get("nome") ?? "").trim(),
      precoCentavos: paraCentavos(String(dados.get("preco") ?? "")) ?? 0,
      custoUnitarioCentavos: paraCentavos(String(dados.get("custo") ?? "")) ?? 0,
      estoqueTotal: estoque ? Math.max(0, Math.floor(Number(estoque))) : null,
    });
    recarregar(acaoId);
  }

  async function removerOpcaoAction(dados: FormData) {
    "use server";
    await exigirEdicao();
    await removerOpcao(acaoId, String(dados.get("id")));
    recarregar(acaoId);
  }

  // Custo fixo: o valor cheio que a ação custou pra acontecer, e que some do
  // líquido na hora (a barra passa a precisar dele a mais pra fechar a meta).
  async function lancarCustoAction(dados: FormData) {
    "use server";
    await exigirEdicao();
    const valor = paraCentavos(String(dados.get("valor") ?? "")) ?? 0;
    const descricao = String(dados.get("descricao") ?? "").trim();
    if (valor <= 0 || !descricao) {
      redirect(
        `/painel/acao/${acaoId}?erroCusto=${encodeURIComponent("Descreva o custo e o valor.")}`
      );
    }
    await registrarCustoFixo({
      campanhaId: acao!.campanhaId,
      acaoId,
      descricao,
      valorCentavos: valor,
      data: daCaixaDeData(String(dados.get("quando") ?? "")) ?? new Date(),
      criadoPorId: usuarioId,
    });
    recarregar(acaoId);
    revalidatePath("/painel/extrato");
    redirect(`/painel/acao/${acaoId}?custo=1`);
  }

  async function apagarCustoAction(dados: FormData) {
    "use server";
    await exigirEdicao();
    await apagarCustoFixo(String(dados.get("id")));
    recarregar(acaoId);
    revalidatePath("/painel/extrato");
  }

  const acoesDoEditor = {
    adicionar: async (dados: FormData) => {
      "use server";
      await exigirEdicao();
      await adicionarBloco(alvo, String(dados.get("tipo")) as TipoBloco);
      recarregar(acaoId);
    },
    salvar: async (dados: FormData) => {
      "use server";
      await exigirEdicao();
      const blocoId = String(dados.get("id"));
      const bloco = (await listarBlocos(alvo)).find((b) => b.id === blocoId);
      if (!bloco) return;
      await salvarBloco(blocoId, lerConteudoDoFormulario(bloco.tipo as TipoBloco, dados));
      recarregar(acaoId);
    },
    mover: async (dados: FormData) => {
      "use server";
      await exigirEdicao();
      await moverBloco(alvo, String(dados.get("id")), String(dados.get("direcao")) as "cima" | "baixo");
      recarregar(acaoId);
    },
    alternar: async (dados: FormData) => {
      "use server";
      await exigirEdicao();
      await alternarBloco(String(dados.get("id")));
      recarregar(acaoId);
    },
    remover: async (dados: FormData) => {
      "use server";
      await exigirEdicao();
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

        {/* O pacote de comandos, junto e claro. Antes o "Salvar" era um botão
            secundário perdido no fim de um formulário longo, e ninguém o achava.
            Agora ele é o primeiro daqui, ao lado da prévia e do publicar. */}
        <div className="barra-comandos">
          {/* Salva o formulário "O básico" mesmo estando fora dele, pelo id. */}
          <button className="botao botao-primario botao-pequeno" type="submit" form="form-acao">
            Salvar ação
          </button>

          {/* Ver antes de publicar. Ação em rascunho ou marcada pra abrir no
              futuro não é clicável na página pública, então sem isto a equipe só
              descobria o erro de texto depois de já estar no ar. */}
          <a
            className="botao botao-contorno botao-pequeno"
            href={`/c/${campanha.slug}/${acao.slug}?previa=1`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver prévia
          </a>

          {/* Publicar NÃO é o mesmo que estar no ar: uma ação publicada com
              abertura marcada pro mês que vem já está publicada, só não abriu.
              Por isso o botão olha `rascunho`, não `disponivel`, e vira
              "Programar" quando há uma data de abertura no futuro. */}
          <form action={publicar}>
            <input type="hidden" name="publicar" value={acao.rascunho ? "1" : "0"} />
            <button
              className={`botao botao-pequeno ${acao.rascunho ? "botao-primario" : "botao-contorno"}`}
              type="submit"
            >
              {acao.rascunho ? (vaiAbrirNoFuturo ? "Programar" : "Publicar") : "Voltar para rascunho"}
            </button>
          </form>
        </div>
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
      </div>

      <section className="painel-cartao">
        <h2 className="formulario-secao">O básico</h2>
        <form id="form-acao" action={salvarBasico} className="formulario">
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

          {/* Foto e tabela de tamanhos só no PRODUTO: é a vitrine da peça, e
              aparece na página dela (não no cartão, que segue limpo, só ícone).
              Nos outros tipos, imagem entra num bloco de foto do construtor. */}
          {acao.tipo === "PRODUTO" && (
            <>
              <h2 className="formulario-secao">A peça</h2>
              <CampoDeImagem
                name="capa"
                valorInicial={acao.capaUrl}
                quadros={QUADRO_DA_ACAO.map((q) => ({ ...q, valorInicial: acao.capaFoco }))}
                rotulo="Foto do produto"
                ajuda="Aparece no alto da página desta ação, em tamanho grande."
              />
              <label className="campo">
                <span className="campo-rotulo">Tabela de tamanhos</span>
                <textarea
                  className="campo-entrada"
                  name="tabelaMedidas"
                  rows={5}
                  defaultValue={acao.tabelaMedidas ?? ""}
                  placeholder={"P: 68cm de comprimento, 48cm de largura\nM: 71cm, 52cm\nG: 74cm, 55cm"}
                />
                <span className="campo-ajuda">Uma linha por tamanho. Aparece na página, ao lado da foto.</span>
              </label>
            </>
          )}

          <button className="botao botao-primario" type="submit">
            Salvar ação
          </button>
        </form>
      </section>

      {/* Opções de venda: os lotes do ingresso, os tamanhos da camisa. Cada uma
          com preço e estoque próprios. Só evento e produto usam. */}
      {(acao.tipo === "EVENTO" || acao.tipo === "PRODUTO") && (
        <section className="painel-cartao">
          <h2 className="formulario-secao">
            {acao.tipo === "EVENTO" ? "Tipos de ingresso" : "Opções e tamanhos"}
          </h2>
          <p className="campo-ajuda" style={{ margin: "-8px 0 18px" }}>
            {acao.tipo === "EVENTO"
              ? "Cada tipo de ingresso (1º lote, 2º lote, VIP) com seu preço e sua quantidade. Quem compra escolhe um."
              : "Cada variação (P, M, G, sabor, cor) com seu preço e seu estoque. Quem compra escolhe uma."}{" "}
            Sem nenhuma opção, a ação cobra pelo preço único lá de cima.
          </p>

          {erroOpcao && (
            <p className="aviso-ruim" role="alert">
              {erroOpcao}
            </p>
          )}

          {(acao.opcoes ?? []).length > 0 && (
            <div className="opcoes-lista">
              {(acao.opcoes ?? []).map((o) => (
                <form key={o.id} action={salvarOpcaoAction} className="opcao-linha">
                  <input type="hidden" name="id" value={o.id} />
                  <label className="campo opcao-nome">
                    <span className="campo-rotulo">Nome</span>
                    <input className="campo-entrada" name="nome" defaultValue={o.nome} />
                  </label>
                  <label className="campo opcao-preco">
                    <span className="campo-rotulo">Preço</span>
                    <input
                      className="campo-entrada"
                      name="preco"
                      inputMode="decimal"
                      defaultValue={(o.precoCentavos / 100).toFixed(2).replace(".", ",")}
                    />
                  </label>
                  <label className="campo opcao-preco">
                    <span className="campo-rotulo">Custo</span>
                    <input
                      className="campo-entrada"
                      name="custo"
                      inputMode="decimal"
                      defaultValue={
                        o.custoUnitarioCentavos
                          ? (o.custoUnitarioCentavos / 100).toFixed(2).replace(".", ",")
                          : ""
                      }
                      placeholder="0,00"
                    />
                  </label>
                  <label className="campo opcao-estoque">
                    <span className="campo-rotulo">Quantidade</span>
                    <input
                      className="campo-entrada"
                      name="estoque"
                      inputMode="numeric"
                      defaultValue={o.estoqueTotal ?? ""}
                      placeholder="livre"
                    />
                  </label>
                  <div className="opcao-botoes">
                    <button className="botao botao-contorno botao-pequeno" type="submit">
                      Salvar
                    </button>
                    <button
                      className="editor-mini perigo"
                      type="submit"
                      formAction={removerOpcaoAction}
                      title="Remover opção"
                    >
                      Remover
                    </button>
                  </div>
                  {o.estoqueTotal != null && (
                    <span className="opcao-resta">
                      {o.restante ?? 0} de {o.estoqueTotal} ainda disponíveis
                    </span>
                  )}
                </form>
              ))}
            </div>
          )}

          <form action={adicionarOpcao} className="opcao-nova">
            <h3 className="opcao-nova-titulo">Adicionar {acao.tipo === "EVENTO" ? "ingresso" : "opção"}</h3>
            <div className="opcao-linha">
              <label className="campo opcao-nome">
                <span className="campo-rotulo">Nome</span>
                <input
                  className="campo-entrada"
                  name="nome"
                  placeholder={acao.tipo === "EVENTO" ? "1º lote" : "Tamanho M"}
                />
              </label>
              <label className="campo opcao-preco">
                <span className="campo-rotulo">Preço</span>
                <input className="campo-entrada" name="preco" inputMode="decimal" placeholder="40,00" />
              </label>
              <label className="campo opcao-preco">
                <span className="campo-rotulo">Custo</span>
                <input className="campo-entrada" name="custo" inputMode="decimal" placeholder="0,00" />
              </label>
              <label className="campo opcao-estoque">
                <span className="campo-rotulo">Quantidade</span>
                <input className="campo-entrada" name="estoque" inputMode="numeric" placeholder="livre" />
              </label>
              <div className="opcao-botoes">
                <button className="botao botao-primario botao-pequeno" type="submit">
                  Adicionar
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

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

      {/* Lançamento manual.
          Fica na tela da ação, e não numa página só dele, porque quem chega
          aqui com o caderno na mão já sabe de qual ação está falando. O
          formulário abre numa caixa por cima, pra não pesar a tela toda. */}
      <LancamentoManual
        action={lancarManual}
        ehRifa={ehRifa}
        valorLivre={valorLivre}
        precoCentavos={acao.precoCentavos}
        precoRotulo={formatarBRL(acao.precoCentavos ?? 0)}
        hoje={paraCampoData(new Date())}
        erro={erro}
        lancado={Boolean(lancado)}
      />

      {/* Custo fixo da ação: o valor cheio que ela custou pra acontecer e que
          não dá pra ratear por venda (os R$ 200 do bingo, o aluguel do salão).
          Sai do líquido na hora, então a barra passa a precisar dele a mais pra
          fechar a meta. É o que faltava pra quem não sabe o custo por unidade. */}
      <section className="painel-cartao">
        <h2 className="formulario-secao">Custo desta ação</h2>
        <p className="campo-ajuda" style={{ margin: "-8px 0 18px" }}>
          Para gastos de valor cheio, que não dependem de quanto você vende: o material do bingo,
          o aluguel do salão, a arte encomendada. Entra como desconto e a meta passa a contar com
          ele. (O custo por unidade vendida, esse, você define lá em cima, no preço.)
        </p>

        {erroCusto && (
          <p className="aviso-ruim" role="alert">
            {erroCusto}
          </p>
        )}
        {custo && (
          <p className="aviso-salvo" role="status">
            Custo lançado. Já saiu do líquido.
          </p>
        )}

        {custosFixos.length > 0 && (
          <div className="custos-lista">
            {custosFixos.map((c) => (
              <div key={c.id} className="custo-linha">
                <div>
                  <strong>{c.descricao}</strong>
                  <span className="custo-meta">
                    {c.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                    {c.criadoPor && ` · ${c.criadoPor.nome}`}
                  </span>
                </div>
                <span className="custo-valor">- {formatarBRL(Math.abs(c.valorCentavos))}</span>
                <form action={apagarCustoAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="editor-mini perigo" type="submit" title="Apagar custo">
                    Apagar
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <form action={lancarCustoAction} className="formulario">
          <div className="campo-dupla">
            <label className="campo">
              <span className="campo-rotulo">O que foi</span>
              <input className="campo-entrada" name="descricao" placeholder="Material do bingo" />
            </label>
            <label className="campo">
              <span className="campo-rotulo">Valor</span>
              <input className="campo-entrada" name="valor" inputMode="decimal" placeholder="200,00" />
            </label>
          </div>
          <label className="campo">
            <span className="campo-rotulo">Quando pagou</span>
            <input
              className="campo-entrada"
              name="quando"
              type="date"
              defaultValue={paraCampoData(new Date())}
            />
          </label>
          <button className="botao botao-contorno" type="submit">
            Lançar custo
          </button>
        </form>
      </section>

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
