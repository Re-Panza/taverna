// --- CONFIGURAZIONE ---
// INSERISCI QUI IL TUO LINK GOOGLE APPS SCRIPT
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

// --- REGOLE ---
const RULES = {
    'cosciotto': "Trascina il cestino 🧺 col dito.<br>Prendi il cibo, evita le bombe 💣!",
    'ratti': "Tocca i topi 🐭 appena escono.<br>Sii veloce!",
    'freccette': "Il bersaglio oscilla.<br>Tira quando il centro è allineato col puntino verde.",
    'barili': "Impila i barili.<br>Tocca per fermare il blocco al momento giusto.",
    'simon': "Memorizza la sequenza di luci e ripetila."
};

// --- GESTIONE INTERFACCIA ---
function openGame(gameName) {
    currentGame = gameName;
    score = 0; lives = 3;
    
    // Apri modale e resetta
    modal.style.display = 'flex';
    gameStage.innerHTML = '';
    saveForm.classList.add('hidden');
    instructionsPanel.classList.remove('hidden');
    instructionsText.innerHTML = RULES[gameName] || "Gioca e divertiti!";
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
    gameStage.onclick = null;
    gameStage.onmousemove = null;
    gameStage.ontouchmove = null;
    gameStage.onpointerdown = null;
}

function updateHUD() {
    scoreDisplay.innerText = score;
    livesDisplay.innerText = "❤️".repeat(Math.max(0, lives));
}

function gameOver() {
    if (!gameActive) return;
    gameActive = false;
    stopAllGames();
    if(navigator.vibrate) navigator.vibrate(200);
    saveForm.classList.remove('hidden');
    document.getElementById('final-score-display').innerText = score;
}

function resetGame() {
    stopAllGames();
    openGame(currentGame);
}

function flashStage(color) {
    gameStage.style.borderColor = color;
    setTimeout(() => gameStage.style.borderColor = "#444", 200);
}


// --- GIOCHI ---

// 1. COSCIOTTO
function initCosciotto() {
    gameStage.innerHTML = `<div id="basket">🧺</div>`;
    const basket = document.getElementById('basket');
    
    function move(xInput) {
        if (!gameActive) return;
        const rect = gameStage.getBoundingClientRect();
        let x = xInput - rect.left - 40;
        if (x < 0) x = 0; if (x > rect.width - 80) x = rect.width - 80;
        basket.style.left = x + 'px';
    }
    
    gameStage.ontouchmove = (e) => { e.preventDefault(); move(e.touches[0].clientX); };
    gameStage.onmousemove = (e) => move(e.clientX);

    let spawner = setInterval(() => {
        const item = document.createElement('div');
        item.className = 'falling-item';
        const isBomb = Math.random() > 0.8;
        item.innerText = isBomb ? '💣' : '🍗';
        item.style.left = Math.random() * (gameStage.offsetWidth - 50) + 'px';
        item.style.top = '-50px';
        gameStage.appendChild(item);
        
        let speed = 4 + (score * 0.05);
        let fall = setInterval(() => {
            if (!gameActive) { clearInterval(fall); item.remove(); return; }
            let top = parseFloat(item.style.top);
            
            // Collisione
            if (top > gameStage.offsetHeight - 90 && top < gameStage.offsetHeight - 10) {
                const iR = item.getBoundingClientRect();
                const bR = basket.getBoundingClientRect();
                if (iR.right > bR.left+10 && iR.left < bR.right-10) {
                    if (isBomb) { lives--; flashStage('red'); } else { score += 10; }
                    updateHUD(); item.remove(); clearInterval(fall);
                    if (lives <= 0) gameOver(); return;
                }
            }
            if (top > gameStage.offsetHeight) {
                if (!isBomb) { lives--; updateHUD(); }
                item.remove(); clearInterval(fall);
                if (lives <= 0) gameOver();
            } else {
                item.style.top = (top + speed) + 'px';
            }
        }, 20);
        gameIntervals.push(fall);
    }, 1000);
    gameIntervals.push(spawner);
}

// 2. RATTI
function initRatti() {
    let html = '<div class="grid-ratti">';
    for(let i=0; i<9; i++) html += `<div class="hole"><div class="mole" onpointerdown="whack(this)">🐭</div></div>`;
    html += '</div>';
    gameStage.innerHTML = html;
    
    function peep() {
        if (!gameActive) return;
        const moles = document.querySelectorAll('.mole');
        const mole = moles[Math.floor(Math.random() * moles.length)];
        if (mole.classList.contains('up')) { setTimeout(peep, 100); return; }
        
        mole.innerText = "🐭"; mole.classList.add('up');
        let time = Math.max(500, 1200 - (score * 10));
        setTimeout(() => {
            mole.classList.remove('up');
            if (gameActive) setTimeout(peep, Math.random()*500 + 300);
        }, time);
    }
    setTimeout(peep, 500);
}
window.whack = function(mole) {
    if (!mole.classList.contains('up') || !gameActive) return;
    score += 10; updateHUD();
    mole.innerText = "💥";
    setTimeout(() => mole.classList.remove('up'), 200);
};

