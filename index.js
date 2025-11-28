import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const DASHBOARD_WEBHOOK = process.env.DASHBOARD_WEBHOOK;
const N8N_WEBHOOK = process.env.N8N_WEBHOOK;

// Webhook verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Receive WhatsApp messages
app.post("/webhook", async (req, res) => {
  try {
    const message = req.body.entry?.[0].changes?.[0].value.messages?.[0];
    if (message) {
      const msg = {
        from: message.from,
        text: message.text?.body || "",
        timestamp: message.timestamp,
      };

      if (DASHBOARD_WEBHOOK) {
        await axios.post(DASHBOARD_WEBHOOK, msg);
      }

      if (N8N_WEBHOOK) {
        await axios.post(N8N_WEBHOOK, msg);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.log("WEBHOOK ERR:", err.message);
    res.sendStatus(500);
  }
});

// Send message to WhatsApp
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
    console.log("SEND ERROR:", err.response?.data);
    res.status(500).json(err.response?.data);
  }
});

app.listen(3000, () => console.log("Backend running on port 3000"));
