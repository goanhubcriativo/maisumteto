// O construtor: a pilha de blocos com os controles de editar, mover e remover.
//
// Feito com formulario e server action, sem arrastar-e-soltar. Nao e preguica:
// arrastar quebra no celular, some pra quem usa teclado e leitor de tela, e a
// pessoa que monta a campanha faz isso do telefone tanto quanto do computador.
// Setinha de subir e descer resolve o mesmo problema e funciona em tudo.

import { BLOCOS, definicaoDe, familias, type Bloco, type TipoBloco } from "@/lib/blocos";

export interface AcoesDoEditor {
  adicionar: (dados: FormData) => Promise<void>;
  salvar: (dados: FormData) => Promise<void>;
  mover: (dados: FormData) => Promise<void>;
  alternar: (dados: FormData) => Promise<void>;
  remover: (dados: FormData) => Promise<void>;
}

/** Converte o conteudo guardado para o texto que vai na caixa de edicao. */
function paraCaixa(valor: unknown, tipo: string, chavesDoPar?: [string, string]): string {
  if (tipo === "lista") {
    return Array.isArray(valor) ? valor.join("\n") : "";
  }
  if (tipo === "pares") {
    if (!Array.isArray(valor)) return "";
    const [a, b] = chavesDoPar ?? ["nome", "valor"];
    return valor
      .map((p: Record<string, unknown>) => `${p?.[a] ?? ""} | ${p?.[b] ?? ""}`)
      .join("\n");
  }
  return valor == null ? "" : String(valor);
}

export default function EditorDeBlocos({
  blocos,
  acoes,
}: {
  blocos: Bloco[];
  acoes: AcoesDoEditor;
}) {
  const ordenados = [...blocos].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="editor">
      <div className="editor-pilha">
        {ordenados.length === 0 && (
          <p className="vazio">
            A página desta ação ainda não tem nenhum bloco. Escolha um na gaveta ao lado.
          </p>
        )}

        {ordenados.map((bloco, i) => {
          const def = definicaoDe(bloco.tipo as TipoBloco);
          if (!def) return null;

          return (
            <article key={bloco.id} className={`editor-bloco${bloco.visivel ? "" : " oculto"}`}>
              <header className="editor-bloco-topo">
                <span className="editor-bloco-nome">
                  {def.nome}
                  {def.automatico && <em className="editor-auto">automático</em>}
                  {!bloco.visivel && <em className="editor-oculto">oculto</em>}
                </span>

                <span className="editor-bloco-botoes">
                  <form action={acoes.mover}>
                    <input type="hidden" name="id" value={bloco.id} />
                    <input type="hidden" name="direcao" value="cima" />
                    <button
                      className="editor-mini"
                      type="submit"
                      disabled={i === 0}
                      title="Subir"
                      aria-label={`Subir o bloco ${def.nome}`}
                    >
                      ↑
                    </button>
                  </form>

                  <form action={acoes.mover}>
                    <input type="hidden" name="id" value={bloco.id} />
                    <input type="hidden" name="direcao" value="baixo" />
                    <button
                      className="editor-mini"
                      type="submit"
                      disabled={i === ordenados.length - 1}
                      title="Descer"
                      aria-label={`Descer o bloco ${def.nome}`}
                    >
                      ↓
                    </button>
                  </form>

                  <form action={acoes.alternar}>
                    <input type="hidden" name="id" value={bloco.id} />
                    <button
                      className="editor-mini"
                      type="submit"
                      title={bloco.visivel ? "Ocultar da página" : "Mostrar na página"}
                    >
                      {bloco.visivel ? "Ocultar" : "Mostrar"}
                    </button>
                  </form>

                  <form action={acoes.remover}>
                    <input type="hidden" name="id" value={bloco.id} />
                    <button className="editor-mini perigo" type="submit" title="Remover bloco">
                      Remover
                    </button>
                  </form>
                </span>
              </header>

              {def.campos.length === 0 ? (
                <p className="editor-sem-campos">
                  {def.automatico
                    ? "Preenchido pelo sistema, com os números da campanha."
                    : "Este bloco não tem nada para preencher."}
                </p>
              ) : (
                <form action={acoes.salvar} className="editor-campos">
                  <input type="hidden" name="id" value={bloco.id} />

                  {def.campos.map((campo) => {
                    const nome = `c_${campo.chave}`;
                    const valor = paraCaixa(
                      bloco.conteudo[campo.chave],
                      campo.tipo,
                      campo.chavesDoPar
                    );
                    const grande =
                      campo.tipo === "textoLongo" || campo.tipo === "lista" || campo.tipo === "pares";

                    return (
                      <label key={campo.chave} className="campo">
                        <span className="campo-rotulo">{campo.rotulo}</span>
                        {grande ? (
                          <textarea
                            className="campo-entrada"
                            name={nome}
                            rows={campo.tipo === "textoLongo" ? 5 : 3}
                            defaultValue={valor}
                            placeholder={campo.exemplo}
                          />
                        ) : (
                          <input
                            className="campo-entrada"
                            name={nome}
                            type={campo.tipo === "data" ? "date" : "text"}
                            defaultValue={valor}
                            placeholder={campo.exemplo}
                          />
                        )}
                        {campo.ajuda && <span className="campo-ajuda">{campo.ajuda}</span>}
                      </label>
                    );
                  })}

                  <button className="botao botao-contorno botao-pequeno" type="submit">
                    Salvar bloco
                  </button>
                </form>
              )}
            </article>
          );
        })}
      </div>

      <aside className="editor-gaveta">
        <h3>Gaveta de blocos</h3>
        <p className="editor-gaveta-apoio">
          Toque para acrescentar no fim da página. Depois é só mover para onde quiser.
        </p>

        {familias().map((familia) => (
          <div key={familia} className="editor-familia">
            <span className="editor-familia-nome">{familia}</span>
            {BLOCOS.filter((b) => b.familia === familia).map((b) => (
              <form key={b.tipo} action={acoes.adicionar}>
                <input type="hidden" name="tipo" value={b.tipo} />
                <button className="editor-opcao" type="submit" title={b.paraQue}>
                  <span className="editor-opcao-nome">{b.nome}</span>
                  <span className="editor-opcao-para">{b.paraQue}</span>
                </button>
              </form>
            ))}
          </div>
        ))}
      </aside>
    </div>
  );
}

/**
 * Le o FormData do editor e devolve o conteudo pronto pra guardar.
 * Fica aqui, junto do editor que escreveu o formulario, pra que ler e escrever
 * o mesmo formato nao se percam um do outro.
 */
export function lerConteudoDoFormulario(
  tipo: TipoBloco,
  dados: FormData
): Record<string, unknown> {
  const def = definicaoDe(tipo);
  const conteudo: Record<string, unknown> = {};
  if (!def) return conteudo;

  for (const campo of def.campos) {
    const bruto = String(dados.get(`c_${campo.chave}`) ?? "");

    if (campo.tipo === "lista") {
      conteudo[campo.chave] = bruto
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    } else if (campo.tipo === "pares") {
      const [a, b] = campo.chavesDoPar ?? ["nome", "valor"];
      conteudo[campo.chave] = bruto
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((linha) => {
          // Corta so no primeiro "|": assim a resposta pode conter "|" sem quebrar.
          const corte = linha.indexOf("|");
          if (corte < 0) return { [a]: linha, [b]: "" };
          return {
            [a]: linha.slice(0, corte).trim(),
            [b]: linha.slice(corte + 1).trim(),
          };
        });
    } else {
      conteudo[campo.chave] = bruto;
    }
  }

  return conteudo;
}
