import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";

import {
    getAuth,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyBH_cc7KBT3YASiHH56OkwDhETUo_aUhH8",
    authDomain: "lovena-d8328.firebaseapp.com",
    projectId: "lovena-d8328",
    storageBucket: "lovena-d8328.firebasestorage.app",
    messagingSenderId: "105578962519",
    appId: "1:105578962519:web:8e59c66880e975c71a4d12",
    measurementId: "G-KVY8Y73J3P"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence);


const db = getFirestore(app);


export { auth, db };