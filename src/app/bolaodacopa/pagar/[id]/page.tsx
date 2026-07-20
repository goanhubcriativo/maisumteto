"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { registrar } from "@/lib/bolao/metricas";
import LogoTeto from "@/components/bolao/LogoTeto";
import { IconCadeado, IconSeta, IconPix } from "@/components/bolao/icones";
import TelaSucesso from "@/components/bolao/TelaSucesso";

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
  return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
    let timer: ReturnType<typeof setInterval> | null = null;
    const parar = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    async function checar() {
      try {
        const res = await fetch(`/api/casinhas/${id}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          if (ativo) setErro(data.erro || "Casinha não encontrada.");
          parar(); // 404/erro definitivo: para de perguntar
          return;
        }
        if (ativo) setCasinha(data);
        // Quando não está mais PENDENTE (pago/cancelado), encerra o polling.
        if (data.status && data.status !== "PENDENTE") parar();
      } catch {
        // Erro de rede transitório: mantém tentando (pode voltar).
        if (ativo) setErro("Erro de conexão.");
      }
    }
    checar();
    timer = setInterval(checar, 4000);
    return () => {
      ativo = false;
      parar();
    };
  }, [id]);

  // Métrica: chegou na tela do PIX (pendente)
  useEffect(() => {
    if (casinha?.status === "PENDENTE") registrar("pix_visualizado");
  }, [casinha?.status]);

  function copiar() {
    if (!casinha?.pixPayload) return;
    navigator.clipboard.writeText(casinha.pixPayload);
    registrar("pix_copiado");
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const qtd = casinha?.palpites.length ?? 0;

  return (
    <main className="canvas">
      <header className="masthead">
        <LogoTeto className="masthead-logo" />
      </header>

      {erro && !casinha && (
        <div className="folha">
          <section className="passo">
            <div className="erro">
              <span>{erro}</span>
            </div>
            <Link href="/bolaodacopa" className="cta secacao">
              Voltar
            </Link>
          </section>
        </div>
      )}

      {!erro && !casinha && (
        <div className="folha">
          <section className="passo">
            <div className="aguardando">
              <span className="spinner" /> Carregando sua casinha...
            </div>
          </section>
        </div>
      )}

      {casinha && casinha.status === "PAGO" && (
        <TelaSucesso
          nome={casinha.nome}
          palpites={casinha.palpites}
          doacaoCentavos={casinha.doacaoCentavos}
          valorTotalCentavos={casinha.valorTotalCentavos}
          reciboId={casinha.id}
        />
      )}

      {casinha && casinha.status === "PENDENTE" && casinha.pixQrCodeImage && (
        <>
          <div className="obra">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="obra-casa-real"
              src="/casa.svg"
              alt="Casa emergencial da Teto"
            />
          </div>

          <div className="folha">
            <section className="passo">
              <div className="passo-head">
                <span className="passo-num">01</span>
                <h2 className="passo-titulo">Sua Bolsa de Terreno tem:</h2>
              </div>
              <ul className="fezinhas">
                {casinha.palpites.map((p, i) => (
                  <li key={i} className="fezinha-row">
                    <span className="idx">{String(i + 1).padStart(2, "0")}</span>
                    <span className="placar">
                      {p.placarCasa} <span className="xs">×</span>{" "}
                      {p.placarVisitante}
                    </span>
                  </li>
                ))}
              </ul>
              {casinha.doacaoCentavos > 0 && (
                <div className="resumo-linha" style={{ marginTop: 12 }}>
                  <span>Ajudinha extra</span>
                  <span className="v">{brl(casinha.doacaoCentavos)}</span>
                </div>
              )}
              <div className="resumo-total">
                <span className="lbl">Total</span>
                <span className="v">{brl(casinha.valorTotalCentavos)}</span>
              </div>
            </section>

            <section className="passo pix-box">
              <div className="passo-head">
                <span className="passo-num">02</span>
                <h2 className="passo-titulo">Pague com PIX</h2>
                <IconPix className="icone" size={22} />
              </div>
              <p className="passo-sub" style={{ marginLeft: 37 }}>
                Escaneie o QR ou use o Copia e Cola. A confirmação é automática.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="qr"
                src={`data:image/png;base64,${casinha.pixQrCodeImage}`}
                alt="QR Code PIX"
              />
              {casinha.pixPayload && (
                <div className="copia">
                  <input readOnly value={casinha.pixPayload} />
                  <button className="btn-copiar" onClick={copiar}>
                    {copiado ? "Copiado" : "Copiar"}
                  </button>
                </div>
              )}
              <div className="aguardando">
                <span className="spinner" /> Aguardando pagamento...
              </div>
              <div className="seguranca" style={{ marginTop: 10 }}>
                <IconCadeado size={14} /> Ambiente seguro · Mercado Pago
              </div>
            </section>
          </div>
        </>
      )}

      {casinha &&
        casinha.status !== "PAGO" &&
        casinha.status !== "PENDENTE" && (
          <div className="folha">
            <section className="passo">
              <div className="erro">
                <span>Esta casinha foi cancelada ou expirou.</span>
              </div>
              <Link href="/bolaodacopa" className="cta">
                Montar nova casinha <IconSeta size={18} />
              </Link>
            </section>
          </div>
        )}
    </main>
  );
}
