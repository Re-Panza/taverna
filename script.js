// URL SCRIPT GOOGLE (INSERISCI IL TUO QUI!)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby5lE4L1IZ13C7LaucAwB19dG_7erjtTUrOcCPmltTBcbXANAA8ewakSGwITGS4FOtV-w/exec";

// STATO GLOBALE
let currentGame = null;
let score = 0;
let lives = 3;
let gameIntervals = [];
let gameActive = false;

// DOM ELEMENTS
const modal = document.getElementById('gameModal');
const gameStage = document.getElementById('game-stage');
const scoreDisplay = document.getElementById('global-score');
const livesDisplay = document.getElementById('global-lives');
const saveForm = document.getElementById('save-form');
const instructionsPanel = document.getElementById('game-instructions');
const instructionText = document.getElementById('instruction-text');
const leaderboardList = document.getElementById('leaderboard-list');

// LEGENDA
const GAME_RULES = {
    'cosciotto': "Muovi il cestino col MOUSE (o dito) per prendere cosciotti e birre.<br>Evita le bombe!<br>Se il cibo cade a terra, perdi una vita.",
    'freccette': "Il bersaglio oscilla.<br>Aspetta che il centro rosso passi SOTTO il puntino verde.<br>Premi TIRA quando è allineato!",
    'ratti': "I ratti spuntano a caso.<br>Cliccali velocemente prima che rientrino!<br>Più punti fai, più diventano schegge.",
    'barili': "Ferma il barile esattamente sopra quello precedente.<br>Se non sei preciso, il barile si rimpicciolisce.<br>Se manchi la torre... crolla tutto!",
    'simon': "Memorizza la sequenza di luci.<br>Ripetila uguale.<br>Ogni turno si aggiunge un colore."
};

/* --- SISTEMA GENERALE --- */

function openGame(gameType) {
    currentGame = gameType;
    modal.style.display = 'flex';
    document.getElementById('modal-title').innerText = gameType.toUpperCase();
    
    saveForm.classList.add('hidden');
    gameStage.innerHTML = ''; 
    score = 0; lives = 3;
    updateHUD();
    loadLeaderboard(gameType);

    instructionsPanel.classList.remove('hidden');
    instructionText.innerHTML = GAME_RULES[gameType];
}

function startGameLogic() {
    instructionsPanel.classList.add('hidden');
    gameActive = true;
    
    switch(currentGame) {
        case 'ratti': initRatti(); break;
        case 'freccette': initFreccette(); break;
        case 'barili': initBarili(); break;
        case 'simon': initSimon(); break;
        case 'cosciotto': initCosciotto(); break;
    }
}

function closeGame() {
    stopAllGames();
    modal.style.display = 'none';
}

function stopAllGames() {
    gameActive = false;
    gameIntervals.forEach(clearInterval);
    gameIntervals = [];
    // Rimuovi event listeners speciali se necessario
    gameStage.onclick = null;
    gameStage.onmousemove = null;
    gameStage.ontouchmove = null;
}

function updateHUD() {
    scoreDisplay.innerText = score;
    livesDisplay.innerText = "❤️".repeat(Math.max(0, lives));
}

function gameOver() {
    if(!gameActive) return; // Evita doppi trigger
    gameActive = false;
    stopAllGames();
    saveForm.classList.remove('hidden');
    document.getElementById('final-score-display').innerText = score;
}

function resetGameUI() {
    openGame(currentGame);
}

