"use client";

import { useState } from "react";
import { config } from "@/lib/config";
import { IconSeta } from "@/components/icones";
import LogoTeto from "@/components/LogoTeto";

// Abreviação dos times (ESP, ARG) pra mostrar quem é quem nos placares.
const ab = (s: string) => s.trim().slice(0, 3).toUpperCase();
const CASA_AB = ab(config.timeCasa);
const VIS_AB = ab(config.timeVisitante);
// "2x1" vira "ESP 2x1 ARG"
const comTimes = (placar: string) => `${CASA_AB} ${placar} ${VIS_AB}`;

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
  const [funil, setFunil] = useState<Record<string, number>>({});
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
    setFunil(data.funil || {});
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
                  Taxas do Mercado Pago
                  <small>
                    {" "}
                    (soma real por PIX
                    {resumo.totalArrecadadoCentavos > 0 &&
                      `, ${(
                        (100 * resumo.totalTaxaCentavos) /
                        resumo.totalArrecadadoCentavos
                      ).toFixed(2)}% efetivo`}
                    )
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
                Alguns valores usam a taxa estimada de 0,99% por PIX. Quando o
                Mercado Pago confirmar cada pagamento, o líquido real substitui a
                estimativa automaticamente.
              </p>
            )}
          </section>
        </div>
      )}

      {resumo && (
        <div className="folha">
          <section className="passo">
            <h2 className="passo-titulo" style={{ marginBottom: 4 }}>
              Funil de visitantes
            </h2>
            <p className="conta-nota" style={{ marginBottom: 14 }}>
              Visitantes únicos por etapa (anônimo, 1x por sessão). Mostra onde
              o pessoal para quando não aposta.
            </p>
            {(() => {
              const ETAPAS: [string, string][] = [
                ["visita", "Visitaram a página"],
                ["rolou_50", "Rolaram até a metade"],
                ["rolou_100", "Chegaram ao fim da página"],
                ["placar_digitado", "Digitaram um placar"],
                ["fezinha_fincada", "Fincaram uma fézinha"],
                ["dados_completos", "Preencheram os dados"],
                ["finalizar_clicou", "Clicaram em finalizar"],
                ["pix_gerado", "Geraram o PIX"],
                ["pix_copiado", "Copiaram o código PIX"],
              ];
              const base = funil["visita"] || 0;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {ETAPAS.map(([tipo, rotulo]) => {
                    const n = funil[tipo] || 0;
                    const pct = base > 0 ? Math.round((100 * n) / base) : 0;
                    return (
                      <div key={tipo} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ flex: "0 0 210px", fontSize: 13, fontWeight: 600 }}>
                          {rotulo}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: 16,
                            background: "rgba(39,55,64,0.1)",
                            borderRadius: 8,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, pct)}%`,
                              height: "100%",
                              background: "var(--azul)",
                              borderRadius: 8,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            flex: "0 0 110px",
                            fontSize: 13,
                            fontWeight: 800,
                            textAlign: "right",
                          }}
                        >
                          {n} <small style={{ color: "var(--grafite-70)" }}>({pct}%)</small>
                        </span>
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                    <span style={{ flex: "0 0 210px", fontSize: 13, fontWeight: 800 }}>
                      Pagaram de verdade
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 16,
                        background: "rgba(39,55,64,0.1)",
                        borderRadius: 8,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${
                            base > 0
                              ? Math.min(100, Math.round((100 * resumo.casinhasPagas) / base))
                              : 0
                          }%`,
                          height: "100%",
                          background: "var(--verde, #1a9e5f)",
                          borderRadius: 8,
                        }}
                      />
                    </div>
                    <span style={{ flex: "0 0 110px", fontSize: 13, fontWeight: 800, textAlign: "right" }}>
                      {resumo.casinhasPagas}{" "}
                      <small style={{ color: "var(--grafite-70)" }}>
                        {base > 0 && resumo.casinhasPagas <= base
                          ? `(${Math.round((100 * resumo.casinhasPagas) / base)}%)`
                          : "(·)"}
                      </small>
                    </span>
                  </div>
                  <p className="conta-nota" style={{ marginTop: 8 }}>
                    Extras: {funil["ajudinha_escolhida"] || 0} escolheram ajudinha,{" "}
                    {funil["so_ajudar"] || 0} marcaram só ajudar,{" "}
                    {funil["erro_validacao"] || 0} esbarraram em erro de validação. O
                    funil conta a partir de agora (visitas antigas não foram medidas).
                  </p>
                </div>
              );
            })()}
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
            <h2 className="passo-titulo">Apostadores</h2>
            <button className="mini" onClick={atualizar}>
              Atualizar
            </button>
          </div>
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
                  <th>Ajudinha</th>
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
                        ({c.palpites.map(comTimes).join(", ")})
                      </span>
                    </td>
                    <td>{c.doacaoCentavos > 0 ? brl(c.doacaoCentavos) : "·"}</td>
                    <td>{brl(c.valorTotalCentavos)}</td>
                    <td>
                      {c.liquidoCentavos !== null ? (
                        <>
                          {brl(c.liquidoCentavos)}
                          {!c.liquidoReal && c.status === "PAGO" && (
                            <span className="est" title="Estimado (aguardando confirmação do Mercado Pago)">
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

        <section className="passo">
          <h2 className="passo-titulo" style={{ marginBottom: 14 }}>
            Fézinhas por placar (pagas)
          </h2>
          <div className="scroll-x">
            <table className="tabela">
              <thead>
                <tr>
                  <th>
                    Placar ({config.timeCasa} × {config.timeVisitante})
                  </th>
                  <th>Fézinhas pagas</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(porPlacar)
                  .sort((a, b) => b[1] - a[1])
                  .map(([placar, qtd]) => (
                    <tr key={placar}>
                      <td>
                        <b>{comTimes(placar.replace("x", " × "))}</b>
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
      </div>
    </main>
  );
}
