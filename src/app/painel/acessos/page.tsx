// Acessos da equipe: quem entra no painel.
//
// O líder gera acessos de leitura para outras pessoas verem o sistema. Cada um
// vê tudo, inclusive o extrato, e não muda nada (a barreira é exigirEdicao,
// em toda ação de escrita). Aqui ele cria, vê a lista e revoga.

import { revalidatePath } from "next/cache";
import { campanhaAtual } from "@/lib/repositorio";
import { exigirEdicao, usuarioAtual } from "@/lib/sessao";
import { listarAcessos, revogarAcesso } from "@/lib/acessos";
import NovoAcesso from "@/components/NovoAcesso";

export const dynamic = "force-dynamic";

const ROTULO_PAPEL: Record<string, string> = {
  LIDER: "Administrador",
  MEMBRO: "Equipe",
  VISITANTE: "Só leitura",
};

export default async function Acessos() {
  const eu = await usuarioAtual();
  const campanha = await campanhaAtual();
  const acessos = await listarAcessos(campanha.equipeId);

  async function revogar(dados: FormData) {
    "use server";
    await exigirEdicao();
    await revogarAcesso(campanha.equipeId, String(dados.get("usuarioId")));
    revalidatePath("/painel/acessos");
  }

  const somenteLeitura = eu ? !eu.podeEditar : false;

  return (
    <div className="painel-largura">
      <div className="painel-cabeca">
        <div>
          <span className="painel-sobre">Equipe</span>
          <h1>Acessos</h1>
          <p className="painel-intro">
            Quem pode entrar no painel. Um acesso de leitura vê tudo, inclusive o extrato, e não
            altera nada.
          </p>
        </div>
      </div>

      {somenteLeitura ? (
        <div className="aviso-bom">
          Você está com um acesso <strong>somente leitura</strong>. Pode ver tudo, mas criar e
          revogar acessos é só para a equipe.
        </div>
      ) : (
        <section className="painel-cartao">
          <h2 className="formulario-secao">Gerar um acesso</h2>
          <p className="campo-ajuda" style={{ margin: "-8px 0 18px" }}>
            Crie um login para outra pessoa. Escolha se ela administra o sistema junto com você ou
            só acompanha sem poder mexer. A senha aparece uma vez, na hora: copie e mande para a
            pessoa.
          </p>
          <NovoAcesso />
        </section>
      )}

      <div className="painel-secao-cabeca">
        <h2>Quem tem acesso</h2>
      </div>
      <div className="tabela-rolo">
        <table className="tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
              {!somenteLeitura && <th></th>}
            </tr>
          </thead>
          <tbody>
            {acessos.map((a) => (
              <tr key={a.membroId}>
                <td>
                  {a.nome}
                  {eu?.id === a.usuarioId && <span className="tabela-nota">você</span>}
                </td>
                <td>{a.email}</td>
                <td>
                  <span className={`papel-tag${a.papel === "VISITANTE" ? " leitura" : ""}`}>
                    {ROTULO_PAPEL[a.papel] ?? a.papel}
                  </span>
                </td>
                {!somenteLeitura && (
                  <td className="num">
                    {/* Dá pra revogar qualquer um, menos você mesmo: ninguém se
                        tranca pra fora sem querer. */}
                    {a.usuarioId !== eu?.id && (
                      <form action={revogar}>
                        <input type="hidden" name="usuarioId" value={a.usuarioId} />
                        <button className="editor-mini perigo" type="submit">
                          Revogar
                        </button>
                      </form>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
