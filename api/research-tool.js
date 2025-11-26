import fetch from "node-fetch";

export default async function handler(req, res) {
  // --- CORS headers so Squarespace can call this endpoint ---
  // You can replace * with your Squarespace domain later if you want.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow POST for real requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // Call Vellum's execute-workflow-stream HTTP API
    const vellumResponse = await fetch(
      "https://predict.vellum.ai/v1/execute-workflow-stream",
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
      console.error("Vellum error:", text);
      return res.status(500).json({ error: "Vellum request failed" });
    }

    const data = await vellumResponse.json();

    // Try to pull a sensible text field from outputs
    let outputText = "No output returned.";

    if (Array.isArray(data.outputs) && data.outputs.length > 0) {
      const first = data.outputs[0];
      if (typeof first.value === "string") {
        outputText = first.value;
      }
    } else if (data.outputs && typeof data.outputs === "object") {
      const firstKey = Object.keys(data.outputs)[0];
      if (firstKey && typeof data.outputs[firstKey] === "string") {
        outputText = data.outputs[firstKey];
      }
    }

    return res.status(200).json({ output: outputText });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

