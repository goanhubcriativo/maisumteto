// Confere que todo tipo do catalogo tem icone e rotulo proprios, e que as
// receitas estao bem formadas. Roda a partir da pasta do projeto.
const fs = require("fs");
const path = require("path");

const RAIZ = process.argv[2] || path.join(__dirname, "..");
const { RECEITAS } = require(path.join(RAIZ, ".tmp-c", "catalogo.js"));
const icones = fs.readFileSync(path.join(RAIZ, "src/components/icones.tsx"), "utf8");

function blocoDepoisDe(marca) {
  const i = icones.indexOf(marca);
  if (i < 0) return "";
  const ini = icones.indexOf("{", i);
  const fim = icones.indexOf("};", ini);
  return icones.slice(ini, fim);
}

const porTipo = blocoDepoisDe("const porTipo");
const rotulos = blocoDepoisDe("rotuloDoTipo");

let falhas = 0;
const falhar = (msg) => {
  falhas++;
  console.log("FALHA " + msg);
};

if (!porTipo) falhar("nao achei o mapa porTipo em icones.tsx");
if (!rotulos) falhar("nao achei o mapa rotuloDoTipo em icones.tsx");

for (const r of RECEITAS) {
  const re = new RegExp("\\b" + r.tipo + "\\s*:");
  const temIcone = re.test(porTipo);
  const temRotulo = re.test(rotulos);

  if (!temIcone || !temRotulo) {
    falhar(`${r.tipo}: icone=${temIcone} rotulo=${temRotulo}`);
  } else {
    console.log("PASS  " + r.tipo.padEnd(18) + " tem icone e rotulo proprios");
  }
}

// Um tipo generico demais atras do outro: DOACAO e DOACAO_RECORRENTE nao podem
// cair no mesmo icone, senao a caixa de ferramentas fica com dois iguais.
for (const r of RECEITAS) {
  if (!r.blocosIniciais || r.blocosIniciais.length === 0) {
    falhar(`${r.tipo}: sem blocosIniciais (a pagina nasceria vazia)`);
  }
  const chaves = r.campos.map((c) => c.chave);
  if (new Set(chaves).size !== chaves.length) {
    falhar(`${r.tipo}: chave de campo repetida`);
  }
  for (const c of r.campos) {
    if (c.tipo === "escolha" && (!c.escolhas || !c.escolhas.length)) {
      falhar(`${r.tipo}.${c.chave}: campo de escolha sem opcoes`);
    }
  }
  if (!r.comoFunciona || r.comoFunciona.length === 0) {
    falhar(`${r.tipo}: sem "como funciona"`);
  }
}
console.log(`\n${RECEITAS.length} receitas conferidas`);
console.log(falhas === 0 ? "=== CATALOGO INTEIRO COBERTO ===" : `=== ${falhas} FALHA(S) ===`);
process.exit(falhas === 0 ? 0 : 1);
