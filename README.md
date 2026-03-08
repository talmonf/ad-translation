# Air Doctor Translation Lab

Compare translations from **OpenAI**, **Claude**, and **Gemini** with a shared prompt and glossary. Use this app to choose a provider and export the final prompt + glossary for your customer support application.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables**

   Copy `.env.example` to `.env` and set:

   - `OPENAI_API_KEY` – OpenAI API key
   - `ANTHROPIC_API_KEY` – Anthropic API key
   - `GEMINI_API_KEY` – Google AI (Gemini) API key
   - `BLOB_READ_WRITE_TOKEN` – (optional) Vercel Blob token for production; omit to use local `./data` JSON files in development

3. **Run locally**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Features

- **Compare** – Enter text and target language; see translations from all three providers side by side.
- **Prompt** – Edit the system prompt (use `{{GLOSSARY}}` and `{{TARGET_LANGUAGE}}`); save and version it.
- **Glossary** – Add terms (e.g. מגדל → Migdal Insurance) so they are not mistranslated.
- **Examples** – Store correct translation examples to refine the prompt manually.
- **Export** – Download or copy the final prompt and glossary for use in your support app.

## Deploy on Vercel

1. Connect the repo to Vercel.
2. Add the same env vars (including `BLOB_READ_WRITE_TOKEN` from your Vercel Blob store).
3. Deploy; data is stored in Vercel Blob.

## Plan

See [docs/PLAN.md](docs/PLAN.md) for the full design and implementation plan.