/* --- 1. GIOCO RATTI (FIXED) --- */
function initRatti() {
    let html = '<div class="grid-ratti">';
    for(let i=0; i<9; i++) html += `<div class="hole"><div class="mole" onmousedown="hitRat(this)"></div></div>`;
    html += '</div>';
    gameStage.innerHTML = html;

    let minTime = 800;
    
    function peep() {
        if(!gameActive) return;
        const moles = document.querySelectorAll('.mole');
        const randomIdx = Math.floor(Math.random() * moles.length);
        const mole = moles[randomIdx];

        if(mole.classList.contains('up')) { 
            // Se è già su, riprova tra poco
            setTimeout(peep, 100); 
            return; 
        }

        mole.classList.add('up');

        // Difficoltà: più punti = meno tempo
        let stayTime = Math.max(500, 1000 - (score * 5));
        
        setTimeout(() => {
            if(mole.classList.contains('up')) {
                mole.classList.remove('up');
                // Se vuoi perdere vite quando scappano, scommenta:
                // lives--; updateHUD(); if(lives<=0) gameOver();
            }
            if(gameActive) setTimeout(peep, Math.random() * 500 + 200);
        }, stayTime);
    }
    // Avvia il ciclo
    setTimeout(peep, 500);
}

window.hitRat = function(mole) {
    if(!mole.classList.contains('up') || !gameActive) return;
    mole.classList.remove('up'); // Nascondi subito
    score += 10;
    updateHUD();
}

/* --- 2. GIOCO FRECCETTE --- */
function initFreccette() {
    gameStage.innerHTML = `
        <div class="center-mark"></div>
        <div style="position:absolute; top:50%; width:100%; height:1px; background:rgba(255,255,255,0.3);"></div>
        <div style="position:absolute; left:50%; height:100%; width:1px; background:rgba(255,255,255,0.3);"></div>
        <div id="dart-target"></div>
        <button onclick="throwDart()" style="position:absolute; bottom:20px; left:50%; transform:translate(-50%); padding:15px; font-weight:bold; z-index:100; cursor:pointer; background:red; color:white; border:2px solid white;">TIRA!</button>
    `;

    const target = document.getElementById('dart-target');
    let angle = 0;
    let speed = 0.04;

    let loop = setInterval(() => {
        angle += speed + (score * 0.0001);
        let radius = 100; 
        // Movimento Lissajous (più caotico)
        let x = Math.sin(angle) * radius;
        let y = Math.cos(angle * 1.3) * radius; 
        
        target.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        target.dataset.x = x;
        target.dataset.y = y;
    }, 20);
    gameIntervals.push(loop);
}

window.throwDart = function() {
    if(!gameActive) return;
    const target = document.getElementById('dart-target');
    let x = parseFloat(target.dataset.x || 0);
    let y = parseFloat(target.dataset.y || 0);
    let dist = Math.sqrt(x*x + y*y); // Distanza dal centro (0,0)

    // Hitbox: Centro < 15px, Medio < 35px, Esterno < 60px
    if (dist < 15) { score += 50; flash("lime"); }
    else if (dist < 35) { score += 20; flash("yellow"); }
    else if (dist < 60) { score += 5; flash("orange"); }
    else {
        lives--;
        flash("red");
        if(lives <= 0) gameOver();
    }
    updateHUD();
}

function flash(color) {
    gameStage.style.borderColor = color;
    setTimeout(() => gameStage.style.borderColor = "#5c4a35", 200);
}

