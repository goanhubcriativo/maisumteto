import Link from "next/link";
import { redirect } from "next/navigation";
import "../painel.css";
import { exigirLogin, encerrarSessao } from "@/lib/sessao";
import { IconeCasa } from "@/components/icones";

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

          <nav className="painel-nav">
            <Link href="/painel">Campanha</Link>
            <Link href="/painel/ferramentas">Caixa de ferramentas</Link>
            <Link href="/previa" target="_blank">
              Ver a página
            </Link>
          </nav>

          <form action={sair} className="painel-sair">
            <span className="painel-quem">{usuario.nome}</span>
            <button className="botao botao-contorno botao-pequeno" type="submit">
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="painel-corpo">{children}</main>
    </div>
  );
}
