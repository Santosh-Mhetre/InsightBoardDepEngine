import { NextApiRequest, NextApiResponse } from "next";

const BACKEND = process.env.BACKEND_URL || "https://insightboarddepengine.onrender.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const backendPath = Array.isArray(path) ? path.join("/") : path;
  const url = `${BACKEND}/${backendPath}`;
  // debug: log what backend URL and method the proxy will call
  console.log("PROXY ->", req.method, url);
  if (req.body) console.log("PROXY BODY ->", typeof req.body === "object" ? JSON.stringify(req.body) : req.body);
  // safety guard: avoid proxying to self (infinite loop) or invalid BACKEND
  try {
    const target = new URL(url);
    const incomingHost = req.headers.host;
    if (incomingHost && target.host === incomingHost) {
      console.error("Proxy target resolves to same host as incoming request — aborting to avoid loop:", url);
      return res.status(500).json({ detail: "Proxy misconfiguration: BACKEND_URL points to this frontend host." });
    }
  } catch (err) {
    console.error("Invalid proxy target URL:", url, err);
    return res.status(500).json({ detail: "Proxy misconfiguration: invalid BACKEND_URL." });
  }
  // validate backendPath presence (avoid forwarding to /undefined)
  if (!backendPath || backendPath === "undefined") {
    console.error("Proxy called without a valid path:", backendPath);
    return res.status(400).json({ detail: "Missing or invalid proxied path" });
  }
  const init: RequestInit = {
    method: req.method,
    headers: { "Content-Type": "application/json" },
  };
  if (req.body && Object.keys(req.body).length) init.body = JSON.stringify(req.body);
  const r = await fetch(url, init as any);
  const text = await r.text();
  try {
    return res.status(r.status).json(JSON.parse(text));
  } catch (e) {
    return res.status(r.status).send(text);
  }
}

