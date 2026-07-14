"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import CasinhaObra from "@/components/CasinhaObra";
import LogoTeto from "@/components/LogoTeto";
import { IconCadeado, IconSeta, IconPix } from "@/components/icones";
import TelaSucesso from "@/components/TelaSucesso";

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
  const origem =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://maisumteto.com.br";

  return (
    <main className="canvas">
      <header className="masthead">
        <LogoTeto className="masthead-logo" />
      </header>

      {erro && (
        <div className="folha">
          <section className="passo">
            <div className="erro">
              <span>{erro}</span>
            </div>
            <Link href="/" className="cta secacao">
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
          origem={origem}
        />
      )}

      {casinha && casinha.status === "PENDENTE" && casinha.pixQrCodeImage && (
        <>
          <div className="obra">
            <CasinhaObra pilotis={qtd} />
            <p className="obra-legenda">
              Sua casinha sobre <b>{qtd} piloti{qtd > 1 ? "s" : ""}</b>. Falta o
              PIX pra fincar de vez.
            </p>
          </div>

          <div className="folha">
            <section className="passo">
              <div className="passo-head">
                <span className="passo-num">01</span>
                <h2 className="passo-titulo">O que tem na casinha</h2>
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
                  <span>Chorinho pra obra</span>
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
                <IconCadeado size={14} /> Ambiente seguro · Asaas
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
              <Link href="/" className="cta">
                Montar nova casinha <IconSeta size={18} />
              </Link>
            </section>
          </div>
        )}
    </main>
  );
}
