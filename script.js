// --- CONFIGURAZIONE ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzRM7kZEFD0QHHayNcMrtWq1W2yzAAvIS2fMK9ccrysEe45Tb498_6KhLz5NzaGcRL8JQ/exec";

// --- VARIABILI GLOBALI ---
let currentGame = null;
let score = 0;
let lives = 3;
let timeLeft = 60;
let gameActive = false;
let gameIntervals = [];

// --- AVVIO ---
window.onload = () => {
    getDeviceUID(); 
    loadChat();     
};

setInterval(loadChat, 4000); 

// --- SISTEMA ID & CHAT ---
function getDeviceUID() {
    let uid = localStorage.getItem('tavern_uid');
    if (!uid) {
        uid = 'usr_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('tavern_uid', uid);
    }
    const savedName = localStorage.getItem('tavern_name');
    if(savedName) {
        if(document.getElementById('player-name')) document.getElementById('player-name').value = savedName;
        if(document.getElementById('chat-user-name')) document.getElementById('chat-user-name').value = savedName;
    }
    return uid;
}

function sendChat() {
    const name = document.getElementById('chat-user-name').value || "Anonimo";
    const msg = document.getElementById('chat-message').value;
    if(!msg) return;
    
    document.getElementById('chat-message').value = ""; 
    localStorage.setItem('tavern_name', name); 
    
    fetch(`${SCRIPT_URL}?action=chat_send&name=${encodeURIComponent(name)}&msg=${encodeURIComponent(msg)}&uid=${getDeviceUID()}`, {method:'POST'})
    .then(()=> loadChat());
}

function loadChat() {
    const box = document.getElementById('tavern-chat-box');
    if(!box) return; 
    
    fetch(`${SCRIPT_URL}?action=chat_get`)
    .then(r=>r.json())
    .then(data => {
        let html = "";
        if(!data || data.length === 0) { 
            html = "<div style='color:#ccc; padding:10px; font-size:12px;'>Nessun messaggio.</div>"; 
        } else {
            data.forEach(m => {
                let d = new Date(m.time);
                let timeStr = d.getHours().toString().padStart(2,'0') + ":" + d.getMinutes().toString().padStart(2,'0');
                let nameStyle = m.name.toLowerCase().includes("re panza") ? "color:var(--gold); font-weight:bold;" : "color:var(--accent);";
                html += `<div style="margin-bottom:5px; font-size:13px; border-bottom:1px solid rgba(255,255,255,0.05);">
                            <span style="opacity:0.6; font-size:11px;">[${timeStr}]</span> 
                            <span style="${nameStyle}">${m.name}:</span> 
                            <span style="color:#e2e8f0;">${m.msg}</span>
                         </div>`;
            });
        }
        if(box.innerHTML !== html) { 
            box.innerHTML = html; 
            box.scrollTop = box.scrollHeight;
        }
    })
    .catch(() => {});
}

// --- GESTIONE GIOCHI ---
const RULES = {
    'cosciotto': "Trascina il cestino 🧺.<br>Prendi 🍗, evita 💣!",
    'ratti': "Tocca i topi 🐭 (+10pt).<br>EVITA I GATTI 🐱 (-1 vita)!<br>Non colpire a vuoto.",
    'freccette': "Tira quando il centro è allineato.",
    'barili': "Impila i barili con precisione.",
    'simon': "Ripeti la sequenza di luci."
};

function openGame(gameName) {
    currentGame = gameName;
    score = 0; lives = 3; timeLeft = 60;
    
    document.getElementById('gameModal').style.display = 'flex';
    document.getElementById('game-stage').innerHTML = '';
    document.getElementById('save-form').classList.add('hidden');
    document.getElementById('game-instructions').classList.remove('hidden');
    
    document.getElementById('instruction-text').innerHTML = RULES[gameName];
    document.getElementById('modal-title').innerText = gameName.toUpperCase();
    document.getElementById('lb-game-name').innerText = gameName.toUpperCase();
    document.getElementById('end-reason').innerText = "☠️ PARTITA FINITA!";
    
    updateHUD();
    loadLeaderboard(gameName);
}

