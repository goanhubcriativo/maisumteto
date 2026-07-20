"use client";

// Quem contribuiu, sem virar uma parede de nomes.
//
// A lista inteira de uma vez empurrava o rodape pra baixo demais e transformava
// o fim da pagina num aparente formulario de censo. Mostrar os ultimos e abrir o
// resto sob demanda mantem os dois valores: quem acabou de doar se ve na hora, e
// ninguem que ja doou some da pagina.

import { useState } from "react";
import type { ApoiadorRecente } from "@/lib/vitrine";

interface Props {
  apoiadores: ApoiadorRecente[];
}

const QUANTOS_DE_INICIO = 15;

function primeiraLetra(nome: string): string {
  return nome.trim().charAt(0).toUpperCase() || "?";
}

function quandoRelativo(d: Date | null): string {
  if (!d) return "";
  const horas = Math.floor((Date.now() - d.getTime()) / 36e5);
  if (horas < 1) return "agora há pouco";
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ListaDeApoiadores({ apoiadores }: Props) {
  const [abertaToda, setAbertaToda] = useState(false);

  const escondidos = apoiadores.length - QUANTOS_DE_INICIO;
  const mostrando = abertaToda ? apoiadores : apoiadores.slice(0, QUANTOS_DE_INICIO);

  return (
    <>
      <div className="pessoas">
        {mostrando.map((a) => (
          <div key={a.id} className="pessoa">
            <span className={`pessoa-inicial${a.anonimo ? " calma" : ""}`}>
              {a.anonimo ? "?" : primeiraLetra(a.nome)}
            </span>
            <span className="pessoa-corpo">
              <span className="pessoa-nome">{a.nome}</span>
              <span className="pessoa-papel">
                {a.acao} · {quandoRelativo(a.quando)}
              </span>
            </span>
            {/* O valor de cada pessoa NAO aparece, de proposito. Quem deu R$ 10 e
                quem deu R$ 500 fizeram a mesma coisa: entraram. Mostrar o valor
                ao lado do nome cria comparacao entre quem doou, e comparacao
                afasta quem pode pouco. */}
          </div>
        ))}
      </div>

      {escondidos > 0 && (
        <button
          type="button"
          className="pessoas-mais"
          onClick={() => setAbertaToda((v) => !v)}
          aria-expanded={abertaToda}
        >
          {abertaToda
            ? "Mostrar menos"
            : `Ver todas as ${apoiadores.length} pessoas`}
        </button>
      )}
    </>
  );
}
