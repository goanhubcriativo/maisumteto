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
export default function ProgressoPiloti() {
  const [p, setP] = useState<Progresso>({
    arrecadadoCentavos: 0,
    metaCentavos: 100000,
    pct: 0,
    passo: 0,
  });

  useEffect(() => {
    let ativo = true;
    fetch("/api/progresso", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (ativo && d) setP(d);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  const arquivo = `/carregamento/Piloti${String(p.passo).padStart(2, "0")}.svg`;

  return (
    <section className="progresso" aria-label="Progresso da arrecadação">
      <div className="progresso-piloti">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={arquivo} alt={`Piloti carregado em ${p.pct}%`} />
        <span className="progresso-pct">{p.pct}%</span>
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
