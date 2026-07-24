"use client";

// O formulário do evento. UM só, pra criar e pra gerenciar, com a MESMA cara do
// produto (reusa as classes produto-*), pra caixa de ferramentas ficar coesa.
//
// O que muda do produto é a lógica do evento: data, local e o que está incluído
// no lugar de fotos; tipos de INGRESSO (a pessoa escolhe um) e EXTRAS (soma
// vários) no lugar de variações; e o custo dividido em fixo (o salão, adiado pro
// fechamento) e por pessoa (comida e bebida, que anda com cada ingresso).

import { useState } from "react";
import { PALETA } from "@/lib/paleta";
import type { ValoresDoEvento, EntradaDeEvento } from "@/lib/evento";
import EditorDeTexto from "@/components/EditorDeTexto";
import { Segmento, Interruptor } from "@/components/ControlesDeForm";

function emCentavos(entrada: string): number | null {
  const limpo = entrada.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  if (!limpo) return null;
  const n = Number(limpo);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/** Uma lista de linhas (ingressos ou extras): nome, preço, vagas. */
function EditorDeEntradas({
  entradas,
  aoTrocar,
  rotuloVagas = "Vagas",
  exemplos,
}: {
  entradas: EntradaDeEvento[];
  aoTrocar: (v: EntradaDeEvento[]) => void;
  rotuloVagas?: string;
  exemplos: { nome: string; preco: string };
}) {
  function troca(i: number, campo: keyof EntradaDeEvento, valor: string) {
    aoTrocar(entradas.map((e, j) => (j === i ? { ...e, [campo]: valor } : e)));
  }
  return (
    <div className="evento-lotes">
      {entradas.map((l, i) => (
        <div key={i} className="evento-lote">
          <label className="campo">
            <span className="campo-rotulo">Nome</span>
            <input
              className="campo-entrada"
              value={l.nome}
              onChange={(e) => troca(i, "nome", e.target.value)}
              placeholder={exemplos.nome}
            />
          </label>
          <label className="campo">
            <span className="campo-rotulo">Preço</span>
            <input
              className="campo-entrada"
              inputMode="decimal"
              value={l.precoReais}
              onChange={(e) => troca(i, "precoReais", e.target.value)}
              placeholder={exemplos.preco}
            />
          </label>
          <label className="campo">
            <span className="campo-rotulo">{rotuloVagas}</span>
            <input
              className="campo-entrada"
              inputMode="numeric"
              value={l.vagas}
              onChange={(e) => troca(i, "vagas", e.target.value)}
              placeholder="livre"
            />
          </label>
          {entradas.length > 1 && (
            <button
              type="button"
              className="evento-lote-tira"
              onClick={() => aoTrocar(entradas.filter((_, j) => j !== i))}
              title="Remover"
            >
              Remover
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        className="botao botao-contorno botao-pequeno"
        onClick={() => aoTrocar([...entradas, { nome: "", precoReais: "", vagas: "" }])}
      >
        Adicionar
      </button>
    </div>
  );
}

export default function FormularioDoEvento({
  action,
  modo,
  valores,
  coresOcupadas = [],
}: {
  action: (dados: FormData) => void;
  modo: "criar" | "editar";
  valores: ValoresDoEvento;
  coresOcupadas?: string[];
}) {
  const criando = modo === "criar";
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [erroEtapa1, setErroEtapa1] = useState<string | null>(null);
  const [temHistoria, setTemHistoria] = useState(Boolean(valores.historia));

  const [meta, setMeta] = useState(valores.metaReais);
  const [corAcao, setCorAcao] = useState(valores.cor);
  const [coresProprias, setCoresProprias] = useState(valores.coresProprias);
  const [corPrincipal, setCorPrincipal] = useState(valores.corPrincipal);
  const [corTopo, setCorTopo] = useState(valores.corTopo);
  const [palavraChave, setPalavraChave] = useState(valores.palavraChave);
  const [cardTitulo, setCardTitulo] = useState(valores.cardTitulo);
  const [cardDescricao, setCardDescricao] = useState(valores.cardDescricao);
  const [abreEm, setAbreEm] = useState(valores.abreEm);
  const [fechaEm, setFechaEm] = useState(valores.fechaEm);

  const [quando, setQuando] = useState(valores.quando);
  const [onde, setOnde] = useState(valores.onde);

  const [ingressos, setIngressos] = useState<EntradaDeEvento[]>(
    valores.ingressos.length ? valores.ingressos : [{ nome: "", precoReais: "", vagas: "" }]
  );
  const [temExtras, setTemExtras] = useState(valores.temExtras);
  const [extras, setExtras] = useState<EntradaDeEvento[]>(
    valores.extras.length ? valores.extras : [{ nome: "", precoReais: "", vagas: "" }]
  );

  const [custoFixo, setCustoFixo] = useState(valores.custoFixoReais);
  const [custoPorPessoa, setCustoPorPessoa] = useState(valores.custoPorPessoaReais);

  const corForte = coresProprias
    ? corPrincipal
    : PALETA.find((c) => c.id === corAcao)?.forte ?? "#0092dd";

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

  const soValidas = (lista: EntradaDeEvento[]) =>
    lista
      .filter((l) => l.nome.trim() && emCentavos(l.precoReais) != null)
      .map((l) => ({ nome: l.nome.trim(), precoReais: l.precoReais, vagas: l.vagas.trim() }));

  const ingressosPayload = soValidas(ingressos);
  const extrasPayload = temExtras ? soValidas(extras) : [];

  // Ponto de equilíbrio: quantos ingressos pagam o custo fixo (o salão). Usa o
  // preço do primeiro ingresso, menos o custo por pessoa.
  const precoBase = emCentavos(ingressos[0]?.precoReais ?? "");
  const fixoC = emCentavos(custoFixo);
  const porPessoaC = emCentavos(custoPorPessoa) ?? 0;
  const margem = (precoBase ?? 0) - porPessoaC;
  const pontoEquilibrio = fixoC && fixoC > 0 && margem > 0 ? Math.ceil(fixoC / margem) : null;

  return (
    <form id="form-acao" action={action} className="produto-form">
      <input type="hidden" name="meta" value={meta} />
      <input type="hidden" name="cor" value={corAcao} />
      <input type="hidden" name="coresProprias" value={coresProprias ? "1" : ""} />
      <input type="hidden" name="corPrincipal" value={coresProprias ? corPrincipal : ""} />
      <input type="hidden" name="corTopo" value={coresProprias ? corTopo : ""} />
      <input type="hidden" name="palavraChave" value={palavraChave} />
      <input type="hidden" name="cardTitulo" value={cardTitulo} />
      <input type="hidden" name="cardDescricao" value={cardDescricao} />
      <input type="hidden" name="abreEm" value={abreEm} />
      <input type="hidden" name="fechaEm" value={fechaEm} />
      <input type="hidden" name="quando" value={quando} />
      <input type="hidden" name="onde" value={onde} />
      <input type="hidden" name="ingressos" value={JSON.stringify(ingressosPayload)} />
      <input type="hidden" name="temExtras" value={temExtras ? "1" : ""} />
      <input type="hidden" name="extras" value={JSON.stringify(extrasPayload)} />

      {/* ======================= SOBRE A AÇÃO ======================= */}
      <div className="produto-etapa" hidden={criando && etapa !== 1}>
        <div className="produto-largo">
          <h2 className="formulario-secao">Sobre a ação</h2>
          <p className="produto-sub">
            Por que esse evento acontece e pra onde vai o dinheiro. É o momento de convencer quem
            está em cima do muro a garantir o ingresso.
          </p>
        </div>

        {erroEtapa1 && (
          <p className="aviso-ruim produto-largo" role="alert">
            {erroEtapa1}
          </p>
        )}

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
          <Segmento
            valor={coresProprias ? "PROPRIAS" : "PALETA"}
            aoTrocar={(v) => setCoresProprias(v === "PROPRIAS")}
            opcoes={[
              { valor: "PALETA", rotulo: "Paleta da plataforma" },
              { valor: "PROPRIAS", rotulo: "Cores próprias" },
            ]}
          />
          {!coresProprias ? (
            <>
              <div className="cores" style={{ marginTop: 14 }}>
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
                  Outra ação já usa esta cor. No gráfico da campanha as duas ficam com a mesma
                  fatia.
                </p>
              )}
            </>
          ) : (
            <div className="cores-proprias">
              <div className="cor-campo">
                <label className="cor-campo-cabeca">
                  <span className="cor-bolha" style={{ background: corPrincipal }} />
                  <span>
                    <strong>Cor principal</strong>
                    <em>botões, preço, barra e detalhes</em>
                  </span>
                  <input
                    type="color"
                    value={corPrincipal}
                    onChange={(e) => setCorPrincipal(e.target.value)}
                  />
                </label>
              </div>
              <div className="cor-campo">
                <label className="cor-campo-cabeca">
                  <span className="cor-bolha" style={{ background: corTopo }} />
                  <span>
                    <strong>Cor do topo</strong>
                    <em>o fundo do alto da página</em>
                  </span>
                  <input type="color" value={corTopo} onChange={(e) => setCorTopo(e.target.value)} />
                </label>
              </div>
              <div
                className="cores-previa"
                style={{ background: `linear-gradient(140deg, ${corPrincipal}, ${corTopo})` }}
              >
                <span style={{ color: "#fff" }}>Assim fica o alto da página</span>
              </div>
            </div>
          )}
        </fieldset>

        <div className="produto-largo produto-card">
          <h3 className="produto-custo-titulo">Card na home</h3>
          <p className="produto-sub">
            É o quadrinho deste evento na página, junto das outras formas de ajudar.
          </p>
          <label className="campo">
            <span className="campo-rotulo">Título da faixa</span>
            <input
              className="campo-entrada"
              maxLength={30}
              value={palavraChave}
              onChange={(e) => setPalavraChave(e.target.value)}
              placeholder="EVENTO"
            />
            <span className="campo-ajuda">Corre na fita do card. Até 30. Em branco, fica EVENTO.</span>
          </label>
          <label className="campo">
            <span className="campo-rotulo">Título da chamada</span>
            <input
              className="campo-entrada"
              value={cardTitulo}
              onChange={(e) => setCardTitulo(e.target.value)}
              placeholder="Jantar beneficente"
            />
            <span className="campo-ajuda">O título grande do card. Em branco, usa o nome do evento.</span>
          </label>
          <label className="campo">
            <span className="campo-rotulo">
              Descrição do card<em className="produto-contador">{cardDescricao.length}/160</em>
            </span>
            <textarea
              className="campo-entrada"
              rows={2}
              maxLength={160}
              value={cardDescricao}
              onChange={(e) => setCardDescricao(e.target.value)}
              placeholder="Uma frase curta que faz a pessoa querer garantir o ingresso."
            />
          </label>
        </div>

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
            É a meta de arrecadação. Só o lucro entra: o custo do salão e da comida sai antes.
          </span>
        </label>

        {criando && (
          <div className="produto-pe produto-largo">
            <button type="button" className="botao botao-primario" onClick={avancar}>
              Configurar o evento
            </button>
            <span className="formulario-nota">Agora o evento: data, local, ingressos e custo.</span>
          </div>
        )}
      </div>

      {/* ========================= O EVENTO ======================== */}
      <div className="produto-etapa" hidden={criando && etapa !== 2}>
        <div className="produto-largo">
          <h2 className="formulario-secao">O evento</h2>
        </div>

        <label className="campo produto-largo">
          <span className="campo-rotulo">
            Nome do evento<em className="campo-obrigatorio">obrigatório</em>
          </span>
          <input
            className="campo-entrada"
            name="nome"
            required={!criando || etapa === 2}
            defaultValue={valores.titulo}
            placeholder="Jantar beneficente da Casa Amiga"
          />
        </label>

        <div className="campo produto-largo">
          <span className="campo-rotulo">Descrição</span>
          <EditorDeTexto
            nome="descricao"
            valorInicial={valores.descricao}
            corDaAcao={corForte}
            rows={4}
            placeholder="Como vai ser a noite, o clima, o que esperar."
          />
        </div>

        <label className="campo">
          <span className="campo-rotulo">Data e hora</span>
          <input
            className="campo-entrada"
            type="datetime-local"
            value={quando}
            onChange={(e) => setQuando(e.target.value)}
          />
        </label>

        <label className="campo">
          <span className="campo-rotulo">Local</span>
          <input
            className="campo-entrada"
            value={onde}
            onChange={(e) => setOnde(e.target.value)}
            placeholder="Salão da paróquia São José, Centro"
          />
        </label>

        <div className="campo produto-largo">
          <span className="campo-rotulo">O que está incluído</span>
          <EditorDeTexto
            nome="incluso"
            valorInicial={valores.incluso}
            corDaAcao={corForte}
            rows={3}
            placeholder="Prato principal, sobremesa e uma bebida. Estacionamento no local."
          />
        </div>

        {/* Ingressos: escolhe um */}
        <div className="produto-largo">
          <span className="campo-rotulo">Tipos de ingresso</span>
          <span className="campo-ajuda" style={{ marginBottom: 12 }}>
            A pessoa escolhe um. Pode ser um só ("Ingresso"), tipos diferentes ("Jantar", "Jantar +
            bebida") ou lotes com preços diferentes ("1º lote", "2º lote"). Cada um com preço e
            quantas vagas.
          </span>
          <EditorDeEntradas
            entradas={ingressos}
            aoTrocar={setIngressos}
            exemplos={{ nome: "Jantar", preco: "50,00" }}
          />
        </div>

        {/* Extras: soma vários */}
        <div className="produto-largo">
          <div className="produto-dim-cabeca">
            <span className="campo-rotulo">Extras e adicionais</span>
            <Interruptor ligado={temExtras} aoTrocar={setTemExtras} />
          </div>
          <span className="campo-ajuda" style={{ marginBottom: 12 }}>
            Coisas que a pessoa soma por cima do ingresso, cada uma com quantidade: uma garrafa de
            vinho, uma sobremesa, cartelas de bingo. Ligue se o evento tiver.
          </span>
          {temExtras && (
            <EditorDeEntradas
              entradas={extras}
              aoTrocar={setExtras}
              rotuloVagas="Limite"
              exemplos={{ nome: "Garrafa de vinho", preco: "60,00" }}
            />
          )}
        </div>

        {/* Custo */}
        <div className="produto-largo produto-custo">
          <h3 className="produto-custo-titulo">Custo</h3>
          <p className="produto-sub">
            Fica entre você e o sistema. O número que aparece pra causa já é o líquido.
          </p>

          <div className="campo-dupla" style={{ marginTop: 12 }}>
            <label className="campo">
              <span className="campo-rotulo">Custo fixo do evento</span>
              <input
                className="campo-entrada"
                name="custoFixo"
                inputMode="decimal"
                value={custoFixo}
                onChange={(e) => setCustoFixo(e.target.value)}
                placeholder="0,00"
              />
              <span className="campo-ajuda">
                Salão, som, decoração: o que você paga mesmo vendendo pouco.
              </span>
            </label>
            <label className="campo">
              <span className="campo-rotulo">Custo por pessoa</span>
              <input
                className="campo-entrada"
                name="custoPorPessoa"
                inputMode="decimal"
                value={custoPorPessoa}
                onChange={(e) => setCustoPorPessoa(e.target.value)}
                placeholder="0,00"
              />
              <span className="campo-ajuda">
                Comida e bebida de cada convidado. Só conta por quem veio.
              </span>
            </label>
          </div>

          {pontoEquilibrio != null && (
            <p className="produto-equilibrio">
              Faltam <strong>{pontoEquilibrio}</strong>{" "}
              {pontoEquilibrio === 1 ? "ingresso" : "ingressos"} pra pagar o salão. Depois disso, o
              evento começa a render.
            </p>
          )}

          {fixoC != null && fixoC > 0 && (
            <p className="produto-alerta">
              O custo fixo não entra durante a campanha: a barra não começa no vermelho. Ele é
              descontado no fechamento, quando você confirma o valor. O custo por pessoa, esse, sai
              a cada ingresso vendido.
            </p>
          )}
        </div>

        <aside className="receita-checklist produto-largo">
          <span className="receita-checklist-rotulo">Fora do sistema, não esqueça</span>
          <ul>
            <li>Reservar o local e assinar o que precisar antes de abrir a venda.</li>
            <li>Fechar o cardápio ou a programação com quem vai executar.</li>
            <li>Definir quem recebe na porta e confere os ingressos.</li>
          </ul>
        </aside>

        <div className="produto-pe produto-largo">
          {criando && (
            <button type="button" className="botao botao-contorno" onClick={() => setEtapa(1)}>
              Voltar
            </button>
          )}
          <button className="botao botao-primario" type="submit">
            {criando ? "Criar evento" : "Salvar ação"}
          </button>
          {criando && (
            <span className="formulario-nota">Nasce como rascunho. Só aparece quando você publicar.</span>
          )}
        </div>
      </div>
    </form>
  );
}