// 3. FRECCETTE
function initFreccette() {
    gameStage.innerHTML = `<div class="center-mark"></div><div id="dart-target"></div><button onpointerdown="throwDart()" class="btn-action" style="position:absolute; bottom:20px; left:50%; transform:translateX(-50%); width:100px; z-index:200;">TIRA!</button>`;
    const target = document.getElementById('dart-target');
    let angle = 0;
    let loop = setInterval(() => {
        angle += 0.04 + (score * 0.0001);
        let r = 100;
        let x = Math.sin(angle) * r;
        let y = Math.cos(angle * 1.3) * r;
        target.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        target.dataset.x = x; target.dataset.y = y;
    }, 20);
    gameIntervals.push(loop);
}
window.throwDart = function() {
    if (!gameActive) return;
    const t = document.getElementById('dart-target');
    const d = Math.sqrt(Math.pow(parseFloat(t.dataset.x||0),2) + Math.pow(parseFloat(t.dataset.y||0),2));
    if (d < 15) { score+=50; flashStage('green'); }
    else if (d < 40) { score+=20; flashStage('yellow'); }
    else if (d < 70) { score+=5; flashStage('orange'); }
    else { lives--; flashStage('red'); if(lives<=0) gameOver(); }
    updateHUD();
};

// 4. BARILI
function initBarili() {
    gameStage.innerHTML = `<div id="tower-world"><div id="moving-block"></div></div>`;
    const world = document.getElementById('tower-world');
    const mover = document.getElementById('moving-block');
    let level=0, w=200, pos=0, dir=1, speed=3, h=30;
    
    mover.style.width=w+'px'; mover.style.bottom='0px';
    
    let loop = setInterval(() => {
        pos += speed * dir;
        if (pos > gameStage.offsetWidth - w || pos < 0) dir *= -1;
        mover.style.left = pos + 'px';
    }, 16);
    gameIntervals.push(loop);
    
    gameStage.onpointerdown = function(e) {
        if(e.target.tagName === 'BUTTON') return;
        if(!gameActive) return;
        
        let prevLeft = (gameStage.offsetWidth - 200)/2;
        let prevWidth = 200;
        if (level > 0) {
            const pb = document.getElementById(`barile-${level-1}`);
            prevLeft = parseFloat(pb.style.left);
            prevWidth = parseFloat(pb.style.width);
        }
        
        let overlap = w;
        let newLeft = pos;
        
        if (level > 0) {
            const oL = Math.max(pos, prevLeft);
            const oR = Math.min(pos+w, prevLeft+prevWidth);
            overlap = oR - oL;
            newLeft = oL;
        }
        
        if (overlap <= 0) { lives=0; gameOver(); return; }
        
        const b = document.createElement('div');
        b.className='barile'; b.id=`barile-${level}`;
        b.style.width=overlap+'px'; b.style.left=newLeft+'px';
        b.style.bottom=(level*h)+'px';
        world.appendChild(b);
        
        score+=10; level++; w=overlap; speed+=0.5;
        mover.style.width=w+'px'; mover.style.bottom=(level*h)+'px'; pos=0;
        
        if (level*h > gameStage.offsetHeight/2) {
            world.style.transform = `translateY(${ (level*h) - (gameStage.offsetHeight/2) }px)`;
        }
    };
}

// 5. SIMON
let sSeq=[], sStep=0, sClick=false;
function initSimon() {
    gameStage.innerHTML = `<div class="simon-grid">
        <div class="simon-btn" style="background:red" onpointerdown="clkS(0)"></div>
        <div class="simon-btn" style="background:blue" onpointerdown="clkS(1)"></div>
        <div class="simon-btn" style="background:lime" onpointerdown="clkS(2)"></div>
        <div class="simon-btn" style="background:yellow" onpointerdown="clkS(3)"></div>
    </div><div id="simon-msg" style="position:absolute; top:50%; width:100%; text-align:center; color:#fff; font-size:20px;"></div>`;
    sSeq=[]; setTimeout(playS, 1000);
}
function playS() {
    if (!gameActive) return;
    sStep=0; sClick=false;
    document.getElementById('simon-msg').innerText = "Memorizza!";
    sSeq.push(Math.floor(Math.random()*4));
    let i=0;
    let int = setInterval(()=>{
        if(i>=sSeq.length) { clearInterval(int); document.getElementById('simon-msg').innerText="Tocca!"; sClick=true; return;}
        flashS(sSeq[i]); i++;
    }, 800);
    gameIntervals.push(int);
}
function flashS(idx) {
    const b=document.querySelectorAll('.simon-btn');
    b[idx].classList.add('active-light');
    setTimeout(()=>b[idx].classList.remove('active-light'), 300);
}
window.clkS = function(idx) {
    if(!sClick || !gameActive) return;
    flashS(idx);
    if(idx!==sSeq[sStep]) { lives=0; gameOver(); return; }
    sStep++;
    if(sStep>=sSeq.length) { score+=sSeq.length*10; updateHUD(); sClick=false; setTimeout(playS, 1000); }
};


// --- SALVATAGGIO ---
function submitScore() {
    const name = document.getElementById('player-name').value;
    if(!name) return alert("Inserisci nome");
    const btn = document.getElementById('btn-save');
    btn.innerText = "..."; btn.disabled = true;
    
    fetch(`${SCRIPT_URL}?action=save&name=${encodeURIComponent(name)}&score=${score}&game=${currentGame}`, {method:'POST'})
    .then(()=>{ alert("Salvato!"); btn.innerText="SALVA"; btn.disabled=false; resetGame(); })
    .catch(()=>{ alert("Errore"); btn.disabled=false; });
}

function loadLeaderboard(g) {
    leaderboardList.innerHTML = "<li>...</li>";
    fetch(`${SCRIPT_URL}?game=${g}`).then(r=>r.json()).then(d=>{
        leaderboardList.innerHTML="";
        if(!d.length) leaderboardList.innerHTML="<li>Nessun record</li>";
        d.forEach((r,i)=> leaderboardList.innerHTML += `<li><span>#${i+1} ${r.name}</span><span>${r.score}</span></li>`);
    }).catch(()=>leaderboardList.innerHTML="<li>Errore</li>");
}
