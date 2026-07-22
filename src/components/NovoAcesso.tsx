"use client";

// O formulário que gera um acesso de leitura e mostra a senha uma vez.
//
// Cliente porque a senha volta no corpo da resposta e é mostrada na hora: ela
// não fica guardada em texto em lugar nenhum, então esta tela é a única chance
// de copiar. Depois de fechar, só dá para gerar outra.

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Credencial {
  nome: string;
  email: string;
  senha: string;
}

export default function NovoAcesso() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [nivel, setNivel] = useState<"ADMIN" | "LEITURA">("LEITURA");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [criada, setCriada] = useState<Credencial | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function gerar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/acessos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, nivel }),
      });
      const resposta = await r.json();
      if (!r.ok) {
        setErro(resposta.erro ?? "Não consegui criar o acesso.");
      } else {
        setCriada(resposta);
        setNome("");
        setEmail("");
        router.refresh(); // atualiza a lista de acessos abaixo
      }
    } catch {
      setErro("Sem conexão. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  function copiar() {
    if (!criada) return;
    const texto = `Acesso ao painel Casa Amiga\nEntre em: ${location.origin}/entrar\nE-mail: ${criada.email}\nSenha: ${criada.senha}`;
    navigator.clipboard?.writeText(texto).then(
      () => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2500);
      },
      () => {}
    );
  }

  if (criada) {
    return (
      <div className="acesso-criado">
        <h3>Acesso criado para {criada.nome}</h3>
        <p className="campo-ajuda">
          Copie e mande agora. A senha não fica guardada e não dá para ver de novo depois.
        </p>
        <dl className="acesso-credencial">
          <div>
            <dt>E-mail</dt>
            <dd>{criada.email}</dd>
          </div>
          <div>
            <dt>Senha</dt>
            <dd className="acesso-senha">{criada.senha}</dd>
          </div>
        </dl>
        <div className="acesso-criado-botoes">
          <button type="button" className="botao botao-primario botao-pequeno" onClick={copiar}>
            {copiado ? "Copiado!" : "Copiar acesso"}
          </button>
          <button
            type="button"
            className="botao botao-contorno botao-pequeno"
            onClick={() => setCriada(null)}
          >
            Gerar outro
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="formulario" onSubmit={gerar}>
      {erro && (
        <p className="aviso-ruim" role="alert">
          {erro}
        </p>
      )}
      <div className="campo-dupla">
        <label className="campo">
          <span className="campo-rotulo">Nome</span>
          <input
            className="campo-entrada"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Quem vai receber o acesso"
            required
          />
        </label>
        <label className="campo">
          <span className="campo-rotulo">E-mail</span>
          <input
            className="campo-entrada"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
            required
          />
        </label>
      </div>

      <fieldset className="campo nivel-acesso">
        <legend className="campo-rotulo">O que essa pessoa pode fazer</legend>
        <label className={`nivel-opcao${nivel === "ADMIN" ? " escolhido" : ""}`}>
          <input
            type="radio"
            name="nivel"
            checked={nivel === "ADMIN"}
            onChange={() => setNivel("ADMIN")}
          />
          <span>
            <strong>Administrador</strong>
            <em>Gerencia tudo, como você: cria ações, publica, lança, mexe no sistema inteiro.</em>
          </span>
        </label>
        <label className={`nivel-opcao${nivel === "LEITURA" ? " escolhido" : ""}`}>
          <input
            type="radio"
            name="nivel"
            checked={nivel === "LEITURA"}
            onChange={() => setNivel("LEITURA")}
          />
          <span>
            <strong>Só leitura</strong>
            <em>Vê tudo, inclusive o extrato, e não altera nada.</em>
          </span>
        </label>
      </fieldset>

      <button className="botao botao-primario" type="submit" disabled={enviando}>
        {enviando ? "Gerando..." : nivel === "ADMIN" ? "Gerar acesso de administrador" : "Gerar acesso de leitura"}
      </button>
    </form>
  );
}
