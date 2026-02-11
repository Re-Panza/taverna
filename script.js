// --- CONFIGURAZIONE ---
// INCOLLA QUI IL TUO URL DI GOOGLE SCRIPT:
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby5lE4L1IZ13C7LaucAwB19dG_7erjtTUrOcCPmltTBcbXANAA8ewakSGwITGS4FOtV-w/exec";

// --- VARIABILI GLOBALI ---
let currentGame = null;
let score = 0;
let lives = 3;
let gameActive = false;
let gameIntervals = [];

// --- ELEMENTI DOM ---
const modal = document.getElementById('gameModal');
const gameStage = document.getElementById('game-stage');
const scoreDisplay = document.getElementById('global-score');
const livesDisplay = document.getElementById('global-lives');
const saveForm = document.getElementById('save-form');
const instructionsPanel = document.getElementById('game-instructions');
const instructionsText = document.getElementById('instruction-text');
const leaderboardList = document.getElementById('leaderboard-list');

// --- ISTRUZIONI GIOCHI ---
const RULES = {
    'cosciotto': "Trascina il cestino 🧺 col dito.<br>Prendi cibo 🍗 ed evita le bombe 💣.<br>Se il cibo cade, perdi una vita.",
    'ratti': "Tocca i topi 🐭 appena escono.<br>Sii veloce! Più punti fai, più schizzano via.",
    'freccette': "Il bersaglio oscilla.<br>Tocca 'TIRA' quando il centro rosso passa sotto il puntino verde.",
    'barili': "Impila i barili.<br>Tocca per fermare il blocco.<br>Se non sei preciso, il pezzo si taglia!",
    'simon': "Memorizza la sequenza di luci.<br>Ripetila toccando i colori.<br>Ogni turno si aggiunge un passo."
};

// --- GESTIONE HUB ---

function openGame(gameName) {
    currentGame = gameName;
    score = 0; lives = 3;
    
    // Reset UI
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
    gameIntervals.forEach(clearInterval);
    gameIntervals = [];
    // Pulisci eventi
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
    if(navigator.vibrate) navigator.vibrate([100, 50, 100]); // Vibrazione sconfitta
    saveForm.classList.remove('hidden');
    document.getElementById('final-score-display').innerText = score;
}

function resetGame() {
    stopAllGames();
    openGame(currentGame);
}

// --- UTILITY FLASH SCHERMO ---
function flashStage(color) {
    gameStage.style.borderColor = color;
    setTimeout(() => gameStage.style.borderColor = "#5d4037", 200);
}


// ==========================================
//              LOGICA DEI 5 GIOCHI
// ==========================================

// 1. GIOCO COSCIOTTO (Touch & Drag)
function initCosciotto() {
    gameStage.innerHTML = `<div id="basket">🧺</div>`;
    const basket = document.getElementById('basket');
    
    function moveBasket(clientX) {
        if (!gameActive) return;
        const rect = gameStage.getBoundingClientRect();
        let x = clientX - rect.left - 40; // Centra l'emoji (larga 80px)
        if (x < 0) x = 0;
        if (x > rect.width - 80) x = rect.width - 80;
        basket.style.left = x + 'px';
    }
    
    // Usa 'touchmove' con preventDefault per evitare scroll pagina
    gameStage.ontouchmove = (e) => { e.preventDefault(); moveBasket(e.touches[0].clientX); };
    gameStage.onmousemove = (e) => moveBasket(e.clientX);

    let spawner = setInterval(() => {
        const item = document.createElement('div');
        item.classList.add('falling-item');
        const isBomb = Math.random() > 0.8;
        item.innerText = isBomb ? '💣' : (Math.random()>0.5 ? '🍗' : '🍺');
        item.style.left = Math.random() * (gameStage.offsetWidth - 50) + 'px';
        item.style.top = '-50px';
        gameStage.appendChild(item);
        
        let speed = 4 + (score * 0.05);
        
        let fallLoop = setInterval(() => {
            if (!gameActive) { clearInterval(fallLoop); item.remove(); return; }
            let top = parseFloat(item.style.top);
            
            // Collisione
            if (top > gameStage.offsetHeight - 90 && top < gameStage.offsetHeight - 10) {
                const iRect = item.getBoundingClientRect();
                const bRect = basket.getBoundingClientRect();
                
                if (iRect.right > bRect.left + 15 && iRect.left < bRect.right - 15) {
                    if (isBomb) { lives--; flashStage('red'); }
                    else { score += 10; }
                    updateHUD(); item.remove(); clearInterval(fallLoop);
                    if (lives <= 0) gameOver();
                    return;
                }
            }
            // Caduto a terra
            if (top > gameStage.offsetHeight) {
                if (!isBomb) { lives--; updateHUD(); }
                item.remove(); clearInterval(fallLoop);
                if (lives <= 0) gameOver();
            } else {
                item.style.top = (top + speed) + 'px';
            }
        }, 20);
        gameIntervals.push(fallLoop);
    }, 1000);
    gameIntervals.push(spawner);
}

