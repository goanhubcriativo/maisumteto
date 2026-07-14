"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface Palpite {
  placarCasa: number;
  placarVisitante: number;
}

interface Casinha {
  id: string;
  status: string;
  nome: string;
  doacaoCentavos: number;
  valorTotalCentavos: number;
  palpites: Palpite[];
  pixPayload: string | null;
  pixQrCodeImage: string | null;
}

function brl(c: number) {
  return (c / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function PagarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [casinha, setCasinha] = useState<Casinha | null>(null);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function checar() {
      try {
        const res = await fetch(`/api/casinhas/${id}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          if (ativo) setErro(data.erro || "Casinha não encontrada.");
          return;
        }
        if (ativo) setCasinha(data);
      } catch {
        if (ativo) setErro("Erro de conexão.");
      }
    }

    checar();
    const t = setInterval(checar, 4000);
    return () => {
      ativo = false;
      clearInterval(t);
    };
  }, [id]);

  function copiar() {
    if (!casinha?.pixPayload) return;
    navigator.clipboard.writeText(casinha.pixPayload);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const qtd = casinha?.palpites.length ?? 0;

  return (
    <main className="container">
      <div className="hero" style={{ padding: "22px 24px", textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-claro.svg" alt="Teto" className="hero-logo-sm" />
        <h1 style={{ fontSize: 22 }}>Fechar a casinha</h1>
        {casinha && (
          <p>
            {qtd} palpite(s)
            {casinha.doacaoCentavos > 0 ? " + chorinho" : ""} ·{" "}
            <b>{brl(casinha.valorTotalCentavos)}</b>
          </p>
        )}
      </div>

      {erro && (
        <div className="card">
          <div className="erro">{erro}</div>
          <Link href="/">← Voltar</Link>
        </div>
      )}

      {!erro && !casinha && (
        <div className="card">
          <div className="status-aguardando">
            <span className="spinner" /> Carregando...
          </div>
        </div>
      )}

      {casinha && casinha.status === "PAGO" && (
        <div className="card sucesso">
          <div className="check">✓</div>
          <h2>Casinha fechada! 🏠</h2>
          <p className="sub">
            Valeu, {casinha.nome.split(" ")[0]}! Seus {qtd} palpite(s) estão
            confirmados e viraram tijolo pra obra. 💙
          </p>
          <Link
            href="/"
            className="btn btn-primario"
            style={{ display: "block", textDecoration: "none", marginTop: 10 }}
          >
            Montar outra casinha
          </Link>
        </div>
      )}

      {casinha && casinha.status === "PENDENTE" && casinha.pixQrCodeImage && (
        <>
          <div className="card">
            <h2 style={{ marginBottom: 12 }}>O que tem na sua casinha</h2>
            <ul className="casinha-lista">
              {casinha.palpites.map((p, i) => (
                <li key={i} className="casinha-item">
                  <span className="tijolo">🧱</span>
                  <span className="placar">
                    {p.placarCasa} <span className="x-mini">x</span>{" "}
                    {p.placarVisitante}
                  </span>
                </li>
              ))}
            </ul>
            {casinha.doacaoCentavos > 0 && (
              <div className="resumo-linha" style={{ marginTop: 10 }}>
                <span>Chorinho pra obra 💙</span>
                <span>{brl(casinha.doacaoCentavos)}</span>
              </div>
            )}
            <div className="resumo-total" style={{ marginTop: 6 }}>
              <span>Total</span>
              <span>{brl(casinha.valorTotalCentavos)}</span>
            </div>
          </div>

          <div className="card qr-box">
            <h2>Pague com PIX para confirmar</h2>
            <p className="sub">
              Escaneie o QR Code ou use o Pix Copia e Cola. A confirmação é
              automática.
            </p>
            <img
              src={`data:image/png;base64,${casinha.pixQrCodeImage}`}
              alt="QR Code PIX"
            />
            {casinha.pixPayload && (
              <div className="copia-cola">
                <input readOnly value={casinha.pixPayload} />
                <button className="btn-copiar" onClick={copiar}>
                  {copiado ? "Copiado!" : "Copiar"}
                </button>
              </div>
            )}
            <div className="status-aguardando">
              <span className="spinner" /> Aguardando pagamento...
            </div>
          </div>
        </>
      )}

      {casinha &&
        casinha.status !== "PAGO" &&
        casinha.status !== "PENDENTE" && (
          <div className="card">
            <div className="erro">Esta casinha foi cancelada ou expirou.</div>
            <Link
              href="/"
              className="btn btn-primario"
              style={{
                display: "block",
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              Montar nova casinha
            </Link>
          </div>
        )}
    </main>
  );
}
