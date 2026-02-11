// CONFIGURAZIONE
// Inserisci qui il TUO URL dello script Google
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby5lE4L1IZ13C7LaucAwB19dG_7erjtTUrOcCPmltTBcbXANAA8ewakSGwITGS4FOtV-w/exec";

// VARIABILI DI GIOCO GLOBALI
let currentGame = null;
let score = 0;
let lives = 3;
let gameActive = false;
let gameIntervals = []; // Array per salvare tutti i timer e pulirli alla fine

// ELEMENTI DOM
const modal = document.getElementById('gameModal');
const gameStage = document.getElementById('game-stage');
const scoreDisplay = document.getElementById('global-score');
const livesDisplay = document.getElementById('global-lives');
const saveForm = document.getElementById('save-form');
const instructionsPanel = document.getElementById('game-instructions');
const instructionsText = document.getElementById('instruction-text');
const leaderboardList = document.getElementById('leaderboard-list');

// TESTI ISTRUZIONI
const RULES = {
    'cosciotto': "Muovi il cestino 🧺 per raccogliere cibo 🍗.<br>Evita le bombe 💣!<br>Se il cibo cade, perdi una vita.",
    'ratti': "Tocca i topi 🐭 appena escono dai buchi.<br>Sii veloce! Più punti fai, più sono rapidi.",
    'freccette': "Il bersaglio oscilla.<br>Premi 'TIRA' quando il centro rosso è allineato col puntino verde.",
    'barili': "Impila i barili.<br>Clicca per fermare il blocco.<br>Se non sei preciso, il barile si taglia!",
    'simon': "Memorizza la sequenza di colori.<br>Ripetila. Ad ogni turno si aggiunge un colore."
};

/* --- GESTIONE SISTEMA --- */

function openGame(gameName) {
    currentGame = gameName;
    score = 0;
    lives = 3;
    
    // UI Reset
    modal.style.display = 'flex';
    gameStage.innerHTML = '';
    saveForm.classList.add('hidden');
    instructionsPanel.classList.remove('hidden');
    instructionsText.innerHTML = RULES[gameName];
    document.getElementById('modal-title').innerText = gameName.toUpperCase();
    
    updateHUD();
    loadLeaderboard(gameName);
}

function startGameLogic() {
    instructionsPanel.classList.add('hidden');
    gameActive = true;
    
    // Switch giochi
    if (currentGame === 'cosciotto') initCosciotto();
    else if (currentGame === 'ratti') initRatti();
    else if (currentGame === 'freccette') initFreccette();
    else if (currentGame === 'barili') initBarili();
    else if (currentGame === 'simon') initSimon();
}

function closeGame() {
    stopAllGames();
    modal.style.display = 'none';
}

function stopAllGames() {
    gameActive = false;
    // Ferma tutti i loop
    gameIntervals.forEach(clearInterval);
    gameIntervals = [];
    // Rimuovi listener
    gameStage.onclick = null;
    gameStage.onmousemove = null;
    gameStage.ontouchmove = null;
}

function updateHUD() {
    scoreDisplay.innerText = score;
    livesDisplay.innerText = "❤️".repeat(Math.max(0, lives));
}

function gameOver() {
    if (!gameActive) return;
    gameActive = false;
    stopAllGames();
    
    // Mostra form salvataggio
    saveForm.classList.remove('hidden');
    document.getElementById('final-score-display').innerText = score;
}

function resetGame() {
    stopAllGames();
    openGame(currentGame);
}

