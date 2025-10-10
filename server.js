import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import admin from "firebase-admin";
import fs from "fs";
import cors from "cors";
import path from "path";

// Firebase setup
// Load service account key from environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();

// Enable CORS for all origins
app.use(cors());
app.options(/.*/, cors());
app.use(bodyParser.json());

// Serve static front-end files from 'public' folder
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "public")));

// Root GET route serves index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Your existing /send-sms endpoint
app.post("/send-sms", async (req, res) => {
  try {
    const { attendance, date, time } = req.body;
    if (!attendance || !attendance.length) {
      return res.status(400).send({ error: "No attendance data provided" });
    }

    let success = 0;

    for (let learner of attendance) {
      if (learner.phone && learner.remarks !== "present") {
        try {
          let phoneNumber = learner.phone.replace(/\D/g, "");
          if (phoneNumber.length === 10) {
            phoneNumber = "63" + phoneNumber;
          }

          const payload = new URLSearchParams();
          payload.append("token", "ff93b1c36d66bf7cd0ec2b9ab8145ff2");
          payload.append("sendto", "+" + phoneNumber);
          payload.append(
            "body",
            `Magandang araw po! Nais po naming ipaalam na ang iyong anak na si ${learner.name} ay ${learner.remarks} sa klase bandang ${time} ng ${date}.`
          );
          payload.append("device_id", "12476");
          payload.append(
            "timetosend",
            new Date().toISOString().slice(0, 19).replace("T", " ")
          );
          payload.append("sim", "1");

          const smsResponse = await fetch("https://smsgateway24.com/getdata/addsms", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: payload,
          });

          const smsResult = await smsResponse.json();
          if (smsResult.error === 0) success++;
        } catch (err) {
          console.error(`SMS failed for ${learner.phone}:`, err.message);
        }
      }
    }

    res.json({ success });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error sending SMS" });
  }
});

// Use Render-assigned PORT or 3000 locally
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
