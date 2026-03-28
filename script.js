const SIZE = 8;
const EMPTY = 0, P1 = 1, P2 = 2; // P1: Blue, P2: Red
let board = [];
let currentPlayer = P1;
let myPlayer = P1;
let gameMode = ''; // 'ai' or 'p2p'
let peer = null, conn = null;

// UI Elements
const menuUI = document.getElementById('menu-ui');
const gameUI = document.getElementById('game-ui');
const resultScreen = document.getElementById('result-screen');
const boardEl = document.getElementById('board');
const turnIndicator = document.getElementById('turn-indicator');
const p1ScoreEl = document.getElementById('score-1');
const p2ScoreEl = document.getElementById('score-2');

// Directions for Othello logic (8 directions)
const DIRS = [[-1,0], [1,0], [0,-1], [0,1], [-1,-1], [-1,1], [1,-1], [1,1]];

// Heuristic matrix for Hard AI
const BOARD_WEIGHTS = [
    [100, -20, 10,  5,  5, 10, -20, 100],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [ 10,  -2, -1, -1, -1, -1,  -2,  10],
    [  5,  -2, -1, -1, -1, -1,  -2,   5],
    [  5,  -2, -1, -1, -1, -1,  -2,   5],
    [ 10,  -2, -1, -1, -1, -1,  -2,  10],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [100, -20, 10,  5,  5, 10, -20, 100]
];

// --- GAME LOGIC ---
function initBoard() {
    board = Array(SIZE).fill().map(() => Array(SIZE).fill(EMPTY));
    board[3][3] = P2; board[4][4] = P2;
    board[3][4] = P1; board[4][3] = P1;
    currentPlayer = P1;
}

function getFlips(r, c, player, b = board) {
    if (b[r][c] !== EMPTY) return [];
    let flips = [];
    const opp = player === P1 ? P2 : P1;
    
    for (let [dr, dc] of DIRS) {
        let nr = r + dr, nc = c + dc;
        let path = [];
        while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && b[nr][nc] === opp) {
            path.push([nr, nc]);
            nr += dr; nc += dc;
        }
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && b[nr][nc] === player) {
            flips.push(...path);
        }
    }
    return flips;
}

function getValidMoves(player, b = board) {
    let moves = [];
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (getFlips(r, c, player, b).length > 0) moves.push({r, c});
        }
    }
    return moves;
}

function makeMove(r, c, player, b = board) {
    let flips = getFlips(r, c, player, b);
    if (flips.length === 0) return false;
    b[r][c] = player;
    for (let [fr, fc] of flips) b[fr][fc] = player;
    return true;
}

// --- HARD AI LOGIC (Minimax with Alpha-Beta) ---
function evaluateBoard(b, player) {
    let score = 0;
    const opp = player === P1 ? P2 : P1;
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (b[r][c] === player) score += BOARD_WEIGHTS[r][c];
            else if (b[r][c] === opp) score -= BOARD_WEIGHTS[r][c];
        }
    }
    return score;
}

