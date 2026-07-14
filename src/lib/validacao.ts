// Utilitários de validação/normalização de dados do apostador.

export function somenteDigitos(v: string): string {
  return (v || "").replace(/\D/g, "");
}

// Valida CPF pelos dígitos verificadores.
export function cpfValido(cpfRaw: string): boolean {
  const cpf = somenteDigitos(cpfRaw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos iguais

  const calcDigito = (base: string, pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += parseInt(base[i], 10) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const d1 = calcDigito(cpf.slice(0, 9), 10);
  const d2 = calcDigito(cpf.slice(0, 10), 11);
  return d1 === parseInt(cpf[9], 10) && d2 === parseInt(cpf[10], 10);
}

// Aceita telefones brasileiros com DDD (10 ou 11 dígitos).
export function whatsappValido(v: string): boolean {
  const d = somenteDigitos(v);
  return d.length === 10 || d.length === 11;
}

export function emailValido(v: string): boolean {
  if (!v) return true; // opcional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function placarValido(n: unknown): boolean {
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 20;
}
