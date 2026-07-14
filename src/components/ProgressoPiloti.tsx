"use client";

import { useEffect, useState, type CSSProperties } from "react";

interface Progresso {
  arrecadadoCentavos: number;
  metaCentavos: number;
  pct: number;
  passo: number;
}

// O piloti é a barra de carregamento da campanha.
// - Parte JÁ CONQUISTADA (estática): avança de 5 em 5%.
// - Bloco que está "carregando" (animado): sobe de 10 em 10%, em loop e lento.
// - Número: conta de 1 em 1 até o valor real.
// Base = tubo vazio; sobreposição = tubo cheio recortado por clip-path (CSS).
export default function ProgressoPiloti() {
  const [real, setReal] = useState(0); // % exato arrecadado (1 em 1)
  const [num, setNum] = useState(0); // número exibido, contando 1 a 1

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

  // Número conta de 1 em 1 até o real
  useEffect(() => {
    const reduz =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduz) {
      setNum(real);
      return;
    }
    setNum(0);
    const t = setInterval(() => {
      setNum((n) => {
        if (n >= real) {
          clearInterval(t);
          return real;
        }
        return n + 1;
      });
    }, 45);
    return () => clearInterval(t);
  }, [real]);

  const cheio = real >= 100;
  const estatico = Math.floor(real / 5) * 5; // conquistado, de 5 em 5
  const alvo = cheio ? 100 : Math.min(100, Math.floor(real / 10) * 10 + 10); // próxima marca de 10

  // clip-path inset esconde X% pela direita → mostra (100 - X)%
  const de = 100 - estatico; // início do loop (parte fixa)
  const ate = 100 - alvo; // fim do loop (topo do bloco de 10%)

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
        <span className="progresso-pct">{num}%</span>
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
