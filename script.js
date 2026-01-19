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
signInAnonymously(auth).then(() => {
    console.log("Signed in anonymously");
}).catch((error) => {
    console.error("Auth Error", error);
});

/* GAME STATE */
let roomId = null;
let myPlayerId = null;
let myName = "";
let unsubscribeChat = null;

/* UTILS */
function generateTiles(){
  let t = [];
  for(let i=0; i<=6; i++){
    for(let j=i; j<=6; j++){
      t.push([i, j]);
    }
  }
  // Shuffle tiles
  return t.sort(() => Math.random() - 0.5);
}

/* CREATE ROOM */
window.createRoom = async function(){
  myName = document.getElementById("playerName").value || "Host";
  roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

  let tiles = generateTiles();
  
  // Player 1 gets 7 tiles
  let p1Tiles = tiles.splice(0, 7);
  
  let players = {
    p1: { name: myName, tiles: p1Tiles }
  };

  await setDoc(doc(db, "rooms", roomId), {
    board: [],
    tiles: tiles, // Boneyard
    players: players,
    turn: "p1",
    status: "waiting"
  });

  myPlayerId = "p1";
  alert("Room Created! Code: " + roomId);
  listenRoom();
}

/* JOIN ROOM */
window.joinRoom = async function(){
  myName = document.getElementById("playerName").value || "Guest";
  roomId = document.getElementById("roomCode").value.toUpperCase();

  if(!roomId) { alert("Enter Room Code"); return; }

  const ref = doc(db, "rooms", roomId);
  const snap = await getDoc(ref);
  
  if(!snap.exists()){ alert("Room not found"); return; }

  let data = snap.data();
  let currentPlayers = Object.keys(data.players).length;
  
  if(currentPlayers >= 4){ alert("Room Full"); return; }

  myPlayerId = "p" + (currentPlayers + 1);
  
  // Assign tiles to new player
  let newHand = data.tiles.splice(0, 7);

  data.players[myPlayerId] = {
    name: myName,
    tiles: newHand
  };

  await updateDoc(ref, {
    players: data.players,
    tiles: data.tiles
  });

  listenRoom();
}

/* REALTIME LISTENER */
function listenRoom(){
  document.getElementById("status").innerText = `Connected to Room: ${roomId}`;
  
  onSnapshot(doc(db, "rooms", roomId), (snap) => {
    if(snap.exists()){
        const g = snap.data();
        render(g);
        listenChat(); // Start chat listener once
    }
  });
}

/* RENDER UI */
function render(g){
  // Status Bar
  let turnName = g.players[g.turn] ? g.players[g.turn].name : g.turn;
  document.getElementById("status").innerHTML = 
    `Room: <b>${roomId}</b> | You are: <b>${myName}</b> (${myPlayerId}) | Turn: <span style="color:#22c55e">${turnName}</span>`;

  // Draw Board
  const boardEl = document.getElementById("board");
  boardEl.innerHTML = "";
  
  if(g.board.length === 0){
      boardEl.innerHTML = "<div style='color:gray; padding:10px;'>Board Empty - Waiting for first move</div>";
  } else {
      g.board.forEach(t => {
          // ডমিনো টাইল দেখতে যেমন হয় (উপর/নিচ বা পাশাপাশি)
          boardEl.innerHTML += `<div class="tile" style="background:#fff;">${t[0]}<br>|<br>${t[1]}</div>`;
      });
  }

  // Render Players
  for(let i=1; i<=4; i++){
    let pid = "p" + i;
    let handDiv = document.getElementById(pid);
    let nameTitle = document.getElementById("name-" + pid);
    
    // Highlight active player
    if(pid === g.turn) {
        handDiv.parentElement.classList.add("active-turn");
    } else {
        handDiv.parentElement.classList.remove("active-turn");
    }

    if(!g.players[pid]){ 
        handDiv.innerHTML = "<i>Waiting...</i>"; 
        continue; 
    }

    nameTitle.innerText = g.players[pid].name;

    // Show my tiles properly, hide others
    handDiv.innerHTML = g.players[pid].tiles.map((t, idx) => {
      if(pid === myPlayerId){
        // Only add onclick if it's MY turn
        let clickAttr = (g.turn === myPlayerId) ? `onclick="playTile(${idx})"` : "";
        let style = (g.turn === myPlayerId) ? "cursor:pointer; background:#fff;" : "cursor:not-allowed; opacity:0.7;";
        return `<div class="tile" style="${style}" ${clickAttr}>${t[0]}<br>|<br>${t[1]}</div>`;
      } else {
        return `<div class="tile" style="background:#cbd5e1; color:#cbd5e1;">?</div>`; // Opponent tiles hidden
      }
    }).join("");
  }
}

