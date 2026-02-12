// --- CONFIGURAZIONE ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzRM7kZEFD0QHHayNcMrtWq1W2yzAAvIS2fMK9ccrysEe45Tb498_6KhLz5NzaGcRL8JQ/exec";

// --- VARIABILI GLOBALI ---
let currentGame = null;
let score = 0;
let lives = 3;
let gameActive = false;
let gameIntervals = [];

// --- AVVIO IMMEDIATO ---
window.onload = () => {
    getDeviceUID(); 
    loadChat();     
};

setInterval(loadChat, 2000); 

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
            html = "<div style='color:#777; padding:5px; text-align:center;'>La locanda è silenziosa...</div>"; 
        } else {
            data.forEach(m => {
                let d = new Date(m.time);
                let timeStr = d.getHours().toString().padStart(2,'0') + ":" + d.getMinutes().toString().padStart(2,'0');
                let nameStyle = m.name.toLowerCase().includes("re panza") ? "color:var(--gold); font-weight:bold;" : "color:var(--accent);";

                // La bandierina è qui, con la classe .btn-report aggiornata nel CSS
                html += `<div class="chat-msg">
                            <div class="chat-content-wrapper">
                                <span class="chat-time">[${timeStr}]</span> 
                                <span class="chat-name" style="${nameStyle}">${m.name}:</span> 
                                <span class="chat-text">${m.msg}</span>
                            </div>
                            <button class="btn-report" onclick="reportMsg('${m.time}')" title="Segnala al Re">🚩</button>
                         </div>`;
            });
        }
        
        if(box.dataset.lastContent !== html) { 
            box.innerHTML = html; 
            box.dataset.lastContent = html;
            box.scrollTop = box.scrollHeight;
        }
    })
    .catch(e => console.log("Errore chat"));
}

window.reportMsg = function(timeId) {
    if(!confirm("Vuoi segnalare questo messaggio ai moderatori?")) return;
    fetch(`${SCRIPT_URL}?action=chat_report&time=${encodeURIComponent(timeId)}`)
    .then(r => r.json())
    .then(d => {
        alert("Segnalazione inviata! Le guardie stanno controllando.");
    });
};

// --- GESTIONE GIOCHI ---
const RULES = {
    'cosciotto': "Trascina il cestino 🧺 col dito.<br>Prendi cibo 🍗, evita le bombe 💣!",
    'ratti': "Tocca i topi 🐭 appena escono.<br>⚠️ Se tocchi il buco vuoto perdi una vita!",
    'freccette': "Tira quando il centro rosso è allineato col puntino verde.",
    'barili': "Impila i barili.<br>Tocca per fermare il blocco al momento giusto.",
    'simon': "Memorizza la sequenza di luci e ripetila."
};

function openGame(gameName) {
    currentGame = gameName;
    score = 0; lives = 3;
    const modal = document.getElementById('gameModal');
    modal.style.display = 'flex';
    
    document.getElementById('game-stage').innerHTML = '';
    document.getElementById('save-form').classList.add('hidden');
    document.getElementById('game-instructions').classList.remove('hidden');
    document.getElementById('instruction-text').innerHTML = RULES[gameName] || "Gioca!";
    document.getElementById('modal-title').innerText = gameName.toUpperCase();
    
    const lbTitle = document.getElementById('lb-game-name');
    if(lbTitle) lbTitle.innerText = gameName.toUpperCase();
    
    updateHUD();
    loadLeaderboard(gameName);
    getDeviceUID(); 
}

function startGameLogic() {
    document.getElementById('game-instructions').classList.add('hidden');
    gameActive = true;
    setTimeout(() => {
        if (currentGame === 'cosciotto') initCosciotto();
        else if (currentGame === 'ratti') initRatti();
        else if (currentGame === 'freccette') initFreccette();
        else if (currentGame === 'barili') initBarili();
        else if (currentGame === 'simon') initSimon();
    }, 300);
}

function closeGame() {
    stopAllGames();
    document.getElementById('gameModal').style.display = 'none';
}

function stopAllGames() {
    gameActive = false;
    gameIntervals.forEach(clearInterval);
    gameIntervals = [];
    const stage = document.getElementById('game-stage');
    stage.onclick = null;
    stage.onmousemove = null;
    stage.ontouchmove = null;
    stage.onpointerdown = null;
}

function updateHUD() {
    document.getElementById('global-score').innerText = score;
    document.getElementById('global-lives').innerText = "❤️".repeat(Math.max(0, lives));
}

function gameOver() {
    if (!gameActive) return;
    gameActive = false;
    stopAllGames();
    if(navigator.vibrate) navigator.vibrate(200);
    document.getElementById('save-form').classList.remove('hidden');
    document.getElementById('final-score-display').innerText = score;
}

function resetGame() {
    stopAllGames();
    document.getElementById('game-stage').innerHTML = '';
    document.getElementById('save-form').classList.add('hidden');
    setTimeout(startGameLogic, 100);
}

function flashStage(color) {
    const stage = document.getElementById('game-stage');
    stage.style.borderColor = color;
    setTimeout(() => stage.style.borderColor = "rgba(255,255,255,0.1)", 200);
}

