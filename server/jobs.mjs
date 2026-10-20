import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { dirname } from "node:path";
import { generateCategory, GenerationError, normalize } from "./generation.mjs";

const activePhases = new Set(["queued", "researching", "validating"]);
export class CategoryJobs {
  constructor({ provider, file, maxDaily = 20 }) {
    this.provider = provider;
    this.file = file;
    this.maxDaily = maxDaily;
    this.jobs = new Map();
    this.queue = [];
    this.running = false;
    this.writes = Promise.resolve();
  }
  async init() {
    if (!this.file) return;
    let stored;
    try {
      stored = JSON.parse(await readFile(this.file, "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw new Error(
        "Não foi possível ler o banco de categorias. Preserve o arquivo antes de reparar.",
      );
    }
    if (!Array.isArray(stored))
      throw new Error("Formato inválido do banco de categorias.");
    for (const job of stored) {
      if (job && typeof job.id === "string" && typeof job.name === "string")
        this.jobs.set(
          job.id,
          activePhases.has(job.status)
            ? {
                ...job,
                status: "error",
                message:
                  "O serviço reiniciou durante a geração. Tente novamente.",
                questions: [],
              }
            : job,
        );
    }
  }
  publicJob(job) {
    return {
      id: job.id,
      name: job.name,
      status: job.status,
      message: job.message ?? "",
      scope: job.scope ?? "",
      questions: job.status === "ready" ? job.questions : [],
      validatedAt: job.validatedAt ?? null,
    };
  }
  get(id) {
    const job = this.jobs.get(id);
    return job ? this.publicJob(job) : null;
  }
  async persist() {
    if (!this.file) return;
    const data = JSON.stringify([...this.jobs.values()]);
    const operation = this.writes
      .catch(() => {})
      .then(async () => {
        await mkdir(dirname(this.file), { recursive: true });
        await writeFile(this.file + ".tmp", data, { mode: 0o600 });
        await rename(this.file + ".tmp", this.file);
      });
    this.writes = operation;
    await operation;
  }
  async create(id, input) {
    const name =
      typeof input === "string" ? input.trim().replace(/\s+/g, " ") : "";
    if (
      !/^custom-[a-zA-Z0-9-]{1,100}$/.test(id) ||
      name.length < 3 ||
      name.length > 60
    )
      throw new GenerationError(
        "input",
        "Informe um nome de categoria com 3 a 60 caracteres.",
      );
    const previous = this.jobs.get(id);
    if (previous && normalize(previous.name) !== normalize(name))
      throw new GenerationError(
        "conflict",
        "Esse identificador já pertence a outra categoria.",
      );
    if (
      previous &&
      (activePhases.has(previous.status) || previous.status === "ready")
    )
      return this.publicJob(previous);
    if (!this.provider)
      throw new GenerationError(
        "not_configured",
        "A categoria foi criada, mas o serviço precisa de uma chave de API configurada no servidor para pesquisar e gerar perguntas.",
      );
    const today = new Date().toISOString().slice(0, 10);
    const attempts = [...this.jobs.values()]
      .filter((job) => job.attemptDate === today)
      .reduce((sum, job) => sum + (job.attempts ?? 1), 0);
    if (attempts >= this.maxDaily)
      throw new GenerationError(
        "limit",
        "O serviço atingiu o limite diário de gerações configurado.",
      );
    const job = {
      id,
      name,
      status: "queued",
      message: "Pesquisa solicitada. Aguardando o agente.",
      questions: [],
      attemptDate: today,
      attempts:
        previous?.attemptDate === today ? (previous.attempts ?? 1) + 1 : 1,
    };
    this.jobs.set(id, job);
    await this.persist();
    this.queue.push(id);
    this.drain();
    return this.publicJob(job);
  }
  async drain() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length) {
        const id = this.queue.shift(),
          job = this.jobs.get(id);
        try {
          const existingPrompts = [...this.jobs.values()]
            .flatMap((j) => j.questions ?? [])
            .map((q) => q.prompt);
          const result = await generateCategory({
            categoryId: id,
            name: job.name,
            provider: this.provider,
            existingPrompts,
            onPhase: (phase) => {
              job.status = phase;
              job.message =
                phase === "researching"
                  ? "O agente está pesquisando fontes e criando as perguntas."
                  : "Um validador independente está conferindo as fontes e as respostas.";
            },
          });
          Object.assign(job, result, {
            status: "ready",
            message: "Perguntas aprovadas. Categoria habilitada para duelos.",
          });
          await this.persist();
        } catch (error) {
          job.status = "error";
          job.message =
            error instanceof GenerationError
              ? error.message
              : "Não foi possível concluir a geração com segurança. Tente novamente.";
          job.questions = [];
          try {
            await this.persist();
          } catch {
            job.message =
              "Não foi possível salvar as perguntas. Verifique o armazenamento do servidor.";
          }
        }
      }
    } finally {
      this.running = false;
    }
  }
}
