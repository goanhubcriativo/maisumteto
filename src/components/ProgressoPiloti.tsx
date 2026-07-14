"use client";

import { useEffect, useState, type CSSProperties } from "react";

interface Progresso {
  arrecadadoCentavos: number;
  metaCentavos: number;
  pct: number;
  passo: number;
}

// O piloti é a barra de carregamento da campanha.
// A parte já conquistada (arrecadação real) fica fixa; o bloco de 5% atual
// "carrega" continuamente do início ao fim e reinicia (loop), completando a
// imagem sem divisões. Base = tubo vazio; sobreposição = tubo cheio recortado
// por clip-path, animado por CSS (de "real%" até o topo do bloco de 5%).
export default function ProgressoPiloti() {
  const [real, setReal] = useState(0);

  useEffect(() => {
    let ativo = true;
    fetch("/api/progresso", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Progresso | null) => {
        if (ativo && d) setReal(d.pct);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  const cheio = real >= 100;
  const alvo = cheio ? 100 : (Math.floor(real / 5) + 1) * 5;
  // clip-path inset esconde X% pela direita → mostra (100 - X)%
  const de = 100 - real; // início do loop (parte fixa já conquistada)
  const ate = 100 - alvo; // fim do loop (topo do bloco de 5%)

  const estiloFill = {
    "--de": `${de}%`,
    "--ate": `${ate}%`,
    ...(cheio ? { clipPath: "inset(0 0 0 0)", animation: "none" } : {}),
  } as CSSProperties;

  return (
    <section className="progresso" aria-label="Progresso da arrecadação">
      <div className="progresso-piloti">
        <div className="piloti-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="piloti-base" src="/carregamento/Piloti00.svg" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="piloti-fill"
            src="/carregamento/Piloti100.svg"
            alt={`Arrecadação em ${real}%`}
            style={estiloFill}
          />
        </div>
        <span className="progresso-pct">{real}%</span>
      </div>

      <div className="participe">
        <h2 className="participe-chamada">
          Participe do Bolão e<br />
          ajude a <span className="script-azul">fixar o 1º piloti</span>
        </h2>
        <p className="participe-meta">
          Nossa meta com o bolão é arrecadar os primeiros 1000 reais para nossa
          casa amiga. Cada aposta ajuda muito!
        </p>
      </div>
    </section>
  );
}
