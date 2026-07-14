"use client";

import { useEffect, useState } from "react";

interface Progresso {
  arrecadadoCentavos: number;
  metaCentavos: number;
  pct: number;
  passo: number;
}

// O piloti é a barra de carregamento da campanha: os SVGs em
// /carregamento/PilotiXX.svg preenchem de 5 em 5% (R$ 50 por nível).
// Ao carregar a página, a barra "enche" do 0 até o valor atual da meta.
export default function ProgressoPiloti() {
  const [alvo, setAlvo] = useState<Progresso | null>(null);
  const [passoExibido, setPassoExibido] = useState(0);
  const [pctExibido, setPctExibido] = useState(0);

  // Busca a meta real
  useEffect(() => {
    let ativo = true;
    fetch("/api/progresso", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (ativo && d) setAlvo(d);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  // Anima o enchimento do piloti (frames de 5 em 5) e o número subindo
  useEffect(() => {
    if (!alvo) return;

    const reduz =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduz) {
      setPassoExibido(alvo.passo);
      setPctExibido(alvo.pct);
      return;
    }

    let passo = 0;
    let pct = 0;
    setPassoExibido(0);
    setPctExibido(0);

    const t = setInterval(() => {
      let acabou = true;
      if (passo < alvo.passo) {
        passo = Math.min(alvo.passo, passo + 5);
        setPassoExibido(passo);
        acabou = false;
      }
      if (pct < alvo.pct) {
        pct = Math.min(alvo.pct, pct + 1);
        setPctExibido(pct);
        acabou = false;
      }
      if (acabou) clearInterval(t);
    }, 70);

    return () => clearInterval(t);
  }, [alvo]);

  const arquivo = `/carregamento/Piloti${String(passoExibido).padStart(2, "0")}.svg`;
  const cheio = alvo ? pctExibido >= 100 : false;

  return (
    <section className="progresso" aria-label="Progresso da arrecadação">
      <div className="progresso-piloti">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={arquivo}
          alt={`Piloti carregado em ${pctExibido}%`}
          className={cheio ? "cheio" : ""}
        />
        <span className="progresso-pct">{pctExibido}%</span>
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
