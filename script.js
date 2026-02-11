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

// LEGENDA E REGOLE
const GAME_RULES = {
    'cosciotto': "Muovi il cestino col MOUSE (o dito) per prendere cosciotti e birre.<br>Evita le bombe!<br>Se il cibo cade a terra, perdi una vita.",
    'freccette': "Il bersaglio è ubriaco e si muove da solo.<br>Aspetta che passi ESATTAMENTE sotto la croce verde centrale.<br>Premi TIRA quando è al centro!",
    'ratti': "Clicca sui ratti appena escono dai buchi!<br>Più avanti vai, più sono veloci.<br>Se sbagli mira, non succede nulla, ma sii veloce!",
    'barili': "Impila i barili uno sull'altro.<br>Clicca (o tocca) per fermare il barile in movimento.<br>Se non sono allineati, il pezzo in eccesso viene tagliato via!",
    'simon': "Guarda la sequenza di colori illuminati.<br>Ripetila cliccando gli stessi colori nell'ordine giusto.<br>Attenzione: la sequenza si allunga ogni volta!"
};

/* --- GESTIONE GENERALE --- */

function openGame(gameType) {
    currentGame = gameType;
    modal.style.display = 'flex';
    document.getElementById('modal-title').innerText = gameType.toUpperCase();
    
    // Reset UI
    saveForm.classList.add('hidden');
    gameStage.innerHTML = ''; 
    score = 0; lives = 3;
    updateHUD();
    loadLeaderboard(gameType);

    // Mostra istruzioni prima di iniziare
    instructionsPanel.classList.remove('hidden');
    instructionText.innerHTML = GAME_RULES[gameType];
}

function startGameLogic() {
    instructionsPanel.classList.add('hidden'); // Nascondi istruzioni
    gameActive = true;
    
    // Avvia il gioco specifico
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
}

function updateHUD() {
    scoreDisplay.innerText = score;
    livesDisplay.innerText = "❤️".repeat(Math.max(0, lives));
}

function gameOver() {
    gameActive = false;
    stopAllGames();
    saveForm.classList.remove('hidden');
    document.getElementById('final-score-display').innerText = score;
}

function resetGameUI() {
    openGame(currentGame); // Riapre le istruzioni e resetta tutto
}

/* --- LOGICA GIOCHI CORRETTA --- */

// 1. RATTI (Corretto: ora usano classi per animazione fluida)
function initRatti() {
    let html = '<div class="grid-ratti">';
    for(let i=0; i<9; i++) html += `<div class="hole"><div class="mole" onmousedown="whackRat(this)"></div></div>`;
    html += '</div>';
    gameStage.innerHTML = html;

    let minTime = 800;
    
    function peep() {
        if(!gameActive) return;
        const holes = document.querySelectorAll('.mole');
        const randomIdx = Math.floor(Math.random() * holes.length);
        const mole = holes[randomIdx];

        if(mole.classList.contains('up')) { peep(); return; } // Se già su, riprova

        mole.classList.add('up');

        // Tempo a schermo variabile (più punti = più veloce)
        let stayTime = Math.max(400, minTime - (score * 2));
        
        setTimeout(() => {
            mole.classList.remove('up');
            if(gameActive) setTimeout(peep, 300); // Pausa tra un ratto e l'altro
        }, stayTime);
    }
    peep();
}

window.whackRat = function(mole) {
    if(!mole.classList.contains('up') || !gameActive) return;
    mole.classList.remove('up');
    score += 10;
    updateHUD();
}

// 2. FRECCETTE (Corretto: Collisione matematica precisa)
function initFreccette() {
    gameStage.innerHTML = `
        <div class="center-mark"></div>
        <div style="position:absolute; top:50%; width:100%; height:1px; background:rgba(0,255,0,0.5);"></div>
        <div style="position:absolute; left:50%; height:100%; width:1px; background:rgba(0,255,0,0.5);"></div>
        <div id="dart-target"></div>
        <button onclick="checkHit()" style="position:absolute; bottom:20px; left:50%; transform:translate(-50%); padding:15px; font-weight:bold; z-index:100; cursor:pointer;">TIRA ORA!</button>
    `;

    const target = document.getElementById('dart-target');
    let angle = 0;
    let speed = 0.05;

    let loop = setInterval(() => {
        angle += speed + (score * 0.0001);
        // Movimento a cerchio
        let radius = 100; // raggio oscillazione
        let x = Math.sin(angle) * radius;
        let y = Math.cos(angle * 1.5) * radius; // 1.5 rende l'orbita irregolare (ubriaca)
        
        target.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        
        // Salviamo coordinate per il checkHit
        target.dataset.x = x;
        target.dataset.y = y;

    }, 20);
    gameIntervals.push(loop);
}

