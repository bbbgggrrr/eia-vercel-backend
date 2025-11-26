import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

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
