import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { GenerationError } from "./generation.mjs";
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};
export function createApp({ jobs, dist = resolve("dist") }) {
  return createServer(async (req, res) => {
    const json = (status, body) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(JSON.stringify(body));
    };
    try {
      const url = new URL(
        req.url ?? "/",
        `http://${req.headers.host ?? "localhost"}`,
      );
      if (url.pathname === "/api/health" && req.method === "GET")
        return json(200, { ok: true, aiConfigured: !!jobs.provider });
      if (url.pathname === "/api/categories" && req.method === "POST") {
        // Limite de corpo e verificação de origem evitam chamadas involuntárias por outros sites.
        const origin = req.headers.origin;
        if (origin) {
          let host;
          try {
            host = new URL(origin).host;
          } catch {
            return json(403, { error: "Origem inválida." });
          }
          if (
            host !== req.headers.host &&
            !["localhost", "127.0.0.1"].includes(new URL(origin).hostname)
          )
            return json(403, { error: "Origem não autorizada." });
        }
        if (!req.headers["content-type"]?.startsWith("application/json"))
          return json(415, { error: "Envie JSON." });
        let body = "",
          size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 4096)
            return json(413, { error: "Solicitação muito grande." });
          body += chunk;
        }
        let data;
        try {
          data = JSON.parse(body);
        } catch {
          return json(400, { error: "JSON inválido." });
        }
        if (!data || typeof data.id !== "string")
          return json(400, { error: "Identificador de categoria inválido." });
        const category = await jobs.create(data.id, data.name);
        return json(202, { category });
      }
      if (url.pathname.startsWith("/api/categories/") && req.method === "GET") {
        const job = jobs.get(
          decodeURIComponent(url.pathname.slice("/api/categories/".length)),
        );
        return job
          ? json(200, { category: job })
          : json(404, {
              error: "Geração não encontrada. Solicite uma nova pesquisa.",
            });
      }
      if (url.pathname.startsWith("/api/"))
        return json(404, { error: "Endpoint não encontrado." });
      if (req.method !== "GET" && req.method !== "HEAD")
        return json(405, { error: "Método não permitido." });
      const pathname = decodeURIComponent(url.pathname);
      const file = resolve(
        dist,
        "." + (pathname === "/" ? "/index.html" : pathname),
      );
      if (!file.startsWith(dist + sep))
        return json(403, { error: "Caminho inválido." });
      let content;
      try {
        content = await readFile(file);
      } catch (error) {
        if (error.code === "ENOENT")
          return json(404, {
            error: "Arquivo não encontrado. Execute npm run build.",
          });
        throw error;
      }
      res.writeHead(200, {
        "Content-Type": mime[extname(file)] ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control":
          extname(file) === ".html" ? "no-cache" : "public, max-age=3600",
      });
      res.end(req.method === "HEAD" ? undefined : content);
    } catch (error) {
      const code = error instanceof GenerationError ? error.code : "internal";
      const status = ["input", "conflict"].includes(code)
        ? 400
        : code === "not_configured"
          ? 503
          : code === "limit"
            ? 429
            : 500;
      json(status, {
        error:
          error instanceof GenerationError
            ? error.message
            : "O servidor não conseguiu concluir a solicitação.",
      });
    }
  });
}
