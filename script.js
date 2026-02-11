// CONFIGURAZIONE
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby5lE4L1IZ13C7LaucAwB19dG_7erjtTUrOcCPmltTBcbXANAA8ewakSGwITGS4FOtV-w/exec";

// Variabili Globali di Stato
let currentGame = null; // 'ratti', 'freccette', etc.
let score = 0;
let lives = 3;
let gameIntervals = []; // Per pulire i timer quando si chiude
let gameActive = false;

// Elementi DOM Comuni
const modal = document.getElementById('gameModal');
const gameStage = document.getElementById('game-stage');
const scoreDisplay = document.getElementById('global-score');
const livesDisplay = document.getElementById('global-lives');
const saveForm = document.getElementById('save-form');
const leaderboardList = document.getElementById('leaderboard-list');

/* --- GESTIONE HUB E MODALE --- */

function openGame(gameType) {
    currentGame = gameType;
    modal.style.display = 'flex';
    document.getElementById('modal-title').innerText = gameType.toUpperCase();
    loadLeaderboard(gameType);
    startGameSystem();
}

function closeGame() {
    stopAllGames();
    modal.style.display = 'none';
    gameStage.innerHTML = '';
}

function stopAllGames() {
    gameActive = false;
    gameIntervals.forEach(clearInterval);
    gameIntervals = [];
}

