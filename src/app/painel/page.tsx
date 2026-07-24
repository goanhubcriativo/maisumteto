import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  buscarAcao,
  campanhaAtual,
  contarApoiadores,
  listarAcoes,
  moverAcao,
  publicarAcao,
  type AcaoDoPainel,
} from "@/lib/repositorio";
import { exigirEdicao, campanhaDoPainel } from "@/lib/sessao";
import { resumoCampanha } from "@/lib/extrato";
import { formatarBRL, formatarBRLCurto, paraCentavos } from "@/lib/dinheiro";
import { lerNumeros, registrarLancamentoManual } from "@/lib/manual";
import { receitaDe } from "@/lib/catalogo";
import { IconeDaAcao } from "@/components/icones";
import LancamentoManual from "@/components/LancamentoManual";

export const dynamic = "force-dynamic";

/** Date -> "AAAA-MM-DD" com os getters locais (toISOString joga pro dia anterior). */
function paraCampoData(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** "AAAA-MM-DD" -> meia-noite LOCAL daquele dia. */
function daCaixaDeData(texto: string): Date | null {
  const t = texto.trim();
  if (!t) return null;
  const d = new Date(`${t}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function Painel({
  searchParams,
}: {
  searchParams: Promise<{ somenteLeitura?: string; lancado?: string; erro?: string }>;
}) {
  const { somenteLeitura, lancado, erro } = await searchParams;
  const hoje = paraCampoData(new Date());
  const campanha = await campanhaDoPainel();
  const principal = await campanhaAtual();
  const ehTeste = campanha.id !== principal.id;
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
    await exigirEdicao();
    const id = String(dados.get("id"));
    await publicarAcao(id, dados.get("publicar") === "1");
    revalidatePath("/painel");
    revalidatePath("/");
  }

  // Sobe ou desce um card na ordem em que ele aparece pra quem visita.
  async function reordenar(dados: FormData) {
    "use server";
    await exigirEdicao();
    const c = await campanhaDoPainel();
    await moverAcao(c.id, String(dados.get("id")), dados.get("direcao") === "cima" ? "cima" : "baixo");
    revalidatePath("/painel");
    revalidatePath("/");
  }

  /**
   * Lançamento manual direto da lista. Uma server action só serve todas as
   * linhas: a ação vem no próprio formulário (campo `acaoId`), e não presa no
   * fechamento, senão seria uma action diferente por linha da lista.
   */
  async function lancarManualDaLista(dados: FormData) {
    "use server";
    const usuario = await exigirEdicao();

    const acaoId = String(dados.get("acaoId") ?? "");
    const alvo = acaoId ? await buscarAcao(acaoId) : null;
    if (!alvo) {
      redirect(`/painel?erro=${encodeURIComponent("Não achei essa ação.")}`);
    }

    const r = await registrarLancamentoManual({
      acaoId: alvo.id,
      nome: String(dados.get("nome") ?? ""),
      whatsapp: String(dados.get("whatsapp") ?? ""),
      cpf: String(dados.get("cpf") ?? ""),
      anonimo: dados.get("anonimo") === "on",
      quantidade: Number(dados.get("quantidade") ?? 1),
      valorCentavos: paraCentavos(String(dados.get("valor") ?? "")),
      numeros: lerNumeros(
        String(dados.get("numeros") ?? ""),
        alvo.tipo === "RIFA" ? alvo.estoqueTotal ?? 0 : 0
      ),
      forma: String(dados.get("forma") ?? ""),
      data: daCaixaDeData(String(dados.get("quando") ?? "")) ?? new Date(),
      registradoPorId: usuario.id,
    });

    revalidatePath("/painel");
    revalidatePath("/painel/extrato");
    revalidatePath("/");

    if (!r.ok) {
      redirect(`/painel?erro=${encodeURIComponent(r.erro)}`);
    }
    redirect("/painel?lancado=1");
  }

  return (
    <div className="painel-largura">
      {somenteLeitura && (
        <div className="aviso-bom" style={{ marginBottom: 22 }}>
          Nada foi alterado: este acesso é <strong>somente leitura</strong>.
        </div>
      )}
      {lancado && (
        <p className="aviso-salvo" role="status" style={{ marginBottom: 22 }}>
          Lançamento registrado. Já está no extrato.
        </p>
      )}
      {erro && (
        <p className="aviso-ruim" role="alert" style={{ marginBottom: 22 }}>
          {erro}
        </p>
      )}
      {ehTeste && (
        <div className="aviso-teste" style={{ marginBottom: 22 }}>
          Você está numa <strong>campanha de teste</strong>. O que mexer aqui não toca na campanha
          real. Para voltar, use <strong>Campanhas</strong> no menu.
        </div>
      )}
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
              <LinhaDeAcao
                key={a.id}
                acao={a}
                alternar={alternar}
                lancar={lancarManualDaLista}
                hoje={hoje}
              />
            ))}
          </div>
        </>
      )}

      <p className="painel-etiqueta-lista">
        Publicadas ({publicadas.length})
        {publicadas.length > 1 ? " · use as setas para ordenar os cards" : ""}
      </p>
      <div className="painel-lista">
        {publicadas.map((a, i) => (
          <LinhaDeAcao
            key={a.id}
            acao={a}
            alternar={alternar}
            lancar={lancarManualDaLista}
            hoje={hoje}
            reordenar={reordenar}
            primeiro={i === 0}
            ultimo={i === publicadas.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function LinhaDeAcao({
  acao,
  alternar,
  lancar,
  hoje,
  reordenar,
  primeiro,
  ultimo,
}: {
  acao: AcaoDoPainel;
  alternar: (dados: FormData) => Promise<void>;
  lancar: (dados: FormData) => Promise<void>;
  hoje: string;
  /** Só nas publicadas: sobe/desce o card. Ausente = sem setas (rascunho). */
  reordenar?: (dados: FormData) => Promise<void>;
  primeiro?: boolean;
  ultimo?: boolean;
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

      {reordenar && (
        <span className="painel-linha-ordem">
          <form action={reordenar}>
            <input type="hidden" name="id" value={acao.id} />
            <input type="hidden" name="direcao" value="cima" />
            <button
              className="ordem-seta"
              type="submit"
              disabled={primeiro}
              title="Subir"
              aria-label={`Subir ${acao.titulo}`}
            >
              ↑
            </button>
          </form>
          <form action={reordenar}>
            <input type="hidden" name="id" value={acao.id} />
            <input type="hidden" name="direcao" value="baixo" />
            <button
              className="ordem-seta"
              type="submit"
              disabled={ultimo}
              title="Descer"
              aria-label={`Descer ${acao.titulo}`}
            >
              ↓
            </button>
          </form>
        </span>
      )}

      <span className="painel-linha-acoes">
        {/* Lançamento manual, publicar e editar, na ordem em que a mão vai:
            registrar o que entrou fora do site, botar no ar, e só então abrir
            a ação inteira pra mexer. */}
        <LancamentoManual
          variante="botao"
          acaoId={acao.id}
          action={lancar}
          ehRifa={acao.tipo === "RIFA" && (acao.estoqueTotal ?? 0) > 0}
          valorLivre={acao.precoCentavos == null}
          precoCentavos={acao.precoCentavos}
          precoRotulo={formatarBRL(acao.precoCentavos ?? 0)}
          hoje={hoje}
        />

        <form action={alternar}>
          <input type="hidden" name="id" value={acao.id} />
          <input type="hidden" name="publicar" value={acao.rascunho ? "1" : "0"} />
          <button className="botao botao-contorno botao-pequeno" type="submit">
            {acao.rascunho ? "Publicar" : "Despublicar"}
          </button>
        </form>

        <Link href={`/painel/acao/${acao.id}`} className="botao botao-contorno botao-pequeno">
          Editar
        </Link>
      </span>
    </div>
  );
}
