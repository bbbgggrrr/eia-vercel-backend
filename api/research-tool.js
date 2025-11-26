import fetch from "node-fetch";

const ALLOWED_ORIGIN = "*"; 
// Later you can replace "*" with "https://your-squarespace-domain.com"

export default async function handler(req, res) {
  // --- CORS headers for every request (including errors) ---
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // --- Handle preflight OPTIONS request ---
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // --- Only allow POST for real work ---
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // Call the NON-streaming Execute Workflow endpoint
    // Docs: https://predict.vellum.ai/v1/execute-workflow
    const vellumResponse = await fetch(
      "https://predict.vellum.ai/v1/execute-workflow",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.VELLUM_API_KEY
        },
        body: JSON.stringify({
          workflow_deployment_name: "entertainment-insights-assistant",
          release_tag: "LATEST",
          inputs: [
            {
              name: "query",
              type: "STRING",
              value: prompt
            }
          ]
        })
      }
    );

    if (!vellumResponse.ok) {
      const text = await vellumResponse.text();
      console.error("Vellum HTTP error:", vellumResponse.status, text);
      return res.status(500).json({ error: "Vellum request failed" });
    }

    const result = await vellumResponse.json();
    // Shape per Vellum docs: { execution_id, data: { state, outputs: [...] } }
    const data = result.data || {};

    if (data.state === "REJECTED" && data.error) {
      console.error("Vellum rejected:", data.error);
      return res.status(500).json({ error: data.error.message || "Workflow rejected" });
    }

    let outputText = "No output returned.";

    if (Array.isArray(data.outputs) && data.outputs.length > 0) {
      const first = data.outputs[0];
      if (typeof first.value === "string") {
        outputText = first.value;
      }
    }

    return res.status(200).json({ output: outputText });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
