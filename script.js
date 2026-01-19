let tiles = [];
let board = [];
let currentPlayer = 1;
let players = { 1: [], 2: [] };

function generateTiles() {
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      tiles.push([i, j]);
    }
  }
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function deal() {
  shuffle(tiles);
  players[1] = tiles.splice(0, 7);
  players[2] = tiles.splice(0, 7);
}

function render() {
  document.getElementById('board').innerHTML = board.map(t => `<div class='tile'>${t[0]}|${t[1]}</div>`).join('');

  document.getElementById('p1').innerHTML = players[1].map((t,i) =>
    currentPlayer===1 ? `<div class='tile' onclick='playTile(1,${i})'>${t[0]}|${t[1]}</div>` : `<div class='tile'>?</div>`
  ).join('');

  document.getElementById('p2').innerHTML = players[2].map((t,i) =>
    currentPlayer===2 ? `<div class='tile' onclick='playTile(2,${i})'>${t[0]}|${t[1]}</div>` : `<div class='tile'>?</div>`
  ).join('');

  document.getElementById('status').innerText = `Player ${currentPlayer}'s turn`;
}

function playTile(player, index) {
  if (player !== currentPlayer) return;

  const tile = players[player][index];

  if (board.length === 0 || board[board.length-1][1] === tile[0]) {
    board.push(tile);
    players[player].splice(index,1);
    if (players[player].length === 0) {
      alert(`Player ${player} Wins!`);
      location.reload();
    }
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    render();
  } else {
    alert('Invalid Move');
  }
}

// Init
generateTiles();
deal();
render();
