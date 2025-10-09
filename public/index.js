const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

loginForm.addEventListener('submit', async e => {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Load profile from Firestore
    const teacherDoc = await db.collection('teachers').doc(user.uid).get();
    if (!teacherDoc.exists) {
      alert('No profile found. Please sign up.');
      await firebase.auth().signOut();
      return;
    }

    const userData = teacherDoc.data();
    sessionStorage.setItem('currentTeacherUID', user.uid);
    sessionStorage.setItem('currentTeacherName', userData.name);
    sessionStorage.setItem('role', userData.role);

    alert(`Welcome back, ${userData.name}`);

    // Redirect based on role
    if (userData.role === "admin") {
      window.location.href = 'qr.html';
    } else {
      window.location.href = 'enrol_learners.html';
    }

  } catch (error) {
    console.error(error);
    alert('Login failed: ' + error.message);
  }
});

signupForm.addEventListener('submit', async e => {
  e.preventDefault();

  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const name = document.getElementById('signupName').value.trim();
  const section = document.getElementById('signupSection').value.trim();
  const grade = document.getElementById('signupGrade').value.trim();
  const role = document.getElementById('signupRole').value; // new

  try {
    // Create user account with Firebase Auth
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Save profile in Firestore
    await db.collection('teachers').doc(user.uid).set({
      name,
      section: role === "adviser" ? section : "",
      grade: role === "adviser" ? grade : "",
      email,
      role // store role here
    });

    alert('Signup successful! Redirecting...');

    sessionStorage.setItem('currentTeacherUID', user.uid);
    sessionStorage.setItem('currentTeacherName', name);
    sessionStorage.setItem('role', role);

    // Redirect based on role
    if (role === "admin") {
      window.location.href = 'qr.html';
    } else {
      window.location.href = 'enrol_learners.html';
    }

  } catch (error) {
    console.error(error);
    alert('Signup failed: ' + error.message);
  }
});