function startGameSystem() {
    stopAllGames(); // Pulisci precedenti
    gameStage.innerHTML = ''; // Pulisci area
    saveForm.classList.add('hidden');
    
    score = 0;
    lives = 3;
    gameActive = true;
    updateHUD();

    // Avvia la logica specifica del gioco
    switch(currentGame) {
        case 'ratti': initRatti(); break;
        case 'freccette': initFreccette(); break;
        case 'barili': initBarili(); break;
        case 'simon': initSimon(); break;
        case 'cosciotto': initCosciotto(); break;
    }
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

function restartCurrentGame() {
    startGameSystem();
}

/* --- LOGICA DEI 5 GIOCHI --- */

// 1. GIOCO RATTI
function initRatti() {
    // Costruisci griglia
    let html = '<div class="grid-ratti">';
    for(let i=0; i<9; i++) html += `<div class="hole" id="hole-${i}"><div class="mole" onmousedown="hitRat(this)"></div></div>`;
    html += '</div>';
    gameStage.innerHTML = html;

    let speed = 1000;
    
    function peep() {
        if(!gameActive) return;
        const holes = document.getElementsByClassName('hole');
        const randomHole = holes[Math.floor(Math.random() * holes.length)];
        const mole = randomHole.querySelector('.mole');
        
        mole.classList.add('up');
        
        // Se non lo clicchi in tempo (e il gioco è difficile) potremmo togliere vite
        // Per ora semplice: appare e scompare
        let stayTime = Math.max(400, speed - (score * 5)); // Diventa più veloce

        setTimeout(() => {
            if(mole.classList.contains('up')) {
                mole.classList.remove('up');
                // Opzionale: Se scende senza essere cliccato, perdi vita? 
                // lives--; updateHUD(); if(lives<=0) gameOver();
            }
            if(gameActive) peep(); // Ciclo continuo
        }, stayTime);
    }
    peep();
}

window.hitRat = function(mole) {
    if(!mole.classList.contains('up')) return;
    mole.classList.remove('up');
    score += 10;
    updateHUD();
}

// 2. GIOCO FRECCETTE
function initFreccette() {
    gameStage.innerHTML = `
        <div class="crosshair-v"></div><div class="crosshair-h"></div>
        <div id="dart-target"></div>
        <button onclick="throwDart()" style="position:absolute; bottom:20px; left:50%; transform:translateX(-50%); padding:15px 30px; background:red; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer; z-index:100;">TIRA!</button>
    `;
    
    const target = document.getElementById('dart-target');
    let angle = 0;
    let speed = 0.05;

    let loop = setInterval(() => {
        angle += speed + (score * 0.0005); // Accelera col punteggio
        let x = Math.sin(angle) * 120; // 120px raggio oscillazione
        let y = Math.cos(angle * 1.3) * 120;
        target.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        target.dataset.x = x;
        target.dataset.y = y;
    }, 20);
    gameIntervals.push(loop);
}

window.throwDart = function() {
    if(!gameActive) return;
    const target = document.getElementById('dart-target');
    let dx = parseFloat(target.dataset.x || 0);
    let dy = parseFloat(target.dataset.y || 0);
    let dist = Math.sqrt(dx*dx + dy*dy); // Distanza dal centro

    if(dist < 15) score += 50; // Centro perfetto
    else if(dist < 30) score += 20;
    else if(dist < 50) score += 5;
    else {
        lives--;
        // Feedback visivo errore
        gameStage.style.backgroundColor = "rgba(255,0,0,0.2)";
        setTimeout(()=>gameStage.style.backgroundColor = "#111", 100);
    }

    updateHUD();
    if(lives <= 0) gameOver();
}

// 3. GIOCO BARILI (Stacking)
function initBarili() {
    gameStage.innerHTML = `<div id="tower-base"></div><div id="current-block"></div>`;
    // Impostazioni iniziali
    let blockWidth = 150;
    let blockPos = 0;
    let direction = 1;
    let speed = 2; // px per frame
    let towerHeight = 0;
    let blockLevel = 0; // Quanti ne hai messi

    // Il blocco che si muove
    const mover = document.getElementById('current-block');
    mover.style.width = blockWidth + 'px';
    mover.style.bottom = (20 + (blockLevel * 30)) + 'px'; // 30px altezza blocco

    let loop = setInterval(() => {
        // Movimento destra sinistra
        const containerWidth = gameStage.offsetWidth;
        const maxPos = containerWidth - blockWidth;
        
        blockPos += speed * direction;
        
        if (blockPos > maxPos || blockPos < 0) direction *= -1;
        mover.style.left = blockPos + 'px';
    }, 10);
    gameIntervals.push(loop);

    // Click per fermare
    gameStage.onclick = function() {
        if(!gameActive) return;
        
        // Logica di "Taglio"
        // In un gioco vero calcoleremmo la sovrapposizione col blocco sotto.
        // Qui semplifichiamo: se manchi troppo il centro (schermo width / 2), perdi larghezza.
        // Centro schermo
        const center = gameStage.offsetWidth / 2;
        const blockCenter = blockPos + (blockWidth/2);
        const diff = Math.abs(center - blockCenter);
        
        // Tolleranza
        if(diff > blockWidth) {
            lives = 0; gameOver(); return; // Mancato totalmente
        }

        // Riduci larghezza per il prossimo
        if(diff > 10) {
            blockWidth -= diff; // Taglia il pezzo in eccesso
            if(blockWidth < 10) { lives = 0; gameOver(); return; }
        }

        score += 10;
        speed += 0.5; // Più veloce
        blockLevel++;

        // Crea il blocco "fissato"
        let fixed = document.createElement('div');
        fixed.className = 'barile';
        fixed.style.width = blockWidth + 'px';
        fixed.style.height = '30px';
        fixed.style.bottom = (20 + ((blockLevel-1) * 30)) + 'px';
        fixed.style.left = blockPos + 'px'; // Dove l'hai fermato
        gameStage.appendChild(fixed);

        // Resetta il mover in alto
        mover.style.width = blockWidth + 'px';
        mover.style.bottom = (20 + (blockLevel * 30)) + 'px';
        blockPos = 0; // Riparte da sinistra

        // Se la torre è troppo alta, abbassa tutto visivamente (scroll)
        if(blockLevel > 5) {
            gameStage.scrollTop = gameStage.scrollHeight; 
        }

        updateHUD();
    };
}

// 4. GIOCO SIMON
function initSimon() {
    gameStage.innerHTML = `
        <div class="simon-grid">
            <div class="simon-btn s-red" data-col="0" onclick="simonInput(0)"></div>
            <div class="simon-btn s-blue" data-col="1" onclick="simonInput(1)"></div>
            <div class="simon-btn s-green" data-col="2" onclick="simonInput(2)"></div>
            <div class="simon-btn s-yellow" data-col="3" onclick="simonInput(3)"></div>
        </div>
        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); pointer-events:none; color:white; font-size:2em;" id="simon-msg"></div>
    `;
    
    let sequence = [];
    let playerStep = 0;
    let isCpuTurn = true;

    function nextRound() {
        playerStep = 0;
        isCpuTurn = true;
        document.getElementById('simon-msg').innerText = "Memorizza!";
        sequence.push(Math.floor(Math.random()*4));
        
        // Riproduci sequenza
        let i = 0;
        let playInterval = setInterval(() => {
            flashBtn(sequence[i]);
            i++;
            if(i >= sequence.length) {
                clearInterval(playInterval);
                isCpuTurn = false;
                document.getElementById('simon-msg').innerText = "Tocca a te!";
                setTimeout(() => document.getElementById('simon-msg').innerText = "", 500);
            }
        }, 800);
        gameIntervals.push(playInterval);
    }

    window.flashBtn = function(idx) {
        let btns = document.querySelectorAll('.simon-btn');
        btns[idx].classList.add('active');
        setTimeout(() => btns[idx].classList.remove('active'), 300);
    }

    window.simonInput = function(idx) {
        if(isCpuTurn || !gameActive) return;
        flashBtn(idx);
        
        if(idx !== sequence[playerStep]) {
            lives = 0; updateHUD(); gameOver(); return;
        }
        
        playerStep++;
        if(playerStep >= sequence.length) {
            score += sequence.length * 10;
            updateHUD();
            setTimeout(nextRound, 1000);
        }
    }

    setTimeout(nextRound, 1000); // Start
}

// 5. GIOCO COSCIOTTO (Semplificato con Emoji)
function initCosciotto() {
    gameStage.innerHTML = `<div id="basket">🗑️</div>`;
    const basket = document.getElementById('basket');
    let basketX = 150;
    
    // Mouse move
    gameStage.onmousemove = function(e) {
        let rect = gameStage.getBoundingClientRect();
        basketX = e.clientX - rect.left;
        if(basketX < 30) basketX = 30;
        if(basketX > rect.width - 30) basketX = rect.width - 30;
        basket.style.left = (basketX - 30) + 'px';
    }

    // Spawner
    let spawnRate = 1000;
    let spawner = setInterval(() => {
        if(!gameActive) return;
        spawnItem();
    }, spawnRate);
    gameIntervals.push(spawner);

    function spawnItem() {
        const item = document.createElement('div');
        item.classList.add('falling-item');
        
        // 80% Cibo (Punti), 20% Bomba (Danno)
        let type = Math.random() > 0.2 ? 'food' : 'bomb';
        item.innerText = type === 'food' ? (Math.random()>0.5 ? '🍗' : '🍺') : '💣';
        
        item.style.left = Math.random() * (gameStage.offsetWidth - 40) + 'px';
        item.style.top = '0px';
        gameStage.appendChild(item);

        let fallSpeed = 3 + (score * 0.01); // Accelera

        let fallInterval = setInterval(() => {
            if(!gameActive) { clearInterval(fallInterval); return; }
            let top = parseFloat(item.style.top);
            if(top > gameStage.offsetHeight - 50) {
                // Controllo collisione
                let itemLeft = parseFloat(item.style.left) + 15; // Centro item
                let basketLeft = parseFloat(basket.style.left) + 30; // Centro cesto
                
                if(Math.abs(itemLeft - basketLeft) < 40) {
                    // Preso!
                    if(type === 'food') score += 10;
                    else { lives--;  gameStage.style.borderColor="red"; setTimeout(()=>gameStage.style.borderColor="#555", 200);}
                } else {
                    // Caduto a terra
                    if(type === 'food') lives--; // Cibo sprecato
                }
                updateHUD();
                if(lives <= 0) gameOver();
                
                clearInterval(fallInterval);
                item.remove();
            } else {
                item.style.top = (top + fallSpeed) + 'px';
            }
        }, 20);
        gameIntervals.push(fallInterval);
    }
}


/* --- DATABASE GOOGLE SHEETS --- */

function submitScore() {
    const name = document.getElementById('player-name').value;
    if(!name) { alert("Inserisci un nome!"); return; }
    
    const btn = document.querySelector('#save-form button');
    btn.innerText = "Salvataggio...";
    btn.disabled = true;

    // Aggiungiamo parametro 'game' dinamico
    fetch(SCRIPT_URL + `?action=save&name=${encodeURIComponent(name)}&score=${score}&game=${currentGame}`, {
        method: 'POST'
    })
    .then(res => res.json())
    .then(data => {
        alert("Punteggio salvato!");
        loadLeaderboard(currentGame); // Ricarica classifica
        btn.innerText = "INCIDI NELLA BACHECA";
        btn.disabled = false;
        saveForm.classList.add('hidden'); // Chiudi form
    })
    .catch(err => { console.error(err); alert("Errore connessione Taverna!"); });
}

function loadLeaderboard(gameName) {
    leaderboardList.innerHTML = "<li>Caricamento pergamena...</li>";
    
    fetch(SCRIPT_URL + `?game=${gameName}`)
    .then(res => res.json())
    .then(data => {
        leaderboardList.innerHTML = "";
        data.forEach((row, index) => {
            let li = document.createElement('li');
            li.innerHTML = `<span>#${index+1} ${row.name}</span> <span>${row.score}</span>`;
            leaderboardList.appendChild(li);
        });
    });
}
