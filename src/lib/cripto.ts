// Cifra e decifra segredos que nao podem ficar em texto puro no banco,
// hoje as credenciais de gateway de cada equipe (BYO-key).
//
// AES-256-GCM: alem de cifrar, autentica. Se alguem mexer no ciphertext,
// o decifrar quebra em vez de devolver lixo silenciosamente.
//
// A chave mestra vem de APP_SECRET_KEY (32 bytes em hex, 64 caracteres).
// Gerar com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//
// Consequencia importante: perder a APP_SECRET_KEY significa perder as
// credenciais de todas as equipes. Trocar a chave exige recifrar tudo.

import crypto from "crypto";

const ALGO = "aes-256-gcm";

function chaveMestra(): Buffer {
  const hex = process.env.APP_SECRET_KEY;
  if (!hex) {
    throw new Error(
      "APP_SECRET_KEY nao configurada. Gere com: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  const buf = Buffer.from(hex, "hex");
  if (buf.length !== 32) {
    throw new Error("APP_SECRET_KEY precisa ter 32 bytes (64 caracteres hex).");
  }
  return buf;
}

/** Cifra um segredo. Devolve "iv.tag.ciphertext", tudo em base64. */
export function cifrar(texto: string): string {
  const iv = crypto.randomBytes(12); // 96 bits, o tamanho recomendado pra GCM
  const cipher = crypto.createCipheriv(ALGO, chaveMestra(), iv);
  const ct = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(".");
}

/** Decifra o que veio de cifrar(). Lanca se o dado foi adulterado. */
export function decifrar(pacote: string): string {
  const [ivB64, tagB64, ctB64] = pacote.split(".");
  if (!ivB64 || !tagB64 || !ctB64) {
    throw new Error("Segredo cifrado em formato invalido.");
  }
  const decipher = crypto.createDecipheriv(
    ALGO,
    chaveMestra(),
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Mostra so o final da chave, pro lider conferir qual cadastrou sem expor o segredo. */
export function mascarar(texto: string): string {
  if (texto.length <= 6) return "****";
  return `****${texto.slice(-4)}`;
}