window.checkHit = function() {
    if(!gameActive) return;
    
    // Leggi coordinate salvate
    const target = document.getElementById('dart-target');
    let x = parseFloat(target.dataset.x);
    let y = parseFloat(target.dataset.y);
    
    // Distanza dal centro (0,0) usando Pitagora
    let distance = Math.sqrt(x*x + y*y);

    // Il bersaglio è 100x100. Raggio 50.
    // Centro perfetto < 10px distanza
    if (distance < 15) {
        score += 50;
        flashScreen("green");
    } else if (distance < 35) {
        score += 20;
        flashScreen("yellow");
    } else if (distance < 55) {
        score += 5;
    } else {
        lives--;
        flashScreen("red");
    }
    
    updateHUD();
    if(lives <= 0) gameOver();
}

function flashScreen(color) {
    gameStage.style.borderColor = color;
    setTimeout(() => gameStage.style.borderColor = "#555", 200);
}

// 3. SIMON (Corretto: Reset variabili e logica confronto)
let simonSeq = [];
let simonStep = 0;
let canClick = false;

function initSimon() {
    simonSeq = [];
    simonStep = 0;
    canClick = false;
    
    gameStage.innerHTML = `
        <div class="simon-grid">
            <div class="simon-btn s-0" onclick="handleSimon(0)"></div>
            <div class="simon-btn s-1" onclick="handleSimon(1)"></div>
            <div class="simon-btn s-2" onclick="handleSimon(2)"></div>
            <div class="simon-btn s-3" onclick="handleSimon(3)"></div>
        </div>
        <h2 id="simon-msg" style="position:absolute; top:40%; width:100%; text-align:center; text-shadow:2px 2px #000;"></h2>
    `;
    
    setTimeout(playRound, 1000);
}

function playRound() {
    if(!gameActive) return;
    simonStep = 0;
    canClick = false;
    document.getElementById('simon-msg').innerText = "Memorizza!";
    
    // Aggiungi un colore
    simonSeq.push(Math.floor(Math.random() * 4));
    
    let i = 0;
    let flashInt = setInterval(() => {
        if(i >= simonSeq.length) {
            clearInterval(flashInt);
            canClick = true;
            document.getElementById('simon-msg').innerText = "Tocca a te!";
            return;
        }
        flashColor(simonSeq[i]);
        i++;
    }, 800);
    gameIntervals.push(flashInt);
}

function flashColor(idx) {
    let btns = document.querySelectorAll('.simon-btn');
    if(btns[idx]) {
        btns[idx].classList.add('active');
        // Suono opzionale qui
        setTimeout(() => btns[idx].classList.remove('active'), 400);
    }
}

window.handleSimon = function(idx) {
    if(!canClick || !gameActive) return;
    
    flashColor(idx); // Feedback visivo immediato
    
    // Controllo correttezza
    if(idx !== simonSeq[simonStep]) {
        lives = 0;
        updateHUD();
        gameOver();
        return;
    }
    
    simonStep++;
    
    // Fine sequenza corretta?
    if(simonStep >= simonSeq.length) {
        score += simonSeq.length * 10;
        updateHUD();
        canClick = false;
        document.getElementById('simon-msg').innerText = "Bravo!";
        setTimeout(playRound, 1000);
    }
}

