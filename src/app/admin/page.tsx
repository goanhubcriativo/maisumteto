"use client";

import { useState } from "react";
import { IconSeta } from "@/components/icones";
import LogoTeto from "@/components/LogoTeto";

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
  liquidoCentavos: number | null;
  liquidoReal: boolean;
  createdAt: string;
  paidAt: string | null;
}
interface Resumo {
  totalCasinhas: number;
  casinhasPagas: number;
  pendentes: number;
  palpitesPagos: number;
  totalArrecadadoCentavos: number;
  totalApostasCentavos: number;
  totalDoacoesCentavos: number;
  totalTaxaCentavos: number;
  totalLiquidoCentavos: number;
  taxaEstimadaCentavos: number;
  liquidoTemEstimativa: boolean;
}

function brl(c: number) {
  return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function badge(status: string) {
  const map: Record<string, string> = { PAGO: "badge-pago", PENDENTE: "badge-pendente" };
  return <span className={`badge ${map[status] || "badge-cancelado"}`}>{status}</span>;
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
      <main className="canvas">
        <header className="masthead">
          <LogoTeto className="masthead-logo" />
          <div className="sobre">Painel da organização</div>
        </header>
        <div className="folha">
          <form className="passo" onSubmit={entrar}>
            <div className="passo-head">
              <span className="passo-num">→</span>
              <h2 className="passo-titulo">Entrar</h2>
            </div>
            {erro && (
              <div className="erro">
                <span>{erro}</span>
              </div>
            )}
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
            <button className="cta" disabled={carregando}>
              {carregando ? "Entrando..." : "Entrar"} <IconSeta size={18} />
            </button>
          </form>
        </div>
      </main>
    );
  }

  const visiveis =
    filtro === "PAGO" ? casinhas.filter((c) => c.status === "PAGO") : casinhas;

  const porPlacar: Record<string, number> = {};
  casinhas
    .filter((c) => c.status === "PAGO")
    .forEach((c) => c.palpites.forEach((pl) => (porPlacar[pl] = (porPlacar[pl] || 0) + 1)));

  return (
    <main className="canvas admin-wide">
      <header className="masthead">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <LogoTeto className="masthead-logo" />
        <div className="sobre">Painel · arrecadação da obra</div>
      </header>

      {resumo && (
        <div className="stats">
          <div className="stat">
            <div className="num">{resumo.casinhasPagas}</div>
            <div className="lbl">Casinhas pagas</div>
          </div>
          <div className="stat">
            <div className="num">{resumo.palpitesPagos}</div>
            <div className="lbl">Pilotis fincados</div>
          </div>
          <div className="stat">
            <div className="num">{brl(resumo.totalArrecadadoCentavos)}</div>
            <div className="lbl">Arrecadado (bruto)</div>
          </div>
          <div className="stat destaque">
            <div className="num">{brl(resumo.totalLiquidoCentavos)}</div>
            <div className="lbl">Líquido na conta</div>
          </div>
        </div>
      )}

      {resumo && (
        <div className="folha">
          <section className="passo">
            <h2 className="passo-titulo" style={{ marginBottom: 14 }}>
              Prestação de contas
            </h2>
            <div className="contas">
              <div className="conta-linha">
                <span>Apostas (fézinhas)</span>
                <span className="v">{brl(resumo.totalApostasCentavos)}</span>
              </div>
              <div className="conta-linha">
                <span>Ajudinha extra (doações)</span>
                <span className="v">{brl(resumo.totalDoacoesCentavos)}</span>
              </div>
              <div className="conta-linha forte">
                <span>Total arrecadado (bruto)</span>
                <span className="v">{brl(resumo.totalArrecadadoCentavos)}</span>
              </div>
              <div className="conta-linha neg">
                <span>
                  Taxas do Asaas
                  <small>
                    {" "}
                    ({brl(resumo.taxaEstimadaCentavos)}/PIX ×{" "}
                    {resumo.casinhasPagas})
                  </small>
                </span>
                <span className="v">− {brl(resumo.totalTaxaCentavos)}</span>
              </div>
              <div className="conta-total">
                <span>Líquido na conta</span>
                <span className="v">{brl(resumo.totalLiquidoCentavos)}</span>
              </div>
            </div>
            {resumo.liquidoTemEstimativa && (
              <p className="conta-nota">
                Alguns valores usam a taxa estimada de{" "}
                {brl(resumo.taxaEstimadaCentavos)} por PIX. Quando o Asaas
                confirmar cada pagamento, o líquido real substitui a
                estimativa automaticamente.
              </p>
            )}
          </section>
        </div>
      )}

      <div className="folha">
        <section className="passo">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <h2 className="passo-titulo">Fézinhas por placar (pagas)</h2>
            <button className="mini" onClick={atualizar}>
              Atualizar
            </button>
          </div>
          <div className="scroll-x">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Placar</th>
                  <th>Fézinhas pagas</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(porPlacar)
                  .sort((a, b) => b[1] - a[1])
                  .map(([placar, qtd]) => (
                    <tr key={placar}>
                      <td>
                        <b>{placar.replace("x", " × ")}</b>
                      </td>
                      <td>{qtd}</td>
                    </tr>
                  ))}
                {Object.keys(porPlacar).length === 0 && (
                  <tr>
                    <td colSpan={2}>Nenhuma fézinha paga ainda.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="passo">
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button
              className="mini"
              style={{ background: filtro === "PAGO" ? "var(--azul)" : "var(--grafite-70)" }}
              onClick={() => setFiltro("PAGO")}
            >
              Só pagas
            </button>
            <button
              className="mini"
              style={{ background: filtro === "TODAS" ? "var(--grafite)" : "var(--grafite-70)" }}
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
                  <th>Fézinhas</th>
                  <th>Chorinho</th>
                  <th>Total</th>
                  <th>Líquido</th>
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
                      <span style={{ color: "var(--grafite-70)" }}>
                        {" "}
                        ({c.palpites.join(", ")})
                      </span>
                    </td>
                    <td>{c.doacaoCentavos > 0 ? brl(c.doacaoCentavos) : "·"}</td>
                    <td>{brl(c.valorTotalCentavos)}</td>
                    <td>
                      {c.liquidoCentavos !== null ? (
                        <>
                          {brl(c.liquidoCentavos)}
                          {!c.liquidoReal && c.status === "PAGO" && (
                            <span className="est" title="Estimado (aguardando confirmação do Asaas)">
                              {" "}
                              ~
                            </span>
                          )}
                        </>
                      ) : (
                        "·"
                      )}
                    </td>
                    <td>{badge(c.status)}</td>
                    <td>{new Date(c.createdAt).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
                {visiveis.length === 0 && (
                  <tr>
                    <td colSpan={8}>Nenhuma casinha.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