/* --- GIOCO 1: ACCHIAPPA IL COSCIOTTO --- */
function initCosciotto() {
    // 1. Crea il Cestino (Emoji)
    gameStage.innerHTML = `<div id="basket">🧺</div>`;
    const basket = document.getElementById('basket');
    
    // 2. Movimento Cestino
    function moveBasket(clientX) {
        if (!gameActive) return;
        const rect = gameStage.getBoundingClientRect();
        let x = clientX - rect.left - 40; // Centra l'emoji (larga ca 80px)
        
        // Limiti
        if (x < 0) x = 0;
        if (x > rect.width - 80) x = rect.width - 80;
        
        basket.style.left = x + 'px';
    }
    
    // Listener Mouse e Touch
    gameStage.onmousemove = (e) => moveBasket(e.clientX);
    gameStage.ontouchmove = (e) => { e.preventDefault(); moveBasket(e.touches[0].clientX); };

    // 3. Spawner Oggetti
    let spawner = setInterval(() => {
        const item = document.createElement('div');
        item.classList.add('falling-item');
        
        // 20% Bomba, 80% Cibo
        const isBomb = Math.random() > 0.8;
        item.innerText = isBomb ? '💣' : (Math.random() > 0.5 ? '🍗' : '🍺');
        
        // Posizione casuale
        item.style.left = Math.random() * (gameStage.offsetWidth - 50) + 'px';
        item.style.top = '-50px';
        gameStage.appendChild(item);
        
        // Loop Caduta Singolo Oggetto
        let fallSpeed = 4 + (score * 0.05); // Accelera col punteggio
        
        let fallLoop = setInterval(() => {
            if (!gameActive) { clearInterval(fallLoop); item.remove(); return; }
            
            let top = parseFloat(item.style.top);
            const limit = gameStage.offsetHeight;
            
            // Collisione
            if (top > limit - 90 && top < limit - 10) {
                const iRect = item.getBoundingClientRect();
                const bRect = basket.getBoundingClientRect();
                
                // Sovrapposizione
                if (iRect.right > bRect.left + 10 && iRect.left < bRect.right - 10) {
                    // Preso!
                    if (isBomb) {
                        lives--; flashStage('red');
                    } else {
                        score += 10;
                    }
                    updateHUD();
                    item.remove();
                    clearInterval(fallLoop);
                    if (lives <= 0) gameOver();
                    return;
                }
            }
            
            // Toccato terra
            if (top > limit) {
                if (!isBomb) { lives--; updateHUD(); } // Cibo perso
                item.remove();
                clearInterval(fallLoop);
                if (lives <= 0) gameOver();
            } else {
                item.style.top = (top + fallSpeed) + 'px';
            }
        }, 20);
        gameIntervals.push(fallLoop);
        
    }, 1000); // Spawn ogni secondo
    gameIntervals.push(spawner);
}


/* --- GIOCO 2: SCHIACCIA IL RATTO --- */
function initRatti() {
    // Genera griglia
    let html = '<div class="grid-ratti">';
    for (let i = 0; i < 9; i++) {
        html += `<div class="hole"><div class="mole" onmousedown="whack(this)">🐭</div></div>`;
    }
    html += '</div>';
    gameStage.innerHTML = html;
    
    // Loop comparsa
    function peep() {
        if (!gameActive) return;
        const moles = document.querySelectorAll('.mole');
        const rand = Math.floor(Math.random() * moles.length);
        const mole = moles[rand];
        
        if (mole.classList.contains('up')) {
            setTimeout(peep, 100); return;
        }
        
        mole.innerText = "🐭"; // Reset emoji
        mole.classList.add('up');
        
        // Tempo a schermo variabile
        const time = Math.max(500, 1200 - (score * 10));
        
        setTimeout(() => {
            mole.classList.remove('up');
            if (gameActive) setTimeout(peep, Math.random() * 500 + 200);
        }, time);
    }
    
    setTimeout(peep, 500);
}

window.whack = function(mole) {
    if (!mole.classList.contains('up') || !gameActive) return;
    score += 10;
    updateHUD();
    mole.innerText = "💥"; // Feedback visivo
    setTimeout(() => mole.classList.remove('up'), 200);
};


