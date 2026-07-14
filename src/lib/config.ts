// Configuração central do bolão, lida das variáveis de ambiente.

export const config = {
  timeCasa: process.env.NEXT_PUBLIC_TIME_CASA || "Seleção A",
  timeVisitante: process.env.NEXT_PUBLIC_TIME_VISITANTE || "Seleção B",
  dataJogo: process.env.NEXT_PUBLIC_DATA_JOGO || "19/07/2026",
  nomeEvento:
    process.env.NEXT_PUBLIC_NOME_EVENTO ||
    "Bolão da Casa Amiga · Teto",
};

// Valor de cada aposta em centavos (só no servidor; nunca confie no cliente).
export function valorApostaCentavos(): number {
  const raw = process.env.VALOR_APOSTA_CENTAVOS;
  const n = raw ? parseInt(raw, 10) : 1000;
  return Number.isFinite(n) && n > 0 ? n : 1000;
}

// Grupo de clientes no Asaas para onde vão as cobranças desta campanha.
export function grupoAsaas(): string {
  return process.env.ASAAS_GRUPO || "DOAÇÕES TETO PARANÁ";
}

// Taxa estimada por PIX (centavos), usada só como estimativa enquanto o
// valor líquido real (netValue do Asaas) ainda não chegou.
export function taxaPixEstimadaCentavos(): number {
  const raw = process.env.TAXA_PIX_ESTIMADA_CENTAVOS;
  const n = raw ? parseInt(raw, 10) : 99;
  return Number.isFinite(n) && n >= 0 ? n : 99;
}

export function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Valores sugeridos da "ajudinha extra" (doação), em centavos.
export const doacaoPresetsCentavos = [500, 1000, 2500];

// Converte um texto em reais ("10", "10,50", "R$ 7") para centavos.
export function reaisParaCentavos(texto: string): number {
  const limpo = (texto || "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "") // remove separador de milhar
    .replace(",", ".");
  const n = parseFloat(limpo);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}
