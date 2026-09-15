import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";

import {
    getAuth,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";


// SparkSocial Firebase Web App configuration.
// These client-side values are expected to be present in a Firebase web app.
// Security is enforced by Firebase Authentication and Firestore Security Rules.
const firebaseConfig = {
    apiKey: "AIzaSyDY46sh9jAyNtOUs_fCMuPgSGeaQn4Arxs",
    authDomain: "sparksocial-af6c8.firebaseapp.com",
    projectId: "sparksocial-af6c8",
    storageBucket: "sparksocial-af6c8.firebasestorage.app",
    messagingSenderId: "96819653349",
    appId: "1:96819653349:web:19bec91d9503b2ba3ec20c",
    measurementId: "G-3KELZJDMR8"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence);


const db = getFirestore(app);


export { auth, db };