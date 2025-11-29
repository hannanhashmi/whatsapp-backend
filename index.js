import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔐 ENV variables
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// 🟦 Your custom webhook endpoints
const DASHBOARD_WEBHOOK = process.env.DASHBOARD_WEBHOOK; // optional
const N8N_WEBHOOK = process.env.N8N_WEBHOOK; // optional

// ------------------------------------------------------
// ✅ HEALTH CHECK ROUTES
// ------------------------------------------------------
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// DEFAULT HOME ROUTE
app.get("/", (req, res) => {
  res.send("WhatsApp Backend Running");
});

// SERVER LISTEN
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

// ------------------------------------------------------
// ✅ META WEBHOOK VERIFICATION (IMPORTANT)
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
// ✅ MAIN WEBHOOK RECEIVER → FORWARD TO N8N + DASHBOARD
// ------------------------------------------------------
app.post("/webhook", async (req, res) => {
  try {
    const fullBody = req.body;

    // ✔ forward full JSON to Dashboard (optional)
    if (DASHBOARD_WEBHOOK) {
      try {
        await axios.post(DASHBOARD_WEBHOOK, fullBody);
      } catch (err) {
        console.error("Dashboard Webhook Error:", err.message);
      }
    }

    // ✔ forward full JSON to n8n (recommended)
    if (N8N_WEBHOOK) {
      try {
        await axios.post(N8N_WEBHOOK, fullBody);
      } catch (err) {
        console.error("N8N Webhook Error:", err.message);
      }
    }

    // ------------------------------------------------------
    // OPTIONAL: PARSED MESSAGE EXTRACTION (if needed later)
    // ------------------------------------------------------
    const message = fullBody.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (message) {
      console.log("Incoming WhatsApp Message:", {
        from: message.from,
        text: message.text?.body,
      });
    }

    return res.sendStatus(200);

  } catch (err) {
    console.error("WEBHOOK ERROR:", err.message);
    return res.sendStatus(500);
  }
});

// ------------------------------------------------------
// ✅ SEND MESSAGE API → WhatsApp Cloud API
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
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        },
      }
    );

    res.json(response.data);

  } catch (err) {
    console.error("SEND ERROR:", err.response?.data || err.message);
    res.status(500).json(err.response?.data || { error: err.message });
  }
});

// ------------------------------------------------------
// START SERVER
// ------------------------------------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🔥 Backend running on port " + PORT));