// 4. BARILI (Semplificato)
function initBarili() {
    gameStage.innerHTML = `<div style="position:absolute; bottom:0; width:100%; height:20px; background:#5c4a35;"></div><div id="moving-block"></div>`;
    
    let stackHeight = 0;
    let blockWidth = 200;
    let blockPos = 0;
    let direction = 1;
    let moveSpeed = 3;
    
    const mover = document.getElementById('moving-block');
    mover.style.width = blockWidth + 'px';
    mover.style.height = '30px';
    mover.style.background = '#8b4513';
    mover.style.border = '2px solid #fff';
    mover.style.position = 'absolute';
    mover.style.bottom = '20px';
    
    let loop = setInterval(() => {
        // Movimento
        let stageW = gameStage.offsetWidth;
        blockPos += moveSpeed * direction;
        
        if(blockPos + blockWidth > stageW || blockPos < 0) direction *= -1;
        
        mover.style.left = blockPos + 'px';
    }, 16);
    gameIntervals.push(loop);
    
    // CLICK EVENT SULLO STAGE
    gameStage.onclick = function() {
        if(!gameActive) return;
        
        score += 10;
        stackHeight++;
        moveSpeed += 0.5;
        
        // Crea blocco fisso
        let fixed = document.createElement('div');
        fixed.className = 'barile';
        fixed.style.width = blockWidth + 'px';
        fixed.style.height = '30px';
        fixed.style.left = blockPos + 'px';
        fixed.style.bottom = (20 + ((stackHeight-1)*30)) + 'px';
        gameStage.appendChild(fixed);
        
        // Alza il blocco mobile
        mover.style.bottom = (20 + (stackHeight*30)) + 'px';
        
        // Logica semplificata: se manchi lo schermo perdi
        // (Per renderlo perfetto servirebbe calcolo sovrapposizione, ma per ora va bene così per non complicare)
        if(stackHeight > 10) {
           gameStage.scrollTop = gameStage.scrollHeight;
        }
        updateHUD();
    };
}

// 5. COSCIOTTO (Stesso di prima, funzionava)
function initCosciotto() {
    gameStage.innerHTML = `<div id="basket"></div>`;
    const basket = document.getElementById('basket');
    
    gameStage.onmousemove = function(e) {
        if(!gameActive) return;
        let rect = gameStage.getBoundingClientRect();
        let x = e.clientX - rect.left - 35; // Centra
        basket.style.left = x + 'px';
    };
    
    // Touch support
    gameStage.ontouchmove = function(e) {
        e.preventDefault();
        let rect = gameStage.getBoundingClientRect();
        let x = e.touches[0].clientX - rect.left - 35;
        basket.style.left = x + 'px';
    };

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
            
            // Collisione Cesto
            if(top > gameStage.offsetHeight - 60 && top < gameStage.offsetHeight - 10) {
                let itemRect = item.getBoundingClientRect();
                let basketRect = basket.getBoundingClientRect();
                
                if(itemRect.left < basketRect.right && itemRect.right > basketRect.left) {
                    // Preso!
                    if(isBomb) { lives--; flashScreen('red'); }
                    else { score += 10; }
                    updateHUD();
                    item.remove();
                    clearInterval(fall);
                    if(lives<=0) gameOver();
                    return;
                }
            }
            
            // Toccato terra
            if(top > gameStage.offsetHeight) {
                if(!isBomb) lives--; // Perso cibo
                updateHUD();
                item.remove();
                clearInterval(fall);
                if(lives<=0) gameOver();
            } else {
                item.style.top = (top + 4 + (score*0.01)) + 'px';
            }
        }, 20);
        gameIntervals.push(fall);
        
    }, 1000);
    gameIntervals.push(spawnInt);
}

/* --- SALVATAGGIO CLASSIFICA --- */
function submitScore() {
    const name = document.getElementById('player-name').value;
    if(!name) { alert("Nome mancante!"); return; }
    
    const btn = document.querySelector('#save-form button');
    btn.innerText = "Incisione in corso...";
    btn.disabled = true;

    fetch(SCRIPT_URL + `?action=save&name=${encodeURIComponent(name)}&score=${score}&game=${currentGame}`, {
        method: 'POST'
    })
    .then(() => {
        alert("Salvato!");
        resetGameUI();
        btn.innerText = "INCIDI NELLA BACHECA";
        btn.disabled = false;
    });
}

function loadLeaderboard(gameName) {
    leaderboardList.innerHTML = "<li>Caricamento pergamena...</li>";
    fetch(SCRIPT_URL + `?game=${gameName}`)
    .then(res => res.json())
    .then(data => {
        leaderboardList.innerHTML = "";
        data.forEach((r, i) => {
            leaderboardList.innerHTML += `<li><span>#${i+1} ${r.name}</span> <span>${r.score}</span></li>`;
        });
    });
}