// --- LOGICA GIOCHI ---
function initCosciotto() {
    const stage = document.getElementById('game-stage');
    stage.innerHTML = `<div id="basket">🧺</div>`;
    const basket = document.getElementById('basket');
    const stageW = stage.offsetWidth;
    basket.style.left = (stageW / 2 - 40) + 'px';
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
            let stageH = stage.offsetHeight; 
            if (top > stageH - 90 && top < stageH - 10) {
                const iR = item.getBoundingClientRect();
                const bR = basket.getBoundingClientRect();
                if (iR.right > bR.left+10 && iR.left < bR.right-10) {
                    if (isBomb) { lives--; flashStage('red'); } else { score += 10; }
                    updateHUD(); item.remove(); clearInterval(fall);
                    if (lives <= 0) gameOver(); return;
                }
            }
            if (top > stageH) {
                if (!isBomb) { lives--; updateHUD(); }
                item.remove(); clearInterval(fall);
                if (lives <= 0) gameOver();
            } else { item.style.top = (top + speed) + 'px'; }
        }, 20);
        gameIntervals.push(fall);
    }, 1000);
    gameIntervals.push(spawner);
}

function initRatti() {
    const stage = document.getElementById('game-stage');
    let html = '<div class="grid-ratti">';
    for(let i=0; i<9; i++) html += `<div class="hole" onpointerdown="missRat(event)"><div class="mole" onpointerdown="whack(event, this)">🐭</div></div>`;
    html += '</div>';
    stage.innerHTML = html;
    function peep() {
        if (!gameActive) return;
        const moles = document.querySelectorAll('.mole');
        if(moles.length === 0) return;
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

window.whack = function(e, mole) {
    e.stopPropagation();
    if (!mole.classList.contains('up') || !gameActive) return;
    score += 10; updateHUD();
    mole.innerText = "💥";
    mole.classList.remove('up');
    setTimeout(() => mole.innerText = "🐭", 200);
};

window.missRat = function(e) {
    if (!gameActive) return;
    lives--; updateHUD(); flashStage('red');
    if (lives <= 0) gameOver();
}

function initFreccette() {
    const stage = document.getElementById('game-stage');
    stage.innerHTML = `<div class="center-mark"></div><div id="dart-target"></div><button onpointerdown="throwDart()" class="btn-action" style="position:absolute; bottom:20px; left:50%; transform:translateX(-50%); width:100px; z-index:200;">TIRA!</button>`;
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

function initBarili() {
    const stage = document.getElementById('game-stage');
    stage.innerHTML = `<div id="tower-world"><div id="moving-block"></div></div>`;
    const world = document.getElementById('tower-world');
    const mover = document.getElementById('moving-block');
    let level=0, w=200, pos=0, dir=1, speed=3, h=30;
    let stageW = stage.offsetWidth; if(stageW===0) stageW=350; 
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
        let prevLeft = (stageW - 200)/2;
        let prevWidth = 200;
        if (level > 0) {
            const pb = document.getElementById(`barile-${level-1}`);
            if(pb) { prevLeft = parseFloat(pb.style.left); prevWidth = parseFloat(pb.style.width); }
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
        if (level*h > stage.offsetHeight/2) {
            world.style.transform = `translateY(${ (level*h) - (stage.offsetHeight/2) }px)`;
        }
    };
}

function initSimon() {
    const stage = document.getElementById('game-stage');
    stage.innerHTML = `<div class="simon-grid">
        <div class="simon-btn" style="background:red" onpointerdown="clkS(0)"></div>
        <div class="simon-btn" style="background:blue" onpointerdown="clkS(1)"></div>
        <div class="simon-btn" style="background:lime" onpointerdown="clkS(2)"></div>
        <div class="simon-btn" style="background:yellow" onpointerdown="clkS(3)"></div>
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
    }, 800);
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
    localStorage.setItem('tavern_name', name);
    const uid = getDeviceUID();
    const btn = document.getElementById('btn-save');
    btn.innerText = "Salvataggio..."; btn.disabled = true;
    
    fetch(`${SCRIPT_URL}?action=save&name=${encodeURIComponent(name)}&score=${score}&game=${currentGame}&uid=${uid}`, {method:'POST'})
    .then(()=>{ 
        alert("Record salvato!"); 
        btn.innerText="INCIDI RECORD"; 
        btn.disabled=false; 
        document.getElementById('save-form').classList.add('hidden');
        loadLeaderboard(currentGame);
        document.getElementById('game-instructions').classList.remove('hidden');
    })
    .catch(()=>{ alert("Errore di connessione"); btn.disabled=false; });
}

function loadLeaderboard(g) {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = "<li>Caricamento...</li>";
    fetch(`${SCRIPT_URL}?game=${g}`).then(r=>r.json()).then(d=>{
        list.innerHTML="";
        if(!d.length) list.innerHTML="<li>Nessun record! Sii il primo!</li>";
        d.forEach((r,i)=> list.innerHTML += `<li><span>#${i+1} ${r.name}</span><span>${r.score}</span></li>`);
    }).catch(()=>list.innerHTML="<li>Errore caricamento</li>");
}
