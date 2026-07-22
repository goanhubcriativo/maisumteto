// Campanhas: o seletor do que o painel está editando.
//
// O piloto tem uma campanha. A Teto vai ter várias. Aqui a equipe cria uma
// cópia de TESTE para experimentar as features sem tocar na real, e escolhe
// qual campanha o painel edita. O público nunca segue essa escolha: a home é
// sempre a campanha principal (ver campanhaAtual vs campanhaDoPainel).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { duplicarCampanha, listarCampanhas } from "@/lib/repositorio";
import { campanhaDoPainel, definirCampanhaDoPainel, exigirEdicao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  ATIVA: "No ar",
  ENCERRADA: "Encerrada",
};

export default async function Campanhas() {
  const campanhas = await listarCampanhas();
  const atual = await campanhaDoPainel();
  const principalId = campanhas[0]?.id;

  async function criarTeste() {
    "use server";
    await exigirEdicao();
    // Duplica a campanha que o painel está editando agora e já entra nela.
    const base = await campanhaDoPainel();
    const nova = await duplicarCampanha(base.id);
    await definirCampanhaDoPainel(nova.id);
    revalidatePath("/painel", "layout");
    redirect("/painel");
  }

  async function trocar(dados: FormData) {
    "use server";
    await exigirEdicao();
    await definirCampanhaDoPainel(String(dados.get("id")));
    revalidatePath("/painel", "layout");
    redirect("/painel");
  }

  return (
    <div className="painel-largura">
      <div className="painel-cabeca">
        <div>
          <span className="painel-sobre">Equipe</span>
          <h1>Campanhas</h1>
          <p className="painel-intro">
            Crie uma cópia de teste para experimentar sem sujar a campanha real. Escolha qual o
            painel edita. A página pública continua sempre na principal.
          </p>
        </div>
        <form action={criarTeste}>
          <button className="botao botao-primario" type="submit">
            Criar campanha de teste
          </button>
        </form>
      </div>

      <div className="campanhas-lista">
        {campanhas.map((c) => {
          const ativa = c.id === atual.id;
          const principal = c.id === principalId;
          return (
            <div key={c.id} className={`campanha-item${ativa ? " ativa" : ""}`}>
              <div>
                <strong>{c.titulo}</strong>
                <span className="campanha-meta">
                  {principal ? "Principal (a que o público vê)" : "Teste"} · {STATUS[c.status] ?? c.status}
                  {" · "}
                  <a href={`/c/${c.slug}`} target="_blank" rel="noopener noreferrer">
                    ver página
                  </a>
                </span>
              </div>
              {ativa ? (
                <span className="campanha-selo">Editando agora</span>
              ) : (
                <form action={trocar}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="botao botao-contorno botao-pequeno" type="submit">
                    Editar esta
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
