import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import admin from "firebase-admin";
import fs from "fs";
import cors from "cors";

// Firebase setup
const serviceAccount = JSON.parse(fs.readFileSync("serviceAccountKey.json"));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const app = express();

// Enable CORS for all origins (including 127.0.0.1) and handle preflight OPTIONS
app.use(cors());
app.options(/.*/, cors());
app.use(bodyParser.json());

// Root GET route
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

// /send-sms endpoint
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
          // Ensure phone number is digits only, then prepend country code if needed
          let phoneNumber = learner.phone.replace(/\D/g, ""); // remove non-digits
          if (phoneNumber.length === 10) {
            phoneNumber = "63" + phoneNumber;
          }

          // Build payload for single SMS API
          const payload = new URLSearchParams();
          payload.append("token", "ff93b1c36d66bf7cd0ec2b9ab8145ff2"); // your token
          payload.append("sendto", "+" + phoneNumber); // API expects +XXXXXXXXXXX
          payload.append(
            "body",
            `Magandang araw po! Nais po naming ipaalam na ang iyong anak na si ${learner.name} ay ${learner.remarks} sa klase bandang ${time} ng ${date}.`
          );
          payload.append("device_id", "12476"); // must match your app device ID
          payload.append(
            "timetosend",
            new Date().toISOString().slice(0, 19).replace("T", " ")
          );
          payload.append("sim", "1");

          // Debug log
          console.log("📤 Sending SMS form-data:", payload.toString());

          // Send to single-SMS endpoint
          const smsResponse = await fetch("https://smsgateway24.com/getdata/addsms", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: payload,
          });

          const smsResult = await smsResponse.json();
          console.log(`📩 SMS result for ${phoneNumber}:`, smsResult);

          if (smsResult.error === 0) {
            console.log(`✅ SMS queued successfully for ${phoneNumber}`);
            success++;
          } else {
            console.error(`❌ SMS API error for ${phoneNumber}:`, smsResult.message);
          }
        } catch (err) {
          console.error(`❌ SMS failed for ${learner.phone}:`, err.message);
        }
      }
    }

    res.json({ success });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Error sending SMS" });
  }
});

// Start server
app.listen(3000, () =>
  console.log("🚀 Server running on http://localhost:3000")
);