// 2. GIOCO RATTI (Pointer Down Instantaneo)
function initRatti() {
    let html = '<div class="grid-ratti">';
    // Usa onpointerdown per risposta immediata su mobile
    for(let i=0; i<9; i++) html += `<div class="hole"><div class="mole" onpointerdown="whack(this)">🐭</div></div>`;
    html += '</div>';
    gameStage.innerHTML = html;
    
    function peep() {
        if (!gameActive) return;
        const moles = document.querySelectorAll('.mole');
        const mole = moles[Math.floor(Math.random() * moles.length)];
        
        if (mole.classList.contains('up')) { setTimeout(peep, 100); return; }
        
        mole.innerText = "🐭";
        mole.classList.add('up');
        
        let time = Math.max(500, 1200 - (score * 10));
        setTimeout(() => {
            mole.classList.remove('up');
            if (gameActive) setTimeout(peep, Math.random() * 500 + 300);
        }, time);
    }
    setTimeout(peep, 500);
}

window.whack = function(mole) {
    if (!mole.classList.contains('up') || !gameActive) return;
    if(navigator.vibrate) navigator.vibrate(50);
    score += 10; updateHUD();
    mole.innerText = "💥";
    setTimeout(() => mole.classList.remove('up'), 200);
};

// 3. GIOCO FRECCETTE (Matematica)
function initFreccette() {
    gameStage.innerHTML = `
        <div class="center-mark"></div>
        <div id="dart-target"></div>
        <button onpointerdown="throwDart()" class="btn-play" style="position:absolute; bottom:20px; left:50%; transform:translateX(-50%); z-index:200; pointer-events:auto; width:100px;">TIRA!</button>
    `;
    const target = document.getElementById('dart-target');
    let angle = 0;
    
    let loop = setInterval(() => {
        let speed = 0.04 + (score * 0.0001);
        angle += speed;
        let radius = 100;
        let x = Math.sin(angle) * radius;
        let y = Math.cos(angle * 1.3) * radius;
        target.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        target.dataset.x = x; target.dataset.y = y;
    }, 20);
    gameIntervals.push(loop);
}

window.throwDart = function() {
    if (!gameActive) return;
    const t = document.getElementById('dart-target');
    const x = parseFloat(t.dataset.x||0);
    const y = parseFloat(t.dataset.y||0);
    const dist = Math.sqrt(x*x + y*y);
    
    if (dist < 15) { score+=50; flashStage('lime'); }
    else if (dist < 40) { score+=20; flashStage('yellow'); }
    else if (dist < 70) { score+=5; flashStage('orange'); }
    else { lives--; flashStage('red'); if(lives<=0) gameOver(); }
    updateHUD();
};

