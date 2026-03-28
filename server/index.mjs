import http from "node:http";
import process from "node:process";
import OpenAI from "openai";

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "127.0.0.1";
const model = process.env.OPENAI_MODEL || "gpt-5-mini";
const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

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

const server = http.createServer((request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && request.url === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      model,
      hasApiKey: Boolean(process.env.OPENAI_API_KEY),
    });
    return;
  }

  if (request.method === "POST" && request.url === "/api/judge") {
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

  if (request.method === "POST" && request.url === "/api/prepare") {
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

  sendJson(response, 404, { error: "Not found." });
});

server.listen(port, host, () => {
  console.log(`Cue AI judge listening on http://${host}:${port}`);
});