/* --- 3. GIOCO BARILI (SCROLL FIXED) --- */
function initBarili() {
    // HTML struttura
    gameStage.innerHTML = `<div id="moving-block"></div>`;
    
    // Variabili logica
    let stack = []; // Array dei blocchi piazzati
    let currentWidth = 200; // Larghezza iniziale
    let currentX = 0;
    let direction = 1;
    let speed = 3;
    let level = 0;
    const height = 30; // Altezza blocco
    const stageWidth = gameStage.offsetWidth;

    // Crea blocco mobile
    const mover = document.getElementById('moving-block');
    mover.style.width = currentWidth + 'px';
    mover.style.bottom = (level * height) + 'px';
    
    // Loop movimento
    let loop = setInterval(() => {
        const maxPos = stageWidth - currentWidth;
        currentX += speed * direction;
        
        if(currentX > maxPos || currentX < 0) direction *= -1;
        mover.style.left = currentX + 'px';
    }, 16);
    gameIntervals.push(loop);

    // Click handler
    gameStage.onclick = function() {
        if(!gameActive) return;

        // 1. Calcola sovrapposizione
        let prevBlock = stack[stack.length - 1];
        let prevX = prevBlock ? parseFloat(prevBlock.style.left) : (stageWidth - 200) / 2; // Primo blocco centrato ideale
        let prevWidth = prevBlock ? parseFloat(prevBlock.style.width) : 200;

        // Se è il primo livello, è un po' più permissivo (centrato)
        if(level === 0) { prevX = (stageWidth - 200) / 2; prevWidth = 200; }

        // Calcolo differenza
        // La posizione reale è currentX
        // Logica semplificata: se manchi troppo muori
        
        let error = 0;
        if(level > 0) {
            let left1 = currentX;
            let right1 = currentX + currentWidth;
            let left2 = parseFloat(prevBlock.style.left);
            let right2 = left2 + parseFloat(prevBlock.style.width);

            let overlapLeft = Math.max(left1, left2);
            let overlapRight = Math.min(right1, right2);
            let overlap = overlapRight - overlapLeft;

            if (overlap <= 0) {
                // Mancato totalmente
                lives = 0; updateHUD(); gameOver(); return;
            }
            
            // Nuova larghezza
            currentWidth = overlap;
            currentX = overlapLeft; // Sposta visivamente il blocco dove c'è overlap
            error = 1; // Flag che abbiamo tagliato
        }

        score += 10;
        speed += 0.5;

        // 2. Crea blocco statico
        let fixed = document.createElement('div');
        fixed.className = 'barile';
        fixed.style.width = currentWidth + 'px';
        fixed.style.left = currentX + 'px';
        fixed.style.bottom = (level * height) + 'px';
        gameStage.appendChild(fixed);
        stack.push(fixed);

        // 3. Prepara prossimo livello
        level++;
        mover.style.width = currentWidth + 'px';
        mover.style.bottom = (level * height) + 'px';
        currentX = 0; // Riparte da sinistra

        // 4. FIX SCROLL: Scrolla giù se la torre è alta
        if ((level * height) > 200) {
            gameStage.scrollTo({
                top: gameStage.scrollHeight,
                behavior: 'smooth'
            });
        }
    };
}

/* --- 4. SIMON --- */
// (Codice Simon precedente era ok, lo reinserisco per sicurezza)
let simonSeq = []; let simonStep = 0; let canClick = false;
function initSimon() {
    simonSeq = []; simonStep = 0; canClick = false;
    gameStage.innerHTML = `<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; height:100%; padding:20px; box-sizing:border-box;">
        <div class="simon-btn" style="background:red; opacity:0.4; border:2px solid black;" onclick="handleSimon(0)"></div>
        <div class="simon-btn" style="background:blue; opacity:0.4; border:2px solid black;" onclick="handleSimon(1)"></div>
        <div class="simon-btn" style="background:lime; opacity:0.4; border:2px solid black;" onclick="handleSimon(2)"></div>
        <div class="simon-btn" style="background:yellow; opacity:0.4; border:2px solid black;" onclick="handleSimon(3)"></div>
    </div><h2 id="simon-msg" style="position:absolute; top:40%; width:100%; text-align:center; text-shadow:2px 2px #000; pointer-events:none;"></h2>`;
    setTimeout(playRound, 1000);
}
function playRound() {
    if(!gameActive) return;
    simonStep = 0; canClick = false;
    document.getElementById('simon-msg').innerText = "Memorizza!";
    simonSeq.push(Math.floor(Math.random() * 4));
    let i = 0;
    let int = setInterval(() => {
        if(i>=simonSeq.length) { clearInterval(int); canClick=true; document.getElementById('simon-msg').innerText="Tocca a te!"; return;}
        flashBtn(simonSeq[i]); i++;
    }, 800);
    gameIntervals.push(int);
}
function flashBtn(idx) {
    let btns = gameStage.querySelectorAll('.simon-btn');
    btns[idx].style.opacity = '1';
    btns[idx].style.boxShadow = '0 0 20px white';
    setTimeout(() => { btns[idx].style.opacity = '0.4'; btns[idx].style.boxShadow = 'none';}, 400);
}
window.handleSimon = function(idx) {
    if(!canClick || !gameActive) return;
    flashBtn(idx);
    if(idx !== simonSeq[simonStep]) { lives=0; updateHUD(); gameOver(); return; }
    simonStep++;
    if(simonStep >= simonSeq.length) { score+=simonSeq.length*10; updateHUD(); canClick=false; setTimeout(playRound, 1000); }
}