// 4. GIOCO BARILI (Logica Overlap)
function initBarili() {
    gameStage.innerHTML = `<div id="moving-block"></div>`;
    let level=0, width=200, pos=0, dir=1, speed=3;
    const height=30;
    const mover = document.getElementById('moving-block');
    mover.style.width = width+'px'; mover.style.bottom='0px';
    
    let loop = setInterval(() => {
        const max = gameStage.offsetWidth - width;
        pos += speed * dir;
        if (pos > max || pos < 0) dir *= -1;
        mover.style.left = pos + 'px';
    }, 16);
    gameIntervals.push(loop);
    
    gameStage.onpointerdown = function(e) {
        // Ignora click se viene dal bottone di Game Over
        if(e.target.tagName === 'BUTTON') return;
        if (!gameActive) return;
        
        const prevBlock = document.getElementById(`barile-${level-1}`);
        let prevLeft = (gameStage.offsetWidth - 200)/2;
        let prevWidth = 200;
        
        if (level > 0 && prevBlock) {
            prevLeft = parseFloat(prevBlock.style.left);
            prevWidth = parseFloat(prevBlock.style.width);
        }
        
        let overlap = width; // Default primo livello
        let newLeft = pos;
        
        if (level > 0) {
            const l1 = pos, r1 = pos + width;
            const l2 = prevLeft, r2 = prevLeft + prevWidth;
            const overlapLeft = Math.max(l1, l2);
            const overlapRight = Math.min(r1, r2);
            overlap = overlapRight - overlapLeft;
            newLeft = overlapLeft;
        }
        
        if (overlap <= 0) { lives=0; gameOver(); return; }
        
        // Piazza blocco
        const fixed = document.createElement('div');
        fixed.className = 'barile'; fixed.id = `barile-${level}`;
        fixed.style.width = overlap + 'px'; fixed.style.left = newLeft + 'px';
        fixed.style.bottom = (level*height) + 'px';
        gameStage.appendChild(fixed);
        
        score+=10; level++; width=overlap; speed+=0.5;
        mover.style.width = width+'px'; mover.style.bottom = (level*height)+'px';
        pos=0;
        
        if (level*height > 200) gameStage.scrollTo({top:gameStage.scrollHeight, behavior:'smooth'});
    };
}

// 5. GIOCO SIMON
let simonSeq = [], simonStep = 0, canClick = false;
function initSimon() {
    gameStage.innerHTML = `
        <div class="simon-grid">
            <div class="simon-btn" style="background:#e74c3c" onpointerdown="clkSimon(0)"></div>
            <div class="simon-btn" style="background:#3498db" onpointerdown="clkSimon(1)"></div>
            <div class="simon-btn" style="background:#2ecc71" onpointerdown="clkSimon(2)"></div>
            <div class="simon-btn" style="background:#f1c40f" onpointerdown="clkSimon(3)"></div>
        </div>
        <div id="simon-msg" style="position:absolute; top:50%; width:100%; text-align:center; font-size:2em; font-weight:bold; pointer-events:none; text-shadow:2px 2px #000;"></div>
    `;
    simonSeq = []; setTimeout(playRound, 1000);
}
function playRound() {
    if (!gameActive) return;
    simonStep=0; canClick=false;
    document.getElementById('simon-msg').innerText = "Memorizza!";
    simonSeq.push(Math.floor(Math.random()*4));
    let i=0;
    let int = setInterval(() => {
        if(i>=simonSeq.length) { clearInterval(int); document.getElementById('simon-msg').innerText="Tocca!"; canClick=true; return; }
        flashBtn(simonSeq[i]); i++;
    }, 800);
    gameIntervals.push(int);
}
function flashBtn(idx) {
    const btns = document.querySelectorAll('.simon-btn');
    btns[idx].classList.add('active-light');
    setTimeout(() => btns[idx].classList.remove('active-light'), 300);
}
window.clkSimon = function(idx) {
    if (!canClick || !gameActive) return;
    flashBtn(idx);
    if(idx !== simonSeq[simonStep]) { lives=0; gameOver(); return; }
    simonStep++;
    if(simonStep>=simonSeq.length) { score+=simonSeq.length*10; updateHUD(); canClick=false; document.getElementById('simon-msg').innerText="Bravo!"; setTimeout(playRound, 1000); }
};

// --- DB INTERFACE ---
function submitScore() {
    const name = document.getElementById('player-name').value;
    if (!name) return alert("Inserisci nome!");
    const btn = document.getElementById('btn-save');
    btn.innerText = "Salvataggio..."; btn.disabled = true;
    
    fetch(`${SCRIPT_URL}?action=save&name=${encodeURIComponent(name)}&score=${score}&game=${currentGame}`, {method:'POST'})
    .then(() => { alert("Salvato!"); btn.innerText="SALVA"; btn.disabled=false; resetGame(); })
    .catch(() => { alert("Errore connessione"); btn.disabled=false; });
}

function loadLeaderboard(game) {
    leaderboardList.innerHTML = "<li>Caricamento...</li>";
    fetch(`${SCRIPT_URL}?game=${game}`).then(r=>r.json()).then(d => {
        leaderboardList.innerHTML = "";
        if(d.length===0) leaderboardList.innerHTML="<li>Nessun record!</li>";
        d.forEach((r,i) => leaderboardList.innerHTML += `<li><span>#${i+1} ${r.name}</span><span>${r.score}</span></li>`);
    }).catch(()=>leaderboardList.innerHTML="<li>Errore classifica</li>");
}
