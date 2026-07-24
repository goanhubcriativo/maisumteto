"use client";

// O formulário que transforma vontade em PIX.
//
// Pede o mínimo: valor (ou quantidade), nome, WhatsApp e CPF. Nada de cadastro,
// nada de senha. Cada campo a mais aqui é gente que desiste no meio.
//
// O CPF é o único que não dá para evitar: o Mercado Pago exige o CPF do pagador
// para gerar cobrança PIX. Por isso a tela explica o porquê, em vez de só pedir.
//
// Estilo PRÓPRIO (classes .ap-*), e não as do painel. As do painel vivem em
// painel.css, que só é carregado na área logada: usá-las aqui deixava o
// formulário sem estilo nenhum para quem doa, que é justamente quem não pode
// tropeçar.

import { useRef, useState } from "react";
import EscolherNumeros from "@/components/EscolherNumeros";
import { useRouter } from "next/navigation";

export interface OpcaoDoForm {
  id: string;
  nome: string;
  precoCentavos: number;
  restante: number | null;
  esgotada: boolean;
}

interface Props {
  acaoId: string;
  /** Tipo da acao. Muda o que o formulario pergunta. */
  tipo: string;
  /** Nulo = valor livre (a pessoa escolhe quanto). */
  precoCentavos: number | null;
  /** Quantas unidades ainda existem. Nulo = sem limite. */
  restante: number | null;
  /** Quantos numeros a rifa tem no total. Liga a grade de escolha. */
  estoqueTotal?: number | null;
  limitePorPedido?: number | null;
  /** Opções de venda (lote do ingresso, tamanho da camisa). Vazio se não tem. */
  opcoes?: OpcaoDoForm[];
  /** Botões de atalho para doação, em reais. */
  valoresSugeridos?: number[];
  corForte: string;
  /**
   * Arrumação de loja (produto): a foto, o nome e a descrição vêm de fora, e o
   * formulário se organiza em volta deles. Ausente, usa a arrumação de sempre.
   */
  loja?: {
    fotos: string[];
    nome: string;
    descricao?: React.ReactNode;
  };
  /**
   * As dimensões da variação (Tamanho, Modelagem, Cor, Modelo) com os valores
   * de cada uma. Existindo, a escolha vira um seletor POR DIMENSÃO, como em
   * loja: "Tamanho: P M G", "Modelagem: Feminina Masculina". Sem isso, cairia
   * na lista de combinações prontas ("P Feminina", "P Masculina"...), que
   * cresce rápido e não é como as lojas fazem.
   *
   * O nome de cada opção é a junção dos valores escolhidos, na ordem daqui, e
   * é assim que a combinação encontra a opção de venda correspondente.
   */
  dimensoes?: { chave: string; rotulo: string; valores: string[] }[];
}

