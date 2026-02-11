const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzRM7kZEFD0QHHayNcMrtWq1W2yzAAvIS2fMK9ccrysEe45Tb498_6KhLz5NzaGcRL8JQ/exec";

let currentGame = null, score = 0, lives = 3, timeLeft = 60;
let gameActive = false, gameIntervals = [];

// --- BLOCCO DESKTOP & QR CODE ---
function checkDevice() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const urlParams = new URLSearchParams(window.location.search);
    const isDev = urlParams.get('dev') === 'true';

    if (!isMobile && !isDev) {
        document.getElementById('site-content').classList.add('hidden');
        document.getElementById('desktop-block').classList.remove('hidden');
        
        const currentURL = encodeURIComponent(window.location.href.split('?')[0]);
        document.getElementById('qr-code').src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${currentURL}`;
    }
}

// --- AVVIO ---
window.onload = () => {
    checkDevice();
    getDeviceUID();
    loadChat();
};

setInterval(loadChat, 4000);

// --- LOGICA CHAT ---
function getDeviceUID() {
    let uid = localStorage.getItem('tavern_uid') || 'usr_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('tavern_uid', uid);
    return uid;
}

function loadChat() {
    const box = document.getElementById('tavern-chat-box');
    fetch(`${SCRIPT_URL}?action=chat_get`)
    .then(r => r.json())
    .then(data => {
        let html = data.map(m => `<div><b style="color:var(--gold)">${m.name}:</b> ${m.msg}</div>`).join('');
        box.innerHTML = html || "Nessun messaggio.";
        box.scrollTop = box.scrollHeight;
    }).catch(() => box.innerHTML = "Errore bacheca.");
}

function sendChat() {
    const name = document.getElementById('chat-user-name').value || "Anonimo";
    const msg = document.getElementById('chat-message').value;
    if(!msg) return;
    fetch(`${SCRIPT_URL}?action=chat_send&name=${encodeURIComponent(name)}&msg=${encodeURIComponent(msg)}&uid=${getDeviceUID()}`, {method:'POST'})
    .then(() => { document.getElementById('chat-message').value = ""; loadChat(); });
}

// --- LOGICA GESTIONE GIOCHI ---
const RULES = {
    'cosciotto': "Raccogli i cosciotti 🍗, evita le bombe 💣!",
    'ratti': "Tocca i topi 🐭 appena escono!",
    'freccette': "Colpisci il centro quando è allineato!",
    'barili': "Impila i barili senza farli cadere!",
    'simon': "Ripeti la sequenza luminosa!"
};

function openGame(name) {
    currentGame = name;
    score = 0; lives = 3; timeLeft = 60;
    document.getElementById('gameModal').style.display = 'flex';
    document.getElementById('game-instructions').classList.remove('hidden');
    document.getElementById('save-form').classList.add('hidden');
    document.getElementById('modal-title').innerText = name.toUpperCase();
    document.getElementById('instruction-text').innerHTML = RULES[name];
    document.getElementById('lb-game-name').innerText = name;
    updateHUD();
    loadLeaderboard(name);
}

function startGameLogic() {
    document.getElementById('game-instructions').classList.add('hidden');
    gameActive = true;
    
    // Timer 60 secondi
    let tInt = setInterval(() => {
        if (!gameActive) return clearInterval(tInt);
        timeLeft--;
        document.getElementById('game-timer').innerText = `⏳ ${timeLeft}s`;
        if (timeLeft <= 0) {
            document.getElementById('end-reason').innerText = "TEMPO SCADUTO!";
            gameOver();
        }
    }, 1000);
    gameIntervals.push(tInt);

    initGame(currentGame);
}

function updateHUD() {
    document.getElementById('global-score').innerText = score;
    document.getElementById('global-lives').innerText = "❤️".repeat(lives);
    document.getElementById('game-timer').innerText = `⏳ ${timeLeft}s`;
}

function gameOver() {
    if (!gameActive) return;
    gameActive = false;
    gameIntervals.forEach(clearInterval);
    document.getElementById('save-form').classList.remove('hidden');
    document.getElementById('final-score-display').innerText = score;
}

function closeGame() {
    gameActive = false;
    gameIntervals.forEach(clearInterval);
    document.getElementById('gameModal').style.display = 'none';
}

function resetGame() {
    gameIntervals.forEach(clearInterval);
    document.getElementById('game-stage').innerHTML = "";
    openGame(currentGame);
}

// --- CLASSIFICHE ---
function submitScore() {
    const n = document.getElementById('player-name').value || "Anonimo";
    const btn = document.getElementById('btn-save');
    btn.disabled = true;
    fetch(`${SCRIPT_URL}?action=save&name=${encodeURIComponent(n)}&score=${score}&game=${currentGame}&uid=${getDeviceUID()}`, {method:'POST'})
    .then(() => { alert("Record Inciso!"); closeGame(); })
    .finally(() => btn.disabled = false);
}

function loadLeaderboard(g) {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = "<li>Caricamento...</li>";
    fetch(`${SCRIPT_URL}?game=${g}`).then(r=>r.json()).then(d => {
        list.innerHTML = d.map((r, i)=>`<li>#${i+1} ${r.name}: ${r.score}</li>`).join('') || "<li>Nessun record</li>";
    });
}

// --- PLACEHOLDER LOGICA GIOCHI (Incolla qui le tue init specifiche) ---
function initGame(game) {
    const stage = document.getElementById('game-stage');
    stage.innerHTML = "";
    // Esempio base per Cosciotto
    if(game === 'cosciotto') {
        stage.innerHTML = `<div id="basket" style="position:absolute; bottom:20px; left:50%; transform:translateX(-50%); font-size:40px;">🧺</div>`;
        // Logica specifica...
    } else {
        stage.innerHTML = `<div style="padding:20px">Logica del gioco ${game} in arrivo...</div>`;
    }
}
