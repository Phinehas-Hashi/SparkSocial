import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import { doc, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

const form = document.getElementById('signupForm');
if (!form) throw new Error('Signup form not found.');

const displayNameInput = document.getElementById('displayName');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const termsInput = document.getElementById('terms');
const button = document.getElementById('signupButton');
const errorBox = document.getElementById('signupError');
const togglePassword = document.getElementById('togglePassword');

const messages = {
  'auth/email-already-in-use': 'That email is already registered. Try signing in instead.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Use a stronger password with at least 8 characters.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/operation-not-allowed': 'Email/password accounts are not enabled in Firebase yet.',
  'auth/too-many-requests': 'Too many attempts. Please wait a little and try again.'
};

const showError = message => { errorBox.textContent = message; errorBox.hidden = false; };
const normalizeUsername = value => value.trim().toLowerCase();
const validPassword = value => value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

if (togglePassword) togglePassword.onclick = () => {
  const showing = passwordInput.type === 'text';
  passwordInput.type = showing ? 'password' : 'text';
  togglePassword.textContent = showing ? 'Show' : 'Hide';
};

form.addEventListener('submit', async event => {
  event.preventDefault();
  errorBox.hidden = true;

  const displayName = displayNameInput.value.trim();
  const username = normalizeUsername(usernameInput.value);
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (displayName.length < 2) return showError('Please enter a display name.');
  if (!/^[a-z0-9_.]{3,24}$/.test(username)) return showError('Username must be 3–24 characters using letters, numbers, underscores or periods.');
  if (!validPassword(password)) return showError('Password must be 8+ characters and contain at least one letter and one number.');
  if (!termsInput.checked) return showError('Please accept the community and privacy terms to continue.');

  button.disabled = true;
  button.querySelector('.button-label').textContent = 'Creating account…';

  let user = null;
  try {
    user = (await createUserWithEmailAndPassword(auth, email, password)).user;
    await updateProfile(user, { displayName });

    await runTransaction(db, async transaction => {
      const usernameRef = doc(db, 'usernames', username);
      const existing = await transaction.get(usernameRef);
      if (existing.exists()) throw new Error('USERNAME_TAKEN');

      transaction.set(usernameRef, { uid: user.uid, username, createdAt: serverTimestamp() });
      transaction.set(doc(db, 'users', user.uid), {
        uid: user.uid,
        username,
        usernameLower: username,
        displayName,
        displayNameLower: displayName.toLowerCase(),
        photoURL: '',
        coverURL: '',
        bio: "Hey there 👋 I'm using SparkSocial.",
        location: null,
        accountType: 'user',
        isVerified: false,
        isPrivate: false,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        sparkXP: 0,
        sparkLevel: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    await sendEmailVerification(user);
    location.replace('verify-email.html');
  } catch (error) {
    if (user && error?.message !== 'USERNAME_TAKEN') {
      await user.delete().catch(() => {});
    }
    if (error?.message === 'USERNAME_TAKEN') showError('That username is already taken. Choose another one.');
    else {
      console.error('SparkSocial signup error:', error);
      showError(messages[error?.code] || 'We could not create your account. Please try again.');
    }
    button.disabled = false;
    button.querySelector('.button-label').textContent = 'Create Account';
  }
});