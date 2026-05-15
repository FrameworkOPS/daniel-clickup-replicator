import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { extractClientName } from "./parsers.js";
import { replicateTemplate } from "./clickup.js";

const {
  CLICKUP_API_TOKEN,
  CLICKUP_SPACE_ID,
  CLICKUP_TEMPLATE_FILE = "./templates/client-template.json",
  WEBHOOK_SECRET,
  FORM_VENDOR = "typeform",
  CLIENT_NAME_FIELD = "client_name",
  PORT = 3000,
} = process.env;

function required(name, value) {
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
}
required("CLICKUP_API_TOKEN", CLICKUP_API_TOKEN);
required("CLICKUP_SPACE_ID", CLICKUP_SPACE_ID);
required("WEBHOOK_SECRET", WEBHOOK_SECRET);

const templatePath = path.resolve(CLICKUP_TEMPLATE_FILE);
const template = JSON.parse(fs.readFileSync(templatePath, "utf8"));

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/", (_req, res) => res.send("daniel-clickup-replicator: ok"));
app.get("/healthz", (_req, res) => res.json({ ok: true, vendor: FORM_VENDOR }));

app.post("/webhook", async (req, res) => {
  const provided = req.header("X-Webhook-Secret") || req.query.secret;
  if (provided !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: "bad secret" });
  }

  const clientName = extractClientName(FORM_VENDOR, req.body, CLIENT_NAME_FIELD);
  if (!clientName) {
    return res.status(400).json({
      error: "could not find client name in payload",
      hint: `Looking for field "${CLIENT_NAME_FIELD}" via ${FORM_VENDOR} parser`,
    });
  }

  try {
    const result = await replicateTemplate({
      token: CLICKUP_API_TOKEN,
      spaceId: CLICKUP_SPACE_ID,
      clientName,
      template,
    });
    console.log(`Replicated template for "${clientName}" → folder ${result.folder.id}`);
    return res.json({ ok: true, client: clientName, folder_id: result.folder.id });
  } catch (err) {
    const detail = err.response?.data ?? err.message;
    console.error("Replication failed:", detail);
    return res.status(500).json({ error: "replication failed", detail });
  }
});

app.listen(PORT, () => {
  console.log(`Listening on :${PORT} (vendor=${FORM_VENDOR})`);
});