function minimax(b, depth, alpha, beta, maximizingPlayer, aiPlayer) {
    const opp = aiPlayer === P1 ? P2 : P1;
    const currentP = maximizingPlayer ? aiPlayer : opp;
    let moves = getValidMoves(currentP, b);
    
    if (depth === 0 || moves.length === 0) return evaluateBoard(b, aiPlayer);

    if (maximizingPlayer) {
        let maxEval = -Infinity;
        for (let m of moves) {
            let tempBoard = b.map(row => [...row]);
            makeMove(m.r, m.c, currentP, tempBoard);
            let ev = minimax(tempBoard, depth - 1, alpha, beta, false, aiPlayer);
            maxEval = Math.max(maxEval, ev);
            alpha = Math.max(alpha, ev);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let m of moves) {
            let tempBoard = b.map(row => [...row]);
            makeMove(m.r, m.c, currentP, tempBoard);
            let ev = minimax(tempBoard, depth - 1, alpha, beta, true, aiPlayer);
            minEval = Math.min(minEval, ev);
            beta = Math.min(beta, ev);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function aiTurn() {
    let moves = getValidMoves(currentPlayer);
    if (moves.length === 0) { passTurn(); return; }
    
    let bestScore = -Infinity;
    let bestMove = moves[0];
    
    for (let m of moves) {
        let tempBoard = board.map(row => [...row]);
        makeMove(m.r, m.c, currentPlayer, tempBoard);
        // Depth 4 is fast in JS and very hard for this heuristic
        let score = minimax(tempBoard, 4, -Infinity, Infinity, false, currentPlayer);
        if (score > bestScore) {
            bestScore = score;
            bestMove = m;
        }
    }
    
    setTimeout(() => { processMove(bestMove.r, bestMove.c); }, 600);
}

// --- UI AND FLOW ---
function drawBoard() {
    boardEl.innerHTML = '';
    let validMoves = getValidMoves(currentPlayer);
    let counts = { [P1]: 0, [P2]: 0 };

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (board[r][c] === P1) counts[P1]++;
            if (board[r][c] === P2) counts[P2]++;
            
            let cell = document.createElement('div');
            cell.className = 'cell';
            
            if (board[r][c] !== EMPTY) {
                let disk = document.createElement('div');
                disk.className = `disk p${board[r][c]}`;
                cell.appendChild(disk);
            } else if (currentPlayer === myPlayer && validMoves.some(m => m.r === r && m.c === c)) {
                cell.classList.add('valid-move');
                cell.onclick = () => handleCellClick(r, c);
            }
            boardEl.appendChild(cell);
        }
    }
    
    p1ScoreEl.innerText = counts[P1];
    p2ScoreEl.innerText = counts[P2];
    turnIndicator.innerText = currentPlayer === P1 ? "Turn: Blue" : "Turn: Red";
    turnIndicator.style.color = currentPlayer === P1 ? "var(--p1-color)" : "var(--p2-color)";
    
    checkGameOver(counts);
}

function handleCellClick(r, c) {
    if (currentPlayer !== myPlayer) return;
    processMove(r, c);
}

function processMove(r, c) {
    if (makeMove(r, c, currentPlayer)) {
        if (gameMode === 'p2p' && currentPlayer === myPlayer) {
            conn.send({ type: 'move', r, c });
        }
        currentPlayer = currentPlayer === P1 ? P2 : P1;
        drawBoard();
        
        if (getValidMoves(currentPlayer).length === 0) passTurn();
        else if (gameMode === 'ai' && currentPlayer !== myPlayer) aiTurn();
    }
}

function passTurn() {
    currentPlayer = currentPlayer === P1 ? P2 : P1;
    if (getValidMoves(currentPlayer).length === 0) drawBoard(); // Game effectively over
    else {
        drawBoard();
        if (gameMode === 'ai' && currentPlayer !== myPlayer) aiTurn();
    }
}

function checkGameOver(counts) {
    if (getValidMoves(P1).length === 0 && getValidMoves(P2).length === 0) {
        gameUI.classList.add('hidden');
        resultScreen.classList.remove('hidden');
        
        let titleEl = document.getElementById('result-title');
        let details = document.getElementById('result-details');
        details.innerText = `Blue: ${counts[P1]} | Red: ${counts[P2]}`;
        
        if (counts[P1] > counts[P2]) {
            titleEl.innerText = gameMode === 'ai' ? "YOU WIN!" : (myPlayer === P1 ? "YOU WIN!" : "YOU LOSE!");
            titleEl.style.color = "var(--p1-color)";
        } else if (counts[P2] > counts[P1]) {
            titleEl.innerText = gameMode === 'ai' ? "AI WINS!" : (myPlayer === P2 ? "YOU WIN!" : "YOU LOSE!");
            titleEl.style.color = "var(--p2-color)";
        } else {
            titleEl.innerText = "DRAW!";
            titleEl.style.color = "white";
        }
    }
}

function resetToMenu() {
    resultScreen.classList.add('hidden');
    menuUI.classList.remove('hidden');
    if (conn) { conn.close(); conn = null; }
    if (peer) { peer.destroy(); peer = null; }
}

// --- NETWORKING & INITIALIZATION ---
function startAIGame() {
    gameMode = 'ai';
    myPlayer = P1;
    menuUI.classList.add('hidden');
    gameUI.classList.remove('hidden');
    initBoard();
    drawBoard();
}

function initPeer() {
    peer = new Peer();
    peer.on('open', id => { document.getElementById('peer-id-display').innerText = id; });
    peer.on('connection', connection => {
        conn = connection;
        setupConn();
        // Host is P1, Guest is P2
        myPlayer = P1; 
        startGameP2P();
    });
}

function hostGame() {
    document.getElementById('host-info').classList.remove('hidden');
    initPeer();
}

function joinGame() {
    const hostId = document.getElementById('join-id').value;
    if (!hostId) return alert('Enter Host ID');
    peer = new Peer();
    peer.on('open', () => {
        conn = peer.connect(hostId);
        conn.on('open', () => {
            myPlayer = P2;
            setupConn();
            startGameP2P();
        });
    });
}

function setupConn() {
    conn.on('data', data => {
        if (data.type === 'move') {
            processMove(data.r, data.c);
        }
    });
    conn.on('close', () => {
        alert("Opponent disconnected!");
        resetToMenu();
    });
}

function startGameP2P() {
    gameMode = 'p2p';
    menuUI.classList.add('hidden');
    gameUI.classList.remove('hidden');
    initBoard();
    drawBoard();
}
