// dashboard.js

const currentTeacherUID = sessionStorage.getItem("currentTeacherUID");

if (!currentTeacherUID) {
  alert("Please login first.");
  window.location.href = "index.html";
}

// Load teacher data
async function loadTeacherData() {
  try {
    const teacherDoc = await window.db.collection("teachers").doc(currentTeacherUID).get();

    if (!teacherDoc.exists) {
      alert("Teacher record not found. Please sign up again.");
      window.location.href = "index.html";
      return;
    }

    const data = teacherDoc.data();

    document.getElementById("welcomeMessage").textContent = `Welcome, ${data.name}!`;
    document.getElementById("teacherName").textContent = data.name || "N/A";
    document.getElementById("teacherEmail").textContent = data.email || "N/A";
    document.getElementById("teacherRole").textContent = data.role || "N/A";
    document.getElementById("teacherGrade").textContent = data.grade || "N/A";
    document.getElementById("teacherSection").textContent = data.section || "N/A";
  } catch (error) {
    console.error("Error loading teacher data:", error);
    alert("Failed to load account data. Please try again.");
  }
}

// Navigate to another page
function goTo(page) {
  window.location.href = page;
}

// Logout
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    await window.auth.signOut();
    sessionStorage.clear();
    alert("You have been logged out.");
    window.location.href = "index.html";
  } catch (error) {
    console.error("Logout failed:", error);
    alert("Error logging out. Please try again.");
  }
});

loadTeacherData();
