import { NextApiRequest, NextApiResponse } from "next";

const BACKEND = process.env.BACKEND_URL || "https://insightboarddepengine.onrender.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const backendPath = Array.isArray(path) ? path.join("/") : path;
  const url = `${BACKEND}/${backendPath}`;
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

