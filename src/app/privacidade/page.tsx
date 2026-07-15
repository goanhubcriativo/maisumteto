import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aviso de Privacidade · Bolão da Casa Amiga",
  description:
    "Como tratamos seus dados (nome, WhatsApp e CPF) nesta campanha de arrecadação para a TETO, conforme a LGPD.",
};

// Contato do responsável pela campanha. Troque por um e-mail da GOAN se quiser.
const CONTATO = "higorjuanbernardino@gmail.com";

export default function Privacidade() {
  return (
    <main className="canvas">
      <article className="politica">
        <h1>Aviso de Privacidade</h1>
        <p className="politica-sub">
          Bolão da Casa Amiga · campanha da <strong>GOAN</strong> em apoio à
          construção de uma casa emergencial da <strong>TETO</strong>.
        </p>

        <p>
          Levamos seus dados a sério e seguimos a{" "}
          <strong>LGPD (Lei 13.709/2018)</strong>. Aqui está, de forma direta, o
          que coletamos e por quê.
        </p>

        <h2>Quais dados coletamos</h2>
        <p>Nome completo, WhatsApp e CPF.</p>

        <h2>Para que usamos</h2>
        <ul>
          <li>
            <strong>CPF</strong> — obrigatório para emitir a cobrança PIX junto
            ao nosso provedor de pagamento e identificar o pagamento. Não usamos
            o CPF para nenhuma outra finalidade.
          </li>
          <li>
            <strong>Nome e WhatsApp</strong> — para identificar sua
            contribuição, enviar a confirmação e, em caso de sorteio, entrar em
            contato com quem for sorteado.
          </li>
        </ul>

        <h2>Base legal</h2>
        <p>
          Execução da sua solicitação de doação/participação e o seu
          consentimento, dado ao concluir a contribuição.
        </p>

        <h2>Com quem compartilhamos</h2>
        <p>
          Apenas com o provedor de pagamento, para processar o PIX. Não vendemos
          nem cedemos seus dados a terceiros.
        </p>

        <h2>Por quanto tempo guardamos</h2>
        <p>
          Enquanto durar a campanha e por até 90 dias após o encerramento, para
          prestação de contas. Depois disso, os dados pessoais são apagados ou
          anonimizados.
        </p>

        <h2>Seus direitos</h2>
        <p>
          Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer
          momento pelo e-mail{" "}
          <a href={`mailto:${CONTATO}`}>{CONTATO}</a>.
        </p>

        <h2>Responsável (controlador)</h2>
        <p>
          GOAN | hub criativo — CNPJ 19.548.987/0001-01 — contato:{" "}
          <a href={`mailto:${CONTATO}`}>{CONTATO}</a>.
        </p>

        <p className="politica-idade">
          A participação é destinada a maiores de 18 anos.
        </p>

        <Link href="/" className="politica-voltar">
          Voltar para a campanha
        </Link>
      </article>
    </main>
  );
}
