const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Nustatymai
const tileSize = 30; // 19 stulpelių * 30 = 570 plotis
const map = [
    "1111111111111111111",
    "1222222222122222221",
    "1211112112121111211",
    "1322212112121222311",
    "1211112222222111211",
    "1222222111112222221",
    "1112111111111121111",
    "1112112222221121111",
    "1112222111122221111",
    "1112111111111121111",
    "1222222222222222221",
    "1211112112121111211",
    "1322112222222112311",
    "1112112112121121111",
    "1222222111122222221",
    "1211111111111111211",
    "1222222222222222221",
    "1111111111111111111"
];

let score = 0;
let lives = 3;
let player = { x: 9, y: 10, dx: 0, dy: 0, nextDx: 0, nextDy: 0 };
let ghosts = [
    { x: 8, y: 8, dx: 1, dy: 0 },
    { x: 10, y: 8, dx: -1, dy: 0 }
];

// Žaidimo būsena
let gameLoopId;
let isPaused = false;
let quizTimeLeft = 10;
let quizTimerId;
let currentQIndex = 0;

// Įkeliame pliko vyro paveikslėlį
const playerImg = new Image();
playerImg.src = 'boss.png'; // Naudojame bosą kaip Pac-Man

function startGame() {
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('play-screen').classList.add('active');
    gameLoopId = requestAnimationFrame(gameLoop);
}

// --- PAC-MAN LOGIKA ---
function gameLoop() {
    if (!isPaused) {
        update();
        draw();
    }
    gameLoopId = requestAnimationFrame(gameLoop);
}

function update() {
    // Judėjimo logika (Pac-Man stilius)
    if (player.nextDx !== 0 || player.nextDy !== 0) {
        if (canMove(player.x + player.nextDx, player.y + player.nextDy)) {
            player.dx = player.nextDx;
            player.dy = player.nextDy;
            player.nextDx = 0; player.nextDy = 0;
        }
    }

    if (canMove(player.x + player.dx, player.y + player.dy)) {
        player.x += player.dx;
        player.y += player.dy;
        checkTile();
    } else {
        player.dx = 0; player.dy = 0;
    }

    // Vaiduoklių judėjimas (labai paprastas)
    ghosts.forEach(g => {
        if (!canMove(g.x + g.dx, g.y + g.dy) || Math.random() < 0.05) {
            // Keičia kryptį
            const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
            const d = dirs[Math.floor(Math.random() * 4)];
            if(canMove(g.x + d[0], g.y + d[1])) { g.dx = d[0]; g.dy = d[1]; }
        }
        g.x += g.dx;
        g.y += g.dy;

        // Susidūrimas su žaidėju
        if (g.x === player.x && g.y === player.y) {
            loseLife();
        }
    });
}

function canMove(x, y) {
    if (x < 0 || x >= 19 || y < 0 || y >= map.length) return false;
    return map[y][x] !== '1';
}

function checkTile() {
    let tile = map[player.y][player.x];
    if (tile === '2') { // Paprastas taškas
        score += 10;
        updateMap(player.x, player.y, '0');
        updateHUD();
    } else if (tile === '3') { // Power pellet - IŠKVIEČIA VIKTORINĄ
        score += 50;
        updateMap(player.x, player.y, '0');
        updateHUD();
        triggerQuiz();
    }

    // Laimėjimo sąlyga (jei neliko taškų)
    if (!map.some(row => row.includes('2') || row.includes('3'))) {
        endGame(true);
    }
}

function updateMap(x, y, char) {
    let row = map[y];
    map[y] = row.substring(0, x) + char + row.substring(x + 1);
}

