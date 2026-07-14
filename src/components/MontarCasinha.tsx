"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL, reaisParaCentavos } from "@/lib/config";
import CasinhaObra from "@/components/CasinhaObra";
import {
  IconPiloti,
  IconCoracao,
  IconWhats,
  IconCasa,
  IconMais,
  IconX,
  IconCadeado,
  IconSeta,
} from "@/components/icones";

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
  const [email, setEmail] = useState("");

  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const totalFezinhas = fezinhas.length * valorCentavos;
  const total = totalFezinhas + doacaoCentavos;

  function adicionar() {
    setErro("");
    if (novoCasa === "" || novoVisitante === "") {
      setErro("Preencha o placar dos dois times pra fincar o piloti.");
      return;
    }
    setFezinhas((f) => [
      ...f,
      { casa: parseInt(novoCasa, 10), visitante: parseInt(novoVisitante, 10) },
    ]);
    setNovoCasa("");
    setNovoVisitante("");
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
    if (fezinhas.length < 1) {
      setErro("Finque pelo menos um piloti (uma fézinha) antes de fechar.");
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
          email,
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

  const n = fezinhas.length;

  return (
    <>
      {/* Ilustração da obra */}
      <div className="obra">
        <CasinhaObra pilotis={n} />
        <p className="obra-legenda">
          {n === 0 ? (
            <>Sua obra começa com a primeira fézinha.</>
          ) : (
            <>
              Sua casinha já está sobre <b>{n} piloti{n > 1 ? "s" : ""}</b>.
            </>
          )}
        </p>
      </div>

      <div className="folha">
        {/* 01 — Fézinha */}
        <section className="passo">
          <div className="passo-head">
            <span className="passo-num">01</span>
            <h2 className="passo-titulo">Sua fézinha</h2>
            <IconPiloti className="icone" size={22} />
          </div>
          <p className="passo-sub">
            Chute o placar da final. Cada fézinha custa{" "}
            <b>{formatBRL(valorCentavos)}</b> e finca um piloti.
          </p>

          <div className="adder">
            <div className="adder-time">
              <div className="nome">{timeCasa}</div>
              <input
                value={novoCasa}
                onChange={(e) => setNovoCasa(soPlacar(e.target.value))}
                placeholder="0"
                inputMode="numeric"
                aria-label={`Gols ${timeCasa}`}
              />
            </div>
            <span className="x">×</span>
            <div className="adder-time">
              <div className="nome">{timeVisitante}</div>
              <input
                value={novoVisitante}
                onChange={(e) => setNovoVisitante(soPlacar(e.target.value))}
                placeholder="0"
                inputMode="numeric"
                aria-label={`Gols ${timeVisitante}`}
              />
            </div>
            <button type="button" className="btn-add" onClick={adicionar}>
              <IconMais size={16} strokeWidth={2.2} /> Fincar
            </button>
          </div>

          {n > 0 ? (
            <ul className="fezinhas">
              {fezinhas.map((f, i) => (
                <li key={i} className="fezinha-row">
                  <span className="idx">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="placar">
                    {f.casa} <span className="xs">×</span> {f.visitante}
                  </span>
                  <span className="val">{formatBRL(valorCentavos)}</span>
                  <button
                    type="button"
                    className="btn-remover"
                    onClick={() => remover(i)}
                    aria-label="Remover fézinha"
                  >
                    <IconX size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="vazio">Nenhuma fézinha ainda — finque a primeira.</p>
          )}
        </section>

        {/* 02 — Chorinho */}
        <section className="passo">
          <div className="passo-head">
            <span className="passo-num">02</span>
            <h2 className="passo-titulo">Um chorinho pra obra?</h2>
            <IconCoracao className="icone" size={22} />
          </div>
          <p className="passo-sub">
            Opcional: um extra que vai <b>direto pra construção</b>.
          </p>
          <div className="chips">
            {doacaoPresets.map((c) => (
              <button
                type="button"
                key={c}
                className={`chip ${
                  customStr === "" && doacaoCentavos === c ? "ativo" : ""
                }`}
                onClick={() => escolherPreset(c)}
              >
                +{formatBRL(c)}
              </button>
            ))}
          </div>
          <div className="campo" style={{ marginTop: 14, marginBottom: 0 }}>
            <label htmlFor="custom">Outro valor (R$)</label>
            <input
              id="custom"
              value={customStr}
              onChange={(e) => mudarCustom(e.target.value)}
              placeholder="ex.: 15,00"
              inputMode="decimal"
            />
          </div>
        </section>

        {/* 03 — Dados */}
        <section className="passo">
          <div className="passo-head">
            <span className="passo-num">03</span>
            <h2 className="passo-titulo">Seus dados</h2>
            <IconWhats className="icone" size={22} />
          </div>
          <p className="passo-sub">Pra confirmar o PIX e te avisar se ganhar.</p>

          {erro && (
            <div className="erro">
              <IconX size={18} strokeWidth={2.4} />
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
          <div className="campo" style={{ marginBottom: 0 }}>
            <label htmlFor="email">E-mail (opcional)</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
            />
          </div>
        </section>

        {/* 04 — Fechar */}
        <section className="passo">
          <div className="passo-head">
            <span className="passo-num">04</span>
            <h2 className="passo-titulo">Fechar a casinha</h2>
            <IconCasa className="icone" size={22} />
          </div>
          <div className="resumo">
            <div className="resumo-linha">
              <span>
                {n} fézinha{n === 1 ? "" : "s"} × {formatBRL(valorCentavos)}
              </span>
              <span className="v">{formatBRL(totalFezinhas)}</span>
            </div>
            <div className="resumo-linha">
              <span>Chorinho pra obra</span>
              <span className="v">{formatBRL(doacaoCentavos)}</span>
            </div>
            <div className="resumo-total">
              <span className="lbl">Total</span>
              <span className="v">{formatBRL(total)}</span>
            </div>
          </div>

          <button
            className="cta"
            onClick={fechar}
            disabled={enviando || n < 1}
            style={{ marginTop: 18 }}
          >
            {enviando ? (
              "Gerando PIX..."
            ) : (
              <>
                Fechar a casinha • {formatBRL(total)} <IconSeta size={18} />
              </>
            )}
          </button>
          <div className="seguranca">
            <IconCadeado size={14} /> Pagamento único e seguro via PIX
          </div>
        </section>
      </div>
    </>
  );
}
