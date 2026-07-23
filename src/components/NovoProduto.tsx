"use client";

// A tela de cadastro de "Venda de produtos".
//
// Diferente das outras acoes, que sobem por um formulario generico montado a
// partir da receita, o produto tem tela propria. O motivo e que aqui as
// decisoes conversam entre si: o modo de producao ja escolhe o modelo de custo,
// o custo total muda o texto e mostra um ponto de equilibrio ao vivo, e as
// variacoes viram uma grade de estoque. Nada disso cabe num campo atras do
// outro; precisa de estado no navegador.
//
// O que sai daqui continua sendo o mesmo da plataforma: uma acao com preco,
// capa e (quando ha variacao) opcoes de venda, cada uma com seu estoque. A
// tela e nova, os dados que ela alimenta sao os de sempre.

import { useMemo, useRef, useState } from "react";

/** Mesma conta de paraCentavos, so pro calculo ao vivo do ponto de equilibrio. */
function emCentavos(entrada: string): number | null {
  const limpo = entrada.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  if (!limpo) return null;
  const n = Number(limpo);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/** "P, M, G" ou uma por linha viram ["P","M","G"], sem repetir nem vazio. */
function emLista(texto: string): string[] {
  const vistos = new Set<string>();
  const fora: string[] = [];
  for (const parte of texto.split(/[\n,]/)) {
    const t = parte.trim();
    if (t && !vistos.has(t.toLowerCase())) {
      vistos.add(t.toLowerCase());
      fora.push(t);
    }
  }
  return fora;
}

type ModoProducao = "ENCOMENDA" | "PRONTO";
type CustoQuando = "AGORA" | "FINAL";
type CustoComo = "PRODUTO" | "TOTAL";
type Entrega = "RETIRADA" | "CORREIO";

const MODELAGENS = ["Feminina", "Masculina", "Unissex"];
// A ordem em que as dimensoes entram no nome e na grade. Tamanho e linha,
// modelagem e coluna, cor e modelo agrupam em blocos.
const ORDEM = ["tamanho", "modelagem", "cor", "modelo"] as const;
type Dim = (typeof ORDEM)[number];

/** Um controle de duas ou tres opcoes, no lugar de um <select> escondido. */
function Segmento<T extends string>({
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

export default function NovoProduto({ action }: { action: (dados: FormData) => void }) {
  // Fotos: a primeira e a capa da acao, as outras entram na galeria da pagina.
  const [fotos, setFotos] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const entradaFoto = useRef<HTMLInputElement>(null);

  const [preco, setPreco] = useState("");

  const [modo, setModo] = useState<ModoProducao>("ENCOMENDA");
  const [custoQuando, setCustoQuando] = useState<CustoQuando>("AGORA");
  const [custoComo, setCustoComo] = useState<CustoComo>("PRODUTO");
  // Enquanto a pessoa nao mexe no COMO na mao, ele segue o modo de producao.
  const [custoComoTocado, setCustoComoTocado] = useState(false);
  const [custoValor, setCustoValor] = useState("");

  const [entrega, setEntrega] = useState<Entrega>("RETIRADA");

  // Dimensoes de variacao. Vazio = dimensao desligada.
  const [tamanhosTexto, setTamanhosTexto] = useState("");
  const [modelagens, setModelagens] = useState<string[]>([]);
  const [coresTexto, setCoresTexto] = useState("");
  const [modelosTexto, setModelosTexto] = useState("");
  // Quantidade por variante, so no modo "ja tenho pronto". Chave = assinatura.
  const [grade, setGrade] = useState<Record<string, string>>({});
  const [estoqueSimples, setEstoqueSimples] = useState("");

  function trocarModo(novo: ModoProducao) {
    setModo(novo);
    if (!custoComoTocado) setCustoComo(novo === "PRONTO" ? "TOTAL" : "PRODUTO");
  }

  function trocarCustoComo(novo: CustoComo) {
    setCustoComoTocado(true);
    setCustoComo(novo);
  }

  async function escolherFotos(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(evento.target.files ?? []);
    if (arquivos.length === 0) return;
    setErroFoto(null);
    setEnviando(true);
    try {
      for (const arquivo of arquivos) {
        const reduzida = await reduzir(arquivo);
        const corpo = new FormData();
        corpo.append("arquivo", new File([reduzida], "produto.jpg", { type: "image/jpeg" }));
        const r = await fetch("/api/imagem", { method: "POST", body: corpo });
        const resposta = await r.json();
        if (!r.ok) {
          setErroFoto(resposta.erro ?? "Nao consegui enviar a foto.");
          break;
        }
        setFotos((f) => [...f, resposta.url]);
      }
    } catch {
      setErroFoto("Nao consegui ler esse arquivo. Tente outra foto.");
    } finally {
      setEnviando(false);
      if (entradaFoto.current) entradaFoto.current.value = "";
    }
  }

  const tamanhos = useMemo(() => emLista(tamanhosTexto), [tamanhosTexto]);
  const cores = useMemo(() => emLista(coresTexto), [coresTexto]);
  const modelos = useMemo(() => emLista(modelosTexto), [modelosTexto]);

  const valoresDim: Record<Dim, string[]> = {
    tamanho: tamanhos,
    modelagem: modelagens,
    cor: cores,
    modelo: modelos,
  };
  const ligadas = ORDEM.filter((d) => valoresDim[d].length > 0);
  const temVariacao = ligadas.length > 0;

  // Produto cartesiano das dimensoes ligadas: a lista de todas as variantes.
  const combinacoes = useMemo(() => {
    let acc: Partial<Record<Dim, string>>[] = [{}];
    for (const d of ligadas) {
      acc = acc.flatMap((c) => valoresDim[d].map((v) => ({ ...c, [d]: v })));
    }
    return acc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tamanhos, modelagens, cores, modelos]);

  const assinatura = (c: Partial<Record<Dim, string>>) =>
    JSON.stringify(ligadas.map((d) => c[d]));
  const rotuloVariante = (c: Partial<Record<Dim, string>>) =>
    ligadas.map((d) => c[d]).join(" ");

  // O que vai no formulario: cada variante com sua quantidade. Sob encomenda,
  // estoque livre (null). Ja tenho pronto, so as celulas com quantidade.
  const variantesPayload = useMemo(() => {
    if (!temVariacao) return [];
    return combinacoes
      .map((c) => {
        const nome = rotuloVariante(c);
        if (modo === "ENCOMENDA") return { nome, quantidade: null as number | null };
        const q = Math.max(0, Math.floor(Number(grade[assinatura(c)] || 0)));
        return { nome, quantidade: q };
      })
      .filter((v) => modo === "ENCOMENDA" || (v.quantidade ?? 0) > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combinacoes, modo, grade, temVariacao]);

  const totalEmEstoque = useMemo(
    () => variantesPayload.reduce((s, v) => s + (v.quantidade ?? 0), 0),
    [variantesPayload]
  );

  // Ponto de equilibrio do custo total: quantas pecas cobrem o gasto do lote.
  const pontoEquilibrio = useMemo(() => {
    if (custoComo !== "TOTAL" || custoQuando !== "AGORA") return null;
    const precoC = emCentavos(preco);
    const custoC = emCentavos(custoValor);
    if (!precoC || precoC <= 0 || !custoC || custoC <= 0) return null;
    return Math.ceil(custoC / precoC);
  }, [custoComo, custoQuando, preco, custoValor]);

  // A grade e desenhada como tamanho (linhas) x modelagem (colunas), repetida em
  // blocos por cor e modelo. Sem tamanho ou sem modelagem, a dimensao que falta
  // vira uma coluna/linha unica; so cor e modelo viram uma lista simples.
  const linhaKey = ligadas.includes("tamanho") ? "tamanho" : null;
  const colunaKey = ligadas.includes("modelagem") ? "modelagem" : null;
  const blocoKeys = ligadas.filter((d) => d === "cor" || d === "modelo");
  const blocos = useMemo(() => {
    let acc: Partial<Record<Dim, string>>[] = [{}];
    for (const d of blocoKeys) {
      acc = acc.flatMap((c) => valoresDim[d].map((v) => ({ ...c, [d]: v })));
    }
    return acc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cores, modelos, tamanhos, modelagens]);
  const linhas = linhaKey ? valoresDim[linhaKey] : [null];
  const colunas = colunaKey ? valoresDim[colunaKey] : [null];

  return (
    <form action={action} className="produto-form">
      {/* Campos que espelham o estado do navegador. O resto entra por name. */}
      <input type="hidden" name="modoProducao" value={modo} />
      <input type="hidden" name="custoQuando" value={custoQuando} />
      <input type="hidden" name="custoComo" value={custoComo} />
      <input type="hidden" name="entrega" value={entrega} />
      <input type="hidden" name="capa" value={fotos[0] ?? ""} />
      <input type="hidden" name="fotos" value={JSON.stringify(fotos)} />
      <input type="hidden" name="variantes" value={JSON.stringify(variantesPayload)} />
      <input
        type="hidden"
        name="estoqueSimples"
        value={modo === "PRONTO" && !temVariacao ? estoqueSimples : ""}
      />

      {/* ---------------- A CAUSA ---------------- */}
      <div className="produto-bloco produto-largo">
        <h2 className="formulario-secao">A causa</h2>
        <p className="produto-sub">
          O porque desse produto existir. E o que faz alguem pagar mais do que a peca vale.
        </p>

        <label className="campo">
          <span className="campo-rotulo">
            Historia da acao<em className="campo-obrigatorio">obrigatorio</em>
          </span>
          <textarea
            className="campo-entrada"
            name="historia"
            rows={4}
            required
            placeholder="Por que existe e pra onde vai o dinheiro. Escreva como se contasse pra alguem no WhatsApp."
          />
          <span className="campo-ajuda">
            Aparece na pagina do produto, junto da foto. Quem entende a causa compra mais.
          </span>
        </label>

        <div className="campo-dupla">
          <label className="campo">
            <span className="campo-rotulo">Abre em</span>
            <input className="campo-entrada" name="abreEm" type="date" />
            <span className="campo-ajuda">Vazio: ja abre assim que voce publicar.</span>
          </label>
          <label className="campo">
            <span className="campo-rotulo">Fecha em</span>
            <input className="campo-entrada" name="fechaEm" type="date" />
            <span className="campo-ajuda">Vazio: fica no ar ate a campanha acabar.</span>
          </label>
        </div>
      </div>

      {/* ---------------- O PRODUTO ---------------- */}
      <div className="produto-bloco produto-largo">
        <h2 className="formulario-secao">O produto</h2>
      </div>

      {/* Fotos, largura inteira. */}
      <div className="produto-bloco produto-largo">
        <span className="campo-rotulo">
          Fotos do produto<em className="campo-obrigatorio">obrigatorio</em>
        </span>
        <span className="campo-ajuda" style={{ marginBottom: 12 }}>
          Foto boa vende. Use luz natural, fundo limpo e mostre a peca de perto. A primeira e a capa.
        </span>

        <div className="produto-fotos">
          {fotos.map((url, i) => (
            <div key={url} className="produto-foto-item">
              <div
                className="produto-foto-quadro"
                style={{ backgroundImage: `url(${JSON.stringify(url)})` }}
                role="img"
                aria-label={i === 0 ? "Foto de capa" : `Foto ${i + 1}`}
              />
              {i === 0 && <span className="produto-foto-selo">Capa</span>}
              <button
                type="button"
                className="produto-foto-tira"
                onClick={() => setFotos((f) => f.filter((_, j) => j !== i))}
                title="Remover foto"
              >
                Remover
              </button>
            </div>
          ))}

          <button
            type="button"
            className="produto-foto-add"
            onClick={() => entradaFoto.current?.click()}
            disabled={enviando}
          >
            {enviando ? "Enviando..." : fotos.length ? "Adicionar foto" : "Escolher fotos"}
          </button>
        </div>

        <input
          ref={entradaFoto}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="apenas-leitor"
          onChange={escolherFotos}
        />
        {erroFoto && <span className="campo-erro">{erroFoto}</span>}
      </div>

      {/* Nome e descricao, largura inteira. */}
      <label className="campo produto-largo">
        <span className="campo-rotulo">
          Nome do produto<em className="campo-obrigatorio">obrigatorio</em>
        </span>
        <input
          className="campo-entrada"
          name="nome"
          required
          placeholder="Camiseta da campanha do agasalho"
        />
        <span className="campo-ajuda">
          E o que aparece no cartao. Nome concreto vende mais que generico.
        </span>
      </label>

      <label className="campo produto-largo">
        <span className="campo-rotulo">Descricao</span>
        <textarea
          className="campo-entrada"
          name="descricao"
          rows={4}
          placeholder="Conta o que e a peca e pra onde vai o dinheiro, como se explicasse pra alguem no WhatsApp."
        />
        <span className="campo-ajuda">
          Diga o material, como fica no corpo e o que a arrecadacao vai fazer. Descricao maior converte mais.
        </span>
      </label>

      {/* Preco e meta, pareados. */}
      <label className="campo">
        <span className="campo-rotulo">Preco de venda por unidade</span>
        <input
          className="campo-entrada"
          name="preco"
          inputMode="decimal"
          placeholder="0,00"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
        />
        <span className="campo-ajuda">
          Quanto a pessoa paga por uma peca. Deixe em branco so se quem compra e que define o valor.
        </span>
      </label>

      <label className="campo">
        <span className="campo-rotulo">Meta deste produto</span>
        <input className="campo-entrada" name="meta" inputMode="decimal" placeholder="0,00" />
        <span className="campo-ajuda">
          Opcional. Sem meta propria, entra direto no total da arrecadacao.
        </span>
      </label>

      {/* Modo de producao, largura inteira. E o campo que mais erra na primeira vez. */}
      <div className="produto-bloco produto-largo">
        <span className="campo-rotulo">
          Modo de producao<em className="campo-obrigatorio">obrigatorio</em>
        </span>
        <Segmento
          valor={modo}
          aoTrocar={trocarModo}
          opcoes={[
            { valor: "ENCOMENDA", rotulo: "Sob encomenda" },
            { valor: "PRONTO", rotulo: "Ja tenho pronto" },
          ]}
        />
        <span className="campo-ajuda">
          Sob encomenda voce so produz o que vender: rende menos por peca, mas ninguem fica com 20
          camisas encalhadas. "Ja tenho pronto" e pra quando o estoque ja existe.
        </span>
      </div>

      {/* Custo, largura inteira: o coracao da logica. */}
      <div className="produto-bloco produto-largo produto-custo">
        <h3 className="produto-custo-titulo">Custo</h3>
        <p className="produto-sub">
          Fica entre voce e o sistema. Quem compra nunca ve o custo nem o lucro: o numero que
          aparece pra causa ja e o liquido.
        </p>

        <span className="campo-rotulo" style={{ marginTop: 10 }}>
          Quando cadastrar
        </span>
        <Segmento
          valor={custoQuando}
          aoTrocar={setCustoQuando}
          opcoes={[
            { valor: "AGORA", rotulo: "Vou cadastrar o custo agora" },
            { valor: "FINAL", rotulo: "Vou cadastrar no final" },
          ]}
        />
        {custoQuando === "AGORA" ? (
          <span className="campo-ajuda">
            Bota o valor agora, mesmo aproximado. No fim voce confirma o numero certo e a barra
            ajusta sozinha. E sempre melhor saber o custo antes.
          </span>
        ) : (
          <p className="produto-alerta">
            O custo entra so no fechamento e e descontado da meta ja publicada, entao a barra vai
            recuar na frente de quem acompanha. Funciona, mas o ideal de verdade e cadastrar o
            custo antes, nem que seja um valor aproximado. Deixe pro fim so se nao tiver mesmo como
            estimar. E ai nao esqueca de por o valor correto no fechamento.
          </p>
        )}

        {custoQuando === "AGORA" && (
          <>
            <span className="campo-rotulo" style={{ marginTop: 16 }}>
              Como e o custo
            </span>
            <Segmento
              valor={custoComo}
              aoTrocar={trocarCustoComo}
              opcoes={[
                { valor: "PRODUTO", rotulo: "Custo por produto" },
                { valor: "TOTAL", rotulo: "Custo total da acao" },
              ]}
            />
            <span className="campo-ajuda">
              {custoComo === "PRODUTO"
                ? "Cada unidade tem um custo. Ex: cada camiseta sai R$ 50 pra produzir. So vira custo quando vende, entao peca parada nao e prejuizo."
                : "Voce gastou um valor fechado no lote inteiro. Ex: R$ 1000. Quanto mais vender, menor o custo por peca, e o lucro pra causa so comeca depois de cobrir esse valor."}
            </span>

            <label className="campo" style={{ marginTop: 14, maxWidth: 260 }}>
              <span className="campo-rotulo">
                {custoComo === "PRODUTO" ? "Custo de cada unidade" : "Custo total do lote"}
              </span>
              <input
                className="campo-entrada"
                name="custoValor"
                inputMode="decimal"
                placeholder="0,00"
                value={custoValor}
                onChange={(e) => setCustoValor(e.target.value)}
              />
            </label>

            {pontoEquilibrio != null && (
              <p className="produto-equilibrio">
                Faltam <strong>{pontoEquilibrio}</strong>{" "}
                {pontoEquilibrio === 1 ? "peca" : "pecas"} pra cobrir o custo. Depois disso, cada
                venda e arrecadacao pura.
              </p>
            )}
          </>
        )}
      </div>

      {/* Variacoes, largura inteira. */}
      <div className="produto-bloco produto-largo">
        <span className="campo-rotulo">Variacoes</span>
        <span className="campo-ajuda" style={{ marginBottom: 14 }}>
          Menos e mais aqui. Cada tamanho, cor e modelagem a mais e mais coisa pra produzir,
          estocar e entregar. Comece pelo essencial, da pra crescer depois. Preencha so as
          dimensoes que voce usar. Mesma peca com estampa diferente e outro produto.
        </span>

        <div className="produto-dims">
          <label className="campo">
            <span className="campo-rotulo">Tamanho</span>
            <input
              className="campo-entrada"
              value={tamanhosTexto}
              onChange={(e) => setTamanhosTexto(e.target.value)}
              placeholder="P, M, G, GG"
            />
          </label>

          <div className="campo">
            <span className="campo-rotulo">Modelagem</span>
            <div className="produto-chips">
              {MODELAGENS.map((m) => {
                const ativo = modelagens.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    className={`produto-chip${ativo ? " ativo" : ""}`}
                    aria-pressed={ativo}
                    onClick={() =>
                      setModelagens((atual) =>
                        ativo ? atual.filter((x) => x !== m) : [...atual, m]
                      )
                    }
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="campo">
            <span className="campo-rotulo">Cor</span>
            <input
              className="campo-entrada"
              value={coresTexto}
              onChange={(e) => setCoresTexto(e.target.value)}
              placeholder="Preta, Branca"
            />
          </label>

          <label className="campo">
            <span className="campo-rotulo">Modelo</span>
            <input
              className="campo-entrada"
              value={modelosTexto}
              onChange={(e) => setModelosTexto(e.target.value)}
              placeholder="Camiseta, Regata"
            />
          </label>
        </div>

        {temVariacao && modo === "ENCOMENDA" && (
          <p className="produto-variacoes-resumo">
            {combinacoes.length === 1
              ? "1 variacao a produzir sob encomenda: "
              : `${combinacoes.length} variacoes a produzir sob encomenda: `}
            {combinacoes.map((c) => rotuloVariante(c)).join(", ")}.
          </p>
        )}
      </div>

      {/* Grade de estoque, so quando ja tenho pronto. */}
      {modo === "PRONTO" && (
        <div className="produto-bloco produto-largo">
          <span className="campo-rotulo">Grade de estoque</span>
          <span className="campo-ajuda" style={{ marginBottom: 14 }}>
            Preencha so as combinacoes que voce realmente tem. Quando uma zera, o sistema fecha
            aquela opcao sozinho e mantem o resto a venda.
          </span>

          {!temVariacao ? (
            <label className="campo" style={{ maxWidth: 260 }}>
              <span className="campo-rotulo">Quantidade em estoque</span>
              <input
                className="campo-entrada"
                inputMode="numeric"
                value={estoqueSimples}
                onChange={(e) => setEstoqueSimples(e.target.value)}
                placeholder="0"
              />
            </label>
          ) : (
            <>
              {blocos.map((bloco, bi) => {
                const rotuloBloco = blocoKeys.map((d) => bloco[d]).join(" ");
                return (
                  <div key={bi} className="produto-grade-bloco">
                    {rotuloBloco && <h4 className="produto-grade-titulo">{rotuloBloco}</h4>}
                    <div className="produto-grade-rolagem">
                      <table className="produto-grade">
                        {colunaKey && (
                          <thead>
                            <tr>
                              <th />
                              {colunas.map((c) => (
                                <th key={String(c)}>{c}</th>
                              ))}
                            </tr>
                          </thead>
                        )}
                        <tbody>
                          {linhas.map((linha) => (
                            <tr key={String(linha)}>
                              {linhaKey && <th scope="row">{linha}</th>}
                              {colunas.map((coluna) => {
                                const combo: Partial<Record<Dim, string>> = { ...bloco };
                                if (linhaKey && linha != null) combo[linhaKey] = linha;
                                if (colunaKey && coluna != null) combo[colunaKey] = coluna;
                                const sig = assinatura(combo);
                                return (
                                  <td key={String(coluna)}>
                                    <input
                                      className="produto-grade-celula"
                                      inputMode="numeric"
                                      aria-label={rotuloVariante(combo)}
                                      value={grade[sig] ?? ""}
                                      onChange={(e) =>
                                        setGrade((g) => ({ ...g, [sig]: e.target.value }))
                                      }
                                      placeholder="0"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
              <p className="produto-grade-total">Total em estoque: {totalEmEstoque}</p>
            </>
          )}
        </div>
      )}

      {/* Entrega e prazo, pareados. */}
      <div className="campo produto-bloco">
        <span className="campo-rotulo">
          Modo de entrega<em className="campo-obrigatorio">obrigatorio</em>
        </span>
        <Segmento
          valor={entrega}
          aoTrocar={setEntrega}
          opcoes={[
            { valor: "RETIRADA", rotulo: "Retirada combinada" },
            { valor: "CORREIO", rotulo: "Envio" },
          ]}
        />
        <span className="campo-ajuda">
          Como a peca chega em quem comprou. Retirada combinada e mais simples: voces marcam ponto
          e horario.
        </span>
      </div>

      <label className="campo produto-bloco">
        <span className="campo-rotulo">Prazo de producao ou entrega</span>
        <input
          className="campo-entrada"
          name="prazo"
          placeholder="Ate 15 dias apos o fechamento das vendas"
        />
        <span className="campo-ajuda">
          Prometa com folga. Melhor entregar antes do combinado do que pedir desculpa depois.
        </span>
      </label>

      {/* Fora do sistema, nao esquece. */}
      <aside className="receita-checklist produto-largo">
        <span className="receita-checklist-rotulo">Fora do sistema, nao esquece</span>
        <ul>
          <li>Fechar o preco com quem produz antes de publicar. Esse numero e o seu custo.</li>
          <li>Definir a data limite pra receber os PIX e nao travar a producao.</li>
          <li>Combinar quem cuida da entrega e como avisa quem comprou.</li>
        </ul>
      </aside>

      <div className="produto-pe produto-largo">
        <button className="botao botao-primario" type="submit">
          Criar produto
        </button>
        <span className="formulario-nota">
          Nasce como rascunho. So aparece na pagina quando voce publicar, entao da pra revisar com
          calma antes.
        </span>
      </div>
    </form>
  );
}

// A mesma reducao de imagem do CampoDeImagem: foto de celular vem com 4000px e
// varios MB, e mandar isso pro banco seria lento pra quem envia e pesado pra
// quem abre a pagina. Reduzida, fica na casa das centenas de KB.
const LADO_MAXIMO = 1600;
const QUALIDADE = 0.82;

async function reduzir(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const tela = document.createElement("canvas");
  tela.width = largura;
  tela.height = altura;
  const ctx = tela.getContext("2d");
  if (!ctx) throw new Error("Nao consegui processar a imagem.");
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  return new Promise((ok, falha) => {
    tela.toBlob(
      (b) => (b ? ok(b) : falha(new Error("Nao consegui processar a imagem."))),
      "image/jpeg",
      QUALIDADE
    );
  });
}
