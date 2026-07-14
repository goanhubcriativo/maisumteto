"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL, reaisParaCentavos } from "@/lib/config";
import { IconMais, IconX, IconCadeado, IconSeta } from "@/components/icones";
import Bandeira from "@/components/Bandeira";

interface Props {
  timeCasa: string;
  timeVisitante: string;
  valorCentavos: number;
  doacaoPresets: number[];
}

interface Fezinha {
  casa: number;
  visitante: number;
}

function mascaraCpf(v: string) {
  return v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function mascaraTel(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}
function soPlacar(v: string) {
  return v.replace(/\D/g, "").slice(0, 2);
}

export default function MontarCasinha({
  timeCasa,
  timeVisitante,
  valorCentavos,
  doacaoPresets,
}: Props) {
  const router = useRouter();

  const [fezinhas, setFezinhas] = useState<Fezinha[]>([]);
  const [novoCasa, setNovoCasa] = useState("");
  const [novoVisitante, setNovoVisitante] = useState("");

  const [doacaoCentavos, setDoacaoCentavos] = useState(0);
  const [customStr, setCustomStr] = useState("");

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpf, setCpf] = useState("");

  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [martelo, setMartelo] = useState(0); // dispara a "marretada"

  const n = fezinhas.length;
  const total = n * valorCentavos + doacaoCentavos;

  function adicionar() {
    setErro("");
    if (novoCasa === "" || novoVisitante === "") {
      setErro("Preencha o placar dos dois times pra fincar a fézinha.");
      return;
    }
    setFezinhas((f) => [
      ...f,
      { casa: parseInt(novoCasa, 10), visitante: parseInt(novoVisitante, 10) },
    ]);
    setNovoCasa("");
    setNovoVisitante("");
    setMartelo((m) => m + 1);
  }
  function remover(i: number) {
    setFezinhas((f) => f.filter((_, idx) => idx !== i));
  }
  function escolherPreset(c: number) {
    setCustomStr("");
    setDoacaoCentavos((a) => (a === c ? 0 : c));
  }
  function mudarCustom(t: string) {
    setCustomStr(t);
    setDoacaoCentavos(reaisParaCentavos(t));
  }

  async function fechar() {
    setErro("");
    if (n < 1) {
      setErro("Faça pelo menos uma fézinha antes de fechar.");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/casinhas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          whatsapp,
          cpf,
          doacaoCentavos,
          palpites: fezinhas.map((f) => ({
            placarCasa: f.casa,
            placarVisitante: f.visitante,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro || "Não foi possível fechar a casinha.");
        setEnviando(false);
        return;
      }
      router.push(`/pagar/${data.id}`);
    } catch {
      setErro("Erro de conexão. Tente de novo.");
      setEnviando(false);
    }
  }

  return (
    <>
      {/* Caixa escura — a aposta, simples e direta */}
      <section className="aposta">
        <div className="aposta-topo">
          <h2>Sua fézinha</h2>
          <span className="aposta-jogo">
            R$ {Math.round(valorCentavos / 100)} cada aposta
          </span>
        </div>

        <div className="aposta-adder">
          <div className="lado">
            <span className="time">
              <Bandeira nome={timeCasa} size={20} /> {timeCasa}
            </span>
            <input
              value={novoCasa}
              onChange={(e) => setNovoCasa(soPlacar(e.target.value))}
              placeholder="0"
              inputMode="numeric"
              aria-label={`Gols ${timeCasa}`}
            />
          </div>
          <span className="x">×</span>
          <div className="lado">
            <span className="time">
              <Bandeira nome={timeVisitante} size={20} /> {timeVisitante}
            </span>
            <input
              value={novoVisitante}
              onChange={(e) => setNovoVisitante(soPlacar(e.target.value))}
              placeholder="0"
              inputMode="numeric"
              aria-label={`Gols ${timeVisitante}`}
            />
          </div>
          <span className="add-wrap">
            <button
              type="button"
              className={`aposta-add ${martelo ? "recuo" : ""}`}
              key={`btn-${martelo}`}
              onClick={adicionar}
            >
              <IconMais size={15} strokeWidth={2.4} /> Fincar
            </button>
            {martelo > 0 && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={martelo}
                className="marretada"
                src="/piloti-marretada.svg"
                alt=""
                aria-hidden
              />
            )}
          </span>
        </div>

        {n > 0 && (
          <ul className="aposta-lista">
            {fezinhas.map((f, i) => (
              <li key={i}>
                <span className="pl">
                  <Bandeira nome={timeCasa} size={16} /> {f.casa} <em>×</em>{" "}
                  {f.visitante} <Bandeira nome={timeVisitante} size={16} />
                </span>
                <span className="ord">{i + 1}ª aposta</span>
                <span className="vl">{formatBRL(valorCentavos)}</span>
                <button
                  type="button"
                  className="rm"
                  onClick={() => remover(i)}
                  aria-label="Remover fézinha"
                >
                  <IconX size={14} strokeWidth={2.4} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Dados — direto no fundo bege, sem caixa */}
      <section className="dados">
        <h3 className="dados-titulo">Seus dados</h3>
        {erro && (
          <div className="erro">
            <span>{erro}</span>
          </div>
        )}
        <div className="campo">
          <label htmlFor="nome">Nome completo</label>
          <input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome"
          />
        </div>
        <div className="linha">
          <div className="campo">
            <label htmlFor="whatsapp">WhatsApp</label>
            <input
              id="whatsapp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(mascaraTel(e.target.value))}
              placeholder="(00) 00000-0000"
              inputMode="numeric"
            />
          </div>
          <div className="campo">
            <label htmlFor="cpf">CPF</label>
            <input
              id="cpf"
              value={cpf}
              onChange={(e) => setCpf(mascaraCpf(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
            />
          </div>
        </div>
      </section>

      {/* Ajudinha extra — caixa azul (mesmo azul do Fincar) */}
      <section className="ajudinha">
        <h3>Que tal uma ajudinha extra?</h3>
        <p className="ajudinha-sub">
          Aquela última batida para deixar o piloti no nível.
        </p>
        <div className="ajudinha-opcoes">
          {doacaoPresets.map((c) => (
            <button
              type="button"
              key={c}
              className={`chip ${
                customStr === "" && doacaoCentavos === c ? "ativo" : ""
              }`}
              onClick={() => escolherPreset(c)}
            >
              R$ {c / 100}
            </button>
          ))}
          <input
            className="chip-outro"
            value={customStr}
            onChange={(e) => mudarCustom(e.target.value)}
            placeholder="outro valor"
            inputMode="decimal"
            aria-label="Outro valor em reais"
          />
        </div>
      </section>

      {/* Fechar — resumo enxuto */}
      <div className="fechar">
        <div className="fechar-resumo">
          <span>
            {n} fézinha{n === 1 ? "" : "s"}
            {doacaoCentavos > 0 && <> + ajudinha de {formatBRL(doacaoCentavos)}</>}
          </span>
          <span className="tot">{formatBRL(total)}</span>
        </div>
        <button className="cta" onClick={fechar} disabled={enviando || n < 1}>
          {enviando ? (
            "Gerando PIX..."
          ) : (
            <>
              Finalizar contribuição e fazer aposta <IconSeta size={17} />
            </>
          )}
        </button>
        <div className="seguranca">
          <IconCadeado size={13} /> Pagamento único e seguro via PIX
        </div>
      </div>
    </>
  );
}
