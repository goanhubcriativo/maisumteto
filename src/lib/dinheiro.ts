// Dinheiro anda em centavos (Int) do banco ate a tela. Float com dinheiro
// erra centavo e o extrato de uma vaquinha nao pode fechar errado.

/** 1800000 -> "R$ 18.000,00" */
export function formatarBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** 1800000 -> "R$ 18.000" (esconde os centavos quando sao zero; bom pra meta) */
export function formatarBRLCurto(centavos: number): string {
  const temCentavos = centavos % 100 !== 0;
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: temCentavos ? 2 : 0,
    maximumFractionDigits: temCentavos ? 2 : 0,
  });
}

/** Aceita "50", "50,00", "R$ 50,00", "1.234,56" e devolve centavos. Null se nao der. */
export function paraCentavos(entrada: string): number | null {
  const limpo = entrada.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  if (!limpo) return null;
  const n = Number(limpo);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/**
 * Percentual da meta, ja limitado no teto pra barra nao vazar.
 * Recebe liquido, nunca bruto: a barra da vaquinha mostra o que foi pra casa.
 */
export function percentualDaMeta(liquidoCentavos: number, metaCentavos: number): number {
  if (metaCentavos <= 0) return 0;
  const pct = (liquidoCentavos / metaCentavos) * 100;
  return Math.max(0, Math.min(100, pct));
}
