import type { Answer, Duel, Level, Player, Question, Round } from "./types";
export const QUESTION_MS = 25_000; // Duração provisória, não regra definitiva.
export const READY_MS = 30_000;
export const LEVELS: Level[] = ["abrangente", "específica", "especialista"];
export function score(
  correct: boolean,
  elapsedMs: number,
  durationMs = QUESTION_MS,
): number {
  if (
    !correct ||
    !Number.isFinite(elapsedMs) ||
    !Number.isFinite(durationMs) ||
    elapsedMs >= durationMs ||
    elapsedMs < 0 ||
    durationMs <= 0
  )
    return 0;
  return (
    100 +
    Math.max(0, Math.min(100, Math.floor(100 * (1 - elapsedMs / durationMs))))
  );
}
export function makeAnswer(
  q: Question,
  selectedIndex: number | null,
  elapsedMs: number,
  durationMs = QUESTION_MS,
): Answer {
  return {
    questionId: q.id,
    selectedIndex,
    elapsedMs,
    points: score(selectedIndex === q.correctIndex, elapsedMs, durationMs),
  };
}
export function eligibleQuestions(
  bank: Question[],
  level: Level,
  seenA: string[],
  seenB: string[],
  reserved: string[] = [],
): Question[] {
  const excluded = new Set([...seenA, ...seenB, ...reserved]);
  return bank.filter((q) => q.level === level && !excluded.has(q.id));
}
export function confirmationOutcome(
  ownReady: boolean,
  otherReady: boolean,
  elapsedMs: number,
): "waiting" | "start" | "requeue-priority" | "expired" {
  if (elapsedMs >= READY_MS)
    return ownReady && !otherReady ? "requeue-priority" : "expired";
  return ownReady && otherReady ? "start" : "waiting";
}
export function markSeen(seen: string[], id: string): string[] {
  return [...new Set([...seen, id])];
}
export function total(answers: Answer[]): number {
  return answers.reduce((s, a) => s + a.points, 0);
}
export function roundWinner(round: Round): 0 | 1 | null {
  if (
    round.answers[0].length < 3 ||
    round.answers[0].length !== round.questionIds.length ||
    round.answers[1].length !== round.questionIds.length ||
    new Set(round.questionIds).size !== round.questionIds.length ||
    round.answers.some((answers) =>
      answers.some(
        (answer, index) => answer.questionId !== round.questionIds[index],
      ),
    )
  )
    return null;
  const a = total(round.answers[0]),
    b = total(round.answers[1]);
  return a === b ? null : a > b ? 0 : 1;
}
export function createRound(index: number, questionIds: string[]): Round {
  return { level: LEVELS[index], questionIds, answers: [[], []], winner: null };
}
export function createDuel(
  id: string,
  categoryId: string,
  players: [Player, Player],
  questionIds: string[],
): Duel {
  return {
    id,
    categoryId,
    players,
    rounds: [createRound(0, questionIds)],
    wins: [0, 0],
    winner: null,
    status: "active",
  };
}
export function finishRound(duel: Duel): Duel {
  if (duel.status === "complete") return duel;
  const last = duel.rounds.at(-1)!;
  const winner = roundWinner(last);
  if (winner === null || last.winner !== null) return duel;
  const wins: [number, number] = [...duel.wins];
  wins[winner]++;
  const complete = wins[winner] === 2;
  return {
    ...duel,
    rounds: [...duel.rounds.slice(0, -1), { ...last, winner }],
    wins,
    winner: complete ? winner : null,
    status: complete ? "complete" : "active",
  };
}
