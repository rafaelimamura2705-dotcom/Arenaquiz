import { describe, expect, it } from "vitest";
import {
  confirmationOutcome,
  createDuel,
  createRound,
  eligibleQuestions,
  finishRound,
  makeAnswer,
  markSeen,
  QUESTION_MS,
  roundWinner,
  score,
  total,
} from "./engine";
import { categories, opponent, questions } from "../data/demo";
import type { Duel, Round } from "./types";
const player = { id: "p", name: "Teste", avatar: "🦉" };
function answeredRound(index: number, winner: 0 | 1 | null): Round {
  const qs = questions
    .filter(
      (q) =>
        q.categoryId === "history" &&
        q.level === ["abrangente", "específica", "especialista"][index],
    )
    .slice(0, 3);
  return {
    ...createRound(
      index,
      qs.map((q) => q.id),
    ),
    answers: [
      qs.map((q) => makeAnswer(q, q.correctIndex, winner === 1 ? 15000 : 1000)),
      qs.map((q) => makeAnswer(q, q.correctIndex, winner === 0 ? 15000 : 1000)),
    ],
  };
}
function appendRound(duel: Duel, index: number, winner: 0 | 1 | null) {
  return finishRound({
    ...duel,
    rounds: [...duel.rounds, answeredRound(index, winner)],
  });
}
describe("pontuação e prazo provisório", () => {
  it("concede 100 de base e no máximo 100 de velocidade", () => {
    expect(score(true, 0)).toBe(200);
    expect(score(true, 12500)).toBe(150);
    expect(score(true, 24999)).toBe(100);
  });
  it("zera erro, ausência, resposta fora do prazo e tempo inválido", () => {
    expect(score(false, 1000)).toBe(0);
    expect(score(true, QUESTION_MS)).toBe(0);
    expect(score(true, 30000)).toBe(0);
    expect(score(true, -1)).toBe(0);
    expect(makeAnswer(questions[0], null, 25000).points).toBe(0);
  });
  it("aceita duração configurável", () => {
    expect(score(true, 5000, 10000)).toBe(150);
    expect(score(true, 10000, 10000)).toBe(0);
  });
});
describe("melhor de três", () => {
  it("encerra imediatamente em 2x0 e não pontua duas vezes", () => {
    let duel = createDuel("d", "history", [player, opponent], []);
    duel = finishRound({ ...duel, rounds: [answeredRound(0, 0)] });
    expect(duel.status).toBe("active");
    expect(finishRound(duel).wins).toEqual([1, 0]);
    duel = appendRound(duel, 1, 0);
    expect(duel.wins).toEqual([2, 0]);
    expect(duel.rounds).toHaveLength(2);
    expect(duel.status).toBe("complete");
    expect(duel.winner).toBe(0);
    expect(finishRound(duel)).toBe(duel);
  });
  it("joga a especialista no 1x1 e encerra em 2x1", () => {
    let duel = createDuel("d", "history", [player, opponent], []);
    duel = finishRound({ ...duel, rounds: [answeredRound(0, 0)] });
    duel = appendRound(duel, 1, 1);
    expect(duel.status).toBe("active");
    expect(duel.wins).toEqual([1, 1]);
    duel = appendRound(duel, 2, 0);
    expect(duel.wins).toEqual([2, 1]);
    expect(duel.rounds.map((r) => r.level)).toEqual([
      "abrangente",
      "específica",
      "especialista",
    ]);
    expect(duel.winner).toBe(0);
  });
  it("também encerra uma vitória do adversário em 0x2", () => {
    let duel = createDuel("d", "history", [player, opponent], []);
    duel = finishRound({ ...duel, rounds: [answeredRound(0, 1)] });
    duel = appendRound(duel, 1, 1);
    expect(duel.winner).toBe(1);
    expect(duel.wins).toEqual([0, 2]);
  });
  it("não conclui uma partida antes de três respostas de ambos", () => {
    const round = answeredRound(0, 0);
    round.answers[0] = round.answers[0].slice(0, 2);
    expect(roundWinner(round)).toBeNull();
  });
});
describe("empate e não repetição", () => {
  it("mantém empate aberto e inclui extra inédita do mesmo nível na soma", () => {
    let duel = createDuel("d", "history", [player, opponent], []);
    const round = answeredRound(0, null);
    duel = { ...duel, rounds: [round] };
    expect(finishRound(duel).wins).toEqual([0, 0]);
    const bank = questions.filter((q) => q.categoryId === "history");
    const extra = eligibleQuestions(
      bank,
      round.level,
      round.questionIds,
      round.questionIds,
    )[0];
    expect(extra.level).toBe(round.level);
    expect(round.questionIds).not.toContain(extra.id);
    round.questionIds.push(extra.id);
    round.answers[0].push(makeAnswer(extra, extra.correctIndex, 1000));
    round.answers[1].push(makeAnswer(extra, null, 25000));
    const completed = finishRound(duel);
    expect(completed.wins).toEqual([1, 0]);
    expect(completed.rounds[0].answers[0]).toHaveLength(4);
    expect(total(completed.rounds[0].answers[0])).toBeGreaterThan(
      total(completed.rounds[0].answers[1]),
    );
  });
  it("exclui perguntas vistas por qualquer um dos dois e questões reservadas", () => {
    const bank = questions.filter(
      (q) => q.categoryId === "history" && q.level === "abrangente",
    );
    const ids = bank.map((q) => q.id);
    const seenA = [ids[0]],
      seenB = [ids[1]],
      reserved = [ids[2]];
    expect(
      eligibleQuestions(bank, "abrangente", seenA, seenB, reserved).map(
        (q) => q.id,
      ),
    ).toEqual([ids[3]]);
    expect(seenA).toEqual([ids[0]]);
    expect(seenB).toEqual([ids[1]]);
  });
  it("marca a exibição mesmo sem resposta e não confunde reserva com vista", () => {
    const q = questions[0];
    let seen: string[] = [];
    eligibleQuestions(questions, q.level, seen, [], [q.id]);
    expect(seen).toEqual([]);
    seen = markSeen(seen, q.id);
    expect(makeAnswer(q, null, 25000).points).toBe(0);
    expect(eligibleQuestions(questions, q.level, seen, [])).not.toContainEqual(
      q,
    );
    expect(markSeen(seen, q.id)).toEqual(seen);
  });
  it("retorna estoque vazio sem reciclar perguntas", () => {
    expect(
      eligibleQuestions(
        questions,
        "abrangente",
        questions.map((q) => q.id),
        [],
      ),
    ).toEqual([]);
  });
});
describe("integridade do banco demonstrativo", () => {
  it("contém quatro questões por nível em cada categoria", () => {
    for (const c of categories)
      for (const level of ["abrangente", "específica", "especialista"] as const)
        expect(
          questions.filter((q) => q.categoryId === c.id && q.level === level),
        ).toHaveLength(4);
  });
  it("usa IDs e enunciados únicos, quatro opções e referência HTTPS", () => {
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    expect(new Set(questions.map((q) => q.prompt)).size).toBe(questions.length);
    for (const q of questions) {
      expect(new Set(q.options).size).toBe(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(4);
      expect(q.source).toMatch(/^https:\/\//);
    }
  });
});

describe("confirmação de presença", () => {
  it("exige os dois prontos antes do prazo", () => {
    expect(confirmationOutcome(true, false, 10_000)).toBe("waiting");
    expect(confirmationOutcome(false, true, 10_000)).toBe("waiting");
    expect(confirmationOutcome(true, true, 29_999)).toBe("start");
    expect(confirmationOutcome(true, true, 30_000)).toBe("expired");
  });
  it("dá prioridade apenas a quem confirmou se o outro falhar", () => {
    expect(confirmationOutcome(true, false, 30_000)).toBe("requeue-priority");
    expect(confirmationOutcome(false, true, 30_000)).toBe("expired");
    expect(confirmationOutcome(false, false, 30_000)).toBe("expired");
  });
  it("recusa partidas com perguntas duplicadas ou fora de ordem", () => {
    const round = answeredRound(0, 0);
    round.answers[1].reverse();
    expect(roundWinner(round)).toBeNull();
    const duplicate = answeredRound(0, 0);
    duplicate.questionIds[1] = duplicate.questionIds[0];
    expect(roundWinner(duplicate)).toBeNull();
  });
});
