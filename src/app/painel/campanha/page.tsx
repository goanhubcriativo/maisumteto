import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  adicionarBloco,
  alternarBloco,
  campanhaAtual,
  listarBlocos,
  moverBloco,
  removerBloco,
  salvarBloco,
  salvarCampanha,
} from "@/lib/repositorio";
import { paraCentavos } from "@/lib/dinheiro";
import type { TipoBloco } from "@/lib/blocos";
import EditorDeBlocos, { lerConteudoDoFormulario } from "@/components/EditorDeBlocos";

export const dynamic = "force-dynamic";

/**
 * Fica FORA do componente: o Next serializa o escopo que cada "use server"
 * enxerga, e funcao comum declarada dentro do componente quebra a serializacao.
 */
function recarregar() {
  revalidatePath("/painel/campanha");
  revalidatePath("/painel");
  revalidatePath("/");
}

export default async function EditarCampanha() {
  const campanha = await campanhaAtual();
  const blocos = await listarBlocos({ tipo: "campanha", id: campanha.id });
  const alvo = { tipo: "campanha" as const, id: campanha.id };
  const campanhaId = campanha.id;

  async function salvar(dados: FormData) {
    "use server";

    const meta = paraCentavos(String(dados.get("meta") ?? ""));

    await salvarCampanha(campanhaId, {
      titulo: String(dados.get("titulo") ?? "").trim(),
      periodo: String(dados.get("periodo") ?? "").trim() || null,
      equipeArrecadacao: String(dados.get("equipe") ?? "").trim() || null,
      sede: String(dados.get("sede") ?? "").trim() || null,
      resumo: String(dados.get("resumo") ?? "").trim() || null,
      sobreTeto: String(dados.get("sobreTeto") ?? "").trim() || null,
      sobreContrato: String(dados.get("sobreContrato") ?? "").trim() || null,
      ...(meta && meta > 0 ? { metaCentavos: meta } : {}),
    });

    recarregar();
  }

  const acoesDoEditor = {
    adicionar: async (dados: FormData) => {
      "use server";
      await adicionarBloco(alvo, String(dados.get("tipo")) as TipoBloco);
      recarregar();
    },
    salvar: async (dados: FormData) => {
      "use server";
      const blocoId = String(dados.get("id"));
      const bloco = (await listarBlocos(alvo)).find((b) => b.id === blocoId);
      if (!bloco) return;
      await salvarBloco(blocoId, lerConteudoDoFormulario(bloco.tipo as TipoBloco, dados));
      recarregar();
    },
    mover: async (dados: FormData) => {
      "use server";
      await moverBloco(alvo, String(dados.get("id")), String(dados.get("direcao")) as "cima" | "baixo");
      recarregar();
    },
    alternar: async (dados: FormData) => {
      "use server";
      await alternarBloco(String(dados.get("id")));
      recarregar();
    },
    remover: async (dados: FormData) => {
      "use server";
      await removerBloco(alvo, String(dados.get("id")));
      recarregar();
    },
  };

  return (
    <div className="painel-largura">
      <Link href="/painel" className="painel-voltar">
        Voltar para a campanha
      </Link>

      <div className="painel-cabeca">
        <div>
          <span className="painel-sobre">Editar</span>
          <h1>Dados da campanha</h1>
          <p className="painel-intro">
            É o que aparece no alto da página pública, antes de qualquer ação.
          </p>
        </div>
      </div>

      <section className="painel-cartao">
        <form action={salvar} className="formulario">
          <label className="campo">
            <span className="campo-rotulo">Título</span>
            <input className="campo-entrada" name="titulo" defaultValue={campanha.titulo} />
          </label>

          <div className="campo-dupla">
            <label className="campo">
              <span className="campo-rotulo">Período da construção</span>
              <input
                className="campo-entrada"
                name="periodo"
                defaultValue={campanha.periodo ?? ""}
                placeholder="Dezembro de 2026"
              />
            </label>

            <label className="campo">
              <span className="campo-rotulo">Sede</span>
              <input className="campo-entrada" name="sede" defaultValue={campanha.sede ?? ""} />
            </label>
          </div>

          <label className="campo">
            <span className="campo-rotulo">Equipe de arrecadação</span>
            <input
              className="campo-entrada"
              name="equipe"
              defaultValue={campanha.equipeArrecadacao ?? ""}
              placeholder="Nomes separados por hífen"
            />
          </label>

          <label className="campo">
            <span className="campo-rotulo">Meta do contrato</span>
            <input
              className="campo-entrada"
              name="meta"
              inputMode="decimal"
              defaultValue={(campanha.metaCentavos / 100).toFixed(2).replace(".", ",")}
            />
            <span className="campo-ajuda">O custo fechado desta casa.</span>
          </label>

          <label className="campo">
            <span className="campo-rotulo">Chamada curta</span>
            <textarea
              className="campo-entrada"
              name="resumo"
              rows={3}
              defaultValue={campanha.resumo ?? ""}
            />
          </label>

          <label className="campo">
            <span className="campo-rotulo">Sobre a Teto</span>
            <textarea
              className="campo-entrada"
              name="sobreTeto"
              rows={7}
              defaultValue={campanha.sobreTeto ?? ""}
            />
            <span className="campo-ajuda">
              Deixe uma linha em branco entre os parágrafos. Este texto precisa da revisão da Teto
              antes de ir ao ar.
            </span>
          </label>

          <label className="campo">
            <span className="campo-rotulo">O contrato de Casa Amiga</span>
            <textarea
              className="campo-entrada"
              name="sobreContrato"
              rows={5}
              defaultValue={campanha.sobreContrato ?? ""}
            />
          </label>

          <button className="botao botao-primario" type="submit">
            Salvar campanha
          </button>
        </form>
      </section>

      <div className="painel-secao-cabeca">
        <h2>Blocos extras da campanha</h2>
      </div>
      <p className="painel-intro" style={{ marginBottom: 18 }}>
        Entram embaixo do texto institucional. É onde a campanha vira um microblog: fotos do
        mutirão, vídeo da família, recados da equipe.
      </p>

      <EditorDeBlocos
        blocos={blocos}
        acoes={acoesDoEditor}
      />
    </div>
  );
}
