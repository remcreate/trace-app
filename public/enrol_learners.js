// DOM elements
const saveBtn = document.getElementById("saveBtn");
const bulkInput = document.getElementById("bulkLearners");
const learnersTableBody = document.querySelector("#learnersTable tbody");

// Get current logged-in teacher UID from sessionStorage
const currentTeacherUID = sessionStorage.getItem('currentTeacherUID');
if (!currentTeacherUID) {
  alert('Please login first.');
  window.location.href = 'index.html';
}

// Function to load learners under the current teacher
async function loadLearners() {
  learnersTableBody.innerHTML = ""; // clear table

  try {
    const snapshot = await window.db
      .collection("teachers")
      .doc(currentTeacherUID)
      .collection("learners")
      .get();

    const learners = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      data.id = doc.id; // 🔹 always keep Firestore doc ID
      learners.push(data);
    });

    // Sort learners: males first, then alphabetically
    learners.sort((a, b) => {
      if (a.sex !== b.sex) return a.sex === "male" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    // Display learners in table
    if (learners.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="4" style="text-align:center;">No learners enrolled.</td>`;
      learnersTableBody.appendChild(tr);
      return;
    }

    learners.forEach(learner => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${learner.name}</td>
        <td>${learner.sex.charAt(0).toUpperCase() + learner.sex.slice(1)}</td>
        <td>${learner.parentPhone}</td>
        <td>
          <div id="qr-${learner.id}"></div>
          <button onclick="downloadQR('${learner.id}','${learner.name}')">Download</button>
        </td>
        <td>
        <button onclick="editLearner('${learner.id}', '${learner.parentPhone}')">Edit</button>
        <button onclick="deleteLearner('${learner.id}')">Delete</button>
        </td>
      `;
      learnersTableBody.appendChild(tr);

      // 🔹 Only encode learner ID (to prevent overflow)
      const qrData = learner.id;

      setTimeout(() => {
        new QRCode(document.getElementById(`qr-${learner.id}`), {
          text: qrData,
          width: 100,
          height: 100,
          correctLevel: QRCode.CorrectLevel.L
        });
      }, 100);
    });

  } catch (error) {
    console.error("Error loading learners:", error);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="4" style="text-align:center; color:red;">Failed to load learners</td>`;
    learnersTableBody.appendChild(tr);
  }
}

// Function to save learners under the current teacher
saveBtn.addEventListener("click", async () => {
  const lines = bulkInput.value.trim().split("\n");
  if (!lines.length) return;

  const learners = [];

  for (let line of lines) {
    let parts = line.split(",").map(p => p.trim());
    if (parts.length !== 4) {
      alert(`Invalid format on line: "${line}". Expected 4 parts separated by commas.`);
      return;
    }

    let [lastName, firstNameMiddleInitial, sex, parentPhone] = parts;
    sex = sex.toLowerCase();
    if (sex !== "male" && sex !== "female") {
      alert(`Invalid sex value on line: "${line}". Must be 'Male' or 'Female'.`);
      return;
    }

    const name = `${lastName}, ${firstNameMiddleInitial}`;
    learners.push({ name, sex, parentPhone });
  }

  try {
    const batch = window.db.batch();
    learners.forEach(learner => {
      const docRef = window.db
        .collection("teachers")
        .doc(currentTeacherUID)
        .collection("learners")
        .doc(); // auto-ID

      learner.id = docRef.id;
      batch.set(docRef, learner);
    });

    await batch.commit();
    alert("Learners saved successfully!");
    bulkInput.value = "";
    loadLearners();

  } catch (error) {
    console.error("Error saving learners:", error);
    alert("Failed to save learners. Check console for details.");
  }
});

// 🔹 Function to download QR code
function downloadQR(id, name) {
  const qrDiv = document.getElementById(`qr-${id}`);
  let img = qrDiv.querySelector("img");

  if (img && img.src) {
    const link = document.createElement("a");
    link.href = img.src;
    link.download = `${name}_QR.png`;
    link.click();
  } else {
    let canvas = qrDiv.querySelector("canvas");
    if (canvas) {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${name}_QR.png`;
      link.click();
    } else {
      alert("QR code not ready yet!");
    }
  }
}

// Load learners when page loads
loadLearners();

// Navigate to Mark Attendance page
const goMarkAttendanceBtn = document.getElementById("goMarkAttendanceBtn");
goMarkAttendanceBtn.addEventListener("click", () => {
  window.location.href = "mark_attendance.html";
});

// 🔹 Bulk download all QR codes
const bulkDownloadBtn = document.getElementById("bulkDownloadBtn");
if (bulkDownloadBtn) {
  bulkDownloadBtn.addEventListener("click", () => {
    const rows = learnersTableBody.querySelectorAll("tr");

    rows.forEach(row => {
      const qrDiv = row.querySelector("td div[id^='qr-']");
      const nameCell = row.querySelector("td:first-child");

      if (qrDiv && nameCell) {
        const id = qrDiv.id.replace("qr-", "");
        const name = nameCell.textContent.trim();

        let img = qrDiv.querySelector("img");
        if (img) {
          const link = document.createElement("a");
          link.href = img.src;
          link.download = `${name}_QR.png`;
          link.click();
        } else {
          let canvas = qrDiv.querySelector("canvas");
          if (canvas) {
            const link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = `${name}_QR.png`;
            link.click();
          }
        }
      }
    });
  });
}
// Edit learner's parent phone
async function editLearner(id) {
  try {
    const docRef = window.db.collection("teachers").doc(currentTeacherUID).collection("learners").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      alert("Learner not found");
      return;
    }

    const currentPhone = doc.data().parentPhone || "";
    const newPhone = prompt("Enter new parent phone number:", currentPhone);
    if (newPhone !== null) {
      await docRef.update({ parentPhone: newPhone });
      alert("Parent phone updated!");
      loadLearners();
    }
  } catch (error) {
    console.error("Error editing learner:", error);
    alert("Failed to update learner. Check console.");
  }
}

// Delete learner
async function deleteLearner(id) {
  if (!confirm("Are you sure you want to delete this learner?")) return;
  try {
    const docRef = window.db.collection("teachers").doc(currentTeacherUID).collection("learners").doc(id);
    await docRef.delete();
    alert("Learner deleted!");
    loadLearners();
  } catch (error) {
    console.error("Error deleting learner:", error);
    alert("Failed to delete learner. Check console.");
  }
}