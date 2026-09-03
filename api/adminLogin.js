// /api/adminLogin.js - Vercel Serverless Function
// Set ADMIN_TOKEN in Vercel Environment Variables

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ success: false, message: "Method not allowed" });
    return;
  }

  const { token } = req.body || {};

  if (!token) {
    res.status(400).json({ success: false, message: "Token required" });
    return;
  }

  if (token === process.env.ADMIN_TOKEN) {
    res.status(200).json({ success: true });
  } else {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};