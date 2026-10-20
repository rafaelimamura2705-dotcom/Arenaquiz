import { resolve } from "node:path";
import { createResearchProvider } from "./generation.mjs";
import { CategoryJobs } from "./jobs.mjs";
import { createApp } from "./app.mjs";
const apiKey = process.env.QUIZ_AI_API_KEY;
const jobs = new CategoryJobs({
  provider: apiKey
    ? createResearchProvider({
        apiKey,
        model: process.env.QUIZ_AI_MODEL ?? "gpt-4.1",
      })
    : null,
  file: resolve(process.env.QUIZ_DATA_DIR ?? ".arena-data", "categories.json"),
  maxDaily: Number(process.env.QUIZ_MAX_DAILY_GENERATIONS ?? 20),
});
await jobs.init();
const server = createApp({ jobs });
const port = Number(process.env.PORT ?? 3001);
server.listen(port, "0.0.0.0", () =>
  console.log(
    `Arena Quiz: serviço online na porta ${port}. IA ${apiKey ? "configurada" : "aguardando QUIZ_AI_API_KEY"}.`,
  ),
);
