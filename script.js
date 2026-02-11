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
            html = "<div style='color:#777; padding:10px; text-align:center;'>La locanda è silenziosa...</div>"; 
        } else {
            data.forEach(m => {
                let d = new Date(m.time);
                let timeStr = d.getHours().toString().padStart(2,'0') + ":" + d.getMinutes().toString().padStart(2,'0');
                let nameStyle = m.name.toLowerCase().includes("re panza") ? "color:var(--gold); font-weight:bold;" : "color:var(--accent);";

                html += `<div class="chat-msg">
                            <div class="chat-content-wrapper">
                                <span class="chat-time">[${timeStr}]</span> 
                                <span class="chat-name" style="${nameStyle}">${m.name}:</span> 
                                <span class="chat-text">${m.msg}</span>
                            </div>
                            <button class="btn-report" onclick="reportMsg('${m.time}')">🚩</button>
                         </div>`;
            });
        }
        if(box.dataset.lastContent !== html) { 
            box.innerHTML = html; 
            box.dataset.lastContent = html;
            box.scrollTop = box.scrollHeight;
        }
    })
    .catch(e => {
        console.log("Errore connessione chat");
        box.innerHTML = "<div style='color:#777; padding:10px; text-align:center;'>Il database sta dormendo... prova a scrivere un messaggio!</div>";
    });
}

window.reportMsg = function(timeId) {
    if(!confirm("Segnalare questo messaggio?")) return;
    fetch(`${SCRIPT_URL}?action=chat_report&time=${encodeURIComponent(timeId)}`)
    .then(() => alert("Segnalazione inviata!"));
};

// --- GESTIONE GIOCHI ---
const RULES = {
    'cosciotto': "Trascina il cestino 🧺.<br>Prendi cibo 🍗, evita bombe 💣!",
    'ratti': "Tocca i topi 🐭 appena escono.",
    'freccette': "Tira quando il centro è allineato.",
    'barili': "Impila i barili al momento giusto.",
    'simon': "Memorizza la sequenza di luci."
};

function openGame(gameName) {
    currentGame = gameName;
    score = 0; lives = 3;
    document.getElementById('gameModal').style.display = 'flex';
    document.getElementById('game-stage').innerHTML = '';
    document.getElementById('save-form').classList.add('hidden');
    document.getElementById('game-instructions').classList.remove('hidden');
    document.getElementById('instruction-text').innerHTML = RULES[gameName] || "Gioca!";
    document.getElementById('modal-title').innerText = gameName.toUpperCase();
    document.getElementById('lb-game-name').innerText = gameName.toUpperCase();
    updateHUD();
    loadLeaderboard(gameName);
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
}

function updateHUD() {
    document.getElementById('global-score').innerText = score;
    document.getElementById('global-lives').innerText = "❤️".repeat(Math.max(0, lives));
}

function gameOver() {
    if (!gameActive) return;
    gameActive = false;
    stopAllGames();
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
    document.getElementById('game-stage').style.borderColor = color;
    setTimeout(() => document.getElementById('game-stage').style.borderColor = "rgba(255,255,255,0.1)", 200);
}

// --- LOGICA GIOCHI ---
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
        let fall = setInterval(() => {
            if (!gameActive) { clearInterval(fall); item.remove(); return; }
            let top = parseFloat(item.style.top);
            if (top > stage.offsetHeight - 90 && top < stage.offsetHeight - 10) {
                const iR = item.getBoundingClientRect();
                const bR = basket.getBoundingClientRect();
                if (iR.right > bR.left+10 && iR.left < bR.right-10) {
                    if (isBomb) { lives--; flashStage('red'); } else { score += 10; }
                    updateHUD(); item.remove(); clearInterval(fall);
                    if (lives <= 0) gameOver(); return;
                }
            }
            if (top > stage.offsetHeight) {
                if (!isBomb) lives--; 
                updateHUD(); item.remove(); clearInterval(fall);
                if (lives <= 0) gameOver();
            } else { item.style.top = (top + 5) + 'px'; }
        }, 20);
        gameIntervals.push(fall);
    }, 1000);
    gameIntervals.push(spawner);
}

function initRatti() {
    const stage = document.getElementById('game-stage');
    stage.innerHTML = '<div class="grid-ratti"></div>';
    const grid = stage.querySelector('.grid-ratti');
    for(let i=0; i<9; i++) grid.innerHTML += `<div class="hole" onclick="missRat()"><div class="mole" onclick="whack(event, this)">🐭</div></div>`;
    function peep() {
        if (!gameActive) return;
        const moles = document.querySelectorAll('.mole');
        const mole = moles[Math.floor(Math.random() * moles.length)];
        mole.classList.add('up');
        setTimeout(() => { mole.classList.remove('up'); if (gameActive) peep(); }, 1000);
    }
    peep();
}
window.whack = (e, m) => { e.stopPropagation(); if(!m.classList.contains('up')) return; score+=10; updateHUD(); m.classList.remove('up'); };
window.missRat = () => { lives--; updateHUD(); if(lives<=0) gameOver(); };

function initFreccette() { /* Logica semplificata per test */ }
function initBarili() { /* Logica semplificata per test */ }
function initSimon() { /* Logica semplificata per test */ }

function submitScore() {
    const name = document.getElementById('player-name').value;
    if(!name) return alert("Inserisci nome");
    fetch(`${SCRIPT_URL}?action=save&name=${encodeURIComponent(name)}&score=${score}&game=${currentGame}&uid=${getDeviceUID()}`, {method:'POST'})
    .then(()=>{ alert("Salvato!"); closeGame(); });
}

function loadLeaderboard(g) {
    const list = document.getElementById('leaderboard-list');
    fetch(`${SCRIPT_URL}?game=${g}`).then(r=>r.json()).then(d=>{
        list.innerHTML = d.map((r,i)=>`<li>#${i+1} ${r.name} - ${r.score}</li>`).join('');
    });
}
