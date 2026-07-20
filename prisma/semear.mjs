// Prepara o banco para a campanha real.
//
// Roda uma vez, quando o banco esta vazio. E seguro rodar de novo: nao apaga
// nada, so cria o que faltar (equipe, usuario, campanha e a doacao livre).
//
// NAO cria acao de mentira nem pedido de mentira. O que estava aqui antes era
// dado de exemplo pra ver a tela funcionando; agora o site e publico, e numero
// inventado em pagina de doacao e pedir dinheiro sob falso pretexto.

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

// Mesmo formato de src/lib/auth.ts (scrypt, "sal:hash" em hex).
function criarHashDeSenha(senha) {
  const sal = crypto.randomBytes(16);
  const hash = crypto.scryptSync(senha.normalize("NFKC"), sal, 64, { N: 16384 });
  return `${sal.toString("hex")}:${hash.toString("hex")}`;
}

const EMAIL = process.env.SEMEAR_EMAIL || "higor@maisumteto.com.br";
const SENHA = process.env.SEMEAR_SENHA;
const NOME = process.env.SEMEAR_NOME || "Higor Bernardino";

async function main() {
  // Se ja existe campanha, nao ha o que semear: sai quieto.
  //
  // Esta checagem vem ANTES de exigir a senha de proposito. A semeadura roda a
  // cada build na Vercel, e exigir SEMEAR_SENHA sempre faria todo deploy futuro
  // falhar assim que a variavel fosse removida.
  const existente = await prisma.campanha.findFirst();
  if (existente) {
    console.log(`Campanha "${existente.titulo}" já existe. Semeadura pulada.`);
    return;
  }

  if (!SENHA) {
    throw new Error(
      "Primeiro deploy: defina SEMEAR_SENHA nas variáveis de ambiente.\n" +
        "Ela vira a senha do painel e pode ser trocada depois."
    );
  }
  if (SENHA.length < 8) {
    throw new Error("A senha precisa de pelo menos 8 caracteres.");
  }

  const usuario = await prisma.usuario.upsert({
    where: { email: EMAIL.toLowerCase() },
    update: {},
    create: {
      nome: NOME,
      email: EMAIL.toLowerCase(),
      senhaHash: criarHashDeSenha(SENHA),
    },
  });

  const equipe = await prisma.equipe.upsert({
    where: { slug: "piloti-mestre" },
    update: {},
    create: {
      nome: "Piloti Mestre",
      slug: "piloti-mestre",
      gateway: "MERCADOPAGO",
      gatewayAmbiente: "production",
      // A credencial vem do .env (MP_ACCESS_TOKEN) enquanto e uma equipe so.
      // Quando entrar a segunda, ela passa a vir por OAuth e fica cifrada aqui.
      recebedorRotulo: process.env.SEMEAR_RECEBEDOR || null,
    },
  });

  await prisma.membro.upsert({
    where: { equipeId_usuarioId: { equipeId: equipe.id, usuarioId: usuario.id } },
    update: { papel: "LIDER" },
    create: { equipeId: equipe.id, usuarioId: usuario.id, papel: "LIDER" },
  });

  const campanha = await prisma.campanha.create({
    data: {
      equipeId: equipe.id,
      slug: "um-teto-um-recomeco",
      titulo: "Um TETO, um RECOMEÇO!",
      periodo: "Dezembro de 2026",
      equipeArrecadacao: NOME,
      sede: "TETO Paraná",
      resumo:
        "Uma equipe se juntou para financiar uma casa emergencial inteira. Não é só doar: é bolão, rifa, camisa e evento até fechar a conta.",
      // Texto de partida. Precisa da revisão da Teto antes de divulgar.
      sobreTeto: `A TETO é uma organização que atua em comunidades onde falta o básico: água encanada, saneamento, piso, parede, telhado. O trabalho não é feito para os moradores, é feito com eles. Cada construção começa por uma conversa com a família e termina com a casa erguida em mutirão, num fim de semana, por voluntários e moradores lado a lado.

A casa emergencial não resolve tudo, e ninguém aqui finge que resolve. Ela tira uma família do chão de terra, do frio e da chuva, e cria o ponto de partida para o resto: documentação, trabalho, escola, a briga por moradia definitiva.

Quem sustenta isso é a doação. Cada casa depende de um grupo de pessoas decidindo que aquela casa vai existir. É exatamente o que está acontecendo aqui.`,
      sobreContrato: `Um contrato de Casa Amiga é o compromisso de um grupo de até 30 pessoas em bancar uma casa inteira, do começo ao fim.

O grupo assume a meta, se organiza para levantar o valor e acompanha a construção. No fim, a casa tem nome, endereço e uma família morando dentro.

A nossa equipe decidiu que não ia só pedir doação: cada um entrou com o que sabe fazer.`,
      metaCentavos: Number(process.env.SEMEAR_META_CENTAVOS || 1689063),
      status: "ATIVA",
    },
  });

  // Toda campanha nasce com a doação livre aberta: é a única ação que não
  // precisa de organização nenhuma, e sem ela a página nasceria sem como ajudar.
  await prisma.acao.create({
    data: {
      campanhaId: campanha.id,
      tipo: "DOACAO",
      slug: "doacao",
      titulo: "Doar qualquer valor",
      descricao:
        "Sem sorteio, sem produto, sem contrapartida: o valor inteiro vira material de construção. É a forma mais direta de ajudar.",
      status: "ATIVA",
      precoCentavos: null, // quem doa escolhe
      cor: "teto",
      config: { valoresSugeridos: ["20", "50", "100", "200"], permiteAnonimo: true },
      // Só um bloco de texto vazio, pra equipe escrever.
      //
      // Sem o bloco de NÚMEROS: a página da ação já mostra arrecadado e meta
      // numa caixa grande no alto, e repetir logo abaixo vira ruído.
      blocos: {
        create: [{ tipo: "TEXTO", ordem: 0, visivel: true, conteudo: { texto: "" } }],
      },
    },
  });

  console.log(`
Banco preparado.

  Campanha: ${campanha.titulo}
  Meta:     R$ ${(campanha.metaCentavos / 100).toFixed(2)}
  Login:    ${usuario.email}

Entre em /entrar e cadastre as ações pela caixa de ferramentas.
`);
}

main()
  .catch((e) => {
    console.error("\n" + e.message + "\n");
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
