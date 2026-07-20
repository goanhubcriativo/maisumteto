// Doações recorrentes: quem se comprometeu e o que precisa ser enviado hoje.
//
// É a tela que substitui o débito automático que o Mercado Pago não oferece.
// O sistema faz o trabalho chato (lembrar a data, gerar o PIX, montar a
// mensagem); a equipe só toca em "enviar".
//
// A mensagem sai pelo WhatsApp da própria pessoa, por link wa.me. Não usa API do
// WhatsApp de propósito: aquilo custa, exige aprovação de modelo de mensagem e
// leva semanas. Um link que abre a conversa com o texto pronto resolve hoje.

import Link from "next/link";
import { prisma } from "@/lib/db";
import { exigirLogin } from "@/lib/sessao";
import { formatarBRL } from "@/lib/dinheiro";

export const dynamic = "force-dynamic";

function dataCurta(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Monta o link que abre o WhatsApp com a mensagem pronta. */
function linkDoWhatsapp(numero: string, texto: string): string {
  // O WhatsApp espera o número com código do país e só dígitos.
  const limpo = numero.replace(/\D/g, "");
  const comPais = limpo.startsWith("55") ? limpo : `55${limpo}`;
  return `https://wa.me/${comPais}?text=${encodeURIComponent(texto)}`;
}

export default async function Recorrentes() {
  await exigirLogin();

  const assinaturas = await prisma.assinatura.findMany({
    orderBy: [{ status: "asc" }, { proximaCobranca: "asc" }],
    include: {
      acao: { select: { titulo: true } },
      pedidos: {
        where: { status: "PENDENTE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, pixPayload: true, valorBrutoCentavos: true },
      },
    },
  });

  const ativas = assinaturas.filter((a) => a.status === "ATIVA");
  const aEnviar = ativas.filter((a) => a.pedidos.length > 0);
  const total = ativas.reduce((t, a) => t + a.valorCentavos, 0);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.maisumteto.com.br";

  return (
    <div className="painel-largura">
      <div className="painel-cabeca">
        <div>
          <span className="painel-sobre">Doações recorrentes</span>
          <h1>Quem se comprometeu</h1>
          <p className="painel-intro">
            O sistema prepara a cobrança no dia certo e monta a mensagem. Você só confere e
            envia.
          </p>
        </div>
      </div>

      <section className="painel-placar">
        <div>
          <span className="painel-placar-valor">{ativas.length}</span>
          <span className="painel-placar-rotulo">
            {ativas.length === 1 ? "compromisso ativo" : "compromissos ativos"}
          </span>
        </div>
        <div>
          <span className="painel-placar-valor">{formatarBRL(total)}</span>
          <span className="painel-placar-rotulo">por período, se todos pagarem</span>
        </div>
        <div>
          <span className="painel-placar-valor">{aEnviar.length}</span>
          <span className="painel-placar-rotulo">
            {aEnviar.length === 1 ? "lembrete para enviar" : "lembretes para enviar"}
          </span>
        </div>
        <div>
          <span className="painel-placar-valor">
            {assinaturas.filter((a) => a.status === "ENCERRADA").length}
          </span>
          <span className="painel-placar-rotulo">encerrados</span>
        </div>
      </section>

      {aEnviar.length > 0 && (
        <>
          <div className="painel-secao-cabeca">
            <h2>Para enviar agora</h2>
          </div>
          <div className="painel-lista">
            {aEnviar.map((a) => {
              const cobranca = a.pedidos[0];
              const mensagem =
                `Oi, ${a.nome.split(" ")[0]}! Chegou a hora da sua doação ` +
                `${a.periodicidade === "MENSAL" ? "deste mês" : "desta semana"} ` +
                `de ${formatarBRL(a.valorCentavos)} para a Casa Amiga.\n\n` +
                `É só pagar por aqui: ${base}/pagar/${cobranca.id}\n\n` +
                `Se quiser parar, é só me avisar. Obrigado por continuar junto!`;

              return (
                <div key={a.id} className="painel-linha">
                  <span className="painel-linha-corpo">
                    <span className="painel-linha-titulo">{a.nome}</span>
                    <span className="painel-linha-apoio">
                      {formatarBRL(a.valorCentavos)} ·{" "}
                      {a.periodicidade === "MENSAL" ? "mensal" : "semanal"} ·{" "}
                      {a.parcelasPagas} de {a.parcelasPrevistas} pagas · venceu em{" "}
                      {dataCurta(a.proximaCobranca)}
                    </span>
                  </span>

                  <a
                    className="botao botao-primario botao-pequeno"
                    href={linkDoWhatsapp(a.whatsapp, mensagem)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Enviar no WhatsApp
                  </a>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="painel-secao-cabeca">
        <h2>Todos os compromissos</h2>
      </div>

      {assinaturas.length === 0 ? (
        <div className="vazio">
          Ninguém se comprometeu com doação recorrente ainda. Quando alguém aderir pela
          página, aparece aqui.
        </div>
      ) : (
        <div className="painel-lista">
          {assinaturas.map((a) => (
            <div key={a.id} className="painel-linha">
              <span className="painel-linha-corpo">
                <span className="painel-linha-titulo">{a.nome}</span>
                <span className="painel-linha-apoio">
                  {a.acao.titulo} · {formatarBRL(a.valorCentavos)}{" "}
                  {a.periodicidade === "MENSAL" ? "por mês" : "por semana"} ·{" "}
                  {a.parcelasPagas} de {a.parcelasPrevistas} pagas
                  {a.status === "ATIVA"
                    ? ` · próxima em ${dataCurta(a.proximaCobranca)}`
                    : ` · ${a.status.toLowerCase()}`}
                </span>
              </span>
              <span className="painel-linha-valor">
                {formatarBRL(a.valorCentavos * a.parcelasPagas)}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="painel-intro" style={{ marginTop: 30 }}>
        As cobranças são preparadas automaticamente todo dia de manhã. Se precisar preparar
        agora, <Link href="/painel/diagnostico">use o diagnóstico</Link>.
      </p>
    </div>
  );
}
