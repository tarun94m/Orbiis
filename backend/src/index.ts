import express from "express";
import cors from "cors";
import { env } from "./env";
import { ideasRouter } from "./routes/ideas";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, aiProvider: env.AI_PROVIDER, aiModel: env.AI_MODEL });
});

app.use("/api", ideasRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error("[unhandled]", err);
  res.status(500).json({ error: "Unexpected server error." });
});

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`ORBIIS backend listening on http://localhost:${env.PORT}`);
});
