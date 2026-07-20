import { redirect } from "next/navigation";
import type { Metadata } from "next";
import "../painel.css";
import { conferirSenha, criarTokenDeSessao, expiracaoDaSessao, normalizarEmail } from "@/lib/auth";
import { usuarioPorEmail } from "@/lib/repositorio";
import { criarSessao, usuarioAtual } from "@/lib/sessao";
import { IconeCasa } from "@/components/icones";

export const metadata: Metadata = {
  title: "Entrar · Casa Amiga",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Hash descartavel, so pra gastar o mesmo tempo quando o e-mail nao existe.
const HASH_FALSO =
  "00000000000000000000000000000000:" + "0".repeat(128);

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (await usuarioAtual()) redirect("/painel");
  const { erro } = await searchParams;

  async function entrar(dados: FormData) {
    "use server";

    const email = normalizarEmail(String(dados.get("email") ?? ""));
    const senha = String(dados.get("senha") ?? "");

    const usuario = await usuarioPorEmail(email);

    // Mensagem unica pra e-mail errado e senha errada. Dizer "esse e-mail nao
    // existe" entrega quem tem conta aqui, e isso e informacao de graca pra
    // quem estiver testando e-mails.
    //
    // conferirSenha roda mesmo com usuario inexistente (contra um hash falso) pra
    // que o tempo de resposta seja o mesmo nos dois casos: responder rapido so
    // quando o e-mail nao existe entregaria quem tem conta pelo relogio.
    const hash = usuario?.senhaHash ?? HASH_FALSO;
    const senhaConfere = conferirSenha(senha, hash);
    if (!usuario || !senhaConfere) redirect("/entrar?erro=1");

    const token = criarTokenDeSessao();
    const expira = expiracaoDaSessao();
    await criarSessao(usuario.id, token, expira);

    redirect("/painel");
  }

  return (
    <main className="entrada">
      <form className="entrada-caixa" action={entrar}>
        <span className="entrada-sinal">
          <IconeCasa />
        </span>

        <h1>Casa Amiga</h1>
        <p className="entrada-apoio">Entre para organizar a arrecadação da sua equipe.</p>

        {erro && (
          <p className="entrada-erro" role="alert">
            E-mail ou senha não conferem.
          </p>
        )}

        <label className="campo">
          <span className="campo-rotulo">E-mail</span>
          <input
            className="campo-entrada"
            type="email"
            name="email"
            required
            autoComplete="email"
            autoFocus
          />
        </label>

        <label className="campo">
          <span className="campo-rotulo">Senha</span>
          <input
            className="campo-entrada"
            type="password"
            name="senha"
            required
            autoComplete="current-password"
          />
        </label>

        <button className="botao botao-primario botao-largo" type="submit">
          Entrar
        </button>

        {process.env.NODE_ENV !== "production" && (
          <p className="entrada-dica">
            Piloto local: <strong>higor@casaamiga.local</strong> · senha <strong>mutirao2026</strong>
          </p>
        )}
      </form>
    </main>
  );
}