function updateHUD() {
    document.getElementById('score-display').innerText = `Taškai: ${score}`;
    document.getElementById('lives-display').innerText = `Gyvybės: ${lives}`;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Piešiame labirintą
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            if (map[y][x] === '1') {
                ctx.fillStyle = '#0ff'; // Sienos
                ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
            } else if (map[y][x] === '2') {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(x * tileSize + 15, y * tileSize + 15, 3, 0, Math.PI * 2);
                ctx.fill();
            } else if (map[y][x] === '3') {
                ctx.fillStyle = '#f0f'; // Power pellet
                ctx.beginPath();
                ctx.arc(x * tileSize + 15, y * tileSize + 15, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // Piešiame žaidėją (Pliką vyrą)
    if (playerImg.complete) {
        ctx.drawImage(playerImg, player.x * tileSize, player.y * tileSize, tileSize, tileSize);
    } else {
        ctx.fillStyle = '#f0f'; // Kol neįsikėlė paveikslėlis
        ctx.fillRect(player.x * tileSize, player.y * tileSize, tileSize, tileSize);
    }

    // Piešiame vaiduoklius (galime naudoti kitus paveikslėlius, bet dabar raudoni kvadratai)
    ctx.fillStyle = 'red';
    ghosts.forEach(g => {
        ctx.fillRect(g.x * tileSize, g.y * tileSize, tileSize, tileSize);
    });
}

// --- VIKTORINOS INTEGRACIJA ---
function triggerQuiz() {
    isPaused = true;
    document.getElementById('quiz-overlay').classList.add('active');
    
    // Paimame klausimą
    const q = quizQuestions[currentQIndex % quizQuestions.length];
    document.getElementById('question-text').innerText = q.question;
    
    const optionsDiv = document.getElementById('options-container');
    optionsDiv.innerHTML = '';
    
    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.classList.add('option-btn');
        btn.innerText = opt;
        btn.onclick = () => checkQuizAnswer(index, q.answer);
        optionsDiv.appendChild(btn);
    });

    // Laikmatis
    quizTimeLeft = 10;
    document.getElementById('quiz-timer-display').innerText = `Laikas: ${quizTimeLeft}s`;
    
    clearInterval(quizTimerId);
    quizTimerId = setInterval(() => {
        quizTimeLeft--;
        document.getElementById('quiz-timer-display').innerText = `Laikas: ${quizTimeLeft}s`;
        if (quizTimeLeft <= 0) {
            clearInterval(quizTimerId);
            loseLife(); // Laikas baigėsi - prarandi gyvybę
            closeQuiz();
        }
    }, 1000);
}

function checkQuizAnswer(selected, correct) {
    clearInterval(quizTimerId);
    if (selected === correct) {
        score += 100; // Bonusas už teisingą atsakymą
        updateHUD();
        closeQuiz();
    } else {
        loseLife();
        closeQuiz();
    }
    currentQIndex++;
}

function closeQuiz() {
    document.getElementById('quiz-overlay').classList.remove('active');
    isPaused = false;
}

function loseLife() {
    lives--;
    updateHUD();
    if (lives <= 0) {
        endGame(false);
    } else {
        // Atstatome žaidėją į pradžią
        player.x = 9; player.y = 10; player.dx = 0; player.dy = 0;
        // Trumpam sustabdome, kad neprarastų visų gyvybių iškart
        isPaused = true;
        setTimeout(() => { isPaused = false; }, 1000);
    }
}

function endGame(isWin) {
    cancelAnimationFrame(gameLoopId);
    document.getElementById('play-screen').classList.remove('active');
    document.getElementById('end-screen').classList.add('active');
    
    document.getElementById('end-title').innerText = isWin ? "PERGALĖ!" : "PRALAIMĖJAI";
    document.getElementById('end-title').className = isWin ? "neon-text" : "neon-text-pink";
    document.getElementById('final-score').innerText = `Taškai: ${score}`;
}

// Valdymas
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w') setDirection('up');
    if (e.key === 'ArrowDown' || e.key === 's') setDirection('down');
    if (e.key === 'ArrowLeft' || e.key === 'a') setDirection('left');
    if (e.key === 'ArrowRight' || e.key === 'd') setDirection('right');
});

function setDirection(dir) {
    if (isPaused) return;
    if (dir === 'up' && player.dy === 0) { player.nextDx = 0; player.nextDy = -1; }
    if (dir === 'down' && player.dy === 0) { player.nextDx = 0; player.nextDy = 1; }
    if (dir === 'left' && player.dx === 0) { player.nextDx = -1; player.nextDy = 0; }
    if (dir === 'right' && player.dx === 0) { player.nextDx = 1; player.nextDy = 0; }
}
