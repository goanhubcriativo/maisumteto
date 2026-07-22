import Link from "next/link";
import { redirect } from "next/navigation";
import "../painel.css";
import { exigirLogin, encerrarSessao } from "@/lib/sessao";
import { IconeCasa } from "@/components/icones";
import PainelNav from "@/components/PainelNav";

export default async function LayoutDoPainel({ children }: { children: React.ReactNode }) {
  const usuario = await exigirLogin();

  async function sair() {
    "use server";
    await encerrarSessao();
    redirect("/entrar");
  }

  return (
    <div className="painel-app">
      <header className="painel-topo">
        <div className="painel-topo-linha">
          <Link href="/painel" className="marca">
            <span className="marca-sinal">
              <IconeCasa />
            </span>
            <span className="marca-texto">
              Casa Amiga
              <em>Painel da equipe</em>
            </span>
          </Link>

          <PainelNav />

          <form action={sair} className="painel-sair">
            <span className="painel-quem">
              {usuario.nome}
              {!usuario.podeEditar && <em className="painel-leitura-selo">só leitura</em>}
            </span>
            <button className="botao botao-contorno botao-pequeno" type="submit">
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="painel-corpo">
        {!usuario.podeEditar && (
          <div className="painel-largura">
            <div className="aviso-bom" style={{ marginBottom: 24 }}>
              Este acesso é <strong>somente leitura</strong>. Você vê tudo, inclusive o extrato,
              mas os botões de mudar as coisas não têm efeito.
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
