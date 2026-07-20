// Roda todos os testes com um comando so: npm run teste
//
// Dois deles precisam do TypeScript compilado antes (catalogo e paleta sao .ts).
// Este arquivo compila numa pasta temporaria, roda tudo e limpa no fim, pra que
// rodar os testes seja sempre um comando, nunca uma receita de bolo.

import { execFileSync } from "child_process";
import { rmSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, "..");

// Chama o tsc pelo arquivo .js dele, e nao por "npx".
//
// No Windows, execFileSync com um .cmd (npx.cmd) estoura EINVAL desde o Node 20,
// que passou a exigir shell pra isso. Apontar direto pro binario evita o shell
// inteiro, e de quebra roda igual no Windows, no Mac e no Linux.
const TSC = path.join(RAIZ, "node_modules", "typescript", "bin", "tsc");

function compilar(arquivo, destino) {
  execFileSync(
    process.execPath,
    [TSC, arquivo, "--outDir", destino, "--module", "commonjs",
     "--target", "ES2020", "--esModuleInterop", "--skipLibCheck"],
    { cwd: RAIZ, stdio: "inherit" }
  );
}

function rodar(teste) {
  console.log(`\n${"─".repeat(60)}\n${teste}\n${"─".repeat(60)}`);
  execFileSync(process.execPath, [path.join("testes", teste)], {
    cwd: RAIZ,
    stdio: "inherit",
  });
}

let falhou = false;
try {
  compilar("src/lib/catalogo.ts", ".tmp-c");
  compilar("src/lib/paleta.ts", ".tmp-p");

  rodar("datas.js");
  rodar("recorrencia.js");
  rodar("paleta.js");
  rodar("catalogo.js");

  console.log("\n✓ Todos os testes passaram\n");
} catch {
  falhou = true;
  console.error("\n✗ Algum teste falhou (veja acima)\n");
} finally {
  // Limpa mesmo se der erro: pasta temporaria esquecida confunde o proximo tsc.
  rmSync(path.join(RAIZ, ".tmp-c"), { recursive: true, force: true });
  rmSync(path.join(RAIZ, ".tmp-p"), { recursive: true, force: true });
}

process.exit(falhou ? 1 : 0);
