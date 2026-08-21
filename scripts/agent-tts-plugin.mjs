import { synthesizeAgentSpeech } from "./agent-tts.mjs";

export function agentTtsPlugin() {
  return {
    name: "app-builder:agent-tts",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathOnly = (req.url ?? "").split("?", 1)[0];
        if (pathOnly !== "/api/agent-tts") {
          next();
          return;
        }
        if ((req.method ?? "GET").toUpperCase() !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
          const buf = await synthesizeAgentSpeech(body.text, body.lang);
          res.statusCode = 200;
          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("Cache-Control", "no-store");
          res.end(buf);
        } catch {
          res.statusCode = 500;
          res.end();
        }
      });
    },
  };
}