function startGameLogic() {
    document.getElementById('game-instructions').classList.add('hidden');
    gameActive = true;
    
    // --- CORREZIONE TIMER ---
    // Il timer ora aggiorna l'HUD ogni secondo
    let timerInt = setInterval(() => {
        if(!gameActive) { clearInterval(timerInt); return; }
        
        timeLeft--;
        updateHUD(); // IMPORTANTE: Aggiorna la grafica!
        
        if(timeLeft <= 0) {
            document.getElementById('end-reason').innerText = "⏳ TEMPO SCADUTO!";
            gameOver();
        }
    }, 1000);
    gameIntervals.push(timerInt);

    if (currentGame === 'cosciotto') initCosciotto();
    else if (currentGame === 'ratti') initRatti();
    else if (currentGame === 'freccette') initFreccette();
    else if (currentGame === 'barili') initBarili();
    else if (currentGame === 'simon') initSimon();
}

function stopAllGames() {
    gameActive = false;
    gameIntervals.forEach(clearInterval);
    gameIntervals = [];
}

function closeGame() {
    stopAllGames();
    document.getElementById('gameModal').style.display = 'none';
}

function updateHUD() {
    document.getElementById('global-score').innerText = score;
    document.getElementById('global-lives').innerText = "❤️".repeat(Math.max(0, lives));
    
    const timerEl = document.getElementById('game-timer');
    if(timerEl) {
        timerEl.innerText = timeLeft;
        // Effetto visivo se mancano meno di 10 secondi
        timerEl.style.color = timeLeft <= 10 ? "#ef4444" : "#fbbf24";
    }
}

function gameOver() {
    if (!gameActive) return;
    gameActive = false;
    stopAllGames();
    if(navigator.vibrate) navigator.vibrate([200, 100, 200]);
    document.getElementById('save-form').classList.remove('hidden');
    document.getElementById('final-score-display').innerText = score;
}

function resetGame() {
    stopAllGames();
    document.getElementById('game-stage').innerHTML = '';
    document.getElementById('save-form').classList.add('hidden');
    openGame(currentGame);
}

function flashStage(color) {
    const stage = document.getElementById('game-stage');
    stage.style.boxShadow = `inset 0 0 50px ${color}`;
    setTimeout(() => stage.style.boxShadow = "none", 200);
}

// --- GIOCO RATTI & GATTI (CORRETTO) ---
function initRatti() {
    const stage = document.getElementById('game-stage');
    let html = '<div class="grid-ratti">';
    // Creiamo 9 buchi
    for(let i=0; i<9; i++) {
        html += `<div class="hole" onpointerdown="missRat(event)">
                    <div class="mole" id="mole-${i}" onpointerdown="whack(event, this)"></div>
                 </div>`;
    }
    html += '</div>';
    stage.innerHTML = html;
    
    function peep() {
        if (!gameActive) return;
        
        // Seleziona un buco a caso
        const moles = document.querySelectorAll('.mole');
        const randomIdx = Math.floor(Math.random() * moles.length);
        const mole = moles[randomIdx];
        
        // Se è già su, riprova tra poco
        if (mole.classList.contains('up')) { 
            setTimeout(peep, 100); 
            return; 
        }
        
        // DECISIONE GATTO vs TOPO
        const isCat = Math.random() < 0.3; // 30% probabilità gatto
        
        // Pulizia classi precedenti
        mole.classList.remove('cat', 'rat');
        
        // Assegnazione valori
        if (isCat) {
            mole.innerText = "🐱";
            mole.dataset.type = "cat";
        } else {
            mole.innerText = "🐭";
            mole.dataset.type = "rat";
        }
        
        // Animazione SU
        mole.classList.add('up');
        
        // Tempo di permanenza (più veloce se hai punteggio alto)
        let stayTime = Math.max(400, 1000 - (score * 5));
        
        setTimeout(() => {
            if(!gameActive) return;
            mole.classList.remove('up');
            // Prossima talpa
            setTimeout(peep, Math.random() * 400 + 200);
        }, stayTime);
    }
    
    // Primo avvio
    setTimeout(peep, 500);
}

window.whack = function(e, mole) {
    e.stopPropagation(); // Ferma il click sul buco
    if (!mole.classList.contains('up') || !gameActive) return;
    
    if (mole.dataset.type === "cat") {
        // HAI PRESO UN GATTO!
        lives--;
        flashStage('red');
        mole.innerText = "😾"; // Faccia arrabbiata
        if(navigator.vibrate) navigator.vibrate(200);
    } else {
        // HAI PRESO UN TOPO!
        score += 10;
        mole.innerText = "💥";
        if(navigator.vibrate) navigator.vibrate(50);
    }
    
    updateHUD();
    mole.classList.remove('up');
    
    if (lives <= 0) gameOver();
};

