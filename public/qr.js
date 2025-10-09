// Restrict access: only admin can open this page
if (sessionStorage.getItem("role") !== "admin") {
  alert("Access denied! Only admins can use this page.");
  window.location.href = "index.html"; // redirect back to login
}

// Ensure Firestore is available
if (typeof db === "undefined") {
  console.error("Firestore (db) is not initialized on this page.");
  alert("Firestore is not initialized. Check console for details.");
}

// Function to send SMS via your gateway
function sendSMSviaGateway(phone, message) {
  return fetch("https://gatewaysms24/api/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: phone, message: message })
  });
}

// Helper: display result text
function showResult(text) {
  const el = document.getElementById("result");
  if (el) el.innerText = text;
  else console.log("result:", text);
}

// QR scan handler
function onScanSuccess(decodedText) {
  console.log("QR scanned raw:", decodedText);
  showResult("🔍 Looking up learner...");

  // Normalise decodedText: accept plain ID or JSON { id: "..." }
  let learnerId = null;
  try {
    const parsed = JSON.parse(decodedText);
    learnerId = parsed && parsed.id ? String(parsed.id).trim() : String(decodedText).trim();
  } catch {
    learnerId = String(decodedText).trim();
  }

  if (!learnerId) {
    showResult("❌ Invalid QR content.");
    return;
  }

  const now = new Date();
  const date = now.toLocaleDateString();
  const time = now.toLocaleTimeString();

  // Save attendance (just learnerId for now)
  db.collection("attendance").add({
    learnerId,
    date,
    time,
    status: "Inside"
  })
  .then(attRef => {
    console.log("Attendance recorded (ref):", attRef.id);

    // ✅ Search across ALL teachers' learners by matching doc.id
    return db.collectionGroup("learners")
      .get()
      .then(snapshot => {
        let found = false;

        snapshot.forEach(doc => {
          if (doc.id === learnerId) {
            const data = doc.data() || {};
            const studentName = data.name || "Unknown";
            const parentPhone = data.parentPhone || null;

            // Update attendance record with student name
            attRef.update({ studentName }).catch(err => console.warn("Could not update attendance with name:", err));

            showResult(`✅ ${studentName} marked present at ${time}.`);

            if (parentPhone) {
              const msg = `Your child ${studentName} has entered the school premises at ${time} on ${date}.`;
              sendSMSviaGateway(parentPhone, msg)
                .then(() => console.log("SMS sent to", parentPhone))
                .catch(err => console.error("SMS sending failed:", err));
            } else {
              console.log("Parent phone not found for learner:", doc.id);
            }

            found = true;
          }
        });

        if (!found) {
          console.warn("No learner found for ID:", learnerId);
          showResult("❌ No learner found for scanned QR.");
        }
      })
      .catch(err => {
        console.error("Error fetching learners:", err);
        showResult("⚠️ Error searching learners. Check console.");
      });
  })
  .catch(err => {
    console.error("Unexpected error in attendance flow:", err);
    showResult("⚠️ Unexpected error. Check console for details.");
  });
}

// Initialize scanner
const html5QrCode = new Html5Qrcode("reader");

html5QrCode.start(
  { facingMode: "environment" }, // back camera
  { fps: 10, qrbox: 250 },
  onScanSuccess
).catch(err => {
  console.error("QR scanner failed to start:", err);
  showResult("⚠️ Unable to start scanner. Check console.");
});
