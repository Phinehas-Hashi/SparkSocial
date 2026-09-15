import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";


// =========================
// LOCATION DETECTION
// =========================

async function getUserLocation(){

    try{

        const response = await fetch(
            "https://ipapi.co/json/"
        );


        const data = await response.json();


        const country =
        data.country_name || "Unknown";



        const continentMap = {


            "Kenya":"Africa",
            "Nigeria":"Africa",
            "South Africa":"Africa",
            "Egypt":"Africa",


            "Canada":"North America",
            "United States":"North America",
            "Mexico":"North America",


            "Brazil":"South America",
            "Argentina":"South America",


            "United Kingdom":"Europe",
            "Germany":"Europe",
            "France":"Europe",


            "India":"Asia",
            "China":"Asia",
            "Japan":"Asia",


            "Australia":"Oceania"

        };



        return {

            country: country,

            continent:
            continentMap[country] || "Unknown"

        };


    }catch(error){


        return {

            country:"Unknown",

            continent:"Unknown"

        };


    }

}





// =========================
// SIGN UP
// =========================

const signupForm =
document.getElementById("signupForm");


if(signupForm){


signupForm.addEventListener("submit", async(e)=>{


    e.preventDefault();



    const fullName =
    document.getElementById("fullName")
    .value.trim();



    const email =
    document.getElementById("email")
    .value.trim();



    const password =
    document.getElementById("password")
    .value;



    try{


        const userCredential =
        await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );


        const user =
        userCredential.user;



        await updateProfile(user,{

            displayName:fullName

        });



        // Detect location

        const locationData =
        await getUserLocation();




        await setDoc(
        doc(db,"users",user.uid),{


            uid:user.uid,


            fullname:fullName,


            email:email,


            photo:"",


            bio:
            "Hey there 👋 I'm using SparkSocial.",



            followers:[],


            following:[],


            likes:0,


            verified:false,



            // LOCATION

            country:
            locationData.country,


            continent:
            locationData.continent,


            locationVerified:true,



            // SPARK SYSTEM

            sparkLevel:1,


            sparkXP:0,


            sparkBadges:[],


            createdAt:
            serverTimestamp()


        });


showWelcome();

setTimeout(() => {
    location.href = "home.html";
}, 2500);


        location.href="home.html";



    }catch(error){


        alert(error.message);


    }


});


}





// =========================
// LOGIN
// =========================


const loginForm =
document.getElementById("loginForm");



if(loginForm){


loginForm.addEventListener("submit",async(e)=>{


    e.preventDefault();



    const email =
    document.getElementById("email")
    .value.trim();



    const password =
    document.getElementById("password")
    .value;



    try{


        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );


        location.href="home.html";



    }catch(error){


        alert(error.message);


    }



});


}
function showWelcome(){

    const welcome = document.createElement("div");

    welcome.innerHTML = `
        <div class="welcome-screen">

            <h1>
            ⚡ Welcome to SparkSocial ❤️
            </h1>

            <p>
            Your community journey begins now.
            </p>

        </div>
    `;


    document.body.appendChild(welcome);

}