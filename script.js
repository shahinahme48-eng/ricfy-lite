import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, updateDoc, getDoc,
  onSnapshot, collection, addDoc,
  serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* 🔥 Firebase Config */
const firebaseConfig = {
  apiKey: "AIzaSyAXXWgGt8WbMzmgn2ukdB4qtP5xwr2jz5E",
  authDomain: "studio-343961532-65f17.firebaseapp.com",
  projectId: "studio-343961532-65f17",
  storageBucket: "studio-343961532-65f17.firebasestorage.app",
  messagingSenderId: "667987171288",
  appId: "1:667987171288:web:ffadb2286957b28b4b84ad"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
signInAnonymously(auth);

/* GAME STATE */
let roomId=null;
let myPlayerId=null;
let myName="";
let unsubscribeChat=null;

/* UTILS */
function generateTiles(){
  let t=[];
  for(let i=0;i<=6;i++){
    for(let j=i;j<=6;j++){
      t.push([i,j]);
    }
  }
  return t.sort(()=>Math.random()-0.5);
}

/* CREATE ROOM */
window.createRoom = async function(){
  myName=document.getElementById("playerName").value||"Player";
  roomId=Math.random().toString(36).substring(2,8);

  let tiles=generateTiles();
  let players={
    p1:{name:myName, tiles:tiles.splice(0,7)}
  };

  await setDoc(doc(db,"rooms",roomId),{
    board:[],
    tiles:tiles,
    players:players,
    turn:"p1"
  });

  myPlayerId="p1";
  alert("Room Code: "+roomId);
  listenRoom();
}

/* JOIN ROOM */
window.joinRoom = async function(){
  myName=document.getElementById("playerName").value||"Player";
  roomId=document.getElementById("roomCode").value;

  const ref=doc(db,"rooms",roomId);
  const snap=await getDoc(ref);
  if(!snap.exists()){ alert("Room not found"); return; }

  let data=snap.data();
  let count=Object.keys(data.players).length+1;
  if(count>4){ alert("Room Full"); return; }

  myPlayerId="p"+count;
  data.players[myPlayerId]={
    name:myName,
    tiles:data.tiles.splice(0,7)
  };

  await updateDoc(ref,{
    players:data.players,
    tiles:data.tiles
  });

  listenRoom();
}

/* REALTIME LISTENER */
function listenRoom(){
  onSnapshot(doc(db,"rooms",roomId),(snap)=>{
    const g=snap.data();
    render(g);
    listenChat();
  });
}

/* RENDER UI */
function render(g){
  document.getElementById("status").innerText=
    `You: ${myPlayerId} | Turn: ${g.turn}`;

  document.getElementById("board").innerHTML=
    g.board.map(t=>`<div class="tile">${t[0]}|${t[1]}</div>`).join("");

  for(let i=1;i<=4;i++){
    let pid="p"+i;
    let el=document.getElementById(pid);
    if(!g.players[pid]){ el.innerHTML=""; continue; }

    el.innerHTML=g.players[pid].tiles.map((t,idx)=>{
      if(pid===myPlayerId && g.turn===myPlayerId){
        return `<div class="tile" onclick="playTile(${idx})">${t[0]}|${t[1]}</div>`;
      }else{
        return `<div class="tile">?</div>`;
      }
    }).join("");
  }
}

/* PLAY TILE */
window.playTile = async function(index){
  const ref=doc(db,"rooms",roomId);
  const snap=await getDoc(ref);
  const g=snap.data();

  if(g.turn!==myPlayerId) return;

  let tile=g.players[myPlayerId].tiles[index];
  if(g.board.length){
    let last=g.board[g.board.length-1];
    if(last[1]!==tile[0]){
      alert("Invalid Move");
      return;
    }
  }

  g.board.push(tile);
  g.players[myPlayerId].tiles.splice(index,1);

  let next=myPlayerId==="p4"?"p1":"p"+(parseInt(myPlayerId[1])+1);

  await updateDoc(ref,{
    board:g.board,
    players:g.players,
    turn:next
  });
}

/* DRAW TILE */
window.drawTile = async function(){
  const ref=doc(db,"rooms",roomId);
  const snap=await getDoc(ref);
  const g=snap.data();

  if(!g.tiles.length){
    alert("Boneyard Empty");
    return;
  }

  g.players[myPlayerId].tiles.push(g.tiles.pop());
  await updateDoc(ref,{
    players:g.players,
    tiles:g.tiles
  });
}

/* CHAT */
function listenChat(){
  if(unsubscribeChat) return;
  const q=query(collection(db,"rooms",roomId,"chat"),orderBy("timestamp"));
  unsubscribeChat=onSnapshot(q,(snap)=>{
    document.getElementById("chatBox").innerHTML=
      snap.docs.map(d=>`<div><b>${d.data().sender}:</b> ${d.data().message}</div>`).join("");
  });
}

window.sendChat = async function(){
  let msg=document.getElementById("chatInput").value;
  if(!msg) return;
  await addDoc(collection(db,"rooms",roomId,"chat"),{
    sender:myName,
    message:msg,
    timestamp:serverTimestamp()
  });
  document.getElementById("chatInput").value="";
}