/* --- GIOCO 3: FRECCETTE DELL'UBRIACO --- */
function initFreccette() {
    gameStage.innerHTML = `
        <div class="center-mark"></div>
        <div id="dart-target"></div>
        <button onclick="throwDart()" class="btn-play" style="position:absolute; bottom:20px; left:50%; transform:translateX(-50%); z-index:200;">TIRA!</button>
    `;
    
    const target = document.getElementById('dart-target');
    let angle = 0;
    
    let loop = setInterval(() => {
        let speed = 0.04 + (score * 0.0001);
        angle += speed;
        
        // Matematica oscillazione
        const radius = 100;
        const x = Math.sin(angle) * radius;
        const y = Math.cos(angle * 1.3) * radius; // 1.3 rende l'orbita irregolare
        
        target.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        
        // Salviamo coordinate per il calcolo hit
        target.dataset.x = x;
        target.dataset.y = y;
        
    }, 20);
    gameIntervals.push(loop);
}

window.throwDart = function() {
    if (!gameActive) return;
    const t = document.getElementById('dart-target');
    const x = parseFloat(t.dataset.x || 0);
    const y = parseFloat(t.dataset.y || 0);
    
    // Distanza dal centro (0,0)
    const dist = Math.sqrt(x*x + y*y);
    
    // Hitbox: Centro < 15px
    if (dist < 15) { score += 50; flashStage('lime'); }
    else if (dist < 40) { score += 20; flashStage('yellow'); }
    else if (dist < 70) { score += 5; flashStage('orange'); }
    else {
        lives--; flashStage('red');
        if (lives <= 0) gameOver();
    }
    updateHUD();
};


/* --- GIOCO 4: TORRE DI BARILI --- */
function initBarili() {
    gameStage.innerHTML = `<div id="moving-block"></div>`;
    
    let level = 0;
    let width = 200;
    let pos = 0;
    let direction = 1;
    let speed = 3;
    const height = 30;
    const stageWidth = gameStage.offsetWidth;
    const mover = document.getElementById('moving-block');
    
    // Setup iniziale
    mover.style.width = width + 'px';
    mover.style.bottom = '0px';
    
    // Loop movimento
    let loop = setInterval(() => {
        const max = stageWidth - width;
        pos += speed * direction;
        
        if (pos > max || pos < 0) direction *= -1;
        mover.style.left = pos + 'px';
    }, 16);
    gameIntervals.push(loop);
    
    // Click per fermare
    gameStage.onclick = function() {
        if (!gameActive) return;
        
        // Calcoli per il taglio
        // Se è il primo blocco (level 0), è sempre valido, ma definiamo la base
        // Se level > 0, confrontiamo con quello sotto
        
        // Logica semplificata per gameplay fluido:
        // Confrontiamo con il "Centro ideale" o il blocco precedente.
        // Qui confrontiamo col blocco precedente salvato nel DOM
        const prevBlock = document.getElementById(`barile-${level-1}`);
        let prevLeft = prevBlock ? parseFloat(prevBlock.style.left) : (stageWidth - 200) / 2;
        let prevWidth = prevBlock ? parseFloat(prevBlock.style.width) : 200;
        
        // Al primo livello permettiamo di piazzare ovunque, ma centrare è meglio
        if (level === 0) { prevLeft = (stageWidth - 200) / 2; prevWidth = 200; }
        
        const currentLeft = pos;
        const currentRight = pos + width;
        const targetLeft = prevLeft;
        const targetRight = prevLeft + prevWidth;
        
        // Calcolo overlap
        const overlapLeft = Math.max(currentLeft, targetLeft);
        const overlapRight = Math.min(currentRight, targetRight);
        const overlap = overlapRight - overlapLeft;
        
        if (level > 0 && overlap <= 0) {
            // Mancato!
            lives = 0; gameOver(); return;
        }
        
        // Aggiorna larghezza (se level > 0)
        let newWidth = width;
        let newLeft = pos;
        
        if (level > 0) {
            newWidth = overlap;
            newLeft = overlapLeft;
        }
        
        // Crea blocco fisso
        const fixed = document.createElement('div');
        fixed.className = 'barile';
        fixed.id = `barile-${level}`;
        fixed.style.width = newWidth + 'px';
        fixed.style.left = newLeft + 'px';
        fixed.style.bottom = (level * height) + 'px';
        gameStage.appendChild(fixed);
        
        score += 10;
        level++;
        width = newWidth;
        speed += 0.5;
        
        // Resetta mover
        mover.style.width = width + 'px';
        mover.style.bottom = (level * height) + 'px';
        pos = 0; // R parte da sinistra
        
        // Scroll camera
        if (level * height > 200) {
            gameStage.scrollTo({ top: gameStage.scrollHeight, behavior: 'smooth' });
        }
    };
}


