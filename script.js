let tiles = [];
let board = [];
let currentPlayer = 1;

let players = {
  1: [],
  2: []
};

// Generate Domino tiles
function generateTiles() {
  tiles = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      tiles.push([i, j]);
    }
  }
}

// Shuffle tiles
function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

// Deal tiles
function dealTiles() {
  shuffle(tiles);
  players[1] = tiles.splice(0, 7);
  players[2] = tiles.splice(0, 7);
}

// Render game
function render() {
  // Board
  document.getElementById("board").innerHTML = board.map(t => {
    let orientation = (t[0] === t[1]) ? "vertical" : "horizontal";
    return `
      <div class="tile ${orientation}">
        <span>${t[0]}</span>
        <div class="divider"></div>
        <span>${t[1]}</span>
      </div>
    `;
  }).join("");

  // Player 1 hand
  document.getElementById("p1").innerHTML = players[1].map((t, i) => {
    return currentPlayer === 1
      ? `<div class="tile" onclick="playTile(1,${i})">${t[0]}|${t[1]}</div>`
      : `<div class="tile">?</div>`;
  }).join("");

  // Player 2 hand
  document.getElementById("p2").innerHTML = players[2].map((t, i) => {
    return currentPlayer === 2
      ? `<div class="tile" onclick="playTile(2,${i})">${t[0]}|${t[1]}</div>`
      : `<div class="tile">?</div>`;
  }).join("");

  document.getElementById("status").innerText =
    `Player ${currentPlayer}'s Turn | Boneyard: ${tiles.length}`;
}

// Play tile
function playTile(player, index) {
  if (player !== currentPlayer) return;

  let tile = players[player][index];

  if (
    board.length === 0 ||
    board[board.length - 1][1] === tile[0]
  ) {
    board.push(tile);
    players[player].splice(index, 1);

    if (players[player].length === 0) {
      alert(`🎉 Player ${player} Wins!`);
      location.reload();
    }

    currentPlayer = currentPlayer === 1 ? 2 : 1;
    render();
  } else {
    alert("❌ Match নাই, Draw করুন");
  }
}

// Draw tile from boneyard
function drawTile() {
  if (tiles.length === 0) {
    alert("Boneyard খালি!");
    return;
  }

  let drawn = tiles.pop();
  players[currentPlayer].push(drawn);
  render();
}

// Start game
generateTiles();
dealTiles();
render();
