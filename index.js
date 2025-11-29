import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ENV VARIABLES
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

const DASHBOARD_WEBHOOK = process.env.DASHBOARD_WEBHOOK; 
const N8N_WEBHOOK = process.env.N8N_WEBHOOK;

// ------------------------------------------------------
// ✅ HEALTH CHECK ROUTES (IMPORTANT FOR DASHBOARD + RENDER)
// ------------------------------------------------------
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Root
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Test
app.get("/test", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// ------------------------------------------------------
// ✅ VERIFY WEBHOOK (META)
// ------------------------------------------------------
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// ------------------------------------------------------
// ✅ RECEIVE WHATSAPP WEBHOOK → Forward to Dashboard + n8n
// ------------------------------------------------------
app.post("/webhook", async (req, res) => {
  const fullBody = req.body;

  // Forward to Dashboard
  if (DASHBOARD_WEBHOOK) {
    axios.post(DASHBOARD_WEBHOOK, fullBody).catch(err => {
      console.error("Dashboard Webhook Error:", err.message);
    });
  }

  // Forward to n8n
  if (N8N_WEBHOOK) {
    axios.post(N8N_WEBHOOK, fullBody).catch(err => {
      console.error("N8N Webhook Error:", err.message);
    });
  }

  // Optional log
  const msg = fullBody.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (msg) {
    console.log("Incoming Message:", {
      from: msg.from,
      text: msg.text?.body,
    });
  }

  res.sendStatus(200);
});

// ------------------------------------------------------
// ✅ SEND MESSAGE API
// ------------------------------------------------------
app.post("/send", async (req, res) => {
  const { to, message } = req.body;

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      },
      {
        headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error("SEND ERROR:", err.response?.data || err.message);
    res.status(500).json(err.response?.data || { error: err.message });
  }
});

// ------------------------------------------------------
// ✅ SINGLE SERVER LISTEN (IMPORTANT!!!)
// ------------------------------------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🔥 Backend running on port " + PORT);
});
