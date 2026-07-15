"use client";

import { useState } from "react";
import Link from "next/link";
import { config, LINK_CAMPANHA } from "@/lib/config";
import {
  IconCheck,
  IconWhats,
  IconInstagram,
  IconDownload,
} from "@/components/icones";

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
}: Props) {
  const [verRecibo, setVerRecibo] = useState(false);
  const [compartilhando, setCompartilhando] = useState(false);
  const abbr = (s: string) => s.trim().slice(0, 3).toUpperCase();
  const casaAb = abbr(config.timeCasa);
  const visAb = abbr(config.timeVisitante);
  const qtd = palpites.length;
  const unit =
    qtd > 0 ? Math.round((valorTotalCentavos - doacaoCentavos) / qtd) : 0;
  const texto = `Acabei de contribuir pra construir mais uma casa com a Teto. Faça sua fézinha também e ajude: ${LINK_CAMPANHA}`;

  // Compartilha a IMAGEM + texto pelo menu nativo (WhatsApp/Instagram).
  async function compartilhar(stories: boolean) {
    if (compartilhando) return; // evita toque duplo enquanto busca o cartão
    setCompartilhando(true);
    // cache-bust: garante a versão mais nova do cartão (evita cache do aparelho)
    const base = stories ? "/api/card?f=stories" : "/api/card";
    const url = `${base}${base.includes("?") ? "&" : "?"}v=${Date.now()}`;
    try {
      const blob = await (await fetch(url, { cache: "no-store" })).blob();
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
    } finally {
      setCompartilhando(false);
    }
    if (stories) window.open(url, "_blank");
    else
      window.open(
        `https://wa.me/?text=${encodeURIComponent(texto)}`,
        "_blank"
      );
  }

  function baixar(url: string, filename: string) {
    const busted = `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
    const a = document.createElement("a");
    a.href = busted;
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
          Valeu, {nome.split(" ")[0]}!{" "}
          {qtd === 0
            ? "Sua ajuda virou piloti na obra da Teto."
            : qtd === 1
            ? "Sua fézinha virou piloti na obra da Teto."
            : `Suas ${qtd} fézinhas viraram pilotis na obra da Teto.`}
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
        <div className="acoes-share">
          <button
            className="acao3"
            onClick={() => compartilhar(false)}
            disabled={compartilhando}
          >
            <IconWhats size={20} />
            WhatsApp
          </button>
          <button
            className="acao3"
            onClick={() => compartilhar(true)}
            disabled={compartilhando}
          >
            <IconInstagram size={20} />
            Instagram
          </button>
          <button
            className="acao3"
            onClick={() => baixar("/api/card", "eu-contribui-teto.png")}
            disabled={compartilhando}
          >
            <IconDownload size={20} />
            Baixar
          </button>
        </div>
        <button
          className={`acao-recibo ${verRecibo ? "on" : ""}`}
          onClick={() => setVerRecibo((v) => !v)}
        >
          {verRecibo
            ? "Ocultar recibo"
            : qtd === 0
            ? "Ver recibo da doação"
            : "Ver recibo da aposta"}
        </button>
      </div>

      {verRecibo && (
        <div className="recibo-caixa">
          <div className="rc-topo">
            <div className="rc-tit">COMPROVANTE</div>
            <div className="rc-sub">BOLÃO DA CASA AMIGA · TETO</div>
            <div className="rc-jogo">
              {config.timeCasa.toUpperCase()} × {config.timeVisitante.toUpperCase()}
            </div>
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
                  {String(i + 1).padStart(2, "0")} {casaAb} {p.placarCasa} x{" "}
                  {p.placarVisitante} {visAb}
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
