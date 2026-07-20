// Confere o cálculo da próxima cobrança.
//
// Somar "um mês" em JavaScript é traiçoeiro: 31 de janeiro + 1 mês vira 3 de
// março, porque fevereiro não tem dia 31 e a data transborda. Numa doação
// recorrente isso faria a cobrança pular um mês inteiro.
//
// A função vive em src/lib/assinaturas.ts; aqui ela é reescrita idêntica, porque
// aquele arquivo importa o Prisma e não dá para carregar sem banco. Se mudar lá,
// mudar aqui.

function proximaData(base, periodicidade) {
  const d = new Date(base);
  if (periodicidade === "SEMANAL") {
    d.setDate(d.getDate() + 7);
  } else {
    const dia = d.getDate();
    d.setMonth(d.getMonth() + 1);
    if (d.getDate() !== dia) d.setDate(0);
  }
  return d;
}

function linkDoWhatsapp(numero, texto) {
  const limpo = numero.replace(/\D/g, "");
  const comPais = limpo.startsWith("55") ? limpo : `55${limpo}`;
  return `https://wa.me/${comPais}?text=${encodeURIComponent(texto)}`;
}

let falhas = 0;
const ok = (nome, real, esperado) => {
  const bate = String(real) === String(esperado);
  if (!bate) falhas++;
  console.log(`${bate ? "PASS " : "FALHA"} ${nome}${bate ? "" : `\n        real=${real} esperado=${esperado}`}`);
};

const dia = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

console.log("Próxima cobrança, mensal:\n");

// O caso normal.
ok("15/03 + 1 mês", dia(proximaData(new Date(2026, 2, 15), "MENSAL")), "2026-04-15");
ok("01/01 + 1 mês", dia(proximaData(new Date(2026, 0, 1), "MENSAL")), "2026-02-01");

// Os casos que quebram sem tratamento.
ok("31/01 + 1 mês (fev não tem 31)", dia(proximaData(new Date(2026, 0, 31), "MENSAL")), "2026-02-28");
ok("31/03 + 1 mês (abr não tem 31)", dia(proximaData(new Date(2026, 2, 31), "MENSAL")), "2026-04-30");
ok("30/01 + 1 mês", dia(proximaData(new Date(2026, 0, 30), "MENSAL")), "2026-02-28");

// Virada de ano.
ok("15/12 + 1 mês", dia(proximaData(new Date(2026, 11, 15), "MENSAL")), "2027-01-15");

console.log("\nPróxima cobrança, semanal:\n");
ok("15/03 + 7 dias", dia(proximaData(new Date(2026, 2, 15), "SEMANAL")), "2026-03-22");
ok("28/02 + 7 dias (vira mês)", dia(proximaData(new Date(2026, 1, 28), "SEMANAL")), "2026-03-07");
ok("29/12 + 7 dias (vira ano)", dia(proximaData(new Date(2026, 11, 29), "SEMANAL")), "2027-01-05");

// Nunca pode devolver data no passado nem igual à base.
for (const p of ["SEMANAL", "MENSAL"]) {
  for (const base of [new Date(2026, 0, 31), new Date(2026, 1, 28), new Date(2026, 11, 31)]) {
    const prox = proximaData(base, p);
    if (prox <= base) {
      falhas++;
      console.log(`FALHA ${p}: ${dia(base)} devolveu ${dia(prox)}, que não avança`);
    }
  }
}
console.log("PASS  toda próxima data avança de verdade");

console.log("\nLink do WhatsApp:\n");
ok("celular com DDD ganha o 55", linkDoWhatsapp("41999741025", "oi").split("?")[0], "https://wa.me/5541999741025");
ok("número já com 55 não duplica", linkDoWhatsapp("5541999741025", "oi").split("?")[0], "https://wa.me/5541999741025");
ok("formatado vira só dígitos", linkDoWhatsapp("(41) 99974-1025", "oi").split("?")[0], "https://wa.me/5541999741025");
ok("texto vai codificado", linkDoWhatsapp("41999741025", "R$ 20 & obrigado").includes("R%24%2020%20%26"), "true");

console.log(falhas === 0 ? "\n=== RECORRÊNCIA OK ===" : `\n=== ${falhas} FALHA(S) ===`);
process.exit(falhas === 0 ? 0 : 1);
