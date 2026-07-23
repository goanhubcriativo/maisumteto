"use client";

// Controles de formulário que o cadastro de ações compartilha.
//
// Nasceram na tela de produto e agora servem a todas as ações: o controle
// segmentado no lugar do <select>, a chavinha liga/desliga, e o editor de
// fichinhas que substitui o campo separado por vírgula (que enganava, porque
// "P M G" sem vírgula virava um valor só).
//
// Os wrappers CampoDeEscolha / CampoDeLista / CampoDeChave existem pra encaixar
// esses controles no formulário genérico sem mudar o servidor: cada um mantém
// seu estado e joga o valor num <input hidden> com o mesmo `name` de antes.

import { useState } from "react";

/** Controle de duas ou mais opções, no lugar de um <select>. */
export function Segmento<T extends string>({
  valor,
  aoTrocar,
  opcoes,
}: {
  valor: T;
  aoTrocar: (v: T) => void;
  opcoes: { valor: T; rotulo: string }[];
}) {
  return (
    <div className="segmento" role="group">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          className={`segmento-opcao${valor === o.valor ? " ativo" : ""}`}
          aria-pressed={valor === o.valor}
          onClick={() => aoTrocar(o.valor)}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

/** Uma chavinha liga/desliga. */
export function Interruptor({
  ligado,
  aoTrocar,
}: {
  ligado: boolean;
  aoTrocar: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      className={`interruptor${ligado ? " ligado" : ""}`}
      onClick={() => aoTrocar(!ligado)}
    >
      <span className="interruptor-bolha" />
    </button>
  );
}

/**
 * Editor de valores em fichinhas. Digitar e apertar Adicionar (ou Enter) cria
 * uma ficha; clicar no X remove. Some com o campo separado por vírgula.
 */
export function EditorDeChips({
  valores,
  aoTrocar,
  placeholder,
  sugestoes,
}: {
  valores: string[];
  aoTrocar: (v: string[]) => void;
  placeholder: string;
  sugestoes?: string[];
}) {
  const [rascunho, setRascunho] = useState("");

  function adicionar(bruto: string) {
    const t = bruto.trim();
    if (!t) return;
    if (!valores.some((x) => x.toLowerCase() === t.toLowerCase())) {
      aoTrocar([...valores, t]);
    }
    setRascunho("");
  }

  const livres = (sugestoes ?? []).filter(
    (s) => !valores.some((v) => v.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="chips">
      {valores.length > 0 && (
        <div className="chips-lista">
          {valores.map((v) => (
            <span key={v} className="chip">
              <span>{v}</span>
              <button
                type="button"
                className="chip-x"
                onClick={() => aoTrocar(valores.filter((x) => x !== v))}
                aria-label={`Remover ${v}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {livres.length > 0 && (
        <div className="chips-sugestoes">
          {livres.map((s) => (
            <button key={s} type="button" className="chip-sugestao" onClick={() => adicionar(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}

      <div className="chip-nova">
        <input
          className="campo-entrada"
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar(rascunho);
            }
          }}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="botao botao-contorno botao-pequeno"
          onClick={() => adicionar(rascunho)}
        >
          Adicionar
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wrappers pro formulário genérico. Cada um guarda o estado e envia o valor num
// <input hidden> com o `name` de sempre, então a server action não muda.
// ---------------------------------------------------------------------------

/** Uma entre opções fixas, como controle segmentado. */
export function CampoDeEscolha({
  nome,
  escolhas,
  padrao,
}: {
  nome: string;
  escolhas: { valor: string; rotulo: string }[];
  padrao?: string;
}) {
  const inicial = padrao && escolhas.some((e) => e.valor === padrao) ? padrao : escolhas[0]?.valor ?? "";
  const [valor, setValor] = useState(inicial);
  return (
    <>
      <input type="hidden" name={nome} value={valor} />
      <Segmento valor={valor} aoTrocar={setValor} opcoes={escolhas} />
    </>
  );
}

/** Lista escrita pela pessoa (tamanhos, lotes, pontos), como fichinhas. */
export function CampoDeLista({
  nome,
  placeholder,
  padrao,
}: {
  nome: string;
  placeholder?: string;
  padrao?: string[];
}) {
  const [valores, setValores] = useState<string[]>(padrao ?? []);
  return (
    <>
      {/* O servidor separa por vírgula ou quebra de linha; uma por linha basta. */}
      <input type="hidden" name={nome} value={valores.join("\n")} />
      <EditorDeChips
        valores={valores}
        aoTrocar={setValores}
        placeholder={placeholder || "Digite e toque em adicionar"}
      />
    </>
  );
}

/** Sim ou não, como chavinha. */
export function CampoDeChave({ nome, padrao }: { nome: string; padrao?: boolean }) {
  const [ligado, setLigado] = useState(Boolean(padrao));
  return (
    <span className="campo-chave">
      <input type="hidden" name={nome} value={ligado ? "1" : ""} />
      <Interruptor ligado={ligado} aoTrocar={setLigado} />
      <span>{ligado ? "Sim" : "Não"}</span>
    </span>
  );
}
