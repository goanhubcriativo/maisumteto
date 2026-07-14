"use client";

import { useState } from "react";

interface Casinha {
  id: string;
  nome: string;
  whatsapp: string;
  cpf: string;
  email: string | null;
  status: string;
  qtdPalpites: number;
  palpites: string[];
  doacaoCentavos: number;
  valorTotalCentavos: number;
  createdAt: string;
  paidAt: string | null;
}

interface Resumo {
  totalCasinhas: number;
  casinhasPagas: number;
  pendentes: number;
  palpitesPagos: number;
  totalArrecadadoCentavos: number;
  totalDoacoesCentavos: number;
}

function brl(c: number) {
  return (c / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function badge(status: string) {
  const map: Record<string, string> = {
    PAGO: "badge-pago",
    PENDENTE: "badge-pendente",
  };
  return (
    <span className={`badge ${map[status] || "badge-cancelado"}`}>{status}</span>
  );
}

export default function AdminPage() {
  const [senha, setSenha] = useState("");
  const [logado, setLogado] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [casinhas, setCasinhas] = useState<Casinha[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [filtro, setFiltro] = useState<"TODAS" | "PAGO">("PAGO");

  async function carregar(comSenha: string) {
    const res = await fetch("/api/admin/casinhas", {
      headers: { "x-admin-password": comSenha },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || "Erro ao carregar.");
    setCasinhas(data.casinhas);
    setResumo(data.resumo);
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      await carregar(senha);
      setLogado(true);
    } catch (err: any) {
      setErro(err.message || "Erro de conexão.");
    }
    setCarregando(false);
  }

  async function atualizar() {
    try {
      await carregar(senha);
    } catch {
      /* ignora */
    }
  }

  if (!logado) {
    return (
      <main className="container">
        <div className="hero" style={{ padding: "22px 24px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-claro.svg"
            alt="Teto"
            className="hero-logo-sm"
            style={{ margin: "0 0 12px" }}
          />
          <h1 style={{ fontSize: 22 }}>Painel — Bolão Teto</h1>
          <p>Acesso restrito à organização.</p>
        </div>
        <form className="card" onSubmit={entrar}>
          <h2>Entrar</h2>
          {erro && <div className="erro">{erro}</div>}
          <div className="campo">
            <label htmlFor="senha">Senha do painel</label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primario" disabled={carregando}>
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </main>
    );
  }

  const visiveis =
    filtro === "PAGO" ? casinhas.filter((c) => c.status === "PAGO") : casinhas;

  // Agrupa palpites pagos por placar (para achar vencedores depois do jogo)
  const porPlacar: Record<string, number> = {};
  casinhas
    .filter((c) => c.status === "PAGO")
    .forEach((c) => {
      c.palpites.forEach((pl) => {
        porPlacar[pl] = (porPlacar[pl] || 0) + 1;
      });
    });

  return (
    <main className="container admin-wide">
      <div className="hero" style={{ padding: "22px 24px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-claro.svg"
          alt="Teto"
          className="hero-logo-sm"
          style={{ margin: "0 0 12px" }}
        />
        <h1 style={{ fontSize: 22 }}>Painel — Bolão Teto</h1>
        <p>Acompanhe as casinhas e a arrecadação pra obra.</p>
      </div>

      {resumo && (
        <div className="stats stats-4">
          <div className="stat">
            <div className="num">{resumo.casinhasPagas}</div>
            <div className="lbl">Casinhas pagas</div>
          </div>
          <div className="stat">
            <div className="num">{resumo.palpitesPagos}</div>
            <div className="lbl">Palpites pagos</div>
          </div>
          <div className="stat">
            <div className="num">{brl(resumo.totalArrecadadoCentavos)}</div>
            <div className="lbl">Arrecadado</div>
          </div>
          <div className="stat">
            <div className="num">{brl(resumo.totalDoacoesCentavos)}</div>
            <div className="lbl">Chorinho 💙</div>
          </div>
        </div>
      )}

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h2 style={{ margin: 0 }}>Palpites por placar (pagos)</h2>
          <button className="btn-copiar" onClick={atualizar}>
            Atualizar
          </button>
        </div>
        <div className="scroll-x">
          <table className="tabela">
            <thead>
              <tr>
                <th>Placar</th>
                <th>Qtd. palpites pagos</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(porPlacar)
                .sort((a, b) => b[1] - a[1])
                .map(([placar, qtd]) => (
                  <tr key={placar}>
                    <td>
                      <b>{placar.replace("x", " x ")}</b>
                    </td>
                    <td>{qtd}</td>
                  </tr>
                ))}
              {Object.keys(porPlacar).length === 0 && (
                <tr>
                  <td colSpan={2}>Nenhum palpite pago ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            className="btn-copiar"
            style={{ background: filtro === "PAGO" ? "var(--azul)" : "#aaa" }}
            onClick={() => setFiltro("PAGO")}
          >
            Só pagas
          </button>
          <button
            className="btn-copiar"
            style={{ background: filtro === "TODAS" ? "var(--grafite)" : "#aaa" }}
            onClick={() => setFiltro("TODAS")}
          >
            Todas
          </button>
        </div>
        <div className="scroll-x">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>WhatsApp</th>
                <th>Palpites</th>
                <th>Chorinho</th>
                <th>Total</th>
                <th>Status</th>
                <th>Quando</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((c) => (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td>{c.whatsapp}</td>
                  <td>
                    <b>{c.qtdPalpites}</b>
                    <span style={{ color: "var(--cinza-texto)" }}>
                      {" "}
                      ({c.palpites.join(", ")})
                    </span>
                  </td>
                  <td>{c.doacaoCentavos > 0 ? brl(c.doacaoCentavos) : "—"}</td>
                  <td>{brl(c.valorTotalCentavos)}</td>
                  <td>{badge(c.status)}</td>
                  <td>{new Date(c.createdAt).toLocaleString("pt-BR")}</td>
                </tr>
              ))}
              {visiveis.length === 0 && (
                <tr>
                  <td colSpan={7}>Nenhuma casinha.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
