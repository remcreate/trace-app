const currentTeacherUID = sessionStorage.getItem('currentTeacherUID');
if (!currentTeacherUID) {
  alert('Please login first.');
  window.location.href = 'index.html';
}

const dateRow = document.getElementById('dateRow');
const hourRow = document.getElementById('hourRow');
const summaryTableBody = document.querySelector('#summaryTable tbody');

// fixed hours for each day
const hours = [
  "7:30-8:30",
  "8:30-9:30",
  "9:50-10:50",
  "10:50-11:50",
  "1:00-2:00",
  "2:00-3:00",
  "3:00-4:00",
  "4:00-5:00"
];

function getDatesInMonth(year, month) {
  const date = new Date(year, month, 1);
  const dates = [];
  while (date.getMonth() === month) {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dates.push(new Date(date));
    }
    date.setDate(date.getDate() + 1);
  }
  return dates;
}

// Usage:
const today = new Date();
const datesInMonth = getDatesInMonth(today.getFullYear(), today.getMonth());

async function loadSummary() {
  try {
    // load learners
    const learnersSnap = await db
      .collection('teachers')
      .doc(currentTeacherUID)
      .collection('learners')
      .get();
    const learners = learnersSnap.docs.map(doc => doc.data().name);

    // load attendance data
    const attendanceSnap = await db
      .collection('teachers')
      .doc(currentTeacherUID)
      .collection('attendance')
      .get();

    const attendanceData = {};
    for (let attDoc of attendanceSnap.docs) {
      const date = attDoc.id;
      const learnersSubSnap = await attDoc.ref.collection('learners').get();
      learnersSubSnap.forEach(learnerDoc => {
        const { name, remarks } = learnerDoc.data();
        if (!attendanceData[name]) attendanceData[name] = {};
        Object.entries(remarks).forEach(([hour, val]) => {
          attendanceData[name][`${date}|${hour}`] = val;
        });
      });
    }

    const today = new Date();
    const days = getMonthDays(today.getFullYear(), today.getMonth());

    // header: date row
    dateRow.innerHTML = `<th rowspan="2">#</th><th rowspan="2">Name</th>`;
    days.forEach(day => {
      const dateStr = day.toISOString().split('T')[0];
      dateRow.innerHTML += `<th colspan="${hours.length}">${dateStr}</th>`;
    });

    // header: hours row
    hourRow.innerHTML = '';
    days.forEach(() => {
      hours.forEach(h => {
        hourRow.innerHTML += `<th>${h}</th>`;
      });
    });

    // body: learners rows
    summaryTableBody.innerHTML = '';
    learners.forEach((name, idx) => {
      let rowHTML = `<td>${idx + 1}</td><td>${name}</td>`;
      days.forEach(day => {
        const dateStr = day.toISOString().split('T')[0];
        hours.forEach(h => {
          const key = `${dateStr}|${h}`;
          const remark = attendanceData[name]?.[key] || '';
          rowHTML += `<td>${remark}</td>`;
        });
      });
      summaryTableBody.innerHTML += `<tr>${rowHTML}</tr>`;
    });
  } catch (err) {
    console.error(err);
    alert('Failed to load summary.');
  }
}

loadSummary();