/* --- 5. COSCIOTTO (FIXED) --- */
function initCosciotto() {
    gameStage.innerHTML = `<div id="basket"></div>`;
    const basket = document.getElementById('basket');
    
    // Funzione movimento unificata
    function moveBasket(clientX) {
        if(!gameActive) return;
        let rect = gameStage.getBoundingClientRect();
        let x = clientX - rect.left - 40; // 40 è metà larghezza cestino
        // Limiti
        if(x < 0) x = 0;
        if(x > rect.width - 80) x = rect.width - 80;
        basket.style.left = x + 'px';
    }

    gameStage.onmousemove = (e) => moveBasket(e.clientX);
    gameStage.ontouchmove = (e) => { e.preventDefault(); moveBasket(e.touches[0].clientX); };

    let spawnInt = setInterval(() => {
        let item = document.createElement('div');
        item.className = 'falling-item';
        let isBomb = Math.random() > 0.8;
        item.innerText = isBomb ? '💣' : '🍗';
        item.style.left = Math.random() * (gameStage.offsetWidth - 40) + 'px';
        item.style.top = '0px';
        gameStage.appendChild(item);
        
        let fall = setInterval(() => {
            if(!gameActive) { clearInterval(fall); return; }
            let top = parseFloat(item.style.top);
            let stageH = gameStage.offsetHeight;

            // Collisione
            if(top > stageH - 70 && top < stageH - 10) {
                let iRect = item.getBoundingClientRect();
                let bRect = basket.getBoundingClientRect();
                // Controllo sovrapposizione orizzontale
                if(iRect.right > bRect.left + 10 && iRect.left < bRect.right - 10) {
                    if(isBomb) { lives--; flash("red"); }
                    else { score += 10; }
                    updateHUD(); item.remove(); clearInterval(fall);
                    if(lives<=0) gameOver();
                    return;
                }
            }
            
            if(top > stageH) {
                if(!isBomb) { lives--; updateHUD(); } // Cibo perso
                item.remove(); clearInterval(fall);
                if(lives<=0) gameOver();
            } else {
                item.style.top = (top + 4 + (score*0.01)) + 'px';
            }
        }, 20);
        gameIntervals.push(fall);
    }, 1000);
    gameIntervals.push(spawnInt);
}

/* --- SALVATAGGIO --- */
function submitScore() {
    const name = document.getElementById('player-name').value;
    if(!name) return alert("Inserisci nome!");
    const btn = document.getElementById('btn-submit');
    btn.innerText = "Incisione..."; btn.disabled = true;

    fetch(SCRIPT_URL + `?action=save&name=${encodeURIComponent(name)}&score=${score}&game=${currentGame}`, {method: 'POST'})
    .then(() => { alert("Salvato!"); resetGameUI(); btn.innerText = "INCIDI"; btn.disabled = false; })
    .catch(() => { alert("Errore Taverna!"); btn.disabled = false; });
}

function loadLeaderboard(g) {
    leaderboardList.innerHTML = "<li>Caricamento...</li>";
    fetch(SCRIPT_URL + `?game=${g}`).then(r=>r.json()).then(d => {
        leaderboardList.innerHTML = "";
        d.forEach((r,i) => leaderboardList.innerHTML += `<li><span>#${i+1} ${r.name}</span><span>${r.score}</span></li>`);
    });
}