/* PLAY TILE LOGIC (FIXED) */
window.playTile = async function(index){
  const ref = doc(db, "rooms", roomId);
  const snap = await getDoc(ref);
  const g = snap.data();

  // ১. চেক করুন এটি আপনার চাল কিনা
  if(g.turn !== myPlayerId) {
      alert("Wait for your turn!");
      return;
  }

  let tile = g.players[myPlayerId].tiles[index]; // [a, b]
  let played = false;

  // ২. যদি বোর্ড খালি থাকে (প্রথম চাল)
  if(g.board.length === 0){
      g.board.push(tile);
      played = true;
  } else {
      // ৩. বোর্ডের দুই প্রান্ত চেক করা
      let head = g.board[0]; // বাম পাশ
      let tail = g.board[g.board.length - 1]; // ডান পাশ
      
      let leftVal = head[0];
      let rightVal = tail[1];

      let t1 = tile[0];
      let t2 = tile[1];

      // ডান পাশে মেলানোর চেষ্টা (Match Right)
      if (rightVal === t1) {
          g.board.push([t1, t2]); // সোজা বসল
          played = true;
      } else if (rightVal === t2) {
          g.board.push([t2, t1]); // ঘুরিয়ে বসল (Flip)
          played = true;
      }
      // বাম পাশে মেলানোর চেষ্টা (Match Left) - যদি ডানে না মেলে
      else if (leftVal === t2) {
          g.board.unshift([t1, t2]); // সোজা বসল
          played = true;
      } else if (leftVal === t1) {
          g.board.unshift([t2, t1]); // ঘুরিয়ে বসল (Flip)
          played = true;
      }
  }

  if(!played){
      alert("Invalid Move! Tile doesn't match either end.");
      return;
  }

  // ৪. টাইলস রিমুভ করা এবং টার্ন পরিবর্তন
  g.players[myPlayerId].tiles.splice(index, 1);

  // পরবর্তী প্লেয়ার বের করা
  let totalPlayers = Object.keys(g.players).length;
  let currentNum = parseInt(myPlayerId.replace("p", ""));
  let nextNum = currentNum + 1;
  if(nextNum > totalPlayers) nextNum = 1;
  
  let nextPlayer = "p" + nextNum;

  await updateDoc(ref, {
    board: g.board,
    players: g.players,
    turn: nextPlayer
  });
}

/* DRAW TILE */
window.drawTile = async function(){
  const ref = doc(db, "rooms", roomId);
  const snap = await getDoc(ref);
  const g = snap.data();

  if(g.turn !== myPlayerId) { alert("Not your turn!"); return; }
  if(g.tiles.length === 0) { alert("Boneyard is Empty!"); return; }

  let newTile = g.tiles.pop();
  g.players[myPlayerId].tiles.push(newTile);

  await updateDoc(ref, {
    players: g.players,
    tiles: g.tiles
  });
}

/* CHAT SYSTEM */
function listenChat(){
  if(unsubscribeChat) return;
  const q = query(collection(db, "rooms", roomId, "chat"), orderBy("timestamp"));
  unsubscribeChat = onSnapshot(q, (snap) => {
    const chatDiv = document.getElementById("chatBox");
    chatDiv.innerHTML = snap.docs.map(d => 
        `<div style="margin-bottom:4px;"><b>${d.data().sender}:</b> ${d.data().message}</div>`
    ).join("");
    chatDiv.scrollTop = chatDiv.scrollHeight; // Auto scroll to bottom
  });
}

window.sendChat = async function(){
  let input = document.getElementById("chatInput");
  let msg = input.value;
  if(!msg) return;
  
  await addDoc(collection(db, "rooms", roomId, "chat"), {
    sender: myName,
    message: msg,
    timestamp: serverTimestamp()
  });
  input.value = "";
            }
