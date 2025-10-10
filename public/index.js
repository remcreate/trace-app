const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const landingPage = document.getElementById('landingPage');
const authContainer = document.getElementById('authContainer');
const showLoginBtn = document.getElementById('showLoginBtn');
const showSignupBtn = document.getElementById('showSignupBtn');
const backToLandingFromLogin = document.getElementById('backToLandingFromLogin');
const backToLandingFromSignup = document.getElementById('backToLandingFromSignup');

// Show Login
    showLoginBtn.addEventListener('click', () => {
      landingPage.classList.add('hidden');
      authContainer.classList.remove('hidden');
      loginForm.classList.remove('hidden');
      signupForm.classList.add('hidden');
    });

 // Show Signup
    showSignupBtn.addEventListener('click', () => {
      landingPage.classList.add('hidden');
      authContainer.classList.remove('hidden');
      signupForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
    });
 // Back to Landing
    [backToLandingFromLogin, backToLandingFromSignup].forEach(backBtn => {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        authContainer.classList.add('hidden');
        landingPage.classList.remove('hidden');
      });
    });

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
