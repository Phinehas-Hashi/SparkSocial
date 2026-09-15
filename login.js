import { auth } from './firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';

const $ = id => document.getElementById(id);
const form = $('loginForm');
const email = $('email');
const password = $('password');
const remember = $('rememberMe');
const button = $('loginButton');
const error = $('loginError');
const toggle = $('togglePassword');

const messages = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/user-not-found': 'Incorrect email or password.'
};

const show = message => {
  error.textContent = message;
  error.hidden = false;
};

if (toggle) {
  toggle.onclick = () => {
    const showing = password.type === 'text';
    password.type = showing ? 'password' : 'text';
    toggle.textContent = showing ? 'Show' : 'Hide';
  };
}

onAuthStateChanged(auth, user => {
  if (user) location.replace(user.emailVerified ? 'home.html' : 'verify-email.html');
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  error.hidden = true;
  const mail = email.value.trim().toLowerCase();
  const pass = password.value;
  if (!mail || !pass) return show('Please enter your email and password.');

  button.disabled = true;
  button.querySelector('.button-label').textContent = 'Signing in…';
  try {
    await setPersistence(auth, remember?.checked ? browserLocalPersistence : browserSessionPersistence);
    const credential = await signInWithEmailAndPassword(auth, mail, pass);
    await credential.user.reload();
    location.replace(credential.user.emailVerified ? 'home.html' : 'verify-email.html');
  } catch (err) {
    console.error('SparkSocial login error:', err);
    show(messages[err?.code] || 'Unable to sign in. Please try again.');
    button.disabled = false;
    button.querySelector('.button-label').textContent = 'Sign In';
  }
});