window.missRat = function(e) {
    if (!gameActive) return;
    // Colpito il buco vuoto
    lives--; 
    flashStage('red'); 
    updateHUD();
    if (lives <= 0) gameOver();
}

// --- ALTRI GIOCHI (Standard) ---

function initCosciotto() {
    const stage = document.getElementById('game-stage');
    stage.innerHTML = `<div id="basket">🧺</div>`;
    const basket = document.getElementById('basket');
    function move(xInput) {
        if (!gameActive) return;
        const rect = stage.getBoundingClientRect();
        let x = xInput - rect.left - 40;
        if (x < 0) x = 0; if (x > rect.width - 80) x = rect.width - 80;
        basket.style.left = x + 'px';
    }
    stage.ontouchmove = (e) => { e.preventDefault(); move(e.touches[0].clientX); };
    stage.onmousemove = (e) => move(e.clientX);
    let spawner = setInterval(() => {
        const item = document.createElement('div');
        item.className = 'falling-item';
        const isBomb = Math.random() > 0.8;
        item.innerText = isBomb ? '💣' : '🍗';
        item.style.left = Math.random() * (stage.offsetWidth - 50) + 'px';
        item.style.top = '-50px';
        stage.appendChild(item);
        let speed = 4 + (score * 0.05);
        let fall = setInterval(() => {
            if (!gameActive) { clearInterval(fall); item.remove(); return; }
            let top = parseFloat(item.style.top);
            if (top > stage.offsetHeight - 80) {
                const iR = item.getBoundingClientRect();
                const bR = basket.getBoundingClientRect();
                if (iR.right > bR.left+10 && iR.left < bR.right-10 && top < stage.offsetHeight - 10) {
                    if (isBomb) { lives--; flashStage('red'); } else { score += 10; }
                    updateHUD(); item.remove(); clearInterval(fall);
                    if (lives <= 0) gameOver(); return;
                }
            }
            if (top > stage.offsetHeight) {
                if (!isBomb) { lives--; updateHUD(); }
                item.remove(); clearInterval(fall);
                if (lives <= 0) gameOver();
            } else { item.style.top = (top + speed) + 'px'; }
        }, 20);
        gameIntervals.push(fall);
    }, 800);
    gameIntervals.push(spawner);
}

function initFreccette() {
    const stage = document.getElementById('game-stage');
    stage.innerHTML = `<div class="center-mark"></div><div id="dart-target"></div><button onpointerdown="throwDart()" class="btn-action" style="position:absolute; bottom:20px; left:50%; transform:translateX(-50%); width:120px; z-index:200;">TIRA!</button>`;
    const target = document.getElementById('dart-target');
    let angle = 0;
    let loop = setInterval(() => {
        angle += 0.05 + (score * 0.0002);
        let r = 100;
        let x = Math.sin(angle) * r;
        let y = Math.cos(angle * 1.5) * r;
        target.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        target.dataset.x = x; target.dataset.y = y;
    }, 20);
    gameIntervals.push(loop);
}

window.throwDart = function() {
    if (!gameActive) return;
    const t = document.getElementById('dart-target');
    const d = Math.sqrt(Math.pow(parseFloat(t.dataset.x||0),2) + Math.pow(parseFloat(t.dataset.y||0),2));
    if (d < 15) { score+=50; flashStage('#34d399'); }
    else if (d < 40) { score+=20; flashStage('#fbbf24'); }
    else if (d < 70) { score+=5; flashStage('#60a5fa'); }
    else { lives--; flashStage('red'); }
    updateHUD(); if(lives<=0) gameOver();
};