function formatar(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Como chamar "o que a pessoa está levando", pro texto do valor extra. */
function rotuloDoItem(tipo: string): string {
  return (
    {
      RIFA: "número",
      BINGO: "cartela",
      PRODUTO: "pedido",
      EVENTO: "ingresso",
      BOLAO: "palpite",
      LEILAO: "lance",
    }[tipo] ?? "contribuição"
  );
}

/** (41) 99999-9999 enquanto digita. Número formatado dá sensação de campo certo. */
function mascararTelefone(valor: string) {
  const n = valor.replace(/\D/g, "").slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

/** 000.000.000-00 enquanto digita. */
function mascararCpf(valor: string) {
  const n = valor.replace(/\D/g, "").slice(0, 11);
  return n
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export default function FormularioDeApoio({
  acaoId,
  tipo,
  precoCentavos,
  restante,
  estoqueTotal,
  limitePorPedido,
  opcoes = [],
  valoresSugeridos = [20, 50, 100, 200],
  corForte,
  loja,
  dimensoes,
}: Props) {
  const router = useRouter();
  const temOpcoes = opcoes.length > 0;
  const valorLivre = !temOpcoes && precoCentavos == null;

  // Por dimensão só faz sentido quando há dimensão E opção pra casar com ela.
  const porDimensao = Boolean(dimensoes && dimensoes.length > 0 && temOpcoes);

  // Já começa na primeira opção com vaga: menos um toque pra quem só quer pagar.
  const [opcaoId, setOpcaoId] = useState<string>(
    () => opcoes.find((o) => !o.esgotada)?.id ?? ""
  );

  // O que está marcado em cada dimensão. Começa no que der numa opção com vaga,
  // pra pessoa não abrir a página já num "esgotado".
  const [escolhas, setEscolhas] = useState<Record<string, string>>(() => {
    if (!dimensoes || dimensoes.length === 0) return {};
    const primeira = opcoes.find((o) => !o.esgotada) ?? opcoes[0];
    const partes = primeira ? primeira.nome.split(" ") : [];
    const inicial: Record<string, string> = {};
    dimensoes.forEach((d, i) => {
      inicial[d.chave] = d.valores.includes(partes[i]) ? partes[i] : d.valores[0] ?? "";
    });
    return inicial;
  });

  /** O nome da opção que corresponde a uma combinação de valores. */
  function nomeDaCombinacao(sel: Record<string, string>) {
    return (dimensoes ?? []).map((d) => sel[d.chave]).filter(Boolean).join(" ");
  }
  const opcaoPorNome = (nome: string) => opcoes.find((o) => o.nome === nome) ?? null;

  const opcaoEscolhida = porDimensao
    ? opcaoPorNome(nomeDaCombinacao(escolhas))
    : opcoes.find((o) => o.id === opcaoId) ?? null;

  const [valor, setValor] = useState<number | null>(null);
  const [valorDigitado, setValorDigitado] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  // Rifa e escolha de numero, e nao compra por quantidade: a pessoa quer o 7,
  // a data do aniversario, o numero da camisa.
  const [numeros, setNumeros] = useState<number[]>([]);
  const ehRifa = tipo === "RIFA" && (estoqueTotal ?? 0) > 0;
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const sigilo = useRef<HTMLDialogElement>(null);

  // O chorinho: um extra por cima da rifa, da camisa, do palpite. So aparece
  // fora da doacao livre, onde somar "um extra" ao valor livre nao faria
  // sentido. Comeca vazio: e oferta, nao cobranca.
  const [extra, setExtra] = useState(0);
  const [extraDigitado, setExtraDigitado] = useState("");

  // O teto da quantidade: numa opção, o que resta dela; senão, o estoque da ação.
  const maximo = temOpcoes ? opcaoEscolhida?.restante ?? 50 : restante ?? 50;
  const quantos = ehRifa ? numeros.length : quantidade;
  const precoUnit = temOpcoes ? opcaoEscolhida?.precoCentavos ?? 0 : precoCentavos ?? 0;
  const totalItens = valorLivre ? (valor ?? 0) : precoUnit * quantos;
  const total = totalItens + (valorLivre ? 0 : extra);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    const dados = new FormData(evento.currentTarget);
    setEnviando(true);

    try {
      const r = await fetch("/api/contribuir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acaoId,
          nome: dados.get("nome"),
          whatsapp: telefone,
          cpf,
          anonimo: dados.get("anonimo") === "on",
          quantidade: quantos,
          opcaoId: temOpcoes ? opcaoEscolhida?.id : undefined,
          dados: ehRifa ? { numeros } : undefined,
          valorCentavos: valorLivre ? valor : undefined,
          doacaoExtraCentavos: valorLivre ? undefined : extra,
        }),
      });

      const resposta = await r.json();
      if (!r.ok) {
        setErro(resposta.erro ?? "Não consegui gerar o PIX. Tente de novo.");
        setEnviando(false);
        return;
      }

      router.push(`/pagar/${resposta.pedidoId}`);
    } catch {
      setErro("Sem conexão. Confira a internet e tente de novo.");
      setEnviando(false);
    }
  }

  // Os pedaços do formulário viram variáveis pra poderem ser colocados em duas
  // arrumações diferentes (a de sempre e a de loja) SEM duplicar nada: é o
  // mesmo formulário, o mesmo estado e o mesmo envio nos dois casos.
  const contador = (
    <>
      <span className="ap-pergunta" style={{ marginTop: 6 }}>
        Quantos?
      </span>
      <div className="ap-contador">
        <button
          type="button"
          onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
          disabled={quantidade <= 1}
          aria-label="Diminuir quantidade"
        >
          −
        </button>
        <span className="ap-numero">{quantidade}</span>
        <button
          type="button"
          onClick={() => setQuantidade((q) => Math.min(maximo, q + 1))}
          disabled={quantidade >= maximo}
          aria-label="Aumentar quantidade"
        >
          +
        </button>
      </div>
    </>
  );

  const blocoEscolha = (
    <>
      {porDimensao ? (
        // Uma dimensão embaixo da outra, como em loja: "Tamanho: P M G",
        // "Modelagem: Feminina Masculina". A combinação do que está marcado é
        // que encontra a variante à venda.
        <div className="ap-bloco">
          {dimensoes!.map((d) => (
            <div key={d.chave} className="ap-dim">
              <span className="ap-pergunta">{d.rotulo}</span>
              <div className="ap-dim-valores">
                {d.valores.map((v) => {
                  const marcado = escolhas[d.chave] === v;
                  const combo = { ...escolhas, [d.chave]: v };
                  const alvo = opcaoPorNome(nomeDaCombinacao(combo));
                  const indisponivel = !alvo || alvo.esgotada;
                  return (
                    <button
                      key={v}
                      type="button"
                      className={`ap-dim-valor${marcado ? " marcado" : ""}${
                        indisponivel ? " esgotado" : ""
                      }`}
                      style={marcado ? { borderColor: corForte, color: corForte } : undefined}
                      aria-pressed={marcado}
                      onClick={() => {
                        setEscolhas(combo);
                        setQuantidade(1);
                      }}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {opcaoEscolhida && !opcaoEscolhida.esgotada ? (
            <>
              {contador}
              {opcaoEscolhida.restante !== null && opcaoEscolhida.restante <= 10 && (
                <span className="ap-escassez">
                  {opcaoEscolhida.restante === 1
                    ? "resta só 1 dessa"
                    : `restam só ${opcaoEscolhida.restante} dessa`}
                </span>
              )}
            </>
          ) : (
            <p className="ap-dica">
              Essa combinação está esgotada. Escolha outra para continuar.
            </p>
          )}
        </div>
      ) : temOpcoes ? (
        <div className="ap-bloco">
          <span className="ap-pergunta">
            {tipo === "EVENTO" ? "Escolha o ingresso" : "Escolha a opção"}
          </span>

          <div className="ap-opcoes">
            {opcoes.map((o) => {
              const escolhida = o.id === opcaoId;
              return (
                <button
                  key={o.id}
                  type="button"
                  className={`ap-opcao${escolhida ? " escolhida" : ""}${o.esgotada ? " esgotada" : ""}`}
                  style={escolhida ? { borderColor: corForte } : undefined}
                  disabled={o.esgotada}
                  onClick={() => {
                    setOpcaoId(o.id);
                    setQuantidade(1);
                  }}
                >
                  <span className="ap-opcao-nome">{o.nome}</span>
                  <span className="ap-opcao-preco" style={escolhida ? { color: corForte } : undefined}>
                    {o.esgotada ? "Esgotado" : formatar(o.precoCentavos)}
                  </span>
                  {!o.esgotada && o.restante !== null && o.restante <= 10 && (
                    <span className="ap-opcao-resta">
                      {o.restante === 1 ? "resta 1" : `restam ${o.restante}`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {opcaoEscolhida && contador}
        </div>
      ) : valorLivre ? (
        <div className="ap-bloco">
          <span className="ap-pergunta">
            Quanto você quer doar?
          </span>

          <div className="ap-valores">
            {valoresSugeridos.map((v) => {
              const escolhido = valor === v * 100;
              return (
                <button
                  key={v}
                  type="button"
                  className={`ap-valor${escolhido ? " escolhido" : ""}`}
                  style={escolhido ? { borderColor: corForte, color: corForte } : undefined}
                  onClick={() => {
                    setValor(v * 100);
                    // Preenche tambem o campo de baixo. Antes ele continuava
                    // mostrando "R$ 0,00" depois do clique, e dava a impressao
                    // de que nada tinha sido escolhido.
                    setValorDigitado(String(v).replace(".", ","));
                  }}
                >
                  {formatar(v * 100)}
                </button>
              );
            })}
          </div>

          <label className="ap-campo">
            <span className="ap-nome">Ou digite outro valor</span>
            <div className="ap-moeda">
              <span>R$</span>
              <input
                inputMode="decimal"
                placeholder="0,00"
                value={valorDigitado}
                onChange={(e) => {
                  setValorDigitado(e.target.value);
                  const limpo = e.target.value.replace(/[^\d,]/g, "").replace(",", ".");
                  const n = Number(limpo);
                  setValor(Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null);
                }}
              />
            </div>
          </label>
        </div>
      ) : ehRifa ? (
        <div className="ap-bloco">
          <EscolherNumeros
            acaoId={acaoId}
            total={estoqueTotal ?? 0}
            limite={limitePorPedido}
            corForte={corForte}
            aoMudar={setNumeros}
          />
        </div>
      ) : (
        <div className="ap-bloco">
          <span className="ap-pergunta">Quantos você quer?</span>
          <span className="ap-preco">{formatar(precoCentavos ?? 0)} cada</span>

          {contador}

          {restante !== null && restante <= 10 && (
            <span className="ap-escassez">
              {restante === 1 ? "resta só 1" : `restam só ${restante}`}
            </span>
          )}
        </div>
      )}
    </>
  );

  const blocoDados = (
      <div className="ap-bloco">
        <span className="ap-pergunta">Seus dados</span>

        <label className="ap-campo">
          <span className="ap-nome">Nome completo</span>
          <input name="nome" required autoComplete="name" placeholder="Como você se chama" />
        </label>

        <label className="ap-campo">
          <span className="ap-nome">WhatsApp</span>
          <input
            name="whatsapp"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="(41) 99999-9999"
            value={telefone}
            onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
          />
          <span className="ap-dica">Só se a equipe precisar falar com você.</span>
        </label>

        <label className="ap-campo">
          <span className="ap-nome">CPF</span>
          <input
            name="cpf"
            required
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(mascararCpf(e.target.value))}
          />
          <span className="ap-dica">
            O banco exige para gerar o PIX. Não aparece em nenhum lugar do site.
          </span>
        </label>

        {/* A explicacao honesta do anonimato.
            Prometer "ninguem vai saber" seria mentira: pelas regras do Banco
            Central o PIX carrega o nome de quem pagou, e a equipe ve isso no
            extrato dela e no app do banco, sem ter como nao ver. O que existe
            de verdade e um compromisso de nao divulgar, e e isso que esta
            escrito aqui. Ver tambem src/app/painel/extrato. */}
        <label className="ap-anonimo">
          <input type="checkbox" name="anonimo" />
          <span>Não quero meu nome na lista de quem contribuiu</span>
        </label>
        {/* A explicação inteira do anonimato virou botão: em pé ela ocupava
            meia coluna e empurrava o pagamento pra baixo, e é um texto que a
            maioria não precisa ler. Quem quiser, abre. */}
        <button type="button" className="ap-entenda" onClick={() => sigilo.current?.showModal()}>
          Entenda melhor
        </button>

        <dialog ref={sigilo} className="popup" aria-label="Sobre o anonimato">
          <div className="popup-topo">
            <h2 className="formulario-secao" style={{ margin: 0 }}>
              Sobre não divulgar seu nome
            </h2>
            <button
              type="button"
              className="popup-fechar"
              onClick={() => sigilo.current?.close()}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
          <p className="ap-dica" style={{ margin: 0 }}>
            Seu nome não vai aparecer na página, e ninguém de fora fica sabendo. A equipe, essa
            continua vendo: o PIX chega com o nome de quem pagou, é assim que o Banco Central
            manda, e é o que permite conferir o extrato com o banco. O compromisso da equipe é
            não divulgar.
          </p>
          <div className="popup-acoes">
            <button
              type="button"
              className="botao botao-contorno"
              onClick={() => sigilo.current?.close()}
            >
              Entendi
            </button>
          </div>
        </dialog>
      </div>
  );

  {/* O chorinho. Só fora da doação livre: uma caixa discreta, opcional, no
      fim, como era no bolão. Quem quer só a rifa passa reto; quem quer
      arredondar pra cima acha o campo na hora certa, antes de pagar. */}
  const blocoExtra = (
    <>
      {!valorLivre && (
        <div className="ap-bloco ap-extra">
          <span className="ap-pergunta">Quer somar um valor extra?</span>
          <span className="ap-dica">
            Opcional. Vai inteiro para a casa, junto com o seu {rotuloDoItem(tipo)}.
          </span>

          {/* Dois valores em cima, e embaixo o terceiro atalho ao lado do campo
              de outro valor: fecha um quadro 2x2, sem uma linha solta pra
              "outro valor" pulando embaixo. */}
          <div className="ap-valores">
            {[5, 10, 20].map((v) => {
              const escolhido = extra === v * 100;
              return (
                <button
                  key={v}
                  type="button"
                  className={`ap-valor${escolhido ? " escolhido" : ""}`}
                  style={escolhido ? { borderColor: corForte, color: corForte } : undefined}
                  onClick={() => {
                    // Clicar de novo no mesmo tira: o extra é opcional e a
                    // pessoa precisa conseguir voltar atrás sem recarregar.
                    const novo = escolhido ? 0 : v * 100;
                    setExtra(novo);
                    setExtraDigitado(novo ? String(v).replace(".", ",") : "");
                  }}
                >
                  + {formatar(v * 100)}
                </button>
              );
            })}

            <div className="ap-moeda ap-extra-outro">
              <span>R$</span>
              <input
                inputMode="decimal"
                placeholder="Outro"
                aria-label="Outro valor extra"
                value={extraDigitado}
                onChange={(e) => {
                  setExtraDigitado(e.target.value);
                  const limpo = e.target.value.replace(/[^\d,]/g, "").replace(",", ".");
                  const n = Number(limpo);
                  setExtra(Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );

  const blocoFecha = (
    <>
      {erro && (
        <p className="ap-erro" role="alert">
          {erro}
        </p>
      )}

      <button
        className="ap-enviar"
        type="submit"
        style={{ background: corForte }}
        disabled={enviando || total <= 0}
      >
        {enviando
          ? "Gerando seu PIX..."
          : total > 0
            ? `Pagar ${formatar(total)} por PIX`
            : "Escolha um valor acima"}
      </button>

      <p className="ap-rodape">Pagamento por PIX. Leva menos de um minuto.</p>
    </>
  );

  // Arrumação de LOJA: foto quadrada com as demais em slide, e ao lado o nome,
  // o preço grande e a escolha da variação. Embaixo, em duas colunas, o que a
  // pessoa preenche pra comprar (esquerda) e a descrição da peça (direita).
  if (loja) {
    return (
      <form className="ap loja" onSubmit={enviar}>
        <div className="loja-topo">
          <Carrossel fotos={loja.fotos} nome={loja.nome} />

          <div className="loja-ficha">
            <h2 className="loja-nome">{loja.nome}</h2>

            {precoUnit > 0 && (
              <div className="loja-preco" style={{ color: corForte }}>
                {formatar(precoUnit)}
              </div>
            )}

            {blocoEscolha}

            <p className="loja-nota">
              O lucro da venda desse produto é 100% destinado à campanha de arrecadação.
            </p>
          </div>
        </div>

        {/* Descrição à esquerda, compra à direita: primeiro a pessoa lê o que
            é a peça, e o pagamento fica do lado de fora, à direita, que é onde
            a mão vai depois de decidir. */}
        <div className="loja-baixo">
          {loja.descricao && <div className="loja-descricao">{loja.descricao}</div>}

          <div className="loja-compra">
            {blocoDados}
            {blocoExtra}
            {blocoFecha}
          </div>
        </div>
      </form>
    );
  }

  return (
    <form className="ap" onSubmit={enviar}>
      {blocoEscolha}
      {blocoDados}
      {blocoExtra}
      {blocoFecha}
    </form>
  );
}

/**
 * As fotos do produto. A primeira é a capa; as outras passam pro lado.
 *
 * O deslize é do próprio navegador (scroll com encaixe), e não um carrossel de
 * biblioteca: no celular o dedo já faz isso sozinho, e as setas existem pra
 * quem está no computador e não tem como arrastar.
 */
function Carrossel({ fotos, nome }: { fotos: string[]; nome: string }) {
  const trilho = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);

  function irPara(i: number) {
    const el = trilho.current;
    if (!el) return;
    const alvo = Math.max(0, Math.min(fotos.length - 1, i));
    el.scrollTo({ left: alvo * el.clientWidth, behavior: "smooth" });
    setAtual(alvo);
  }

  if (fotos.length === 0) {
    return <div className="loja-foto-vazia" aria-hidden="true" />;
  }

  return (
    <div className="loja-fotos">
      <div
        className="loja-trilho"
        ref={trilho}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.clientWidth > 0) setAtual(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {fotos.map((url, i) => (
          <div
            key={url}
            className="loja-foto"
            style={{ backgroundImage: `url(${JSON.stringify(url)})` }}
            role="img"
            aria-label={i === 0 ? `Foto de ${nome}` : `Foto ${i + 1} de ${nome}`}
          />
        ))}
      </div>

      {fotos.length > 1 && (
        <>
          <button
            type="button"
            className="loja-seta esquerda"
            onClick={() => irPara(atual - 1)}
            disabled={atual === 0}
            aria-label="Foto anterior"
          >
            ‹
          </button>
          <button
            type="button"
            className="loja-seta direita"
            onClick={() => irPara(atual + 1)}
            disabled={atual === fotos.length - 1}
            aria-label="Próxima foto"
          >
            ›
          </button>

          <div className="loja-pontos">
            {fotos.map((url, i) => (
              <button
                key={url}
                type="button"
                className={`loja-ponto${i === atual ? " ativo" : ""}`}
                onClick={() => irPara(i)}
                aria-label={`Ir para a foto ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
