// Traz o bolão da Copa para dentro da plataforma.
//
// A campanha do bolão rodou fora da plataforma, no sistema antigo. Este script
// reescreve a história dela no formato novo: cria uma Ação do tipo BOLÃO e, para
// cada Casinha paga, um Pedido com Itens e os Lançamentos correspondentes.
//
// Depois disso o bolão deixa de ser um site à parte e passa a ser mais uma ação
// da campanha: entra no total, ganha fatia no gráfico, e cada apoiador aparece
// na lista de quem contribuiu. É o que faz o extrato contar a história inteira.
//
// NADA é inventado. Todo valor sai da tabela Casinha, que são os pagamentos
// reais. As tabelas antigas não são tocadas: só lidas.
//
// Rodar com: npm run db:importar-bolao
// Pode rodar de novo: se a ação já existir, não faz nada.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG = "bolao-da-copa";
const PRECO_PALPITE = 1000; // R$ 10, o preço que valeu na campanha

async function main() {
  const campanha = await prisma.campanha.findFirst({ orderBy: { createdAt: "asc" } });
  if (!campanha) {
    throw new Error("Nenhuma campanha no banco. Rode a semeadura primeiro.");
  }

  const jaImportado = await prisma.acao.findFirst({
    where: { campanhaId: campanha.id, slug: SLUG },
  });
  if (jaImportado) {
    console.log(`A ação "${jaImportado.titulo}" já existe. Nada foi alterado.`);
    return;
  }

  // Só o que foi PAGO vira dinheiro. Casinha pendente ou expirada é gente que
  // gerou o PIX e desistiu: não entrou na conta e não entra agora.
  const pagas = await prisma.casinha.findMany({
    where: { status: "PAGO" },
    include: { palpites: true },
    orderBy: { paidAt: "asc" },
  });

  if (pagas.length === 0) {
    console.log("Nenhuma casinha paga encontrada. Nada a importar.");
    return;
  }

  const bruto = pagas.reduce((t, c) => t + c.valorTotalCentavos, 0);
  const palpites = pagas.reduce((t, c) => t + c.palpites.length, 0);

  // A taxa é a diferença entre o que a pessoa pagou e o que caiu na conta.
  // Quando o líquido não foi gravado (pagamento antigo), a taxa daquele
  // pedido conta como zero: melhor não lançar do que lançar chutado.
  const taxa = pagas.reduce(
    (t, c) => t + (c.liquidoCentavos != null ? c.valorTotalCentavos - c.liquidoCentavos : 0),
    0
  );

  console.log(`\nEncontrado no bolão:`);
  console.log(`  ${pagas.length} pagamentos, ${palpites} palpites`);
  console.log(`  Bruto:  R$ ${(bruto / 100).toFixed(2)}`);
  console.log(`  Taxa:   R$ ${(taxa / 100).toFixed(2)}`);
  console.log(`  Limpo:  R$ ${((bruto - taxa) / 100).toFixed(2)}`);

  const primeiro = pagas[0].paidAt ?? pagas[0].createdAt;
  const ultimo = pagas[pagas.length - 1].paidAt ?? pagas[pagas.length - 1].createdAt;

  // Tudo numa transação: ou o bolão inteiro entra, ou nada entra. Meia
  // importação deixaria o extrato com receita sem pedido, impossível de auditar.
  //
  // O prazo padrão do Prisma é 5 segundos, e são dezenas de escritas indo até um
  // banco na nuvem. Sem esticar, a transação expira no meio e desfaz tudo.
  await prisma.$transaction(
    async (db) => {
    const acao = await db.acao.create({
      data: {
        campanhaId: campanha.id,
        tipo: "BOLAO",
        slug: SLUG,
        titulo: "Bolão da Final da Copa",
        descricao:
          "Cada palpite custou R$ 10. Quem cravou o placar da final dividiu metade do bolo; a outra metade ficou na casa. Encerrado com a meta batida.",
        status: "ATIVA",
        precoCentavos: PRECO_PALPITE,
        metaCentavos: 150000, // a meta que valeu na campanha: R$ 1.500
        cor: "campo",
        abreEm: primeiro,
        fechaEm: ultimo,
        config: {
          timeCasa: "Espanha",
          timeVisitante: "Argentina",
          placarFinal: "1 x 0",
          percentualPremio: 50,
          encerrada: true,
          paginaAntiga: "/bolaodacopa",
        },
        blocos: {
          create: [
            {
              tipo: "TEXTO",
              ordem: 0,
              visivel: true,
              conteudo: {
                texto:
                  "O bolão da final da Copa foi a primeira ação desta equipe, e bateu a meta: 102%.\n\nForam R$ 1.530,00 arrecadados com 33 apoiadores. Cinco pessoas cravaram o placar de 1 x 0 para a Espanha, e o prêmio foi sorteado entre elas ao vivo.",
              },
            },
            {
              tipo: "BOTAO",
              ordem: 1,
              visivel: true,
              conteudo: {
                texto: "Ver a página do bolão",
                destino: "/bolaodacopa",
              },
            },
          ],
        },
      },
    });

    for (const casinha of pagas) {
      const quantos = casinha.palpites.length;
      const valorDosPalpites = quantos * PRECO_PALPITE;
      const quando = casinha.paidAt ?? casinha.createdAt;

      const pedido = await db.pedido.create({
        data: {
          campanhaId: campanha.id,
          nome: casinha.nome,
          whatsapp: casinha.whatsapp,
          cpf: casinha.cpf,
          email: casinha.email,
          valorBrutoCentavos: casinha.valorTotalCentavos,
          doacaoExtraCentavos: casinha.doacaoCentavos,
          liquidoCentavos: casinha.liquidoCentavos,
          taxaCentavos:
            casinha.liquidoCentavos != null
              ? casinha.valorTotalCentavos - casinha.liquidoCentavos
              : null,
          status: "PAGO",
          gatewayPagamentoId: casinha.asaasPaymentId,
          gatewayClienteId: casinha.asaasCustomerId,
          createdAt: casinha.createdAt,
          paidAt: quando,
          itens: {
            create: casinha.palpites.map((p) => ({
              acaoId: acao.id,
              quantidade: 1,
              valorUnitarioCentavos: PRECO_PALPITE,
              custoUnitarioCentavos: 0,
              dados: { placarCasa: p.placarCasa, placarVisitante: p.placarVisitante },
              createdAt: p.createdAt,
            })),
          },
        },
      });

      // Receita dos palpites, amarrada à ação do bolão.
      if (valorDosPalpites > 0) {
        await db.lancamento.create({
          data: {
            campanhaId: campanha.id,
            acaoId: acao.id,
            pedidoId: pedido.id,
            tipo: "RECEITA",
            descricao: `Bolão (${quantos} ${quantos === 1 ? "palpite" : "palpites"}) - ${casinha.nome}`,
            valorCentavos: valorDosPalpites,
            data: quando,
          },
        });
      }

      // O "chorinho" não pertence ao bolão: é doação pura para a campanha, e
      // por isso vai sem acaoId, igual acontece hoje nos pedidos novos.
      if (casinha.doacaoCentavos > 0) {
        await db.lancamento.create({
          data: {
            campanhaId: campanha.id,
            acaoId: null,
            pedidoId: pedido.id,
            tipo: "RECEITA",
            descricao: `Doação extra - ${casinha.nome}`,
            valorCentavos: casinha.doacaoCentavos,
            data: quando,
          },
        });
      }

      const taxaDoPedido =
        casinha.liquidoCentavos != null
          ? casinha.valorTotalCentavos - casinha.liquidoCentavos
          : 0;

      if (taxaDoPedido > 0) {
        await db.lancamento.create({
          data: {
            campanhaId: campanha.id,
            acaoId: acao.id,
            pedidoId: pedido.id,
            tipo: "TAXA",
            descricao: `Taxa do gateway - ${casinha.nome}`,
            valorCentavos: -taxaDoPedido, // saída: negativo
            data: quando,
          },
        });
      }
    }
    },
    { timeout: 120_000, maxWait: 20_000 }
  );

  // Confere o que entrou contra o que existia, e reclama se não bater.
  const soma = await prisma.lancamento.aggregate({
    where: { campanhaId: campanha.id },
    _sum: { valorCentavos: true },
  });
  const liquidoEsperado = bruto - taxa;
  const liquidoNoLivro = soma._sum.valorCentavos ?? 0;

  console.log(`\nImportado.`);
  console.log(`  Líquido no livro-caixa: R$ ${(liquidoNoLivro / 100).toFixed(2)}`);

  if (liquidoNoLivro !== liquidoEsperado) {
    console.log(
      `\nATENÇÃO: esperava R$ ${(liquidoEsperado / 100).toFixed(2)} e o livro fechou em ` +
        `R$ ${(liquidoNoLivro / 100).toFixed(2)}. Diferença de ` +
        `R$ ${((liquidoNoLivro - liquidoEsperado) / 100).toFixed(2)}. Confira antes de divulgar.`
    );
  } else {
    console.log(`  Bate exatamente com o que o bolão arrecadou.\n`);
  }
}

main()
  .catch((e) => {
    console.error("\n" + e.message + "\n");
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
