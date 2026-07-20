// Confere que data nao escorrega um dia no vai e volta do formulario.
//
// Este erro ja aconteceu: salvei 09/08 e o campo voltou 08/08. A causa e que
// `new Date("2026-08-09")` e meia-noite em UTC, e no Brasil (UTC-3) isso e
// 21h do dia 08. Toda vez que a pessoa salvasse, a data andaria um dia pra tras.
//
// As duas funcoes vivem em src/app/painel/acao/[id]/page.tsx; aqui elas sao
// reescritas identicas, porque aquele arquivo e uma pagina do Next e nao da pra
// importar direto. Se mudar la, mudar aqui.

function paraCampoData(d) {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function daCaixaDeData(texto) {
  const t = String(texto).trim();
  if (!t) return null;
  const d = new Date(`${t}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

let falhas = 0;
const ok = (nome, real, esperado) => {
  const bate = String(real) === String(esperado);
  if (!bate) falhas++;
  console.log(`${bate ? "PASS " : "FALHA"} ${nome}${bate ? "" : `  real=${real} esperado=${esperado}`}`);
};

console.log(`Fuso da máquina: UTC${-new Date().getTimezoneOffset() / 60}\n`);

// O caso que quebrou: ida e volta tem que devolver o mesmo dia.
for (const texto of [
  "2026-08-09",
  "2026-01-01",
  "2026-12-31",
  "2026-02-28",
  "2026-03-01",
  // Viradas de horário de verão em outros fusos, por garantia.
  "2026-10-18",
  "2026-11-01",
]) {
  ok(`ida e volta de ${texto}`, paraCampoData(daCaixaDeData(texto)), texto);
}

// A data guardada tem que ser meia-noite LOCAL, nao 21h do dia anterior.
const d = daCaixaDeData("2026-08-09");
ok("hora local é meia-noite", d.getHours(), 0);
ok("dia local está certo", d.getDate(), 9);
ok("mês local está certo", d.getMonth() + 1, 8);

// Campo vazio e lixo não podem virar Invalid Date, senão a ação ficaria presa
// em "em breve" para sempre.
ok("campo vazio vira null", daCaixaDeData(""), null);
ok("espaço em branco vira null", daCaixaDeData("   "), null);
ok("texto inválido vira null", daCaixaDeData("nao-e-data"), null);

console.log(falhas === 0 ? "\n=== DATAS NÃO ESCORREGAM ===" : `\n=== ${falhas} FALHA(S) ===`);
process.exit(falhas === 0 ? 0 : 1);
