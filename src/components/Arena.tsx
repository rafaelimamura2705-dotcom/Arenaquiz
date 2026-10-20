import { useEffect, useRef, useState } from "react";
import type { Answer, Duel, Question } from "../domain/types";
import { makeAnswer, QUESTION_MS, total } from "../domain/engine";
import { Icon } from "./ui";
export function Arena({
  duel,
  question,
  index,
  onAnswer,
  onNext,
  durationMs = QUESTION_MS,
}: {
  duel: Duel;
  question: Question;
  index: number;
  onAnswer: (a: Answer, b: Answer) => void;
  onNext: () => void;
  durationMs?: number;
}) {
  const [selected, setSelected] = useState<number | null>(null),
    [remaining, setRemaining] = useState(durationMs),
    [feedback, setFeedback] = useState<Answer | null>(null);
  const deadline = useRef(Date.now() + durationMs),
    locked = useRef(false);
  const round = duel.rounds.at(-1)!;
  const submitRef = useRef<(value: number | null) => void>(() => {});
  function submit(value: number | null) {
    if (locked.current) return;
    locked.current = true;
    const elapsed = Math.min(
      durationMs,
      Math.max(0, durationMs - (deadline.current - Date.now())),
    );
    const answer = makeAnswer(question, value, elapsed, durationMs);
    // Adversário local determinístico. Não é uma pessoa conectada.
    const hash = [...(question.id + duel.id)].reduce(
      (a, c) => a + c.charCodeAt(0),
      0,
    );
    const bot = makeAnswer(
      question,
      hash % 4 === 0 ? (question.correctIndex + 1) % 4 : question.correctIndex,
      8_000 + (hash % 11) * 700,
      durationMs,
    );
    setFeedback(answer);
    onAnswer(answer, bot);
  }
  submitRef.current = submit;
  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, deadline.current - Date.now());
      setRemaining(left);
      if (left === 0) submitRef.current(null);
    };
    tick();
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="arena-page">
      <div className="arena-meta">
        <span className="eyebrow">A arena do conhecimento</span>
        <span className="pill">
          Partida {duel.rounds.length} de 3 · {round.level}
        </span>
      </div>
      <div className="duel-score">
        <div className="fighter">
          <span className="avatar">{duel.players[0].avatar}</span>
          <div>
            <strong>{duel.players[0].name}</strong>
            <small>Você · {total(round.answers[0])} pontos</small>
          </div>
        </div>
        <div className="score-center">
          <strong>
            {duel.wins[0]} <span>:</span> {duel.wins[1]}
          </strong>
          <small>PARTIDAS</small>
        </div>
        <div className="fighter opponent">
          <div>
            <strong>{duel.players[1].name}</strong>
            <small>Simulação · {total(round.answers[1])} pontos</small>
          </div>
          <span className="avatar purple">{duel.players[1].avatar}</span>
        </div>
      </div>
      <section className="question-card">
        <div className="question-top">
          <span>
            {index < 3
              ? `PERGUNTA ${index + 1} DE 3`
              : `DESEMPATE · EXTRA ${index - 2}`}
          </span>
          <span
            className={`timer ${remaining < 6000 ? "urgent" : ""}`}
            role="timer"
            aria-label="Tempo restante"
          >
            <Icon name="clock" />
            {Math.ceil(remaining / 1000)}s
          </span>
        </div>
        <div className="time-track">
          <div style={{ width: `${(remaining / durationMs) * 100}%` }} />
        </div>
        <div className="question-content">
          <div className="question-icon">
            <Icon name="scroll" size={28} />
          </div>
          <h1>{question.prompt}</h1>
          <p>Um pouco de conhecimento pode mudar o rumo do duelo.</p>
          <div className="answers">
            {question.options.map((option, i) => (
              <button
                key={option}
                className={`answer ${selected === i ? "selected" : ""} ${feedback && (i === question.correctIndex ? "correct" : feedback.selectedIndex === i ? "incorrect" : "dimmed")}`}
                onClick={() => setSelected(i)}
                disabled={!!feedback}
                aria-pressed={selected === i}
              >
                <span className="letter">{"ABCD"[i]}</span>
                <span>{option}</span>
                {feedback && i === question.correctIndex && (
                  <Icon name="check" />
                )}
              </button>
            ))}
          </div>
          {feedback ? (
            <div
              className={`answer-feedback ${feedback.points > 0 ? "good" : "bad"}`}
              role="status"
            >
              <div>
                <strong>
                  {feedback.points > 0
                    ? "Boa! Conhecimento que vale ouro."
                    : feedback.selectedIndex === null
                      ? "O tempo acabou!"
                      : "Essa fica para o próximo desafio."}
                </strong>
                <p>
                  {feedback.points > 0
                    ? `+${feedback.points} pontos nesta pergunta.`
                    : `Resposta correta: ${question.options[question.correctIndex]}.`}{" "}
                  <a href={question.source} target="_blank" rel="noreferrer">
                    Consultar referência
                  </a>
                </p>
              </div>
              <button className="btn primary" onClick={onNext}>
                Continuar <Icon name="arrow" />
              </button>
            </div>
          ) : (
            <div className="question-action">
              <span>
                <Icon name="zap" size={16} /> Acerto: 100 pts + até 100 de
                velocidade
              </span>
              <button
                className="btn primary"
                disabled={selected === null}
                onClick={() => submit(selected)}
              >
                Confirmar resposta <Icon name="arrow" />
              </button>
            </div>
          )}
        </div>
      </section>
      <p className="fine-print center">
        Relógio local de {durationMs / 1000}s, provisório. O prazo continua
        correndo ao sair da aba. Em produção, o servidor será autoritativo.
      </p>
    </div>
  );
}
