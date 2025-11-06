import { API } from 'cl.js';

const signupModal = document.getElementById('signupModal');
const loginModal = document.getElementById('loginModal');


const signupInputs = {
  username: signupModal.querySelector('input[name="username"]'),
  password: signupModal.querySelector('input[name="password"]'),
  button: signupModal.querySelector('button[type="button"]'),
};

const loginInputs = {
  username: loginModal.querySelector('input[name="username"]'),
  password: loginModal.querySelector('input[name="password"]'),
  button: loginModal.querySelector('button[type="button"]'),
};

// Create message elements
const signupMessage = document.createElement('div');
signupMessage.className = 'text-sm text-center mt-3';
signupModal.querySelector('.flex.flex-col').appendChild(signupMessage);

const loginMessage = document.createElement('div');
loginMessage.className = 'text-sm text-center mt-3';
loginModal.querySelector('.flex.flex-col').appendChild(loginMessage);


function showMessage(target, msg, isError = false) {
  target.textContent = msg;
  target.style.color = isError ? 'red' : 'green';
}

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

// Signup handler
signupInputs.button.addEventListener('click', async () => {
  const username = signupInputs.username.value.trim();
  const password = signupInputs.password.value.trim();
  
  if (!username || !password) {
    showMessage(signupMessage, 'Fill in all fields.', true);
    return;
  }
  
  if (!passwordRegex.test(password)) {
    showMessage(signupMessage, 'Password must include upper, lower, number, special char, 8+ chars.', true);
    return;
  }
  
  try {
    showMessage(signupMessage, 'Creating account...');
    const res = await API.signup(username, password);
    showMessage(signupMessage, res.message || 'Signup successful!');
    signupInputs.username.value = '';
    signupInputs.password.value = '';
  } catch (err) {
    showMessage(signupMessage, err.message || 'Signup failed', true);
  }
});

// Login handler
loginInputs.button.addEventListener('click', async () => {
  const username = loginInputs.username.value.trim();
  const password = loginInputs.password.value.trim();
  
  if (!username || !password) {
    showMessage(loginMessage, 'Fill in all fields.', true);
    return;
  }
  
  try {
    showMessage(loginMessage, 'Logging in...');
    const res = await API.login(username, password);
    showMessage(loginMessage, res.message || 'Login successful!');
    
    setTimeout(() => (window.location.href = '/stage'), 1000);
  } catch (err) {
    showMessage(loginMessage, err.message || 'Login failed', true);
  }
});