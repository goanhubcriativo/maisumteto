"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL, reaisParaCentavos } from "@/lib/config";

interface Props {
  timeCasa: string;
  timeVisitante: string;
  valorCentavos: number; // preço de cada palpite
  doacaoPresets: number[]; // em centavos
}

interface Palpite {
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
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
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

  // Carrinho
  const [palpites, setPalpites] = useState<Palpite[]>([]);
  const [novoCasa, setNovoCasa] = useState("");
  const [novoVisitante, setNovoVisitante] = useState("");

  // Chorinho (doação)
  const [doacaoCentavos, setDoacaoCentavos] = useState(0);
  const [customStr, setCustomStr] = useState("");

  // Dados
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");

  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const totalPalpites = palpites.length * valorCentavos;
  const total = totalPalpites + doacaoCentavos;

  function adicionarPalpite() {
    setErro("");
    if (novoCasa === "" || novoVisitante === "") {
      setErro("Preencha o placar dos dois times para adicionar o palpite.");
      return;
    }
    setPalpites((p) => [
      ...p,
      { casa: parseInt(novoCasa, 10), visitante: parseInt(novoVisitante, 10) },
    ]);
    setNovoCasa("");
    setNovoVisitante("");
  }

  function removerPalpite(i: number) {
    setPalpites((p) => p.filter((_, idx) => idx !== i));
  }

  function escolherPreset(centavos: number) {
    setCustomStr("");
    setDoacaoCentavos((atual) => (atual === centavos ? 0 : centavos));
  }

  function mudarCustom(texto: string) {
    setCustomStr(texto);
    setDoacaoCentavos(reaisParaCentavos(texto));
  }

  async function fecharCasinha() {
    setErro("");
    if (palpites.length < 1) {
      setErro("Adicione pelo menos um palpite antes de fechar a casinha.");
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
          palpites: palpites.map((p) => ({
            placarCasa: p.casa,
            placarVisitante: p.visitante,
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
      setErro("Erro de conexão. Tente novamente.");
      setEnviando(false);
    }
  }

  return (
    <>
      {/* 1. Montar palpites */}
      <div className="card">
        <h2>🏠 Monte sua casinha</h2>
        <p className="sub">
          Adicione quantos palpites quiser — cada um custa{" "}
          <b>{formatBRL(valorCentavos)}</b> e vira tijolo pra obra.
        </p>

        <div className="add-palpite">
          <div>
            <div className="time-nome">{timeCasa}</div>
            <input
              value={novoCasa}
              onChange={(e) => setNovoCasa(soPlacar(e.target.value))}
              placeholder="0"
              inputMode="numeric"
              aria-label={`Gols ${timeCasa}`}
            />
          </div>
          <span className="x">x</span>
          <div>
            <div className="time-nome">{timeVisitante}</div>
            <input
              value={novoVisitante}
              onChange={(e) => setNovoVisitante(soPlacar(e.target.value))}
              placeholder="0"
              inputMode="numeric"
              aria-label={`Gols ${timeVisitante}`}
            />
          </div>
          <button type="button" className="btn-add" onClick={adicionarPalpite}>
            + Adicionar
          </button>
        </div>

        {palpites.length > 0 ? (
          <ul className="casinha-lista">
            {palpites.map((p, i) => (
              <li key={i} className="casinha-item">
                <span className="tijolo">🧱</span>
                <span className="placar">
                  {p.casa} <span className="x-mini">x</span> {p.visitante}
                </span>
                <span className="preco">{formatBRL(valorCentavos)}</span>
                <button
                  type="button"
                  className="btn-remover"
                  onClick={() => removerPalpite(i)}
                  aria-label="Remover palpite"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="vazio">
            Sua casinha está vazia. Adicione seu primeiro palpite acima. 👆
          </div>
        )}
      </div>

      {/* 2. Chorinho */}
      <div className="card">
        <h2>💙 Dá um chorinho pra obra?</h2>
        <p className="sub">
          Opcional: um valor a mais que vai <b>100% pra casa emergencial</b>.
        </p>
        <div className="chorinho-presets">
          {doacaoPresets.map((c) => (
            <button
              type="button"
              key={c}
              className={`preset-btn ${
                customStr === "" && doacaoCentavos === c ? "ativo" : ""
              }`}
              onClick={() => escolherPreset(c)}
            >
              + {formatBRL(c)}
            </button>
          ))}
        </div>
        <div className="campo" style={{ marginTop: 12, marginBottom: 0 }}>
          <label htmlFor="custom">Outro valor (R$)</label>
          <input
            id="custom"
            value={customStr}
            onChange={(e) => mudarCustom(e.target.value)}
            placeholder="Ex.: 15,00"
            inputMode="decimal"
          />
        </div>
      </div>

      {/* 3. Dados */}
      <div className="card">
        <h2>Seus dados</h2>
        <p className="sub">Pra confirmar o pagamento e avisar se você ganhar.</p>

        {erro && <div className="erro">{erro}</div>}

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
      </div>

      {/* 4. Resumo + fechar */}
      <div className="card">
        <h2>Resumo da casinha</h2>
        <div className="resumo">
          <div className="resumo-linha">
            <span>
              {palpites.length} palpite(s) × {formatBRL(valorCentavos)}
            </span>
            <span>{formatBRL(totalPalpites)}</span>
          </div>
          <div className="resumo-linha">
            <span>Chorinho pra obra 💙</span>
            <span>{formatBRL(doacaoCentavos)}</span>
          </div>
          <div className="resumo-total">
            <span>Total</span>
            <span>{formatBRL(total)}</span>
          </div>
        </div>

        <button
          className="btn btn-primario"
          onClick={fecharCasinha}
          disabled={enviando || palpites.length < 1}
          style={{ marginTop: 18 }}
        >
          {enviando
            ? "Gerando PIX..."
            : `Fechar a casinha • ${formatBRL(total)}`}
        </button>
        <p className="valor-destaque">Pagamento único via PIX 🔒</p>
      </div>
    </>
  );
}
