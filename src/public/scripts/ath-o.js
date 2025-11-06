import { API } from 'cl.js';

const signupForm = document.getElementById('signupForm');
const loginForm = document.getElementById('loginForm');

function showMessage(target, msg, isError = false) {
  const messageBox = target.querySelector('.message');
  if (!messageBox) return;
  messageBox.textContent = msg;
  messageBox.style.color = isError ? 'red' : 'green';
}

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = signupForm.username.value.trim();
    const password = signupForm.password.value.trim();
    
    if (!passwordRegex.test(password)) {
      showMessage(signupForm, 'Password must contain uppercase, lowercase, number, special character, and be 8+ chars.', true);
      return;
    }
    
    try {
      showMessage(signupForm, 'Creating account...');
      const res = await API.signup(username, password);
      showMessage(signupForm, res.message || 'Signup successful!');
      signupForm.reset();
    } catch (err) {
      showMessage(signupForm, err.message || 'Signup failed', true);
    }
  });
}

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = loginForm.username.value.trim();
    const password = loginForm.password.value.trim();
    
    try {
      showMessage(loginForm, 'Logging in...');
      const res = await API.login(username, password);
      showMessage(loginForm, res.message || 'Login successful!');
      
      setTimeout(() => (window.location.href = '/stage'), 1000);
    } catch (err) {
      showMessage(loginForm, err.message || 'Login failed', true);
    }
  });
}