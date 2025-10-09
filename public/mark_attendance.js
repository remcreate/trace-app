// mark_attendance.js

const currentTeacherUID = sessionStorage.getItem('currentTeacherUID');
if (!currentTeacherUID) {
  alert('Please login first.');
  window.location.href = 'index.html';
}

// DOM elements
const attendanceTableBody = document.querySelector('#attendanceTable tbody');
const dateInput = document.getElementById('dateInput');
const timeInput = document.getElementById('timeInput');
const subjectInput = document.getElementById('subjectInput');
const teacherNameInput = document.getElementById('teacherNameInput');
const markAllPresentCheckbox = document.getElementById('markAllPresent');
const saveBtn = document.getElementById('saveAttendanceBtn');
const sendStatusBtn = document.getElementById('sendStatusBtn');

// Set default date & time
const today = new Date();
dateInput.valueAsDate = today;
const pad = (num) => (num < 10 ? '0' + num : num);
timeInput.value = `${pad(today.getHours())}:${pad(today.getMinutes())}`;

// Load learners
async function loadLearners() {
  attendanceTableBody.innerHTML = '';
  try {
    const snapshot = await db
      .collection('teachers')
      .doc(currentTeacherUID)
      .collection('learners')
      .get();

    if (snapshot.empty) {
      attendanceTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No learners enrolled.</td></tr>`;
      return;
    }

    snapshot.forEach(doc => {
      const learner = doc.data();
      const tr = document.createElement('tr');
      const remarksOptions = ['present', 'absent', 'cutting classes'];
      tr.innerHTML = `
        <td>${learner.name}</td>
        <td>${learner.parentPhone || ''}</td>
        <td>
          <select>
            ${remarksOptions.map(opt => `<option value="${opt}">${opt.charAt(0).toUpperCase() + opt.slice(1)}</option>`).join('')}
          </select>
        </td>
      `;
      attendanceTableBody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error loading learners:', error);
    alert('Failed to load learners.');
  }
}

// Mark All Present toggle
markAllPresentCheckbox.addEventListener('change', () => {
  const isChecked = markAllPresentCheckbox.checked;
  attendanceTableBody.querySelectorAll('tr').forEach(tr => {
    const select = tr.querySelector('select');
    if (select) select.value = isChecked ? 'present' : 'absent';
  });
});

// Save attendance
saveBtn.addEventListener('click', async () => {
  const date = dateInput.value;
  const time = timeInput.value;
  const subject = subjectInput.value.trim();
  const teacherName = teacherNameInput.value.trim();

  if (!date || !subject || !teacherName) {
    alert('Please fill in all required fields.');
    return;
  }

  const attendanceData = [];
  attendanceTableBody.querySelectorAll('tr').forEach(tr => {
    const name = tr.cells[0].textContent;
    const phone = tr.cells[1].textContent;
    const remarks = tr.querySelector('select').value;
    attendanceData.push({ name, phone, remarks });
  });

  try {
    const attendanceRef = db
      .collection('teachers')
      .doc(currentTeacherUID)
      .collection('attendance')
      .doc(date);

    await attendanceRef.set({
      date, time, subject, teacherName,
      recordedByUID: currentTeacherUID,
      timestamp: new Date()
    });

    const batch = db.batch();
    attendanceData.forEach(record => {
      const docRef = attendanceRef.collection('learners').doc(record.name);
      batch.set(docRef, record);
    });
    await batch.commit();

    alert('Attendance saved successfully!');
  } catch (error) {
    console.error('Error saving attendance:', error);
    alert('Failed to save attendance.');
  }
});

// Send SMS for absent or cutting learners
sendStatusBtn.addEventListener('click', async () => {
  const date = dateInput.value;
  const time = timeInput.value;

  const attendanceData = [];
  attendanceTableBody.querySelectorAll('tr').forEach(tr => {
    const name = tr.cells[0].textContent;
    const phone = tr.cells[1].textContent;
    const remarks = tr.querySelector('select').value;
    if (remarks !== 'present' && phone) {
      attendanceData.push({ name, phone, remarks });
    }
  });

  if (!attendanceData.length) {
    alert('No absent or cutting learners to notify.');
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attendance: attendanceData, date, time })
    });

    if (!response.ok) throw new Error('Failed to send SMS');

    const result = await response.json();
    alert(`SMS sent successfully to ${result.success} learners.`);
  } catch (error) {
    console.error('Error sending SMS:', error);
    alert('Failed to send SMS. Check server and console.');
  }
});

// Load learners on page load
loadLearners();
