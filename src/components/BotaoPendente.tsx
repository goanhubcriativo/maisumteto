"use client";

// Um botão de submit que se tranca enquanto o formulário está indo.
//
// É a correção da dinâmica que quebrou: criar uma campanha de teste demorava
// alguns segundos, o botão não dava sinal de vida, e a pessoa clicava de novo,
// criando cópia repetida. Aqui, ao enviar, ele desabilita e troca o texto, então
// não dá pra disparar duas vezes e fica claro que está trabalhando.

import { useFormStatus } from "react-dom";

export default function BotaoPendente({
  children,
  pendente,
  className = "botao botao-primario",
}: {
  children: React.ReactNode;
  /** O texto enquanto envia. */
  pendente: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending} aria-busy={pending}>
      {pending ? pendente : children}
    </button>
  );
}
