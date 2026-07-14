"use client";

import { useState } from "react";
import Link from "next/link";
import { IconCheck, IconWhats } from "@/components/icones";

interface Palpite {
  placarCasa: number;
  placarVisitante: number;
}
interface Props {
  nome: string;
  palpites: Palpite[];
  doacaoCentavos: number;
  valorTotalCentavos: number;
  reciboId: string;
  origem: string;
}

function brl(c: number) {
  return (c / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function TelaSucesso({
  nome,
  palpites,
  doacaoCentavos,
  valorTotalCentavos,
  reciboId,
  origem,
}: Props) {
  const [verRecibo, setVerRecibo] = useState(false);
  const qtd = palpites.length;
  const unit =
    qtd > 0 ? Math.round((valorTotalCentavos - doacaoCentavos) / qtd) : 0;
  const texto = `Acabei de contribuir pra construir mais uma casa com a Teto. Faça sua fézinha também e ajude: ${origem}`;

  // Compartilha a IMAGEM + texto pelo menu nativo (WhatsApp/Instagram).
  async function compartilhar(stories: boolean) {
    const url = stories ? "/api/card?f=stories" : "/api/card";
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File(
        [blob],
        stories ? "teto-stories.png" : "eu-contribui-teto.png",
        { type: "image/png" }
      );
      const nav = navigator as Navigator & {
        canShare?: (d: { files: File[] }) => boolean;
      };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], text: texto });
        return;
      }
    } catch {
      /* cai no fallback */
    }
    if (stories) window.open(url, "_blank");
    else
      window.open(
        `https://wa.me/?text=${encodeURIComponent(texto)}`,
        "_blank"
      );
  }

  function baixar(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <>
      <div className="sucesso-topo">
        <div className="selo">
          <IconCheck size={32} strokeWidth={2.4} />
        </div>
        <h2 className="st-titulo">Casinha erguida!</h2>
        <p className="st-sub">
          Valeu, {nome.split(" ")[0]}! Suas {qtd} fézinha
          {qtd > 1 ? "s" : ""} viraram piloti na obra da Teto.
        </p>
      </div>

      <div className="sucesso-share">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="card-preview"
          src="/api/card"
          alt="Cartão: Eu contribuí para mais uma casa"
        />
        <p className="share-legenda">
          Compartilhe que ajudou e incentive mais amigos a ajudar.
        </p>
        <div className="acoes">
          <button className="acao zap" onClick={() => compartilhar(false)}>
            <IconWhats size={16} /> WhatsApp
          </button>
          <button className="acao stories" onClick={() => compartilhar(true)}>
            Postar stories
          </button>
          <button
            className="acao baixar"
            onClick={() => baixar("/api/card", "eu-contribui-teto.png")}
          >
            Baixar imagem
          </button>
          <button
            className={`acao recibo ${verRecibo ? "on" : ""}`}
            onClick={() => setVerRecibo((v) => !v)}
          >
            {verRecibo ? "Ocultar recibo" : "Ver recibo da aposta"}
          </button>
        </div>
      </div>

      {verRecibo && (
        <div className="recibo-caixa">
          <div className="rc-topo">
            <div className="rc-tit">COMPROVANTE</div>
            <div className="rc-sub">BOLÃO DA CASA AMIGA · TETO</div>
          </div>
          <div className="rc-hr" />
          <div className="rc-linha">
            <span>APOSTADOR</span>
            <span>{nome.toUpperCase()}</span>
          </div>
          <div className="rc-hr" />
          <ul className="rc-itens">
            {palpites.map((p, i) => (
              <li key={i}>
                <span>
                  {String(i + 1).padStart(2, "0")} APOSTA {p.placarCasa} x{" "}
                  {p.placarVisitante}
                </span>
                <span>{brl(unit)}</span>
              </li>
            ))}
            {doacaoCentavos > 0 && (
              <li className="mut">
                <span>AJUDINHA EXTRA</span>
                <span>{brl(doacaoCentavos)}</span>
              </li>
            )}
          </ul>
          <div className="rc-hr" />
          <div className="rc-total">
            <span>TOTAL PAGO</span>
            <span>{brl(valorTotalCentavos)}</span>
          </div>
          <div className="rc-rodape">
            <span>PROTOCOLO {reciboId.slice(-8).toUpperCase()}</span>
            <span className="pago">PAGO VIA PIX</span>
          </div>
          <div className="rc-obrigado">
            * * * OBRIGADO POR AJUDAR A TETO PARANÁ * * *
          </div>
          <button
            className="rc-baixar"
            onClick={() => baixar(`/api/recibo/${reciboId}`, "recibo-teto.png")}
          >
            Baixar recibo
          </button>
        </div>
      )}

      <Link href="/" className="voltar-txt">
        Voltar para o bolão
      </Link>
    </>
  );
}
