"use client";

// O botão "Detalhes" de uma linha do extrato, e a caixa que ele abre.
//
// A linha do extrato ficou enxuta (quando, quem, ação, valores) pra caber e ser
// fácil de conferir com o banco. Tudo que a pessoa preencheu na compra (a
// variação, a forma de entrega, os números da rifa, a ajuda extra, o contato)
// vive aqui dentro, a um clique, em vez de espremido na linha.

import { useRef } from "react";
import { formatarBRL } from "@/lib/dinheiro";

export interface ItemDoPedido {
  acao: string;
  quantidade: number;
  opcao: string | null;
  entrega: string | null;
  numeros: number[] | null;
}

interface Props {
  quando: string;
  nome: string;
  anonimo: boolean;
  cpf: string;
  whatsapp: string;
  manual: boolean;
  forma: string | null;
  registradoPor: string | null;
  brutoCentavos: number;
  taxaCentavos: number | null;
  liquidoCentavos: number;
  extraCentavos: number;
  itens: ItemDoPedido[];
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="detalhe-linha">
      <dt>{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function DetalhesDoPedido(p: Props) {
  const caixa = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className="botao botao-contorno botao-pequeno"
        onClick={() => caixa.current?.showModal()}
      >
        Detalhes
      </button>

      <dialog ref={caixa} className="popup" aria-label={`Detalhes de ${p.nome}`}>
        <div className="popup-topo">
          <h2 className="formulario-secao" style={{ margin: 0 }}>
            {p.nome}
            {p.anonimo && " · pediu sigilo"}
          </h2>
          <button
            type="button"
            className="popup-fechar"
            onClick={() => caixa.current?.close()}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <dl className="detalhe-lista">
          <Linha rotulo="Quando">{p.quando}</Linha>

          {p.itens.map((i, idx) => (
            <Linha key={idx} rotulo={idx === 0 ? "O que levou" : ""}>
              <strong>{i.acao}</strong>
              <div className="detalhe-sub">
                {i.quantidade} {i.quantidade === 1 ? "unidade" : "unidades"}
                {i.opcao ? ` · ${i.opcao}` : ""}
              </div>
              {i.numeros && i.numeros.length > 0 && (
                <div className="detalhe-sub">Números: {i.numeros.join(", ")}</div>
              )}
              {i.entrega && <div className="detalhe-sub">Recebe por: {i.entrega}</div>}
            </Linha>
          ))}

          {p.extraCentavos > 0 && (
            <Linha rotulo="Ajuda extra">{formatarBRL(p.extraCentavos)} por cima</Linha>
          )}

          <Linha rotulo="Contato">
            <div className="detalhe-sub">CPF: {p.cpf}</div>
            <div className="detalhe-sub">WhatsApp: {p.whatsapp}</div>
          </Linha>

          <Linha rotulo="Como pagou">
            {p.manual
              ? `${p.forma ?? "Lançamento manual"}${
                  p.registradoPor ? `, por ${p.registradoPor}` : ""
                }`
              : "PIX pelo site"}
          </Linha>

          <Linha rotulo="Valores">
            <div className="detalhe-sub">Bruto: {formatarBRL(p.brutoCentavos)}</div>
            <div className="detalhe-sub">
              Taxa: {p.taxaCentavos == null ? "a confirmar" : formatarBRL(p.taxaCentavos)}
            </div>
            <div className="detalhe-sub detalhe-forte">
              Líquido: {formatarBRL(p.liquidoCentavos)}
            </div>
          </Linha>
        </dl>

        <div className="popup-acoes">
          <button
            type="button"
            className="botao botao-primario"
            onClick={() => caixa.current?.close()}
          >
            Fechar
          </button>
        </div>
      </dialog>
    </>
  );
}
