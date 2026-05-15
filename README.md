# daniel-clickup-replicator

Webhook → ClickUp client onboarding. When a form is submitted (Typeform, Jotform, or Tally), this service creates a new **Folder** in your ClickUp Space named after the client, then replicates a predetermined layout of **Lists** and **Tasks** inside it.

Built for Daniel by Framework OPS.

---

## What you need to give me before this works

1. **Your exact ClickUp layout.** Open [`templates/client-template.json`](templates/client-template.json) and replace the placeholder Lists/Tasks with the real onboarding structure you want every new client to get. Each list can have any number of seeded tasks. See "Template format" below.
2. **ClickUp API token.** ClickUp → your avatar (bottom-left) → **Settings** → **Apps** → **Generate** under "API Token". Starts with `pk_...`.
3. **ClickUp Space ID.** Open the Space in your browser. The numeric ID is in the URL: `https://app.clickup.com/<workspace>/v/o/s/<SPACE_ID>`. New client folders are created inside this Space.
4. **Form webhook URL.** Once this service is deployed (see "Deploy"), you'll get a public URL like `https://daniel-clickup-replicator.onrender.com/webhook`. Paste that URL into your form vendor's webhook settings:
   - **Typeform:** Connect → Webhooks → Add a webhook
   - **Jotform:** Settings → Integrations → Webhooks
   - **Tally:** Integrations → Webhooks
5. **Which form field holds the client name.** Tell your form vendor to send a field that contains the new client's company name, and put its identifier in `CLIENT_NAME_FIELD`:
   - **Typeform:** set a `ref` on the question (Logic panel) — use that `ref` as `CLIENT_NAME_FIELD`
   - **Jotform:** use the question label (e.g. `clientName`)
   - **Tally:** use the question label exactly as shown

---

## Template format

`templates/client-template.json`:

```json
{
  "folder_template_id": null,
  "lists": [
    {
      "name": "Onboarding",
      "content": "Optional list description",
      "tasks": [
        { "name": "Send welcome email", "description": "...", "priority": 2 },
        { "name": "Schedule kickoff call" }
      ]
    },
    { "name": "Operations Audit", "tasks": [ { "name": "Map intake-to-invoice" } ] }
  ]
}
```

Notes:
- `priority`: 1=urgent, 2=high, 3=normal, 4=low.
- Task fields support anything ClickUp's [create-task API](https://clickup.com/api/clickupreference/operation/CreateTask/) accepts (`due_date`, `assignees`, `tags`, etc.).
- **Statuses, custom fields, automations, and views are not copied via API.** Set those up once on a ClickUp **Folder Template** inside ClickUp itself; the new folders this service creates will inherit Space-level settings automatically.

---

## Deploy to Render

1. Push this repo to GitHub (already done at `frameworkopsllc/daniel-clickup-replicator`).
2. Go to [render.com](https://render.com) → **New** → **Web Service** → connect this repo.
3. Render auto-detects `render.yaml`. Click **Apply**.
4. In the Render dashboard for the service, open **Environment** and fill in:
   - `CLICKUP_API_TOKEN`
   - `CLICKUP_SPACE_ID`
   - `WEBHOOK_SECRET` — any long random string; you'll paste the same value into your form webhook headers
   - `FORM_VENDOR` — `typeform`, `jotform`, or `tally`
   - `CLIENT_NAME_FIELD` — the identifier described above
5. Wait for deploy. Confirm `https://<your-service>.onrender.com/healthz` returns `{"ok":true,...}`.

### Webhook security

Your form vendor must send the secret. In your form vendor's webhook settings, add a custom header:

```
X-Webhook-Secret: <same value you put in WEBHOOK_SECRET>
```

If the vendor doesn't support custom headers, append `?secret=<value>` to the webhook URL instead.

---

## Local development

```bash
cp .env.example .env       # fill in values
npm install
npm run dev
```

Test with curl (Typeform-shaped payload):

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $WEBHOOK_SECRET" \
  -d '{
    "form_response": {
      "answers": [
        { "field": { "ref": "client_name" }, "type": "text", "text": "Acme Plumbing" }
      ]
    }
  }'
```

You should see a new folder named **Acme Plumbing** appear in your ClickUp Space.

---

## Endpoints

| Method | Path        | Purpose                                            |
|-------:|-------------|----------------------------------------------------|
| GET    | `/`         | Liveness ping                                      |
| GET    | `/healthz`  | Health check (used by Render)                      |
| POST   | `/webhook`  | Form trigger — replicates template under new folder |

---

## Support

Questions? chance@frameworkopsllc.com
