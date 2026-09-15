import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";


import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";



// DOM

const creatorLevel = document.getElementById("creatorLevel");
const creatorXP = document.getElementById("creatorXP");
const xpProgress = document.getElementById("xpProgress");

const badgesList = document.getElementById("badgesList");

const liveRegion = document.getElementById("liveRegion");
const liveFollowers = document.getElementById("liveFollowers");
const liveLevel = document.getElementById("liveLevel");
const liveStatus = document.getElementById("liveStatus");




// LIVE REQUIREMENTS

const liveRequirements = {

    Africa:{
        followers:100,
        level:10
    },

    Asia:{
        followers:300,
        level:12
    },

    Europe:{
        followers:300,
        level:12
    },

    "North America":{
        followers:500,
        level:15
    },

    "South America":{
        followers:200,
        level:10
    },

    Oceania:{
        followers:200,
        level:10
    }

};





onAuthStateChanged(auth, async(user)=>{


    if(!user){

        location.href="login.html";
        return;

    }



    const userRef = doc(db,"users",user.uid);


    const snap = await getDoc(userRef);



    if(snap.exists()){


        const data = snap.data();



        // LEVEL

        const level = data.sparkLevel || 1;

const xp = data.sparkXP || 0;


        creatorLevel.innerHTML =
"⚡ Spark Creator Level " + level;


        creatorXP.innerHTML =
xp + " Spark XP / 100 Spark XP";



        xpProgress.style.width =
        xp + "%";





        // BADGES

        const badges = data.sparkBadges || [];



        badgesList.innerHTML="";



        if(badges.length === 0){

            badgesList.innerHTML =
            "No badges earned yet";

        }
        else{


            badges.forEach((badge)=>{


                badgesList.innerHTML += `

                <div class="badge">

                🏆 ${badge}

                </div>

                `;


            });


        }





        // LIVE ELIGIBILITY


        const continent =
data.continent || "Unknown";


        const followers =
        data.followers ?
        data.followers.length : 0;



        const requirements =
        liveRequirements[continent];



        liveRegion.innerHTML =
        "🌍 Region: " + continent;


        liveFollowers.innerHTML =
        "👥 Followers: "
        + followers +
        " / "
        + requirements.followers;



        liveLevel.innerHTML =
        "⚡ Level: "
        + level +
        " / "
        + requirements.level;




        if(
            followers >= requirements.followers &&
            level >= requirements.level
        ){

            liveStatus.innerHTML =
            "🔴 Live Unlocked";

        }
        else{


            liveStatus.innerHTML =
            "🔒 Keep growing to unlock Live";


        }



    }


});