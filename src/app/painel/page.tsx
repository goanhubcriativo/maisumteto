import Link from "next/link";
import { revalidatePath } from "next/cache";
import { campanhaAtual, contarApoiadores, listarAcoes, publicarAcao, type AcaoDoPainel } from "@/lib/repositorio";
import { resumoCampanha } from "@/lib/extrato";
import { formatarBRL, formatarBRLCurto } from "@/lib/dinheiro";
import { receitaDe } from "@/lib/catalogo";
import { IconeDaAcao } from "@/components/icones";

export const dynamic = "force-dynamic";

export default async function Painel() {
  const campanha = await campanhaAtual();
  const [resumo, apoiadores, acoes] = await Promise.all([
    resumoCampanha(campanha.id),
    contarApoiadores(campanha.id),
    listarAcoes(campanha.id),
  ]);

  // Separa por PUBLICADA, nao por "no ar": uma acao agendada pro mes que vem ja
  // esta publicada e nao deve voltar pra lista de rascunhos.
  const publicadas = acoes.filter((a) => !a.rascunho);
  const rascunhos = acoes.filter((a) => a.rascunho);

  async function alternar(dados: FormData) {
    "use server";
    const id = String(dados.get("id"));
    await publicarAcao(id, dados.get("publicar") === "1");
    revalidatePath("/painel");
    revalidatePath("/");
  }

  return (
    <div className="painel-largura">
      <div className="painel-cabeca">
        <div>
          <span className="painel-sobre">Campanha</span>
          <h1>{campanha.titulo}</h1>
        </div>
        <Link href="/painel/campanha" className="botao botao-contorno">
          Editar campanha
        </Link>
      </div>

      <section className="painel-placar">
        <div>
          <span className="painel-placar-valor">{formatarBRL(resumo.liquidoCentavos)}</span>
          <span className="painel-placar-rotulo">
            arrecadados de {formatarBRLCurto(resumo.metaCentavos)}
          </span>
        </div>
        <div>
          <span className="painel-placar-valor">{Math.floor(resumo.percentual)}%</span>
          <span className="painel-placar-rotulo">da meta</span>
        </div>
        <div>
          <span className="painel-placar-valor">{publicadas.length}</span>
          <span className="painel-placar-rotulo">
            {publicadas.length === 1 ? "ação no ar" : "ações no ar"}
          </span>
        </div>
        <div>
          <span className="painel-placar-valor">{apoiadores}</span>
          <span className="painel-placar-rotulo">apoiadores</span>
        </div>
      </section>

      <div className="painel-secao-cabeca">
        <h2>Ações da campanha</h2>
        <Link href="/painel/ferramentas" className="botao botao-primario">
          Nova ação
        </Link>
      </div>

      {rascunhos.length > 0 && (
        <>
          <p className="painel-etiqueta-lista">
            Rascunhos ({rascunhos.length}) · só ficam visíveis depois de publicar
          </p>
          <div className="painel-lista">
            {rascunhos.map((a) => (
              <LinhaDeAcao key={a.id} acao={a} alternar={alternar} />
            ))}
          </div>
        </>
      )}

      <p className="painel-etiqueta-lista">Publicadas ({publicadas.length})</p>
      <div className="painel-lista">
        {publicadas.map((a) => (
          <LinhaDeAcao key={a.id} acao={a} alternar={alternar} />
        ))}
      </div>
    </div>
  );
}

function LinhaDeAcao({
  acao,
  alternar,
}: {
  acao: AcaoDoPainel;
  alternar: (dados: FormData) => Promise<void>;
}) {
  const receita = receitaDe(acao.tipo);

  return (
    <div className="painel-linha">
      <span className="painel-linha-icone">
        <IconeDaAcao tipo={acao.tipo} />
      </span>

      <span className="painel-linha-corpo">
        <Link href={`/painel/acao/${acao.id}`} className="painel-linha-titulo">
          {acao.titulo}
        </Link>
        <span className="painel-linha-apoio">
          {acao.motivo === "AINDA_NAO_ABRIU" ? "Em breve · " : ""}
          {receita?.nome ?? acao.tipo}
          {acao.precoCentavos != null ? ` · ${formatarBRLCurto(acao.precoCentavos)}` : " · valor livre"}
          {acao.estoqueTotal != null ? ` · ${acao.restante ?? 0} de ${acao.estoqueTotal} restantes` : ""}
        </span>
      </span>

      <span className="painel-linha-valor">{formatarBRLCurto(acao.liquidoCentavos)}</span>

      <form action={alternar} className="painel-linha-acoes">
        <input type="hidden" name="id" value={acao.id} />
        <input type="hidden" name="publicar" value={acao.rascunho ? "1" : "0"} />
        <button className="botao botao-contorno botao-pequeno" type="submit">
          {acao.rascunho ? "Publicar" : "Despublicar"}
        </button>
      </form>
    </div>
  );
}
