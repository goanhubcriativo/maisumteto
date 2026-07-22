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

import { useState } from "react";
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
}: Props) {
  const router = useRouter();
  const temOpcoes = opcoes.length > 0;
  const valorLivre = !temOpcoes && precoCentavos == null;

  // Já começa na primeira opção com vaga: menos um toque pra quem só quer pagar.
  const [opcaoId, setOpcaoId] = useState<string>(
    () => opcoes.find((o) => !o.esgotada)?.id ?? ""
  );
  const opcaoEscolhida = opcoes.find((o) => o.id === opcaoId) ?? null;

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
          opcaoId: temOpcoes ? opcaoId : undefined,
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

  return (
    <form className="ap" onSubmit={enviar}>
      {temOpcoes ? (
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

          {opcaoEscolhida && (
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
          )}
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

          {restante !== null && restante <= 10 && (
            <span className="ap-escassez">
              {restante === 1 ? "resta só 1" : `restam só ${restante}`}
            </span>
          )}
        </div>
      )}

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
        <p className="ap-dica ap-sigilo">
          Seu nome não vai aparecer na página, e ninguém de fora fica sabendo. A equipe, essa
          continua vendo: o PIX chega com o nome de quem pagou, é assim que o Banco Central
          manda, e é o que permite conferir o extrato com o banco. O compromisso da equipe é não
          divulgar.
        </p>
      </div>

      {/* O chorinho. Só fora da doação livre: uma caixa discreta, opcional, no
          fim, como era no bolão. Quem quer só a rifa passa reto; quem quer
          arredondar pra cima acha o campo na hora certa, antes de pagar. */}
      {!valorLivre && (
        <div className="ap-bloco ap-extra">
          <span className="ap-pergunta">Quer somar um valor extra?</span>
          <span className="ap-dica">
            Opcional. Vai inteiro para a casa, junto com o seu {rotuloDoItem(tipo)}.
          </span>

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
          </div>

          <label className="ap-campo">
            <span className="ap-nome">Ou outro valor</span>
            <div className="ap-moeda">
              <span>R$</span>
              <input
                inputMode="decimal"
                placeholder="0,00"
                value={extraDigitado}
                onChange={(e) => {
                  setExtraDigitado(e.target.value);
                  const limpo = e.target.value.replace(/[^\d,]/g, "").replace(",", ".");
                  const n = Number(limpo);
                  setExtra(Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0);
                }}
              />
            </div>
          </label>
        </div>
      )}

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

      <p className="ap-rodape">
        Pagamento por PIX. Leva menos de um minuto.
      </p>
    </form>
  );
}
