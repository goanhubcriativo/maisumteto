// Campanhas: o seletor do que o painel está editando.
//
// O piloto tem uma campanha. A Teto vai ter várias. Aqui a equipe cria uma
// cópia de TESTE para experimentar as features sem tocar na real, e escolhe
// qual campanha o painel edita. O público nunca segue essa escolha: a home é
// sempre a campanha principal (ver campanhaAtual vs campanhaDoPainel).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apagarCampanha, criarCampanhaDeTeste, listarCampanhas } from "@/lib/repositorio";
import {
  campanhaDoPainel,
  definirCampanhaDoPainel,
  exigirEdicao,
  limparCampanhaDoPainel,
} from "@/lib/sessao";
import BotaoPendente from "@/components/BotaoPendente";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  ATIVA: "No ar",
  ENCERRADA: "Encerrada",
};

export default async function Campanhas({
  searchParams,
}: {
  searchParams: Promise<{ criada?: string }>;
}) {
  const { criada } = await searchParams;
  const campanhas = await listarCampanhas();
  const atual = await campanhaDoPainel();
  const principalId = campanhas[0]?.id;

  async function criarTeste() {
    "use server";
    await exigirEdicao();
    // Uma campanha de teste EM BRANCO (sem ações, tudo a preencher) e já entra
    // nela. criarCampanhaDeTeste trava contra o disparo em dobro do formulário.
    const base = await campanhaDoPainel();
    const nova = await criarCampanhaDeTeste(base.equipeId);
    await definirCampanhaDoPainel(nova.id);
    revalidatePath("/painel", "layout");
    // Volta pra esta mesma tela com aviso: a nova aparece na lista na hora e o
    // "criada" confirma que deu certo, em vez de parecer que nada aconteceu.
    redirect("/painel/campanhas?criada=1");
  }

  async function trocar(dados: FormData) {
    "use server";
    await exigirEdicao();
    await definirCampanhaDoPainel(String(dados.get("id")));
    revalidatePath("/painel", "layout");
    redirect("/painel");
  }

  async function apagar(dados: FormData) {
    "use server";
    await exigirEdicao();
    const id = String(dados.get("id"));
    const r = await apagarCampanha(id);
    // Se apagou a que o painel estava editando, volta pra principal, senão o
    // cookie apontaria pra uma campanha que não existe mais.
    if (r.ok && id === atual.id) await limparCampanhaDoPainel();
    revalidatePath("/painel", "layout");
    redirect("/painel/campanhas");
  }

  return (
    <div className="painel-largura">
      {criada && (
        <p className="aviso-salvo" role="status" style={{ marginBottom: 22 }}>
          Campanha de teste criada, em branco, e já selecionada. Vá em{" "}
          <strong>Campanha</strong> no menu para começar a preenchê-la.
        </p>
      )}

      <div className="painel-cabeca">
        <div>
          <span className="painel-sobre">Equipe</span>
          <h1>Campanhas</h1>
          <p className="painel-intro">
            Crie uma campanha de teste em branco para experimentar sem sujar a real. Escolha qual
            o painel edita. A página pública continua sempre na principal.
          </p>
        </div>
        <form action={criarTeste}>
          <BotaoPendente pendente="Criando...">Criar campanha de teste</BotaoPendente>
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
              <div className="campanha-acoes">
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

                {/* Apagar só as de teste. A principal nunca (a barreira também
                    está no servidor, em apagarCampanha). */}
                {!principal && (
                  <form action={apagar}>
                    <input type="hidden" name="id" value={c.id} />
                    <BotaoPendente
                      pendente="Apagando..."
                      className="botao botao-perigo botao-pequeno"
                    >
                      Apagar
                    </BotaoPendente>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
