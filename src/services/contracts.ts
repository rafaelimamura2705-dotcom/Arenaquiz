// Contratos para a integração futura. Nenhuma implementação de produção é simulada como real.
import type { Category, Duel, Question } from "../domain/types";
export interface MatchmakingService {
  join(categoryId: string): Promise<{ reservationId: string }>;
  ready(reservationId: string): Promise<Duel>;
  leave(): Promise<void>;
}
export interface DuelBackend {
  answer(
    duelId: string,
    questionId: string,
    selectedIndex: number,
  ): Promise<void>;
  subscribe(duelId: string, onUpdate: (duel: Duel) => void): () => void;
}
export interface QuestionGenerationService {
  requestCategory(name: string): Promise<{ jobId: string }>;
  status(jobId: string): Promise<"planning" | "validating" | "ready">;
}
export interface QuestionValidator {
  validate(
    question: Question,
  ): Promise<{ approved: boolean; sources: string[] }>;
}
export interface CategoryService {
  list(): Promise<Category[]>;
}
// Produção: relógio, respostas, reservas e conclusão devem ser autoritativos no servidor.
// Gabaritos de perguntas ativas nunca devem fazer parte do payload enviado ao navegador.
