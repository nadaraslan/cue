import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "0.0.0.0";
const model = process.env.OPENAI_MODEL || "gpt-5-mini";
const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "../dist");
const indexHtmlPath = path.join(distDir, "index.html");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(payload));
}

function extractJsonObject(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Model response did not contain JSON.");
  }

  return JSON.parse(match[0]);
}

function sendFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = contentTypes[extension] || "application/octet-stream";

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      sendJson(response, 404, { error: "Not found." });
      return;
    }

    response.writeHead(200, { "Content-Type": contentType });
    response.end(contents);
  });
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (request.method === "OPTIONS") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      model,
      hasApiKey: Boolean(process.env.OPENAI_API_KEY),
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/judge") {
    if (!client) {
      sendJson(response, 500, {
        error: "OPENAI_API_KEY is missing. Add it to your environment before using AI judge mode.",
      });
      return;
    }

    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", async () => {
      try {
        const { slideSummary, point, keyIdeas, previousPoint, nextPoint, recentTranscript, fullTranscript, latestUtterance } = JSON.parse(body || "{}");

        if (!point || !recentTranscript) {
          sendJson(response, 400, { error: "point and recentTranscript are required." });
          return;
        }

        const aiResponse = await client.responses.create({
          model,
          reasoning: { effort: "low" },
          text: { verbosity: "low" },
          input: [
            {
              role: "system",
              content: [
                {
                  type: "input_text",
                  text:
                    "You judge whether a speaker has already communicated one specific presentation point on the current slide. Use the slide summary as context, but evaluate the named point independently. Give the strongest weight to the latest utterance and recent transcript, with full transcript as only supporting context. Accept paraphrases, natural explanations, synonyms, implied meaning, and reordered phrasing. Do not require the speaker to say the bullet word exactly. However, do not mark the point as made just because neighboring or later slide points were discussed. There must be real semantic evidence that this exact point was covered. If a normal human listener would say the speaker clearly communicated this bullet's meaning, mark it as made. Be generous but sensible. Return strict JSON only with keys made, confidence, and reason.",
                },
              ],
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: JSON.stringify(
                    {
                      point,
                      keyIdeas,
                      slideSummary,
                      previousPoint,
                      nextPoint,
                      latestUtterance,
                      recentTranscript,
                      fullTranscript,
                    },
                    null,
                    2
                  ),
                },
              ],
            },
          ],
        });

        const parsed = extractJsonObject(aiResponse.output_text || "");
        sendJson(response, 200, {
          made: Boolean(parsed.made),
          confidence: typeof parsed.confidence === "number" ? parsed.confidence : null,
          reason: typeof parsed.reason === "string" ? parsed.reason : "",
          model,
        });
      } catch (error) {
        sendJson(response, 500, {
          error: error.message || "Judge request failed.",
        });
      }
    });

    return;
  }

  if (request.method === "POST" && url.pathname === "/api/prepare") {
    if (!client) {
      sendJson(response, 500, {
        error: "OPENAI_API_KEY is missing. Add it to your environment before using AI slide preparation.",
      });
      return;
    }

    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", async () => {
      try {
        const { slides } = JSON.parse(body || "{}");

        if (!Array.isArray(slides) || !slides.length) {
          sendJson(response, 400, { error: "slides is required." });
          return;
        }

        const aiResponse = await client.responses.create({
          model,
          reasoning: { effort: "low" },
          text: { verbosity: "low" },
          input: [
            {
              role: "system",
              content: [
                {
                  type: "input_text",
                  text:
                    "You prepare presentation slides for a live cueing assistant. For each slide, write one short summary and for each point write one memorable cue word or a two-word phrase that would instantly remind a presenter about that exact point. Also include up to three supporting keywords. Accept paraphrase-friendly phrasing. Return strict JSON only with a top-level slides array. Each slide item must contain slideIndex, summary, and points. Each points item must contain pointIndex, cue, and keywords.",
                },
              ],
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: JSON.stringify({ slides }, null, 2),
                },
              ],
            },
          ],
        });

        const parsed = extractJsonObject(aiResponse.output_text || "");
        sendJson(response, 200, {
          slides: Array.isArray(parsed.slides) ? parsed.slides : [],
          model,
        });
      } catch (error) {
        sendJson(response, 500, {
          error: error.message || "Slide preparation failed.",
        });
      }
    });

    return;
  }

  if (request.method === "GET") {
    const requestedPath = decodeURIComponent(url.pathname);
    const safePath = path.normalize(requestedPath).replace(/^(\.\.[\/\\])+/, "");
    const filePath = path.join(distDir, safePath === path.sep ? "index.html" : safePath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      sendFile(response, filePath);
      return;
    }

    if (fs.existsSync(indexHtmlPath)) {
      sendFile(response, indexHtmlPath);
      return;
    }
  }

  sendJson(response, 404, { error: "Not found." });
});

server.listen(port, host, () => {
  console.log(`Cue AI judge listening on http://${host}:${port}`);
});
