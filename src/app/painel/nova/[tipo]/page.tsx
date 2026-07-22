import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { receitaDe, rotuloEsforco, type CampoDaReceita } from "@/lib/catalogo";
import { campanhaAtual, criarAcao } from "@/lib/repositorio";
import { exigirEdicao } from "@/lib/sessao";
import { paraCentavos } from "@/lib/dinheiro";
import { IconeDaAcao } from "@/components/icones";

export const dynamic = "force-dynamic";

/** Desenha um campo da receita. O tipo do campo decide o controle. */
function Campo({ campo }: { campo: CampoDaReceita }) {
  const nome = `cfg_${campo.chave}`;
  const padrao = campo.padrao;

  return (
    <label className="campo">
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
        <textarea
          className="campo-entrada"
          name={nome}
          rows={3}
          placeholder={campo.exemplo}
          required={campo.obrigatorio}
          defaultValue={typeof padrao === "string" ? padrao : undefined}
        />
      ) : campo.tipo === "escolha" ? (
        <select
          className="campo-entrada"
          name={nome}
          defaultValue={typeof padrao === "string" ? padrao : undefined}
        >
          {(campo.escolhas ?? []).map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.rotulo}
            </option>
          ))}
        </select>
      ) : campo.tipo === "booleano" ? (
        <span className="campo-chave">
          <input type="checkbox" name={nome} value="1" defaultChecked={padrao === true} />
          <span>Sim</span>
        </span>
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
    </label>
  );
}

export default async function NovaAcao({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  const receita = receitaDe(tipo);
  if (!receita) notFound();

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

    const campanha = await campanhaAtual();

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
