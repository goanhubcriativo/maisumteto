"use client";

// O formulário do produto. UM só, usado nas duas horas: quando a pessoa cria e
// quando volta pra gerenciar.
//
// Ter dois formulários parecidos foi um erro: quem preencheu variações, custo e
// grade no cadastro voltava pra gerenciar e encontrava outra tela, com menos
// campos e outros nomes, sem saber onde mexer no que tinha acabado de escrever.
// Aqui os campos, os controles e a ordem são exatamente os mesmos; o que muda é
// só se ele vem vazio (criar) ou preenchido (gerenciar).
//
// A diferença entre os dois modos é uma só: criar caminha em duas etapas, pra
// não despejar a tela inteira de uma vez em quem nunca fez; gerenciar mostra
// tudo aberto, porque quem volta quer ir direto no campo que precisa mudar.

import { useRef, useState } from "react";
import { PALETA } from "@/lib/paleta";
import {
  ENTREGAS,
  type ValoresDoProduto,
  type ModoProducao,
  type CustoQuando,
  type CustoComo,
} from "@/lib/produto";
import EditorDeTexto from "@/components/EditorDeTexto";
import { Segmento, Interruptor, EditorDeChips } from "@/components/ControlesDeForm";

/** Mesma conta de paraCentavos, so pro calculo ao vivo do ponto de equilibrio. */
function emCentavos(entrada: string): number | null {
  const limpo = entrada.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  if (!limpo) return null;
  const n = Number(limpo);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

const MODELAGENS = ["Feminina", "Masculina", "Unissex"];
const ORDEM = ["tamanho", "modelagem", "cor", "modelo"] as const;
type Dim = (typeof ORDEM)[number];

export default function FormularioDoProduto({
  action,
  modo,
  valores,
  coresOcupadas = [],
}: {
  action: (dados: FormData) => void;
  modo: "criar" | "editar";
  valores: ValoresDoProduto;
  coresOcupadas?: string[];
}) {
  const criando = modo === "criar";
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [erroEtapa1, setErroEtapa1] = useState<string | null>(null);
  const [temHistoria, setTemHistoria] = useState(Boolean(valores.historia));

  const [meta, setMeta] = useState(valores.metaReais);
  const [corAcao, setCorAcao] = useState(valores.cor);
  const [palavraChave, setPalavraChave] = useState(valores.palavraChave);
  const [abreEm, setAbreEm] = useState(valores.abreEm);
  const [fechaEm, setFechaEm] = useState(valores.fechaEm);

  // Fotos: a primeira e a capa da acao, as outras entram na galeria da pagina.
  const [fotos, setFotos] = useState<string[]>(valores.fotos);
  const [enviando, setEnviando] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const entradaFoto = useRef<HTMLInputElement>(null);

  const [preco, setPreco] = useState(valores.precoReais);
  const [producao, setProducao] = useState<ModoProducao>(valores.modoProducao);
  const [custoQuando, setCustoQuando] = useState<CustoQuando>(valores.custoQuando);
  const [custoComo, setCustoComo] = useState<CustoComo>(valores.custoComo);
  const [custoComoTocado, setCustoComoTocado] = useState(!criando);
  const [custoValor, setCustoValor] = useState(valores.custoValorReais);

  const [dimAtiva, setDimAtiva] = useState<Record<Dim, boolean>>(valores.dimAtiva);
  const [tamanhos, setTamanhos] = useState<string[]>(valores.tamanhos);
  const [modelagens, setModelagens] = useState<string[]>(valores.modelagens);
  const [cores, setCores] = useState<string[]>(valores.cores);
  const [modelos, setModelos] = useState<string[]>(valores.modelos);
  const [grade, setGrade] = useState<Record<string, string>>(valores.grade);
  const [estoqueSimples, setEstoqueSimples] = useState(valores.estoqueSimples);

  const [entregas, setEntregas] = useState<Record<string, { ativo: boolean; texto: string }>>(() =>
    Object.fromEntries(
      ENTREGAS.map((e) => {
        const salva = valores.entregas.find((x) => x.tipo === e.tipo);
        return [e.tipo, { ativo: Boolean(salva), texto: salva?.texto ?? "" }];
      })
    )
  );

  const corForte = PALETA.find((c) => c.id === corAcao)?.forte ?? "#0092dd";

  function trocarProducao(novo: ModoProducao) {
    setProducao(novo);
    if (!custoComoTocado) setCustoComo(novo === "PRONTO" ? "TOTAL" : "PRODUTO");
  }
  function trocarCustoComo(novo: CustoComo) {
    setCustoComoTocado(true);
    setCustoComo(novo);
  }

  function avancar() {
    if (!temHistoria) {
      setErroEtapa1("Escreva a explicação da ação antes de seguir.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErroEtapa1(null);
    setEtapa(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
          setErroFoto(resposta.erro ?? "Não consegui enviar a foto.");
          break;
        }
        setFotos((f) => [...f, resposta.url]);
      }
    } catch {
      setErroFoto("Não consegui ler esse arquivo. Tente outra foto.");
    } finally {
      setEnviando(false);
      if (entradaFoto.current) entradaFoto.current.value = "";
    }
  }

  // Dimensoes ligadas viram o produto cartesiano: a lista de variantes.
  const valoresDim: Record<Dim, string[]> = {
    tamanho: dimAtiva.tamanho ? tamanhos : [],
    modelagem: dimAtiva.modelagem ? modelagens : [],
    cor: dimAtiva.cor ? cores : [],
    modelo: dimAtiva.modelo ? modelos : [],
  };
  const ligadas = ORDEM.filter((d) => valoresDim[d].length > 0);
  const temVariacao = ligadas.length > 0;

  function produtoDe(keys: Dim[]): Partial<Record<Dim, string>>[] {
    let acc: Partial<Record<Dim, string>>[] = [{}];
    for (const k of keys) acc = acc.flatMap((c) => valoresDim[k].map((v) => ({ ...c, [k]: v })));
    return acc;
  }
  const combinacoes = produtoDe(ligadas);
  const assinatura = (c: Partial<Record<Dim, string>>) => JSON.stringify(ligadas.map((d) => c[d]));
  const rotuloVariante = (c: Partial<Record<Dim, string>>) => ligadas.map((d) => c[d]).join(" ");

  const variantesPayload = temVariacao
    ? combinacoes
        .map((c) => {
          const nome = rotuloVariante(c);
          if (producao === "ENCOMENDA") return { nome, quantidade: null as number | null };
          const q = Math.max(0, Math.floor(Number(grade[assinatura(c)] || 0)));
          return { nome, quantidade: q };
        })
        .filter((v) => producao === "ENCOMENDA" || (v.quantidade ?? 0) > 0)
    : [];

  const totalEmEstoque = variantesPayload.reduce((s, v) => s + (v.quantidade ?? 0), 0);

  const precoC = emCentavos(preco);
  const custoC = emCentavos(custoValor);
  const pontoEquilibrio =
    custoComo === "TOTAL" && precoC && precoC > 0 && custoC && custoC > 0
      ? Math.ceil(custoC / precoC)
      : null;

  const linhaKey = ligadas.includes("tamanho") ? "tamanho" : null;
  const colunaKey = ligadas.includes("modelagem") ? "modelagem" : null;
  const blocoKeys = ligadas.filter((d) => d === "cor" || d === "modelo");
  const blocos = produtoDe(blocoKeys);
  const linhasGrade = linhaKey ? valoresDim[linhaKey] : [null];
  const colunasGrade = colunaKey ? valoresDim[colunaKey] : [null];

  const entregasPayload = ENTREGAS.filter((e) => entregas[e.tipo].ativo).map((e) => ({
    tipo: e.tipo,
    rotulo: e.rotulo,
    texto: entregas[e.tipo].texto.trim(),
  }));

  const custoDiferido = custoComo === "TOTAL" || custoQuando === "FINAL";

  // A estrutura das variacoes vai junto pro servidor. E o que permite a tela de
  // gerenciar renascer igualzinha: sem isso, so sobrariam os nomes das variantes
  // ja combinados ("P Feminina"), e nao daria pra saber que dimensoes existiam.
  const estruturaVariacoes = {
    dimAtiva,
    tamanhos,
    modelagens,
    cores,
    modelos,
    grade,
    estoqueSimples,
  };

  return (
    <form id="form-acao" action={action} className="produto-form">
      <input type="hidden" name="meta" value={meta} />
      <input type="hidden" name="cor" value={corAcao} />
      <input type="hidden" name="palavraChave" value={palavraChave} />
      <input type="hidden" name="abreEm" value={abreEm} />
      <input type="hidden" name="fechaEm" value={fechaEm} />
      <input type="hidden" name="modoProducao" value={producao} />
      <input type="hidden" name="custoQuando" value={custoQuando} />
      <input type="hidden" name="custoComo" value={custoComo} />
      <input type="hidden" name="capa" value={fotos[0] ?? ""} />
      <input type="hidden" name="fotos" value={JSON.stringify(fotos)} />
      <input type="hidden" name="variantes" value={JSON.stringify(variantesPayload)} />
      <input type="hidden" name="entregas" value={JSON.stringify(entregasPayload)} />
      <input type="hidden" name="variacoes" value={JSON.stringify(estruturaVariacoes)} />
      <input
        type="hidden"
        name="estoqueSimples"
        value={producao === "PRONTO" && !temVariacao ? estoqueSimples : ""}
      />

      {/* ======================= SOBRE A AÇÃO ======================= */}
      <div className="produto-etapa" hidden={criando && etapa !== 1}>
        <div className="produto-largo">
          <h2 className="formulario-secao">Sobre a ação</h2>
          <p className="produto-sub">
            Aqui você explica a motivação da ação. É o momento mais emocional. Mesmo que pareça
            óbvio ("estamos vendendo para arrecadar para a casa"), essa parte é pública: capriche
            na justificativa para convencer as pessoas a colaborarem.
          </p>
        </div>

        {erroEtapa1 && (
          <p className="aviso-ruim produto-largo" role="alert">
            {erroEtapa1}
          </p>
        )}

        <label className="campo produto-largo">
          <span className="campo-rotulo">
            Nome da campanha<em className="campo-obrigatorio">obrigatório</em>
          </span>
          <input
            className="campo-entrada"
            name="nomeCampanha"
            required={!criando || etapa === 1}
            defaultValue={valores.titulo}
            placeholder="Colecionáveis da CC2612"
          />
          <span className="campo-ajuda">
            É o que aparece grande no alto da página, junto com a explicação. Não é o nome da
            peça: esse vem depois, na parte do produto.
          </span>
        </label>

        <div className="campo produto-largo">
          <span className="campo-rotulo">
            Explique a ação<em className="campo-obrigatorio">obrigatório</em>
          </span>
          <EditorDeTexto
            nome="historia"
            valorInicial={valores.historia}
            corDaAcao={corForte}
            rows={5}
            aoMudar={setTemHistoria}
          />
        </div>

        <div className="campo-dupla produto-largo">
          <label className="campo">
            <span className="campo-rotulo">Início das vendas</span>
            <input
              className="campo-entrada"
              type="date"
              value={abreEm}
              onChange={(e) => setAbreEm(e.target.value)}
            />
            <span className="campo-ajuda">Vazio: já começa assim que você publicar.</span>
          </label>
          <label className="campo">
            <span className="campo-rotulo">Fim das vendas</span>
            <input
              className="campo-entrada"
              type="date"
              value={fechaEm}
              onChange={(e) => setFechaEm(e.target.value)}
            />
            <span className="campo-ajuda">Vazio: fica no ar até a campanha acabar.</span>
          </label>
        </div>

        <fieldset className="campo escolha-cor produto-largo">
          <legend className="campo-rotulo">Cor da ação</legend>
          <span className="campo-ajuda" style={{ marginTop: 0, marginBottom: 10 }}>
            Pinta o cartão desta ação e a fatia dela no gráfico da campanha. É o que deixa claro,
            de bater o olho, de onde veio cada parte do dinheiro.
          </span>
          <div className="cores">
            {PALETA.map((c) => (
              <label key={c.id} className="cor" title={c.nome}>
                <input
                  type="radio"
                  name="corVisual"
                  checked={corAcao === c.id}
                  onChange={() => setCorAcao(c.id)}
                />
                <span className="cor-bolha" style={{ background: c.marca ?? c.forte }} />
                <span className="cor-nome">{c.nome}</span>
              </label>
            ))}
          </div>
          {coresOcupadas.includes(corAcao) && (
            <p className="cor-aviso">
              Outra ação já usa esta cor. No gráfico da campanha as duas ficam com a mesma fatia, e
              aí a cor deixa de dizer de onde veio o dinheiro.
            </p>
          )}
        </fieldset>

        <label className="campo produto-largo">
          <span className="campo-rotulo">Palavra-chave</span>
          <input
            className="campo-entrada"
            maxLength={30}
            value={palavraChave}
            onChange={(e) => setPalavraChave(e.target.value)}
            placeholder="PRODUTO"
          />
          <span className="campo-ajuda">
            É o texto que corre na faixa do cartão. Até 30 caracteres. Em branco, fica PRODUTO.
          </span>
        </label>

        <label className="campo produto-largo">
          <span className="campo-rotulo">Meta da ação</span>
          <input
            className="campo-entrada"
            inputMode="decimal"
            value={meta}
            onChange={(e) => setMeta(e.target.value)}
            placeholder="0,00"
          />
          <span className="campo-ajuda">
            É a meta de arrecadação. Pode colocar à vontade, não precisa ser a soma exata do lucro
            de quantas você quer vender: a cada venda as pessoas têm a opção de dar uma ajudinha
            extra. Mas lembre que só o lucro entra na meta. Se o produto é R$ 50 e o custo é R$ 25,
            cada venda sobe R$ 25 na meta.
          </span>
        </label>

        {criando && (
          <div className="produto-pe produto-largo">
            <button type="button" className="botao botao-primario" onClick={avancar}>
              Cadastrar produto
            </button>
            <span className="formulario-nota">
              Agora vem o produto em si: fotos, preço e entrega.
            </span>
          </div>
        )}
      </div>

      {/* ========================= O PRODUTO ======================== */}
      <div className="produto-etapa" hidden={criando && etapa !== 2}>
        <div className="produto-largo">
          <h2 className="formulario-secao">O produto</h2>
        </div>

        <div className="produto-largo">
          <span className="campo-rotulo">
            Fotos do produto<em className="campo-obrigatorio">obrigatório</em>
          </span>
          <span className="campo-ajuda" style={{ marginBottom: 12 }}>
            Foto boa vende. Use luz natural, fundo limpo e mostre a peça de perto. A primeira é a
            capa.
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

        <label className="campo produto-largo">
          <span className="campo-rotulo">
            Nome do produto<em className="campo-obrigatorio">obrigatório</em>
          </span>
          <input
            className="campo-entrada"
            name="nomeProduto"
            required={!criando || etapa === 2}
            defaultValue={valores.nomeDoProduto}
            placeholder="Chaveiro Trena 3D"
          />
          <span className="campo-ajuda">
            É o que aparece ao lado da foto, na vitrine. Nome concreto vende mais que genérico.
          </span>
        </label>

        <div className="campo produto-largo">
          <span className="campo-rotulo">Descrição</span>
          <EditorDeTexto
            nome="descricao"
            valorInicial={valores.descricao}
            corDaAcao={corForte}
            rows={4}
            placeholder="Momento vendedor: explique a peça para quem vai comprar, dê detalhes, fale sobre os diferenciais."
          />
        </div>

        <label className="campo">
          <span className="campo-rotulo">Preço de venda</span>
          <input
            className="campo-entrada"
            name="preco"
            inputMode="decimal"
            placeholder="0,00"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
          />
          <span className="campo-ajuda">
            Quanto a pessoa paga por uma peça. Em branco só se quem compra é que define o valor.
          </span>
        </label>

        <div className="campo">
          <span className="campo-rotulo">
            Modo de produção<em className="campo-obrigatorio">obrigatório</em>
          </span>
          <Segmento
            valor={producao}
            aoTrocar={trocarProducao}
            opcoes={[
              { valor: "ENCOMENDA" as ModoProducao, rotulo: "Sob encomenda" },
              { valor: "PRONTO" as ModoProducao, rotulo: "Já tenho pronto" },
            ]}
          />
          <span className="campo-ajuda">
            Sob encomenda você só produz o que vender: rende menos por peça, mas ninguém fica com
            20 camisas encalhadas. "Já tenho pronto" é pra quando o estoque já existe.
          </span>
        </div>

        <div className="produto-largo produto-custo">
          <h3 className="produto-custo-titulo">Custo</h3>
          <p className="produto-sub">
            Fica entre você e o sistema. Quem compra nunca vê o custo nem o lucro: o número que
            aparece pra causa já é o líquido.
          </p>

          <span className="campo-rotulo" style={{ marginTop: 10 }}>
            Quando cadastrar
          </span>
          <Segmento
            valor={custoQuando}
            aoTrocar={setCustoQuando}
            opcoes={[
              { valor: "AGORA" as CustoQuando, rotulo: "Vou cadastrar agora" },
              { valor: "FINAL" as CustoQuando, rotulo: "Vou cadastrar no final" },
            ]}
          />
          {custoQuando === "AGORA" ? (
            <span className="campo-ajuda">
              Recomendamos cadastrar agora, mesmo que seja um valor aproximado.
            </span>
          ) : (
            <span className="campo-ajuda">
              Você informa o custo só no fechamento. Dá pra fazer, mas o ideal é cadastrar agora,
              nem que seja um valor por alto.
            </span>
          )}

          {custoQuando === "AGORA" && (
            <>
              <span className="campo-rotulo" style={{ marginTop: 16 }}>
                Como é o custo
              </span>
              <Segmento
                valor={custoComo}
                aoTrocar={trocarCustoComo}
                opcoes={[
                  { valor: "PRODUTO" as CustoComo, rotulo: "Custo por produto" },
                  { valor: "TOTAL" as CustoComo, rotulo: "Custo total da ação" },
                ]}
              />
              <span className="campo-ajuda">
                {custoComo === "PRODUTO"
                  ? "Exemplo: cada camiseta vai custar R$ 40 para produzir."
                  : "Exemplo: comprei 30 bombons por R$ 300. No fim da ação, é descontado o custo do que foi vendido."}
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
                  {pontoEquilibrio === 1 ? "peça" : "peças"} para cobrir o custo. Depois disso, cada
                  venda é arrecadação pura.
                </p>
              )}
            </>
          )}

          {custoDiferido && (
            <p className="produto-alerta">
              Esse custo não entra durante a campanha: a ação não pode começar no vermelho, e cada
              venda precisa fazer a barra subir. O valor é descontado só no fim, sobre o que foi
              vendido. É assim também quando você deixa pra cadastrar no final.
            </p>
          )}
        </div>

        <div className="produto-largo">
          <span className="campo-rotulo">Variações</span>
          <span className="campo-ajuda" style={{ marginBottom: 14 }}>
            Menos é mais aqui. Cada tamanho, cor e modelagem a mais é mais coisa pra produzir,
            estocar e entregar. Ligue só as que você usar. Mesma peça com estampa diferente é outro
            produto.
          </span>

          <div className="produto-dims">
            <div className="produto-dim">
              <div className="produto-dim-cabeca">
                <span className="campo-rotulo">Tamanho</span>
                <Interruptor
                  ligado={dimAtiva.tamanho}
                  aoTrocar={(v) => setDimAtiva((d) => ({ ...d, tamanho: v }))}
                />
              </div>
              {dimAtiva.tamanho && (
                <EditorDeChips
                  valores={tamanhos}
                  aoTrocar={setTamanhos}
                  placeholder="Digite um tamanho e toque em adicionar"
                  sugestoes={["P", "M", "G", "GG"]}
                />
              )}
            </div>

            <div className="produto-dim">
              <div className="produto-dim-cabeca">
                <span className="campo-rotulo">Modelagem</span>
                <Interruptor
                  ligado={dimAtiva.modelagem}
                  aoTrocar={(v) => setDimAtiva((d) => ({ ...d, modelagem: v }))}
                />
              </div>
              {dimAtiva.modelagem && (
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
              )}
            </div>

            <div className="produto-dim">
              <div className="produto-dim-cabeca">
                <span className="campo-rotulo">Cor</span>
                <Interruptor
                  ligado={dimAtiva.cor}
                  aoTrocar={(v) => setDimAtiva((d) => ({ ...d, cor: v }))}
                />
              </div>
              {dimAtiva.cor && (
                <EditorDeChips
                  valores={cores}
                  aoTrocar={setCores}
                  placeholder="Digite uma cor e toque em adicionar"
                />
              )}
            </div>

            <div className="produto-dim">
              <div className="produto-dim-cabeca">
                <span className="campo-rotulo">Modelo</span>
                <Interruptor
                  ligado={dimAtiva.modelo}
                  aoTrocar={(v) => setDimAtiva((d) => ({ ...d, modelo: v }))}
                />
              </div>
              {dimAtiva.modelo && (
                <EditorDeChips
                  valores={modelos}
                  aoTrocar={setModelos}
                  placeholder="Digite um modelo e toque em adicionar"
                />
              )}
            </div>
          </div>

          {temVariacao && producao === "ENCOMENDA" && (
            <p className="produto-variacoes-resumo">
              {combinacoes.length === 1
                ? "1 variação a produzir sob encomenda: "
                : `${combinacoes.length} variações a produzir sob encomenda: `}
              {combinacoes.map((c) => rotuloVariante(c)).join(", ")}.
            </p>
          )}
        </div>

        {producao === "PRONTO" && (
          <div className="produto-largo">
            <span className="campo-rotulo">Grade de estoque</span>
            <span className="campo-ajuda" style={{ marginBottom: 14 }}>
              Preencha só as combinações que você realmente tem. Quando uma zera, o sistema fecha
              aquela opção sozinho e mantém o resto à venda.
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
                                {colunasGrade.map((c) => (
                                  <th key={String(c)}>{c}</th>
                                ))}
                              </tr>
                            </thead>
                          )}
                          <tbody>
                            {linhasGrade.map((linha) => (
                              <tr key={String(linha)}>
                                {linhaKey && <th scope="row">{linha}</th>}
                                {colunasGrade.map((coluna) => {
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

        <div className="produto-largo">
          <span className="campo-rotulo">Como a peça chega em quem comprou</span>
          <span className="campo-ajuda" style={{ marginBottom: 14 }}>
            Ligue as formas que você oferece e explique cada uma. Quem compra escolhe entre elas.
          </span>

          <div className="produto-entregas">
            {ENTREGAS.map((e) => {
              const estado = entregas[e.tipo];
              return (
                <div key={e.tipo} className="produto-entrega">
                  <div className="produto-entrega-cabeca">
                    <span className="produto-entrega-nome">{e.rotulo}</span>
                    <Interruptor
                      ligado={estado.ativo}
                      aoTrocar={(v) =>
                        setEntregas((atual) => ({
                          ...atual,
                          [e.tipo]: { ...atual[e.tipo], ativo: v },
                        }))
                      }
                    />
                  </div>
                  {estado.ativo && (
                    <textarea
                      className="campo-entrada"
                      rows={2}
                      value={estado.texto}
                      onChange={(ev) =>
                        setEntregas((atual) => ({
                          ...atual,
                          [e.tipo]: { ...atual[e.tipo], texto: ev.target.value },
                        }))
                      }
                      placeholder={e.ajuda}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <label className="campo produto-largo">
          <span className="campo-rotulo">Prazo de produção ou entrega</span>
          <input
            className="campo-entrada"
            name="prazo"
            defaultValue={valores.prazo}
            placeholder="Até 15 dias após o fechamento das vendas"
          />
          <span className="campo-ajuda">
            Prometa com folga. Melhor entregar antes do combinado do que pedir desculpa depois.
          </span>
        </label>

        <aside className="receita-checklist produto-largo">
          <span className="receita-checklist-rotulo">Fora do sistema, não esqueça</span>
          <ul>
            <li>Fechar o preço com quem produz antes de publicar. Esse número é o seu custo.</li>
            <li>Definir a data limite pra receber os PIX e não travar a produção.</li>
            <li>Combinar quem cuida da entrega e como avisa quem comprou.</li>
          </ul>
        </aside>

        <div className="produto-pe produto-largo">
          {criando && (
            <button type="button" className="botao botao-contorno" onClick={() => setEtapa(1)}>
              Voltar
            </button>
          )}
          <button className="botao botao-primario" type="submit">
            {criando ? "Criar produto" : "Salvar ação"}
          </button>
          {criando && (
            <span className="formulario-nota">
              Nasce como rascunho. Só aparece na página quando você publicar.
            </span>
          )}
        </div>
      </div>
    </form>
  );
}

// A mesma redução de imagem do CampoDeImagem: foto de celular vem com 4000px e
// vários MB, e mandar isso pro banco seria lento pra quem envia e pesado pra
// quem abre a página. Reduzida, fica na casa das centenas de KB.
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
  if (!ctx) throw new Error("Não consegui processar a imagem.");
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  return new Promise((ok, falha) => {
    tela.toBlob(
      (b) => (b ? ok(b) : falha(new Error("Não consegui processar a imagem."))),
      "image/jpeg",
      QUALIDADE
    );
  });
}
