import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { receitaDe, rotuloEsforco, type CampoDaReceita } from "@/lib/catalogo";
import { criarAcao, salvarAcao, listarBlocos, salvarBloco } from "@/lib/repositorio";
import { criarOpcao } from "@/lib/opcoes";
import { exigirEdicao, campanhaDoPainel } from "@/lib/sessao";
import { paraCentavos } from "@/lib/dinheiro";
import { IconeDaAcao } from "@/components/icones";
import FormularioDoProduto from "@/components/FormularioDoProduto";
import { produtoEmBranco } from "@/lib/produto";
import { CampoDeEscolha, CampoDeLista, CampoDeChave } from "@/components/ControlesDeForm";
import { lerTextoRico, textoSimples } from "@/lib/textoRico";

export const dynamic = "force-dynamic";

/** "AAAA-MM-DD" -> meia-noite LOCAL. Vazio ou invalido vira null. */
function daCaixaDeData(texto: string): Date | null {
  const t = texto.trim();
  if (!t) return null;
  const d = new Date(`${t}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Le um campo escondido que veio como JSON. Qualquer defeito volta ao padrao. */
function lerJson<T>(bruto: FormDataEntryValue | null, padrao: T): T {
  try {
    const v = JSON.parse(String(bruto ?? ""));
    return v as T;
  } catch {
    return padrao;
  }
}

/** "P, M, G" ou uma por linha viram ["P","M","G"]. Pro padrão das listas. */
function emLista(texto: string): string[] {
  return texto
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Desenha um campo da receita. O tipo do campo decide o controle.
 *
 * Escolha, lista e sim/não usam os controles novos (segmentado, fichinhas,
 * chavinha) que nasceram na tela de produto. Como são interativos, viram
 * <div> em vez de <label>: <label> em volta de botões confunde o clique.
 */
function Campo({ campo }: { campo: CampoDaReceita }) {
  const nome = `cfg_${campo.chave}`;
  const padrao = campo.padrao;
  const interativo =
    campo.tipo === "escolha" || campo.tipo === "opcoes" || campo.tipo === "booleano";
  const Moldura = interativo ? "div" : "label";

  return (
    <Moldura className="campo">
      <span className="campo-rotulo">
        {campo.rotulo}
        {campo.obrigatorio && <em className="campo-obrigatorio">obrigatório</em>}
      </span>

      {campo.tipo === "textoLongo" ? (
        <textarea
          className="campo-entrada"
          name={nome}
          rows={4}
          placeholder={campo.exemplo}
          required={campo.obrigatorio}
          defaultValue={typeof padrao === "string" ? padrao : undefined}
        />
      ) : campo.tipo === "opcoes" ? (
        <CampoDeLista
          nome={nome}
          placeholder={campo.exemplo}
          padrao={typeof padrao === "string" ? emLista(padrao) : []}
        />
      ) : campo.tipo === "escolha" ? (
        <CampoDeEscolha
          nome={nome}
          escolhas={campo.escolhas ?? []}
          padrao={typeof padrao === "string" ? padrao : undefined}
        />
      ) : campo.tipo === "booleano" ? (
        <CampoDeChave nome={nome} padrao={padrao === true} />
      ) : (
        <input
          className="campo-entrada"
          name={nome}
          type={
            campo.tipo === "numero"
              ? "number"
              : campo.tipo === "data"
                ? "date"
                : campo.tipo === "dataHora"
                  ? "datetime-local"
                  : "text"
          }
          inputMode={campo.tipo === "dinheiro" ? "decimal" : undefined}
          placeholder={campo.tipo === "dinheiro" ? "0,00" : campo.exemplo}
          required={campo.obrigatorio}
          defaultValue={
            typeof padrao === "number" && campo.tipo === "dinheiro"
              ? (padrao / 100).toFixed(2).replace(".", ",")
              : typeof padrao === "number" || typeof padrao === "string"
                ? String(padrao)
                : undefined
          }
        />
      )}

      {campo.ajuda && <span className="campo-ajuda">{campo.ajuda}</span>}
    </Moldura>
  );
}

export default async function NovaAcao({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  const receita = receitaDe(tipo);
  if (!receita) notFound();

  // O produto tem tela propria (ver NovoProduto): as decisoes conversam entre
  // si e nao cabem num campo atras do outro. O resto dos tipos segue no
  // formulario generico logo abaixo.
  if (tipo === "PRODUTO") {
    async function criarProduto(dados: FormData) {
      "use server";
      await exigirEdicao();

      // Dois nomes com papéis diferentes: o da campanha vai no alto da página,
      // o do produto vai ao lado da foto, na vitrine.
      const nomeCampanha = String(dados.get("nomeCampanha") ?? "").trim();
      const nomeProduto = String(dados.get("nomeProduto") ?? "").trim();
      // Os dois textos chegam como JSON do editor (negrito, itálico, cor).
      const descricaoRica = lerTextoRico(lerJson(dados.get("descricao"), null));
      const historia = lerTextoRico(lerJson(dados.get("historia"), null));
      const preco = paraCentavos(String(dados.get("preco") ?? ""));
      const meta = paraCentavos(String(dados.get("meta") ?? ""));
      const prazo = String(dados.get("prazo") ?? "").trim();
      const cor = String(dados.get("cor") ?? "").trim();
      const coresProprias =
        dados.get("coresProprias") === "1"
          ? {
              principal: String(dados.get("corPrincipal") ?? "").trim() || null,
              topo: String(dados.get("corTopo") ?? "").trim() || null,
            }
          : null;
      const palavraChave = String(dados.get("palavraChave") ?? "")
        .trim()
        .slice(0, 30);
      const modo = String(dados.get("modoProducao") ?? "ENCOMENDA");
      const custoQuando = String(dados.get("custoQuando") ?? "AGORA");
      const custoComo = String(dados.get("custoComo") ?? "PRODUTO");
      const custoValor = paraCentavos(String(dados.get("custoValor") ?? "")) ?? 0;
      const capa = String(dados.get("capa") ?? "").trim();

      const fotos = lerJson<string[]>(dados.get("fotos"), []);
      const variantes = lerJson<{ nome: string; quantidade: number | null }[]>(
        dados.get("variantes"),
        []
      );
      const entregas = lerJson<{ tipo: string; rotulo: string; texto: string }[]>(
        dados.get("entregas"),
        []
      );
      const estoqueSimplesRaw = String(dados.get("estoqueSimples") ?? "").trim();

      // Custo por produto anda com a venda: vira custo unitario e desconta a
      // cada peca vendida. Custo total do lote NAO entra agora: a acao nao pode
      // comecar no vermelho e cada venda tem que fazer a barra subir. Ele fica
      // guardado na config e e descontado so no fim, sobre o que foi vendido
      // (por enquanto, lancado a mao na tela da acao ao fechar). Igual pra quem
      // escolhe cadastrar o custo no final.
      const custoAgoraPorProduto =
        custoQuando === "AGORA" && custoComo === "PRODUTO" && custoValor > 0;
      const custoUnitario = custoAgoraPorProduto ? custoValor : 0;
      const custoTotalGuardado =
        custoValor > 0 && (custoComo === "TOTAL" || custoQuando === "FINAL") ? custoValor : 0;

      // Estoque na propria acao so quando nao ha variacao e o lote ja existe.
      // Com variacao, o estoque mora em cada opcao.
      const estoqueTotal =
        variantes.length === 0 && modo === "PRONTO" && estoqueSimplesRaw
          ? Math.max(0, Math.floor(Number(estoqueSimplesRaw)))
          : null;

      const campanha = await campanhaDoPainel();

      const acao = await criarAcao({
        campanhaId: campanha.id,
        tipo: "PRODUTO",
        titulo: nomeCampanha || nomeProduto || "Produto",
        descricao: textoSimples(descricaoRica),
        precoCentavos: preco,
        custoUnitarioCentavos: custoUnitario,
        metaCentavos: meta,
        estoqueTotal,
        config: {
          modoProducao: modo,
          prazoProducao: prazo,
          palavraChave,
          cardTitulo: String(dados.get("cardTitulo") ?? "").trim(),
          cardDescricao: String(dados.get("cardDescricao") ?? "").trim().slice(0, 160),
          nomeDoProduto: nomeProduto,
          cores: coresProprias,
          entregas,
          custoQuando,
          custoComo,
          custoTotalCentavos: custoTotalGuardado,
          historia,
          descricaoRica,
          // A estrutura das variacoes (quais dimensoes, com que valores, e a
          // grade). E o que deixa a tela de gerenciar renascer identica: so os
          // nomes das variantes ja combinados nao diriam que dimensoes existiam.
          variacoes: lerJson(dados.get("variacoes"), null),
        },
      });

      // Periodo, capa e cor nao entram no criarAcao: seguem por salvarAcao.
      await salvarAcao(acao.id, {
        capaUrl: capa || null,
        capaFoco: capa ? "50% 50%" : null,
        cor: cor || undefined,
        abreEm: daCaixaDeData(String(dados.get("abreEm") ?? "")),
        fechaEm: daCaixaDeData(String(dados.get("fechaEm") ?? "")),
      });

      // Cada variante vira uma opcao de venda: mesmo preco do produto, o custo
      // por unidade quando e esse o modelo, e o estoque da celula (nulo = livre).
      for (const v of variantes) {
        await criarOpcao(acao.id, {
          nome: v.nome,
          precoCentavos: preco ?? 0,
          custoUnitarioCentavos: custoUnitario,
          estoqueTotal: v.quantidade,
        });
      }

      // As fotos extras entram na galeria com que a pagina do produto ja nasce.
      // A historia NAO entra em bloco: ela e a descricao da acao e aparece no
      // alto da pagina, entao repetir num bloco de texto seria dizer duas vezes
      // a mesma coisa na mesma pagina.
      const blocos = await listarBlocos({ tipo: "acao", id: acao.id });
      const extras = fotos.slice(1);
      if (extras.length > 0) {
        const galeria = blocos.find((b) => b.tipo === "GALERIA");
        if (galeria) await salvarBloco(galeria.id, { ...galeria.conteudo, imagens: extras });
      }

      redirect(`/painel/acao/${acao.id}?novo=1`);
    }

    return (
      <div className="painel-estreito painel-produto">
        <Link href="/painel/ferramentas" className="painel-voltar">
          Voltar para a caixa de ferramentas
        </Link>

        <div className="receita-cabeca">
          <span className="receita-icone">
            <IconeDaAcao tipo="PRODUTO" />
          </span>
          <div>
            <h1>Vender um produto</h1>
            <p>
              Você monta um produto pra vender e reverter pra arrecadação. O sistema desconta o
              custo sozinho, então o número que aparece é lucro de verdade, não faturamento.
            </p>
          </div>
        </div>

        <section className="receita-como">
          <h2>Como funciona</h2>
          <ol>
            <li>Você cadastra o produto: foto, preço e quanto custa cada peça pra produzir.</li>
            <li>Quem compra escolhe a variação que quer e paga no PIX.</li>
            <li>O custo é descontado do valor de cada peça vendida e o lucro entra para a meta.</li>
            <li>Você recebe a lista de quem comprou o quê, pra entregar tudo certo sem se perder.</li>
          </ol>
          <p className="receita-esforco">Dá um trabalhinho, mas o retorno é real.</p>
        </section>

        <FormularioDoProduto
          action={criarProduto}
          modo="criar"
          valores={produtoEmBranco()}
        />
      </div>
    );
  }

  const pedePreco = receita.precificacao === "FIXO" || receita.precificacao === "FAIXAS";
  const pedeCustoUnitario =
    receita.modeloDeCusto === "POR_UNIDADE" || receita.modeloDeCusto === "MISTO";

  async function criar(dados: FormData) {
    "use server";
    await exigirEdicao();

    const r = receitaDe(tipo)!;

    // Os campos da receita viram um objeto de configuracao. Guardar tudo junto
    // em `config` evita uma coluna por tipo de acao no banco.
    const config: Record<string, unknown> = {};
    for (const campo of r.campos) {
      const bruto = dados.get(`cfg_${campo.chave}`);
      if (campo.tipo === "booleano") {
        config[campo.chave] = bruto === "1";
      } else if (campo.tipo === "dinheiro") {
        config[campo.chave] = bruto ? paraCentavos(String(bruto)) : null;
      } else if (campo.tipo === "opcoes") {
        config[campo.chave] = String(bruto ?? "")
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (campo.tipo === "numero") {
        config[campo.chave] = bruto ? Number(bruto) : null;
      } else {
        config[campo.chave] = String(bruto ?? "");
      }
    }

    const preco = paraCentavos(String(dados.get("preco") ?? ""));
    const meta = paraCentavos(String(dados.get("meta") ?? ""));
    const estoque = dados.get("estoque") ? Number(dados.get("estoque")) : null;
    const custoUnit = paraCentavos(String(dados.get("custoUnitario") ?? "")) ?? 0;

    const campanha = await campanhaDoPainel();

    const acao = await criarAcao({
      campanhaId: campanha.id,
      tipo,
      titulo: String(dados.get("titulo") ?? "").trim() || r.nome,
      descricao: String(dados.get("descricao") ?? "").trim(),
      precoCentavos: preco,
      custoUnitarioCentavos: custoUnit,
      metaCentavos: meta,
      estoqueTotal: estoque,
      config,
    });

    redirect(`/painel/acao/${acao.id}?novo=1`);
  }

  return (
    <div className="painel-estreito">
      <Link href="/painel/ferramentas" className="painel-voltar">
        Voltar para a caixa de ferramentas
      </Link>

      <div className="receita-cabeca">
        <span className="receita-icone">
          <IconeDaAcao tipo={receita.tipo} />
        </span>
        <div>
          <h1>{receita.nome}</h1>
          <p>{receita.descricao}</p>
        </div>
      </div>

      <section className="receita-como">
        <h2>Como funciona</h2>
        <ol>
          {receita.comoFunciona.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ol>
        <p className="receita-esforco">{rotuloEsforco(receita.esforco)}</p>
      </section>

      {receita.armadilha && (
        <aside className="receita-armadilha">
          <span className="receita-armadilha-rotulo">O erro mais comum</span>
          <p>{receita.armadilha}</p>
        </aside>
      )}

      <form action={criar} className="formulario">
        <h2 className="formulario-secao">O básico</h2>

        <label className="campo">
          <span className="campo-rotulo">
            Nome da ação<em className="campo-obrigatorio">obrigatório</em>
          </span>
          <input
            className="campo-entrada"
            name="titulo"
            required
            defaultValue={receita.nome}
            autoFocus
          />
          <span className="campo-ajuda">
            É o que aparece no cartão da página. Nome concreto funciona melhor que genérico.
          </span>
        </label>

        <label className="campo">
          <span className="campo-rotulo">Descrição</span>
          <textarea
            className="campo-entrada"
            name="descricao"
            rows={4}
            placeholder="Explique como se estivesse contando para alguém no WhatsApp."
          />
          <span className="campo-ajuda">
            Aparece no cartão da ação. Descrição maior converte mais: quem entende o que vai
            acontecer participa mais.
          </span>
        </label>

        {pedePreco && (
          <label className="campo">
            <span className="campo-rotulo">Preço por unidade</span>
            <input className="campo-entrada" name="preco" inputMode="decimal" placeholder="0,00" />
            <span className="campo-ajuda">
              Deixe em branco se quem participa é que escolhe o valor.
            </span>
          </label>
        )}

        {receita.temEstoque && (
          <label className="campo">
            <span className="campo-rotulo">Quantidade disponível</span>
            <input className="campo-entrada" name="estoque" type="number" min={1} />
            <span className="campo-ajuda">
              O sistema fecha a venda sozinho quando acabar. Deixe em branco se não tem limite.
            </span>
          </label>
        )}

        {pedeCustoUnitario && (
          <label className="campo">
            <span className="campo-rotulo">Custo por unidade</span>
            <input
              className="campo-entrada"
              name="custoUnitario"
              inputMode="decimal"
              placeholder="0,00"
            />
            <span className="campo-ajuda">
              Só vira custo quando vende. O que está parado no estoque não conta como prejuízo.
            </span>
          </label>
        )}

        <label className="campo">
          <span className="campo-rotulo">Meta desta ação</span>
          <input className="campo-entrada" name="meta" inputMode="decimal" placeholder="0,00" />
          <span className="campo-ajuda">
            Opcional. Sem meta própria, a barra da ação usa o quanto ainda falta para fechar o
            contrato.
          </span>
        </label>

        {receita.campos.length > 0 && (
          <>
            <h2 className="formulario-secao">Detalhes de {receita.nome.toLowerCase()}</h2>
            {receita.campos.map((c) => (
              <Campo key={c.chave} campo={c} />
            ))}
          </>
        )}

        {receita.checklist.length > 0 && (
          <aside className="receita-checklist">
            <span className="receita-checklist-rotulo">Fora do sistema, não esqueça</span>
            <ul>
              {receita.checklist.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </aside>
        )}

        <div className="formulario-pe">
          <button className="botao botao-primario" type="submit">
            Criar ação
          </button>
          <span className="formulario-nota">
            A ação nasce como rascunho: só aparece na página quando você publicar.
          </span>
        </div>
      </form>
    </div>
  );
}
