import {
    doc,
    setDoc,
    getDoc,
    onSnapshot,
    collection,
    addDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

import { db } from "./firebase.js";


let peerConnection;
let pendingCandidates = [];


const servers = {

    iceServers:[
        {
            urls:"stun:stun.l.google.com:19302"
        }
    ]

};



export async function startVoiceCall(callId,isCaller){


    peerConnection =
    new RTCPeerConnection(servers);



    const stream =
    await navigator.mediaDevices.getUserMedia({
        audio:true
    });



    stream.getTracks().forEach(track=>{

        peerConnection.addTrack(
            track,
            stream
        );

    });



    peerConnection.ontrack=(event)=>{

    console.log("REMOTE AUDIO RECEIVED");

    const audio = new Audio();

    audio.srcObject = event.streams[0];

    audio.play()
    .then(()=>{
        console.log("Audio playing");
    })
    .catch(err=>{
        console.log("Audio error:", err);
    });

};



    const callRef =
    doc(db,"calls",callId);



    const candidatesRef =
    collection(
        callRef,
        "candidates"
    );



    peerConnection.onicecandidate =
    async(event)=>{

        if(event.candidate){

            await addDoc(
                candidatesRef,
                event.candidate.toJSON()
            );

        }

    };





    if(isCaller){



        const offer =
        await peerConnection.createOffer();


        await peerConnection.setLocalDescription(
            offer
        );



        await setDoc(
            callRef,
            {
                offer:offer
            },
            {
                merge:true
            }
        );



        onSnapshot(
            callRef,
            async(snapshot)=>{

                const data =
                snapshot.data();


                if(
                    data.answer &&
                    !peerConnection.currentRemoteDescription
                ){

                    await peerConnection.setRemoteDescription(
                        data.answer
                    );
                    for(const candidate of pendingCandidates){

    await peerConnection.addIceCandidate(candidate);

}

pendingCandidates = [];

                }

            }
        );



    }else{



        const callData =
        (await getDoc(callRef)).data();



        await peerConnection.setRemoteDescription(
            callData.offer
        );
        for(const candidate of pendingCandidates){

    await peerConnection.addIceCandidate(candidate);

}

pendingCandidates = [];



        const answer =
        await peerConnection.createAnswer();



        await peerConnection.setLocalDescription(
            answer
        );



        await setDoc(
            callRef,
            {
                answer:answer
            },
            {
                merge:true
            }
        );

    }



    onSnapshot(
    candidatesRef,
    async(snapshot)=>{

        for(const change of snapshot.docChanges()){

            if(change.type === "added"){

                const candidate =
                change.doc.data();


                if(peerConnection.remoteDescription){

                    await peerConnection.addIceCandidate(candidate);

                }else{

                    pendingCandidates.push(candidate);

                }

            }

        }

    }
);