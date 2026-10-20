import { useEffect, useRef, useState } from "react";
import { confirmationOutcome, READY_MS } from "../domain/engine";
import type { Player } from "../domain/types";
import { Icon, SectionTitle } from "./ui";
export function Matchmaking({
  category,
  priority,
  onFound,
  onCancel,
}: {
  category: string;
  priority: boolean;
  onFound: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onFound, 2200);
    return () => clearTimeout(timer);
  }, [onFound]);
  return (
    <div className="narrow">
      <SectionTitle
        eyebrow="Prepare sua espada. E sua memória."
        title="Buscando um desafio à altura"
        subtitle={`Organizando seu duelo demonstrativo de ${category}.`}
      />
      <div className="panel match-panel">
        <div className="search-orbit">
          <span>⚔️</span>
          <i />
          <i />
        </div>
        <h2>
          {priority
            ? "Você tem prioridade na fila"
            : "Procurando um adversário…"}
        </h2>
        <p>
          As perguntas estão reservadas. Elas só contam como vistas quando
          aparecem na arena.
        </p>
        <div className="match-steps">
          <span>
            <Icon name="check" /> Banco demonstrativo preparado
          </span>
          <span>
            <Icon name="clock" /> Pareamento local simulado
          </span>
        </div>
        <button className="btn secondary" onClick={onCancel}>
          Cancelar busca
        </button>
      </div>
    </div>
  );
}
export function Ready({
  player,
  opponent,
  category,
  onStart,
  onTimeout,
  onCancel,
}: {
  player: Player;
  opponent: Player;
  category: string;
  onStart: () => void;
  onTimeout: (priorityEligible: boolean) => void;
  onCancel: () => void;
}) {
  const [ready, setReady] = useState(false),
    [botReady, setBotReady] = useState(false),
    [seconds, setSeconds] = useState(30);
  const deadline = useRef(Date.now() + READY_MS),
    finished = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => setBotReady(true), 1600);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    const tick = () => {
      const left = deadline.current - Date.now();
      setSeconds(Math.max(0, Math.ceil(left / 1000)));
      const outcome = confirmationOutcome(ready, botReady, READY_MS - left);
      if (finished.current || outcome === "waiting") return;
      finished.current = true;
      if (outcome === "start") onStart();
      else onTimeout(outcome === "requeue-priority");
    };
    tick();
    const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, [ready, botReady, onStart, onTimeout]);
  return (
    <div className="narrow">
      <SectionTitle
        eyebrow="Um encontro na arena"
        title="Adversário encontrado!"
        subtitle={`${category} · Melhor de 3 partidas · 3 perguntas por partida`}
      />
      <div className="panel ready-panel">
        <span className="pill">
          <Icon name="clock" size={16} /> Confirme em {seconds}s
        </span>
        <div className="ready-fighters">
          <div>
            <span className="avatar large">{player.avatar}</span>
            <h3>{player.name}</h3>
            <small>
              {ready ? "Pronto para o duelo" : "Esperando sua confirmação"}
            </small>
          </div>
          <span className="versus">VS</span>
          <div>
            <span className="avatar large purple">{opponent.avatar}</span>
            <h3>{opponent.name}</h3>
            <small>
              {botReady ? "✓ Adversária pronta" : "Preparando o grimório…"}
            </small>
          </div>
        </div>
        <p>
          O conhecimento é sua melhor armadura.
          <br />
          Os dois jogadores precisam confirmar para começar.
        </p>
        <button
          className="btn primary big"
          disabled={ready}
          onClick={() => {
            if (Date.now() < deadline.current) setReady(true);
            else if (!finished.current) {
              finished.current = true;
              onTimeout(false);
            }
          }}
        >
          <Icon name="shield" />
          {ready ? "Aguardando adversária…" : "Estou pronto"}
        </button>
        <button className="text-button" onClick={onCancel}>
          Voltar às categorias
        </button>
      </div>
    </div>
  );
}
