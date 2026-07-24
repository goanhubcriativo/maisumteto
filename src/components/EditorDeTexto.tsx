"use client";

// O campo de texto com negrito, itálico, cor e quebra de linha de verdade.
//
// É um contenteditable, e não um <textarea>, porque a pessoa precisa VER o
// negrito enquanto escreve. Mas o que sai daqui não é o HTML do navegador: a
// cada digitada o conteúdo é lido e traduzido pra lista de pedaços (ver
// src/lib/textoRico.ts), que é o formato guardado. Assim o navegador pode
// inventar a estrutura que quiser por dentro, que o dado continua limpo.
//
// A cor é aplicada como CLASSE (tx-azul, tx-acao), nunca como valor fixo. A cor
// da ação muda quando a equipe troca a cor no painel, e o texto acompanha.

import { useEffect, useRef, useState } from "react";
import {
  CORES_DE_TEXTO,
  type CorDeTexto,
  type LinhaDeTexto,
  type PedacoDeTexto,
  type TextoRico,
} from "@/lib/textoRico";

const NOMES: CorDeTexto[] = ["preto", "azul", "acao"];

/** As bandeirinhas que valem pra um nó, olhando os pais até a raiz. */
function bandeirinhas(no: Node, raiz: HTMLElement) {
  let b = false;
  let i = false;
  let c: CorDeTexto | undefined;

  let p: Node | null = no.parentNode;
  while (p && p !== raiz.parentNode) {
    if (p instanceof HTMLElement) {
      const tag = p.tagName.toLowerCase();
      if (tag === "b" || tag === "strong") b = true;
      if (tag === "i" || tag === "em") i = true;
      // O navegador às vezes usa estilo em vez de tag.
      const peso = p.style.fontWeight;
      if (peso === "bold" || peso === "bolder" || Number(peso) >= 600) b = true;
      if (p.style.fontStyle === "italic") i = true;
      // A cor mais próxima é a que vale.
      if (!c) for (const nome of NOMES) if (p.classList.contains(`tx-${nome}`)) c = nome;
    }
    if (p === raiz) break;
    p = p.parentNode;
  }
  return { b, i, c };
}

/** Lê o conteúdo editável e devolve os pedaços, com "\n" onde há quebra. */
function coletar(raiz: HTMLElement): PedacoDeTexto[] {
  const saida: PedacoDeTexto[] = [];
  let primeiro = true;

  function andar(no: Node) {
    if (no.nodeType === Node.TEXT_NODE) {
      const t = no.textContent ?? "";
      if (t) {
        const f = bandeirinhas(no, raiz);
        saida.push({
          t,
          ...(f.b ? { b: true as const } : {}),
          ...(f.i ? { i: true as const } : {}),
          ...(f.c ? { c: f.c } : {}),
        });
        primeiro = false;
      }
      return;
    }
    if (!(no instanceof HTMLElement)) return;

    const tag = no.tagName.toLowerCase();
    if (tag === "br") {
      // O navegador enfia um <br> no fim de todo bloco só pra ele não colapsar
      // ("filler"). Contar esse <br> como quebra somava uma linha em branco a
      // cada volta: o bloco já quebra sozinho, e o <br> quebrava de novo. Por
      // isso o último <br> de um bloco é ignorado.
      const pai = no.parentElement;
      const paiEhBloco =
        pai && pai !== raiz && ["div", "p"].includes(pai.tagName.toLowerCase());
      if (paiEhBloco && pai.lastChild === no) return;

      saida.push({ t: "\n" });
      primeiro = false;
      return;
    }
    // Bloco novo começa numa linha nova (menos o primeiro de todos).
    const bloco = tag === "div" || tag === "p";
    if (bloco && !primeiro) saida.push({ t: "\n" });
    for (const filho of Array.from(no.childNodes)) andar(filho);
  }

  for (const filho of Array.from(raiz.childNodes)) andar(filho);
  return saida;
}

/** Quebra os pedaços em linhas, no "\n". */
function emLinhas(pedacos: PedacoDeTexto[]): LinhaDeTexto[] {
  const linhas: LinhaDeTexto[] = [[]];
  for (const p of pedacos) {
    const partes = p.t.split("\n");
    partes.forEach((parte, idx) => {
      if (idx > 0) linhas.push([]);
      if (parte) linhas[linhas.length - 1].push({ ...p, t: parte });
    });
  }
  // Tira linhas vazias sobrando no fim.
  while (linhas.length > 0 && linhas[linhas.length - 1].length === 0) linhas.pop();
  return linhas;
}

