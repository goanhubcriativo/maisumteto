"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatBRL, reaisParaCentavos } from "@/lib/config";
import {
  IconMais,
  IconX,
  IconCadeado,
  IconSeta,
  IconFeliz,
  IconTriste,
  IconCheck,
} from "@/components/icones";
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

  const [erroMsg, setErroMsg] = useState(""); // dispara o popup da mangueira
  const [soAjuda, setSoAjuda] = useState(false); // "não quero apostar, só ajudar"
  const [enviando, setEnviando] = useState(false);
  const [martelo, setMartelo] = useState(0); // dispara a "marretada"

  // Popup "a maioria fez 3 apostas": arma na 1ª aposta, abre quando rolar a tela.
  const [popupPendente, setPopupPendente] = useState(false);
  const [popupAberto, setPopupAberto] = useState(false);
  const [popupJaMostrado, setPopupJaMostrado] = useState(false);
  const [naoFase, setNaoFase] = useState(0); // 0 e 1 = corre; 2 = pode clicar
  const [naoCorrendo, setNaoCorrendo] = useState(false);
  const [naoPos, setNaoPos] = useState("translate(0px, 0px) rotate(0deg)");
  const runInt = useRef<ReturnType<typeof setInterval> | null>(null);
  const runTo = useRef<ReturnType<typeof setTimeout> | null>(null);
  const casaRef = useRef<HTMLInputElement>(null);

  // Percursos que o "Não" percorre (dois sentidos diferentes) + pontos de descanso.
  const PERCURSO_A = [
    "translate(66px, -40px) rotate(9deg)",
    "translate(-74px, 26px) rotate(-9deg)",
    "translate(48px, 44px) rotate(7deg)",
    "translate(-58px, -42px) rotate(-7deg)",
    "translate(72px, 10px) rotate(9deg)",
    "translate(-40px, 40px) rotate(-6deg)",
  ];
  // 2ª corrida: sai do canto esquerdo (emerge pra direita) e corre — todos os
  // pontos ficam à direita/centro pra ele não sumir enquanto a caixa corta.
  const PERCURSO_B = [
    "translate(62px, -30px) rotate(9deg)",
    "translate(18px, 42px) rotate(-6deg)",
    "translate(72px, 14px) rotate(9deg)",
    "translate(30px, -42px) rotate(-6deg)",
    "translate(56px, 34px) rotate(7deg)",
    "translate(12px, -8px) rotate(-5deg)",
  ];
  const DESCANSO = [
    "translate(-152px, 14px) rotate(-15deg)", // 1ª vez: some quase todo atrás da borda (só uma pontinha aparece)
    "translate(0px, 0px) rotate(0deg)", // 2ª vez: volta pro lugar original
  ];
  // A caixa "corta" o botão durante a fase escondida (descanso + 2ª corrida),
  // então ele surge de trás da borda esquerda ao invés de piscar por fora.
  const boxEscondeu = naoFase === 1;

  const n = soAjuda ? 0 : fezinhas.length;
  const total = n * valorCentavos + doacaoCentavos;
  const podeFechar = soAjuda ? doacaoCentavos > 0 : n >= 1;

  // Marca "só ajudar": zera as fézinhas e o placar em digitação.
  function alternarSoAjuda() {
    setErroMsg("");
    setSoAjuda((s) => {
      const novo = !s;
      if (novo) {
        setFezinhas([]);
        setNovoCasa("");
        setNovoVisitante("");
      }
      return novo;
    });
  }

  function pararCorrida() {
    if (runInt.current) clearInterval(runInt.current);
    if (runTo.current) clearTimeout(runTo.current);
    runInt.current = null;
    runTo.current = null;
  }
  // limpa timers ao desmontar
  useEffect(() => () => pararCorrida(), []);

  // Abre o popup só depois de uma "roladinha" na tela.
  useEffect(() => {
    if (!popupPendente) return;
    const armY = window.scrollY;
    const onScroll = () => {
      if (Math.abs(window.scrollY - armY) > 24) {
        window.removeEventListener("scroll", onScroll);
        setNaoFase(0);
        setNaoCorrendo(false);
        setNaoPos("translate(0px, 0px) rotate(0deg)");
        setPopupPendente(false);
        setPopupAberto(true);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [popupPendente]);

  // Fecha os popups com a tecla Escape (acessibilidade).
  useEffect(() => {
    if (!popupAberto && !erroMsg) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (erroMsg) {
        setErroMsg("");
      } else {
        pararCorrida();
        setPopupAberto(false);
        setNaoFase(0);
        setNaoCorrendo(false);
        setNaoPos("translate(0px, 0px) rotate(0deg)");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popupAberto, erroMsg]);

  function adicionar() {
    setErroMsg("");
    if (novoCasa === "" || novoVisitante === "") {
      setErroMsg(
        "Faltou o placar de um dos times. Coloca quantos gols cada seleção faz e finca de novo."
      );
      return;
    }
    const primeira = fezinhas.length === 0;
    setFezinhas((f) => [
      ...f,
      { casa: parseInt(novoCasa, 10), visitante: parseInt(novoVisitante, 10) },
    ]);
    setNovoCasa("");
    setNovoVisitante("");
    setMartelo((m) => m + 1);
    if (primeira && !popupJaMostrado) {
      setPopupPendente(true); // arma; abre só quando rolar a tela
      setPopupJaMostrado(true);
    }
  }

  // O "Não" corre sem parar por ~2s (fugindo), para, corre de novo em outro
  // sentido por mais ~2s e só então (após ~4s) fica parado pra clicar.
  function clicarNao() {
    if (naoCorrendo) return; // está fugindo, ignora o clique
    // Acessibilidade: quem pediu menos movimento não leva o botão fugindo —
    // "Não" fecha direto.
    const semMovimento =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (naoFase >= 2 || semMovimento) {
      pararCorrida();
      setPopupAberto(false);
      return;
    }
    const fase = naoFase;
    const percurso = fase === 0 ? PERCURSO_A : PERCURSO_B;
    setNaoCorrendo(true);
    setNaoPos(percurso[0]);
    let i = 0;
    runInt.current = setInterval(() => {
      i = (i + 1) % percurso.length;
      setNaoPos(percurso[i]);
    }, 200);
    runTo.current = setTimeout(() => {
      pararCorrida();
      setNaoPos(DESCANSO[fase]);
      setNaoCorrendo(false);
      setNaoFase(fase + 1);
    }, 2000);
  }
  function clicarSim() {
    pararCorrida();
    setPopupAberto(false);
    setNaoFase(0);
    setNaoCorrendo(false);
    setNaoPos("translate(0px, 0px) rotate(0deg)");
    setTimeout(() => casaRef.current?.focus(), 60);
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
    setErroMsg("");

    // Validações amigáveis (todas caem no popup da mangueira).
    if (!soAjuda && fezinhas.length < 1) {
      setErroMsg(
        "Você ainda não fez nenhuma fézinha. Finca um palpite, ou marque “só quero ajudar” pra doar sem apostar."
      );
      return;
    }
    if (soAjuda && doacaoCentavos <= 0) {
      setErroMsg(
        "Pra ajudar sem apostar, escolha um valor da ajudinha extra ali embaixo."
      );
      return;
    }
    if (nome.trim().length < 3) {
      setErroMsg("Faltou seu nome completo, a gente quer saber quem ergueu essa casa!");
      return;
    }
    const telDigitos = whatsapp.replace(/\D/g, "");
    if (telDigitos.length !== 10 && telDigitos.length !== 11) {
      setErroMsg("Confere o WhatsApp: precisa do DDD + número completo.");
      return;
    }
    if (cpf.replace(/\D/g, "").length !== 11) {
      setErroMsg("Confere o CPF: são 11 dígitos (é ele que identifica o PIX).");
      return;
    }
    if (total < 500) {
      setErroMsg(
        "O PIX tem um mínimo de R$ 5. Junte mais fézinhas ou uma ajudinha extra pra chegar lá."
      );
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
          palpites: soAjuda
            ? []
            : fezinhas.map((f) => ({
                placarCasa: f.casa,
                placarVisitante: f.visitante,
              })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErroMsg(data.erro || "Não foi possível fechar a aposta. Tenta de novo.");
        setEnviando(false);
        return;
      }
      router.push(`/pagar/${data.id}`);
    } catch {
      setErroMsg("Deu ruim na conexão. Confere a internet e tenta de novo.");
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

        {soAjuda ? (
          <p className="so-ajuda-nota">
            Fechado! Você vai <strong>ajudar sem apostar</strong>. É só escolher o
            valor da contribuição na <em>ajudinha extra</em>, logo abaixo.
          </p>
        ) : (
          <>
        <div className="aposta-adder">
          <div className="lado">
            <span className="time">
              <Bandeira nome={timeCasa} size={20} /> {timeCasa}
            </span>
            <input
              ref={casaRef}
              value={novoCasa}
              onChange={(e) => setNovoCasa(soPlacar(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && adicionar()}
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
              onKeyDown={(e) => e.key === "Enter" && adicionar()}
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
          </>
        )}

        <label className="so-ajuda">
          <input
            type="checkbox"
            checked={soAjuda}
            onChange={alternarSoAjuda}
            aria-label="Não quero apostar, mas quero ajudar"
          />
          <span className="so-ajuda-box" aria-hidden>
            {soAjuda && <IconCheck size={6} strokeWidth={4} />}
          </span>
          <span className="so-ajuda-txt">
            Não quero apostar, <strong>mas quero ajudar</strong>
          </span>
        </label>
      </section>

      {/* Dados — direto no fundo bege, sem caixa */}
      <section className="dados">
        <h3 className="dados-titulo">Seus dados</h3>
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
            {soAjuda ? (
              doacaoCentavos > 0 ? (
                <>Ajudinha de {formatBRL(doacaoCentavos)}</>
              ) : (
                <>Escolha o valor da ajudinha</>
              )
            ) : (
              <>
                {n} fézinha{n === 1 ? "" : "s"}
                {doacaoCentavos > 0 && (
                  <> + ajudinha de {formatBRL(doacaoCentavos)}</>
                )}
              </>
            )}
          </span>
          <span className="tot">{formatBRL(total)}</span>
        </div>
        <button
          className={`cta ${!podeFechar ? "cta-espera" : ""}`}
          onClick={fechar}
          disabled={enviando}
        >
          {enviando ? (
            "Gerando PIX..."
          ) : (
            <>
              Finalizar contribuição <IconSeta size={17} />
            </>
          )}
        </button>
        <div className="seguranca">
          <IconCadeado size={13} /> Pagamento único e seguro via PIX
        </div>
        <p className="consentimento">
          Ao contribuir, você declara ser maior de 18 anos e concorda com o{" "}
          <a href="/privacidade">Aviso de Privacidade</a>.
        </p>
      </div>

      {/* Popup pós-primeira-aposta: o "Não" foge duas vezes */}
      {popupAberto && (
        <div className="pop-overlay">
          <div
            className={`pop-box ${boxEscondeu ? "escondeu" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label="Deseja fazer mais uma aposta?"
          >
            <p className="pop-titulo">
              A maioria das pessoas
              <br />
              fez 3 apostas!
            </p>
            <p className="pop-sub">Deseja fazer mais uma?</p>
            <div className="pop-botoes">
              <button
                type="button"
                className="pop-nao"
                style={{ transform: naoPos }}
                onClick={clicarNao}
              >
                <IconTriste size={18} /> Não
              </button>
              <button type="button" className="pop-sim" onClick={clicarSim}>
                Sim <IconFeliz size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup de erro — pisou na mangueira de nível */}
      {erroMsg && (
        <div className="pop-overlay" onClick={() => setErroMsg("")}>
          <div
            className="pop-erro"
            role="alertdialog"
            aria-modal="true"
            aria-label="Deu um probleminha"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pop-erro-vetor">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mangueira.svg" alt="" width={150} height={152} />
            </div>
            <p className="pop-erro-tit">
              Ah não! Pisou na
              <br />
              Mangueira de Nível
            </p>
            <p className="pop-erro-msg">{erroMsg}</p>
            <button
              type="button"
              className="pop-corrigir"
              onClick={() => setErroMsg("")}
            >
              Corrigir
            </button>
          </div>
        </div>
      )}
    </>
  );
}
