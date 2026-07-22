import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  adicionarBloco,
  alternarBloco,
  listarBlocos,
  moverBloco,
  removerBloco,
  salvarBloco,
  salvarCampanha,
} from "@/lib/repositorio";
import { paraCentavos } from "@/lib/dinheiro";
import { exigirEdicao, campanhaDoPainel } from "@/lib/sessao";
import type { TipoBloco } from "@/lib/blocos";
import EditorDeBlocos, { lerConteudoDoFormulario } from "@/components/EditorDeBlocos";
import CampoDeImagem from "@/components/CampoDeImagem";
import { QUADROS_DA_CAPA } from "@/lib/quadros";

export const dynamic = "force-dynamic";

/**
 * Fica FORA do componente: o Next serializa o escopo que cada "use server"
 * enxerga, e funcao comum declarada dentro do componente quebra a serializacao.
 */
/** Date -> "AAAA-MM-DD" pelos getters LOCAIS: com toISOString a data escorrega
    um dia no Brasil (UTC-3). Mesmo cuidado da tela de acao. */
function paraCampoData(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** "AAAA-MM-DD" -> fim daquele dia, no horario local.
    Fim do dia, e nao meia-noite: quem marca 20 de dezembro espera doar ate o
    fim do dia 20, e nao ver a campanha fechar na virada da noite anterior. */
function daCaixaDeData(texto: string): Date | null {
  const t = texto.trim();
  if (!t) return null;
  const d = new Date(`${t}T23:59:59`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function recarregar() {
  revalidatePath("/painel/campanha");
  revalidatePath("/painel");
  revalidatePath("/");
}

export default async function EditarCampanha({
  searchParams,
}: {
  searchParams: Promise<{ salvo?: string }>;
}) {
  const { salvo } = await searchParams;
  const campanha = await campanhaDoPainel();
  const blocos = await listarBlocos({ tipo: "campanha", id: campanha.id });
  const alvo = { tipo: "campanha" as const, id: campanha.id };
  const campanhaId = campanha.id;

  async function salvar(dados: FormData) {
    "use server";
    await exigirEdicao();

    const meta = paraCentavos(String(dados.get("meta") ?? ""));

    await salvarCampanha(campanhaId, {
      titulo: String(dados.get("titulo") ?? "").trim(),
      prazo: daCaixaDeData(String(dados.get("prazo") ?? "")),
      periodo: String(dados.get("periodo") ?? "").trim() || null,
      equipeArrecadacao: String(dados.get("equipe") ?? "").trim() || null,
      sede: String(dados.get("sede") ?? "").trim() || null,
      capaUrl: String(dados.get("capa") ?? "").trim() || null,
      capaFoco: String(dados.get("capaFoco") ?? "").trim() || null,
      capaFocoMobile: String(dados.get("capaFocoMobile") ?? "").trim() || null,
      ...(meta && meta > 0 ? { metaCentavos: meta } : {}),
    });

    recarregar();
    // Sem isso a tela volta identica e parece que nada aconteceu. O parametro
    // e o que faz o aviso de "salvo" aparecer depois do recarregamento.
    redirect("/painel/campanha?salvo=1");
  }

  const acoesDoEditor = {
    adicionar: async (dados: FormData) => {
      "use server";
      await exigirEdicao();
      await adicionarBloco(alvo, String(dados.get("tipo")) as TipoBloco);
      recarregar();
    },
    salvar: async (dados: FormData) => {
      "use server";
      await exigirEdicao();
      const blocoId = String(dados.get("id"));
      const bloco = (await listarBlocos(alvo)).find((b) => b.id === blocoId);
      if (!bloco) return;
      await salvarBloco(blocoId, lerConteudoDoFormulario(bloco.tipo as TipoBloco, dados));
      recarregar();
    },
    mover: async (dados: FormData) => {
      "use server";
      await exigirEdicao();
      await moverBloco(alvo, String(dados.get("id")), String(dados.get("direcao")) as "cima" | "baixo");
      recarregar();
    },
    alternar: async (dados: FormData) => {
      "use server";
      await exigirEdicao();
      await alternarBloco(String(dados.get("id")));
      recarregar();
    },
    remover: async (dados: FormData) => {
      "use server";
      await exigirEdicao();
      await removerBloco(alvo, String(dados.get("id")));
      recarregar();
    },
  };

  return (
    <div className="painel-largura">
      <Link href="/painel" className="painel-voltar">
        Voltar para a campanha
      </Link>

      {salvo && (
        <p className="aviso-salvo" role="status">
          Alterações salvas.
        </p>
      )}

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

          <CampoDeImagem
            name="capa"
            valorInicial={campanha.capaUrl}
            quadros={QUADROS_DA_CAPA.map((q) => ({
              ...q,
              valorInicial: q.chave === "Mobile" ? campanha.capaFocoMobile : campanha.capaFoco,
            }))}
            rotulo="Foto de capa"
            ajuda="Aparece no topo da página, em preto e branco com um véu azul por cima. Foto deitada e larga funciona melhor. Sem foto, o topo fica azul liso."
          />

          <label className="campo">
            <span className="campo-rotulo">Equipe de arrecadação</span>
            <input
              className="campo-entrada"
              name="equipe"
              defaultValue={campanha.equipeArrecadacao ?? ""}
              placeholder="Higor Bernardino, Luan Cantele"
            />
            <span className="campo-ajuda">
              Escreva o nome e o sobrenome de quem está nesta equipe, separados por vírgula. É o
              que permite a quem doa identificar que aquela é a arrecadação da pessoa que pediu
              ajuda.
            </span>
          </label>

          <label className="campo">
            <span className="campo-rotulo">Prazo da campanha</span>
            <input
              className="campo-entrada"
              name="prazo"
              type="date"
              defaultValue={campanha.prazo ? paraCampoData(campanha.prazo) : ""}
            />
            <span className="campo-ajuda">
              Até quando vocês pretendem arrecadar. É o que define os &quot;dias restantes&quot;
              na página. Em branco, a campanha fica aberta sem data.
            </span>
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

          {/* Sobre a Teto e o contrato de Casa Amiga NAO sao campos.
              Explicam a organizacao e o modelo, e isso e igual em toda equipe:
              viraram texto do sistema, em src/lib/textos.ts. */}
          <p className="campo-ajuda">
            Os textos <strong>Sobre a Teto</strong> e <strong>O contrato de Casa Amiga</strong>{" "}
            são do sistema e aparecem iguais em toda campanha. Se algum precisar mudar, fale com
            quem cuida da plataforma.
          </p>

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