/** O HTML inicial, montado a partir do que estava guardado. */
function paraHtml(valor: TextoRico | null | undefined): string {
  if (!valor || valor.linhas.length === 0) return "";
  const escapar = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return valor.linhas
    .map((linha) => {
      if (linha.length === 0) return "<div><br></div>";
      const dentro = linha
        .map((p) => {
          let html = escapar(p.t);
          if (p.b) html = `<b>${html}</b>`;
          if (p.i) html = `<i>${html}</i>`;
          if (p.c) html = `<span class="tx-${p.c}">${html}</span>`;
          return html;
        })
        .join("");
      return `<div>${dentro}</div>`;
    })
    .join("");
}

export default function EditorDeTexto({
  nome,
  valorInicial,
  placeholder,
  corDaAcao,
  rows = 5,
  aoMudar,
}: {
  /** Nome do campo escondido que leva o JSON pro servidor. */
  nome: string;
  valorInicial?: TextoRico | null;
  placeholder?: string;
  /** A cor forte da ação, pra "Cor da ação" mostrar a cor certa aqui dentro. */
  corDaAcao?: string;
  rows?: number;
  /** Avisa quem está de fora (pra validar "escreveu alguma coisa?"). */
  aoMudar?: (temTexto: boolean) => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const [rico, setRico] = useState<TextoRico>(() => ({ linhas: valorInicial?.linhas ?? [] }));
  const [vazio, setVazio] = useState(true);

  // O conteúdo inicial entra uma vez, na mão. Deixar o React controlar o
  // innerHTML de um contenteditable faz o cursor pular pro começo a cada tecla.
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    el.innerHTML = paraHtml(valorInicial);
    setVazio((el.textContent ?? "").trim().length === 0);
    // Prefere <b>/<i> a estilo solto, que é mais fácil de reler depois.
    try {
      document.execCommand("styleWithCSS", false, "false");
    } catch {
      // Navegador antigo: segue com o que der, a leitura trata os dois casos.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function atualizar() {
    const el = caixa.current;
    if (!el) return;
    setRico({ linhas: emLinhas(coletar(el)) });
    const semTexto = (el.textContent ?? "").trim().length === 0;
    setVazio(semTexto);
    aoMudar?.(!semTexto);
  }

  function comando(nomeDoComando: "bold" | "italic") {
    caixa.current?.focus();
    document.execCommand(nomeDoComando);
    atualizar();
  }

  function aplicarCor(cor: CorDeTexto) {
    const el = caixa.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.className = `tx-${cor}`;
    try {
      range.surroundContents(span);
    } catch {
      // Seleção atravessando tags: recolhe o pedaço e embrulha na mão.
      span.appendChild(range.extractContents());
      range.insertNode(span);
    }

    // Tira cores antigas de dentro, senão a de baixo (mais próxima) ganharia.
    span.querySelectorAll("span").forEach((dentro) => {
      for (const n of NOMES) dentro.classList.remove(`tx-${n}`);
      if (!dentro.className) dentro.removeAttribute("class");
    });

    sel.removeAllRanges();
    atualizar();
  }

  return (
    <div className="editor-texto" style={corDaAcao ? ({ "--acao-forte": corDaAcao } as React.CSSProperties) : undefined}>
      <input type="hidden" name={nome} value={JSON.stringify(rico)} />

      <div className="editor-barra">
        <button
          type="button"
          className="editor-botao"
          onClick={() => comando("bold")}
          title="Negrito"
        >
          <strong>N</strong>
        </button>
        <button
          type="button"
          className="editor-botao"
          onClick={() => comando("italic")}
          title="Itálico"
        >
          <em>I</em>
        </button>

        <span className="editor-separador" />

        {CORES_DE_TEXTO.map((c) => (
          <button
            key={c.valor}
            type="button"
            className="editor-cor"
            onClick={() => aplicarCor(c.valor)}
            title={`Texto em ${c.rotulo.toLowerCase()}`}
          >
            <span className={`editor-cor-bolha tx-fundo-${c.valor}`} />
            {c.rotulo}
          </button>
        ))}
      </div>

      <div className="editor-caixa-fora">
        <div
          ref={caixa}
          className="campo-entrada editor-caixa"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          style={{ minHeight: rows * 24 }}
          onInput={atualizar}
          onBlur={atualizar}
        />
        {vazio && placeholder && <span className="editor-placeholder">{placeholder}</span>}
      </div>

      <span className="campo-ajuda">
        Selecione um trecho e use os botões. Enter pula linha.
      </span>
    </div>
  );
}