/* --- GIOCO 5: SIMON --- */
let simonSeq = [];
let simonStep = 0;
let canClick = false;

function initSimon() {
    gameStage.innerHTML = `
        <div class="simon-grid">
            <div class="simon-btn" style="background:#e74c3c; color:#e74c3c;" onclick="clkSimon(0)"></div>
            <div class="simon-btn" style="background:#3498db; color:#3498db;" onclick="clkSimon(1)"></div>
            <div class="simon-btn" style="background:#2ecc71; color:#2ecc71;" onclick="clkSimon(2)"></div>
            <div class="simon-btn" style="background:#f1c40f; color:#f1c40f;" onclick="clkSimon(3)"></div>
        </div>
        <div id="simon-msg" style="position:absolute; top:50%; width:100%; text-align:center; font-size:2em; font-weight:bold; pointer-events:none; text-shadow:2px 2px #000;"></div>
    `;
    
    simonSeq = [];
    setTimeout(playRound, 1000);
}

function playRound() {
    if (!gameActive) return;
    simonStep = 0;
    canClick = false;
    document.getElementById('simon-msg').innerText = "Memorizza!";
    
    simonSeq.push(Math.floor(Math.random() * 4));
    
    let i = 0;
    let int = setInterval(() => {
        if (i >= simonSeq.length) {
            clearInterval(int);
            document.getElementById('simon-msg').innerText = "Tocca a te!";
            canClick = true;
            return;
        }
        flashBtn(simonSeq[i]);
        i++;
    }, 800);
    gameIntervals.push(int);
}

function flashBtn(idx) {
    const btns = document.querySelectorAll('.simon-btn');
    btns[idx].classList.add('active-light');
    setTimeout(() => btns[idx].classList.remove('active-light'), 400);
}

window.clkSimon = function(idx) {
    if (!canClick || !gameActive) return;
    flashBtn(idx);
    
    if (idx !== simonSeq[simonStep]) {
        lives = 0; gameOver(); return;
    }
    
    simonStep++;
    if (simonStep >= simonSeq.length) {
        score += simonSeq.length * 10;
        updateHUD();
        canClick = false;
        document.getElementById('simon-msg').innerText = "Bravo!";
        setTimeout(playRound, 1000);
    }
};

/* --- UTILITIES & DB --- */
function flashStage(color) {
    gameStage.style.borderColor = color;
    setTimeout(() => gameStage.style.borderColor = "#5d4037", 200);
}

function submitScore() {
    const name = document.getElementById('player-name').value;
    if (!name) return alert("Inserisci il tuo nome!");
    
    const btn = document.querySelector('#save-form button');
    btn.innerText = "Salvataggio...";
    btn.disabled = true;
    
    fetch(`${SCRIPT_URL}?action=save&name=${encodeURIComponent(name)}&score=${score}&game=${currentGame}`, {
        method: 'POST'
    })
    .then(() => {
        alert("Punteggio salvato!");
        btn.innerText = "SALVA";
        btn.disabled = false;
        resetGame(); // Torna alla home del gioco
    })
    .catch(e => {
        console.error(e);
        alert("Errore di connessione.");
        btn.disabled = false;
    });
}

function loadLeaderboard(game) {
    leaderboardList.innerHTML = "<li>Caricamento...</li>";
    fetch(`${SCRIPT_URL}?game=${game}`)
        .then(res => res.json())
        .then(data => {
            leaderboardList.innerHTML = "";
            if(data.length === 0) leaderboardList.innerHTML = "<li>Nessun record ancora!</li>";
            data.forEach((row, i) => {
                leaderboardList.innerHTML += `<li><span>#${i+1} ${row.name}</span><span>${row.score}</span></li>`;
            });
        });
}