function initBarili() {
    const stage = document.getElementById('game-stage');
    stage.innerHTML = `<div id="tower-world"><div id="moving-block"></div></div>`;
    const world = document.getElementById('tower-world');
    const mover = document.getElementById('moving-block');
    let level=0, w=150, pos=0, dir=1, speed=3, h=25;
    let stageW = stage.offsetWidth; 
    mover.style.width=w+'px'; mover.style.bottom='0px';
    let loop = setInterval(() => {
        pos += speed * dir;
        if (pos > stageW - w || pos < 0) dir *= -1;
        mover.style.left = pos + 'px';
    }, 16);
    gameIntervals.push(loop);
    stage.onpointerdown = function(e) {
        if(e.target.tagName === 'BUTTON') return;
        if(!gameActive) return;
        let prevLeft = (stageW - 150)/2;
        let prevWidth = 150;
        if (level > 0) {
            const pb = document.getElementById(`barile-${level-1}`);
            if(pb) { prevLeft = parseFloat(pb.style.left); prevWidth = parseFloat(pb.style.width); }
        }
        let overlap = w, newLeft = pos;
        if (level > 0) {
            const oL = Math.max(pos, prevLeft);
            const oR = Math.min(pos+w, prevLeft+prevWidth);
            overlap = oR - oL; newLeft = oL;
        }
        if (overlap <= 0) { lives=0; gameOver(); return; }
        const b = document.createElement('div');
        b.className='barile'; b.id=`barile-${level}`;
        b.style.width=overlap+'px'; b.style.left=newLeft+'px';
        b.style.bottom=(level*h)+'px';
        world.appendChild(b);
        score+=10; level++; w=overlap; speed+=0.2;
        mover.style.width=w+'px'; mover.style.bottom=(level*h)+'px'; 
        if (level*h > stage.offsetHeight/2) world.style.transform = `translateY(${ (level*h) - (stage.offsetHeight/2) }px)`;
    };
}

function initSimon() {
    const stage = document.getElementById('game-stage');
    stage.innerHTML = `<div class="simon-grid">
        <div class="simon-btn" style="background:#ef4444" onpointerdown="clkS(0)"></div>
        <div class="simon-btn" style="background:#3b82f6" onpointerdown="clkS(1)"></div>
        <div class="simon-btn" style="background:#34d399" onpointerdown="clkS(2)"></div>
        <div class="simon-btn" style="background:#fbbf24" onpointerdown="clkS(3)"></div>
    </div><div id="simon-msg" style="position:absolute; top:50%; width:100%; text-align:center; color:#fff; font-size:24px; font-weight:bold; pointer-events:none; text-shadow:0 0 10px #000;"></div>`;
    sSeq=[]; setTimeout(playS, 1000);
}

let sSeq=[], sStep=0, sClick=false;
function playS() {
    if (!gameActive) return;
    sStep=0; sClick=false;
    document.getElementById('simon-msg').innerText = "Memorizza!";
    sSeq.push(Math.floor(Math.random()*4));
    let i=0;
    let int = setInterval(()=>{
        if(i>=sSeq.length) { clearInterval(int); document.getElementById('simon-msg').innerText="Tocca!"; sClick=true; return;}
        flashS(sSeq[i]); i++;
    }, 600);
    gameIntervals.push(int);
}

function flashS(idx) {
    const b=document.querySelectorAll('.simon-btn');
    if(!b[idx]) return;
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
    const uid = getDeviceUID();
    const btn = document.getElementById('btn-save');
    btn.innerText = "Salvataggio..."; btn.disabled = true;
    fetch(`${SCRIPT_URL}?action=save&name=${encodeURIComponent(name)}&score=${score}&game=${currentGame}&uid=${uid}`, {method:'POST'})
    .then(()=>{ 
        alert("Record salvato!"); 
        btn.innerText="INCIDI RECORD"; btn.disabled=false; 
        document.getElementById('save-form').classList.add('hidden'); 
        loadLeaderboard(currentGame); 
        document.getElementById('game-instructions').classList.remove('hidden'); 
    })
    .catch(()=>{ alert("Errore connessione"); btn.disabled=false; });
}

function loadLeaderboard(g) {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = "<li>Caricamento...</li>";
    fetch(`${SCRIPT_URL}?game=${g}`).then(r=>r.json()).then(d=>{
        list.innerHTML="";
        if(!d.length) list.innerHTML="<li>Nessun record! Sii il primo!</li>";
        d.forEach((r,i)=> list.innerHTML += `<li>#${i+1} ${r.name} - ${r.score}</li>`);
    }).catch(()=>list.innerHTML="<li>Errore caricamento</li>");
}
