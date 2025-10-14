// summary.js

const currentTeacherUID = sessionStorage.getItem('currentTeacherUID');
if (!currentTeacherUID) {
  alert('Please login first.');
  window.location.href = 'index.html';
}

// DOM elements
const seeSummaryBtn = document.getElementById('seeSummaryBtn');
const yearList = document.getElementById('yearList');
const monthList = document.getElementById('monthList');
const summaryTable = document.getElementById('summaryTable');
const dateRow = document.getElementById('dateRow');
const hourRow = document.getElementById('hourRow');
const summaryTableBody = document.querySelector('#summaryTable tbody');
const legendContainer = document.getElementById('legendContainer') || document.createElement('div');
const downloadSummaryBtn = document.getElementById('downloadSummaryBtn');

// ✅ Hour mapping (compact)
const hoursMap = {
  1: '7:30-8:30',
  2: '8:30-9:30',
  3: '9:50-10:50',
  4: '10:50-11:50',
  5: '1:00-2:00',
  6: '2:00-3:00',
  7: '3:00-4:00',
  8: '4:00-5:00'
};

function getDatesInMonth(year, month) {
  const date = new Date(year, month, 1);
  const dates = [];
  while (date.getMonth() === month) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dates.push(new Date(date));
    }
    date.setDate(date.getDate() + 1);
  }
  return dates;
}

// Step 1: Load years from attendance
seeSummaryBtn?.addEventListener('click', async () => {
  if (!yearList || !monthList || !summaryTable) return;
  yearList.innerHTML = 'Loading years...';
  monthList.innerHTML = '';
  summaryTable.style.display = 'none';
  if (legendContainer) legendContainer.innerHTML = '';

  const attendanceSnap = await db
    .collection('teachers')
    .doc(currentTeacherUID)
    .collection('attendance')
    .get();

  if (attendanceSnap.empty) {
    yearList.innerHTML = 'No attendance records found.';
    return;
  }

  const years = new Set();
  attendanceSnap.docs.forEach(doc => {
    const [year] = doc.id.split('-');
    years.add(year);
  });

  const sortedYears = Array.from(years).sort((a, b) => b - a);

  yearList.innerHTML = '<h3>Select Year:</h3>';
  sortedYears.forEach(year => {
    const btn = document.createElement('button');
    btn.textContent = year;
    btn.addEventListener('click', () => showMonths(year, attendanceSnap));
    yearList.appendChild(btn);
  });
});

// Step 2: Show months
function showMonths(selectedYear, attendanceSnap) {
  if (!monthList || !summaryTable) return;
  monthList.innerHTML = `<h3>Months in ${selectedYear}:</h3>`;
  summaryTable.style.display = 'none';
  if (legendContainer) legendContainer.innerHTML = '';

  const months = new Set();
  attendanceSnap.docs.forEach(doc => {
    const [year, month] = doc.id.split('-');
    if (year === selectedYear) months.add(parseInt(month));
  });

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  for (let m = 1; m <= 12; m++) {
    const btn = document.createElement('button');
    btn.textContent = monthNames[m - 1];
    btn.style.margin = "3px";

    if (!months.has(m)) {
      btn.disabled = true;
      btn.style.opacity = "0.5";
    } else if (selectedYear == currentYear && m > currentMonth) {
      btn.disabled = true;
      btn.style.opacity = "0.5";
    } else {
      btn.addEventListener('click', () => loadSummary(selectedYear, m));
    }

    monthList.appendChild(btn);
  }
}

// Step 3: Load summary for selected month
async function loadSummary(year, month) {
  if (!summaryTable || !dateRow || !hourRow || !summaryTableBody) return;
  summaryTable.style.display = 'table';
  dateRow.innerHTML = '';
  hourRow.innerHTML = '';
  summaryTableBody.innerHTML = '';
  if (legendContainer) legendContainer.innerHTML = '';

  try {
    // learners
    const learnersSnap = await db
      .collection('teachers')
      .doc(currentTeacherUID)
      .collection('learners')
      .get();

    const learners = learnersSnap.docs.map(doc => doc.data().name);

    // attendance data
    const attendanceSnap = await db
      .collection('teachers')
      .doc(currentTeacherUID)
      .collection('attendance')
      .get();

    const attendanceData = {};
    for (let attDoc of attendanceSnap.docs) {
      const date = attDoc.id;
      const [y, m] = date.split('-').map(Number);
      if (y !== parseInt(year) || m !== parseInt(month)) continue;

      const learnersSubSnap = await attDoc.ref.collection('learners').get();
      learnersSubSnap.forEach(learnerDoc => {
        const { name, remarks } = learnerDoc.data();
        if (!attendanceData[name]) attendanceData[name] = {};
        Object.entries(remarks).forEach(([hour, val]) => {
          attendanceData[name][`${date}|${hour}`] = val;
        });
      });
    }

    const days = getDatesInMonth(year, month - 1);

    // Header: date row
    dateRow.innerHTML = `<th rowspan="2">#</th><th rowspan="2">Name</th>`;
    days.forEach(day => {
      const dateStr = day.toISOString().split('T')[0];
      dateRow.innerHTML += `<th colspan="${Object.keys(hoursMap).length}">${dateStr}</th>`;
    });

    // Header: hour numbers
    hourRow.innerHTML = '';
    days.forEach(() => {
      Object.keys(hoursMap).forEach(num => {
        hourRow.innerHTML += `<th>${num}</th>`;
      });
    });

    // Body
    learners.forEach((name, idx) => {
      let rowHTML = `<td>${idx + 1}</td><td>${name}</td>`;
      days.forEach(day => {
        const dateStr = day.toISOString().split('T')[0];
        Object.entries(hoursMap).forEach(([num, h]) => {
          const key = `${dateStr}|${h}`;
          const remark = attendanceData[name]?.[key] || '';
          rowHTML += `<td>${remark}</td>`;
        });
      });
      summaryTableBody.innerHTML += `<tr>${rowHTML}</tr>`;
    });

    // ✅ Show the download button
  downloadSummaryBtn.style.display = 'inline-block';

// ✅ Set up the download function
  downloadSummaryBtn.onclick = () => downloadSummaryAsExcel(year, month);


// --- Download Section ---
function downloadSummaryAsExcel(year, month) {
  const table = document.getElementById('summaryTable');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);

  // Apply styling
  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) continue;

      // Default style
      ws[cellRef].s = {
        alignment: { vertical: "center", horizontal: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { auto: 1 } },
          bottom: { style: "thin", color: { auto: 1 } },
          left: { style: "thin", color: { auto: 1 } },
          right: { style: "thin", color: { auto: 1 } }
        }
      };

      // Left-align learner names
      if (R > 1 && C === 1) {
        ws[cellRef].s.alignment.horizontal = "left";
      }
    }
  }

  // Adjust column widths (make them thinner)
  const colWidths = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    if (C === 0) colWidths.push({ wch: 5 }); // #
    else if (C === 1) colWidths.push({ wch: 20 }); // name
    else colWidths.push({ wch: 5 }); // compact columns for hours
  }
  ws['!cols'] = colWidths;

  // Freeze top 2 rows for easier navigation
  ws['!freeze'] = { xSplit: 2, ySplit: 2 };

  // Append and save
  XLSX.utils.book_append_sheet(wb, ws, `Summary_${year}_${month}`);
  XLSX.writeFile(wb, `Attendance_Summary_${year}_${month}.xlsx`);
}



  } catch (err) {
    console.error(err);
    alert('Failed to load summary.');
  }
}
