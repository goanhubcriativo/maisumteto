"use client";

// O formulário que transforma vontade em PIX.
//
// Pede o mínimo: valor (ou quantidade), nome, WhatsApp e CPF. Nada de cadastro,
// nada de senha. Cada campo a mais aqui é gente que desiste no meio.
//
// O CPF é o único que não dá para evitar: o Mercado Pago exige o CPF do pagador
// para gerar cobrança PIX. Por isso a tela explica o porquê, em vez de só pedir.

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  acaoId: string;
  /** Nulo = valor livre (a pessoa escolhe quanto). */
  precoCentavos: number | null;
  /** Quantas unidades ainda existem. Nulo = sem limite. */
  restante: number | null;
  /** Botões de atalho para doação, em reais. */
  valoresSugeridos?: number[];
  corForte: string;
}

function formatar(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FormularioDeApoio({
  acaoId,
  precoCentavos,
  restante,
  valoresSugeridos = [20, 50, 100, 200],
  corForte,
}: Props) {
  const router = useRouter();
  const valorLivre = precoCentavos == null;

  const [valor, setValor] = useState<number | null>(null);
  const [valorDigitado, setValorDigitado] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const maximo = restante ?? 50;
  const total = valorLivre
    ? (valor ?? 0)
    : (precoCentavos ?? 0) * quantidade;

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
          whatsapp: dados.get("whatsapp"),
          cpf: dados.get("cpf"),
          email: dados.get("email"),
          anonimo: dados.get("anonimo") === "on",
          quantidade,
          valorCentavos: valorLivre ? valor : undefined,
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
    <form className="apoio" onSubmit={enviar}>
      {valorLivre ? (
        <>
          <span className="apoio-rotulo">Quanto você quer doar?</span>
          <div className="apoio-valores">
            {valoresSugeridos.map((v) => (
              <button
                key={v}
                type="button"
                className={`apoio-valor${valor === v * 100 ? " escolhido" : ""}`}
                style={valor === v * 100 ? { borderColor: corForte, color: corForte } : undefined}
                onClick={() => {
                  setValor(v * 100);
                  setValorDigitado("");
                }}
              >
                {formatar(v * 100)}
              </button>
            ))}
          </div>

          <label className="apoio-outro">
            <span>Ou outro valor</span>
            <input
              inputMode="decimal"
              placeholder="R$ 0,00"
              value={valorDigitado}
              onChange={(e) => {
                setValorDigitado(e.target.value);
                const limpo = e.target.value.replace(/[^\d,]/g, "").replace(",", ".");
                const n = Number(limpo);
                setValor(Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null);
              }}
            />
          </label>
        </>
      ) : (
        <>
          <span className="apoio-rotulo">
            Quantos? · {formatar(precoCentavos ?? 0)} cada
          </span>
          <div className="apoio-quantidade">
            <button
              type="button"
              onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
              aria-label="Diminuir"
            >
              −
            </button>
            <span className="apoio-numero">{quantidade}</span>
            <button
              type="button"
              onClick={() => setQuantidade((q) => Math.min(maximo, q + 1))}
              aria-label="Aumentar"
            >
              +
            </button>
          </div>
          {restante !== null && restante <= 10 && (
            <span className="apoio-escassez">
              {restante === 1 ? "resta 1" : `restam ${restante}`}
            </span>
          )}
        </>
      )}

      <label className="campo">
        <span className="campo-rotulo">Seu nome</span>
        <input className="campo-entrada" name="nome" required autoComplete="name" />
      </label>

      <label className="campo">
        <span className="campo-rotulo">WhatsApp</span>
        <input
          className="campo-entrada"
          name="whatsapp"
          required
          inputMode="tel"
          placeholder="(41) 99999-9999"
          autoComplete="tel"
        />
        <span className="campo-ajuda">É por onde a equipe fala com você se precisar.</span>
      </label>

      <label className="campo">
        <span className="campo-rotulo">CPF</span>
        <input
          className="campo-entrada"
          name="cpf"
          required
          inputMode="numeric"
          placeholder="000.000.000-00"
        />
        <span className="campo-ajuda">
          O banco exige CPF para gerar o PIX. Não aparece em lugar nenhum do site.
        </span>
      </label>

      <label className="campo-chave apoio-anonimo">
        <input type="checkbox" name="anonimo" />
        <span>Não quero meu nome na lista de quem contribuiu</span>
      </label>

      {erro && (
        <p className="apoio-erro" role="alert">
          {erro}
        </p>
      )}

      <button
        className="botao botao-primario botao-largo"
        type="submit"
        style={{ background: corForte }}
        disabled={enviando || total <= 0}
      >
        {enviando
          ? "Gerando PIX..."
          : total > 0
            ? `Pagar ${formatar(total)} por PIX`
            : "Escolha um valor"}
      </button>
    </form>
  );
}
