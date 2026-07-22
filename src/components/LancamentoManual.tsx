"use client";

// Lançamento manual, numa caixa que abre por cima.
//
// Antes era uma seção enorme sempre aberta no meio da tela da ação, e pesava:
// a maior parte do tempo a pessoa está mexendo na ação, não lançando dinheiro
// na mão. Agora é um botão; a caixa só aparece quando ela clica.
//
// O formulário por dentro é o mesmo, e o envio continua sendo a server action
// da página (passada por prop): a validação, o registro e o extrato não mudam.

import { useEffect, useRef } from "react";

interface Props {
  /** A server action que registra o lançamento (definida na página da ação). */
  action: (dados: FormData) => void | Promise<void>;
  ehRifa: boolean;
  valorLivre: boolean;
  precoCentavos: number | null;
  precoRotulo: string;
  /** Hoje no formato do input de data, calculado no servidor. */
  hoje: string;
  /** Mensagens que voltam depois do envio, pela URL. */
  erro?: string;
  lancado?: boolean;
}

export default function LancamentoManual({
  action,
  ehRifa,
  valorLivre,
  precoCentavos,
  precoRotulo,
  hoje,
  erro,
  lancado,
}: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);

  // Se o envio voltou com erro, reabre a caixa: a mensagem só faz sentido ao
  // lado dos campos que a pessoa acabou de preencher.
  useEffect(() => {
    if (erro) dialogo.current?.showModal();
  }, [erro]);

  function abrir() {
    dialogo.current?.showModal();
  }
  function fechar() {
    dialogo.current?.close();
  }

  return (
    <section className="painel-cartao lancar-cartao" id="lancar">
      <div className="lancar-chamada">
        <div>
          <h2 className="formulario-secao" style={{ margin: 0 }}>
            Entrou fora do site?
          </h2>
          <p className="campo-ajuda" style={{ margin: "6px 0 0" }}>
            A rifa vendida na rua, a camisa paga em dinheiro, o PIX direto na conta de alguém da
            equipe. Registre em nome de quem contribuiu e entra no extrato como lançamento manual.
          </p>
        </div>
        <button type="button" className="botao botao-primario botao-pequeno" onClick={abrir}>
          Lançar à mão
        </button>
      </div>

      {lancado && (
        <p className="aviso-salvo" role="status" style={{ margin: "16px 0 0" }}>
          Lançamento registrado. Já está no extrato.
        </p>
      )}

      <dialog ref={dialogo} className="popup" aria-label="Lançamento manual">
        <div className="popup-topo">
          <h2 className="formulario-secao" style={{ margin: 0 }}>
            Lancei fora do site
          </h2>
          <button type="button" className="popup-fechar" onClick={fechar} aria-label="Fechar">
            ×
          </button>
        </div>

        {erro && (
          <p className="aviso-ruim" role="alert">
            {erro}
          </p>
        )}

        <form action={action} className="formulario">
          <label className="campo">
            <span className="campo-rotulo">Nome de quem contribuiu</span>
            <input className="campo-entrada" name="nome" required />
            <span className="campo-ajuda">
              O nome oficial, como a pessoa é conhecida. É assim que ela aparece no extrato e na
              lista de quem contribuiu.
            </span>
          </label>

          <div className="campo-dupla">
            <label className="campo">
              <span className="campo-rotulo">WhatsApp</span>
              <input className="campo-entrada" name="whatsapp" inputMode="numeric" />
              <span className="campo-ajuda">Opcional.</span>
            </label>

            <label className="campo">
              <span className="campo-rotulo">CPF</span>
              <input className="campo-entrada" name="cpf" inputMode="numeric" />
              <span className="campo-ajuda">Opcional.</span>
            </label>
          </div>

          <div className="campo-dupla">
            {ehRifa ? (
              <label className="campo">
                <span className="campo-rotulo">Números vendidos</span>
                <input className="campo-entrada" name="numeros" placeholder="7, 12, 40" />
                <span className="campo-ajuda">
                  Separados por vírgula. A quantidade e o valor saem daqui, e os números ficam
                  reservados em nome dessa pessoa.
                </span>
              </label>
            ) : valorLivre ? (
              <label className="campo">
                <span className="campo-rotulo">Valor recebido</span>
                <input
                  className="campo-entrada"
                  name="valor"
                  inputMode="decimal"
                  placeholder="50,00"
                />
              </label>
            ) : (
              <label className="campo">
                <span className="campo-rotulo">Quantidade</span>
                <input
                  className="campo-entrada"
                  name="quantidade"
                  inputMode="numeric"
                  defaultValue="1"
                />
                <span className="campo-ajuda">O valor sai do preço da ação: {precoRotulo} cada.</span>
              </label>
            )}

            <label className="campo">
              <span className="campo-rotulo">Quando a pessoa pagou</span>
              <input className="campo-entrada" name="quando" type="date" defaultValue={hoje} />
              <span className="campo-ajuda">A data do pagamento de verdade, não a de hoje.</span>
            </label>
          </div>

          <label className="campo">
            <span className="campo-rotulo">Como o dinheiro chegou</span>
            <select className="campo-entrada" name="forma" defaultValue="Dinheiro">
              <option>Dinheiro</option>
              <option>PIX direto na conta</option>
              <option>Transferência</option>
              <option>Outro</option>
            </select>
          </label>

          <label className="ap-anonimo" style={{ marginBottom: 4 }}>
            <input type="checkbox" name="anonimo" />
            <span>Esta pessoa não quer o nome na lista pública</span>
          </label>

          <div className="popup-acoes">
            <button type="button" className="botao botao-contorno" onClick={fechar}>
              Cancelar
            </button>
            <button className="botao botao-primario" type="submit">
              Registrar lançamento
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
