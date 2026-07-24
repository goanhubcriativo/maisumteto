"use client";

// O seletor "filtrar por ação" do extrato. Troca o ?acao=... da URL, e a
// página (que é server) recarrega já filtrada. Fica client só por causa do
// onChange; a filtragem em si acontece no servidor.

import { useRouter, useSearchParams } from "next/navigation";

export default function FiltroDeAcao({
  acoes,
}: {
  acoes: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const atual = params.get("acao") ?? "";

  return (
    <label className="filtro-acao">
      <span>Ação</span>
      <select
        className="campo-entrada"
        value={atual}
        onChange={(e) => {
          const v = e.target.value;
          router.push(v ? `/painel/extrato?acao=${encodeURIComponent(v)}` : "/painel/extrato");
        }}
      >
        <option value="">Todas as ações</option>
        {acoes.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nome}
          </option>
        ))}
      </select>
    </label>
  );
}
