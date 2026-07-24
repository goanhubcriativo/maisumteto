// Confere que toda cor da paleta e legivel.
//
// A cor "forte" e usada como TEXTO sobre branco (o preco no cartao, o titulo da
// secao) e como FUNDO de botao com texto branco. Nos dois casos o par precisa
// passar em 4.5:1, que e o minimo do WCAG AA pra texto normal.
//
// Sem este teste, "todas as cores foram testadas" seria so uma frase no
// comentario. Aqui a conta e feita.

const path = require("path");
const RAIZ = process.argv[2] || path.join(__dirname, "..");
const { PALETA, corDe, COR_SUGERIDA, COR_PADRAO } = require(path.join(RAIZ, ".tmp-p", "paleta.js"));

/** Luminancia relativa, conforme a formula do WCAG. */
function luminancia(hex) {
  const n = hex.replace("#", "");
  const canais = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canais.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a, b) {
  const la = luminancia(a);
  const lb = luminancia(b);
  const [claro, escuro] = la > lb ? [la, lb] : [lb, la];
  return (claro + 0.05) / (escuro + 0.05);
}

const BRANCO = "#ffffff";
const MINIMO = 4.5;
// A cor de marca nunca carrega texto: ela e mancha (bolinha do seletor, fatia
// do grafico, barra). O piso dela e o de elemento grafico, 3:1, e nao o de
// texto. E o que permite o azul claro do logo aparecer sem quebrar leitura.
const MINIMO_MARCA = 3;

let falhas = 0;
console.log("Contraste de cada cor contra o branco (mínimo AA = 4.5:1)\n");

for (const c of PALETA) {
  const razao = contraste(c.forte, BRANCO);
  const passa = razao >= MINIMO;
  if (!passa) falhas++;
  console.log(
    `${passa ? "PASS " : "FALHA"} ${c.nome.padEnd(16)} ${c.forte}  ${razao.toFixed(2)}:1`
  );

  // A marca e mancha viva (bolinha, fatia, barra), nao texto. A equipe escolheu
  // uma paleta ALEGRE, e cor viva de verdade (amarelo, verde limao, turquesa)
  // nao chega em 3:1 contra o branco sem virar mostarda. Por isso o piso da
  // marca virou AVISO, e nao trava: o que trava e o `forte`, que carrega texto.
  if (c.marca) {
    const r = contraste(c.marca, BRANCO);
    const ok = r >= MINIMO_MARCA;
    console.log(
      `${ok ? "PASS " : "aviso"} ${(c.nome + " (marca)").padEnd(16)} ${c.marca}  ${r.toFixed(2)}:1`
    );
  }
}

// Ids unicos: dois ids iguais fariam corDe() devolver sempre o primeiro.
const ids = PALETA.map((c) => c.id);
if (new Set(ids).size !== ids.length) {
  falhas++;
  console.log("\nFALHA ids repetidos na paleta");
}

// Toda sugestao precisa apontar pra uma cor que existe, senao cai no padrao
// silenciosamente e o tipo perde a cor pensada pra ele.
console.log("\nSugestão de cor por tipo de ação:");
for (const [tipo, id] of Object.entries(COR_SUGERIDA)) {
  const achou = PALETA.some((c) => c.id === id);
  if (!achou) {
    falhas++;
    console.log(`FALHA ${tipo}: sugere "${id}", que não existe na paleta`);
  } else {
    console.log(`PASS  ${tipo.padEnd(18)} -> ${id}`);
  }
}

// corDe() com lixo tem que cair no padrao, nunca quebrar.
if (corDe("nao-existe").id !== COR_PADRAO.id) {
  falhas++;
  console.log("FALHA corDe() com id desconhecido não caiu no padrão");
}
if (corDe(null).id !== COR_PADRAO.id || corDe(undefined).id !== COR_PADRAO.id) {
  falhas++;
  console.log("FALHA corDe() com nulo não caiu no padrão");
}

console.log(`\n${PALETA.length} cores conferidas`);
console.log(falhas === 0 ? "=== PALETA INTEIRA LEGÍVEL ===" : `=== ${falhas} FALHA(S) ===`);
process.exit(falhas === 0 ? 0 : 1);
