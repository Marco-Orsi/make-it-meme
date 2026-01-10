/**
 * Make it Meme - Web Edition
 * Client-side game logic
 */

// Socket connection
const socket = io();

// Game state
let gameState = {
    roomCode: null,
    playerId: null,
    isHost: false,
    mode: 'normal',
    numRounds: 5,
    timerDuration: 60,
    currentRound: 0,
    players: []
};

// Session storage keys
const SESSION_KEYS = {
    roomCode: 'mim_room_code',
    playerName: 'mim_player_name',
    playerId: 'mim_player_id'
};

// Save session to localStorage
function saveSession(playerName = null) {
    if (gameState.roomCode && gameState.playerId) {
        // Usa il nome passato come parametro, oppure cercalo nell'array players
        const name = playerName || gameState.players.find(p => p.player_id === gameState.playerId)?.name || '';
        if (name) {
            localStorage.setItem(SESSION_KEYS.roomCode, gameState.roomCode);
            localStorage.setItem(SESSION_KEYS.playerName, name);
            localStorage.setItem(SESSION_KEYS.playerId, gameState.playerId);
            console.log('Session saved:', gameState.roomCode, name, gameState.playerId);
        }
    }
}

// Clear session from localStorage
function clearSession() {
    localStorage.removeItem(SESSION_KEYS.roomCode);
    localStorage.removeItem(SESSION_KEYS.playerName);
    localStorage.removeItem(SESSION_KEYS.playerId);
}

// Get saved session
function getSavedSession() {
    return {
        roomCode: localStorage.getItem(SESSION_KEYS.roomCode),
        playerName: localStorage.getItem(SESSION_KEYS.playerName),
        playerId: localStorage.getItem(SESSION_KEYS.playerId)
    };
}

// Try to rejoin a saved session
function tryRejoinSession() {
    const session = getSavedSession();
    if (session.roomCode && session.playerName) {
        socket.emit('rejoin_game', {
            room_code: session.roomCode,
            player_name: session.playerName,
            old_player_id: session.playerId
        });
        return true;
    }
    return false;
}

// Timer variables
let timerInterval = null;
let timerSeconds = 60;


// Mode labels
const MODE_LABELS = {
    'normal': '🎲 Normale',
    'themes': '🎯 Temi',
    'same_meme': '🎨 Stesso Meme',
    'relaxed': '😌 Rilassata'
};

// ===================================
// UI Helper Functions
// ===================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function selectMode(btn) {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}


function selectTimer(btn) {
    document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function changeRounds(delta) {
    const display = document.getElementById('num-rounds');
    let rounds = parseInt(display.textContent) + delta;
    rounds = Math.max(3, Math.min(10, rounds));
    display.textContent = rounds;
}

function copyRoomCode() {
    const code = document.getElementById('display-room-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        showToast('Codice copiato!', 'success');
    });
}

function updateCharCount() {
    const input = document.getElementById('caption-input');
    const count = document.getElementById('char-count');
    if (input && count) {
        count.textContent = input.value.length;
    }
}

function updatePreview() {
    const text1 = document.getElementById('text-input-1');
    const text2 = document.getElementById('text-input-2');
    const preview1 = document.getElementById('preview-text-1');
    const preview2 = document.getElementById('preview-text-2');
    
    if (text1 && preview1) {
        preview1.textContent = text1.value || 'Testo 1';
    }
    if (text2 && preview2) {
        preview2.textContent = text2.value || 'Testo 2';
    }
}

// Meme changes counter
let memeChangesLeft = 5;

function requestNewMeme() {
    if (memeChangesLeft <= 0) {
        showToast('Hai esaurito i cambi meme!', 'error');
        return;
    }
    
    socket.emit('request_new_meme', {
        room_code: gameState.roomCode
    });
}

function updateMemeChangesCounter() {
    const counter = document.getElementById('meme-changes-left');
    if (counter) {
        counter.textContent = memeChangesLeft;
    }
    
    const btn = document.querySelector('.change-meme-btn');
    if (btn) {
        // Abilita o disabilita il bottone in base ai cambi disponibili
        btn.disabled = memeChangesLeft <= 0;
    }
}

// ===================================
// Timer Functions
// ===================================

function startTimer(duration) {
    // Ferma eventuali timer precedenti
    stopTimer();
    
    timerSeconds = duration;
    
    const progressBar = document.getElementById('progress-bar');
    
    // Inizializza la progress bar al 100%
    if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.classList.remove('progress-warning', 'progress-critical');
    }
    
    timerInterval = setInterval(() => {
        timerSeconds--;
        
        const progress = timerSeconds / duration;
        
        // Aggiorna la progress bar lineare
        if (progressBar) {
            progressBar.style.width = `${progress * 100}%`;
            
            // Cambia colore della progress bar
            if (timerSeconds <= 10) {
                progressBar.classList.add('progress-critical');
                progressBar.classList.remove('progress-warning');
            } else if (timerSeconds <= 30) {
                progressBar.classList.add('progress-warning');
                progressBar.classList.remove('progress-critical');
            }
        }
        
        // Tempo scaduto - auto submit
        if (timerSeconds <= 0) {
            stopTimer();
            autoSubmitMeme();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // Rimuovi classi di warning dalla progress bar
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.classList.remove('progress-warning', 'progress-critical');
    }
}

function autoSubmitMeme() {
    const text1 = document.getElementById('text-input-1');
    const text2 = document.getElementById('text-input-2');
    
    // Se l'utente non ha ancora inviato il meme
    if (!text1.disabled) {
        // Invia anche se vuoto (con un testo di default)
        const caption1 = text1.value.trim() || '...';
        const caption2 = text2.value.trim();
        
        socket.emit('submit_meme', {
            room_code: gameState.roomCode,
            caption: caption2 ? `${caption1} / ${caption2}` : caption1,
            text1: caption1,
            text2: caption2
        });
        
        // Disabilita gli input
        text1.disabled = true;
        text2.disabled = true;
        
        const submitBtn = document.querySelector('.submit-btn');
        if (submitBtn) submitBtn.style.display = 'none';
        document.getElementById('waiting-others').style.display = 'flex';
        
        showToast('Tempo scaduto! Meme inviato automaticamente.', 'info');
    }
}

// ===================================
// Players List
// ===================================

function updatePlayersList(players) {
    gameState.players = players;
    const list = document.getElementById('players-list');
    const count = document.getElementById('players-count');
    
    // Conta giocatori attivi (non disconnessi)
    const activePlayers = players.filter(p => !p.disconnected);
    const disconnectedCount = players.filter(p => p.disconnected).length;
    
    count.textContent = disconnectedCount > 0 
        ? `(${activePlayers.length}/${players.length} - ${disconnectedCount} offline)` 
        : `(${players.length}/8)`;
    
    list.innerHTML = players.map(player => `
        <div class="player-item ${player.disconnected ? 'player-disconnected' : ''}">
            <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
            <span class="player-name">${player.name}</span>
            ${player.disconnected ? '<span class="player-badge disconnected-badge">⚠️ Offline</span>' : ''}
            ${player.is_host && !player.disconnected ? '<span class="player-badge">Host</span>' : ''}
            ${player.score > 0 ? `<span class="player-score">${player.score} pts</span>` : ''}
        </div>
    `).join('');
    
    // Update host controls visibility
    const startBtn = document.getElementById('start-game-btn');
    const waitingMsg = document.getElementById('waiting-message');
    
    if (gameState.isHost) {
        startBtn.style.display = activePlayers.length >= 2 ? 'flex' : 'none';
        waitingMsg.style.display = activePlayers.length >= 2 ? 'none' : 'block';
        waitingMsg.textContent = 'Servono almeno 2 giocatori per iniziare...';
    } else {
        startBtn.style.display = 'none';
        waitingMsg.style.display = 'block';
        waitingMsg.textContent = "In attesa che l'host avvii la partita...";
    }
}

// ===================================
// Game Actions
// ===================================

function createGame() {
    const name = document.getElementById('create-name').value.trim();
    if (!name) {
        showToast('Inserisci il tuo nome!', 'error');
        return;
    }
    
    const modeBtn = document.querySelector('.mode-btn.active');
    const mode = modeBtn ? modeBtn.dataset.mode : 'normal';
    const numRounds = parseInt(document.getElementById('num-rounds').textContent);
    const timerBtn = document.querySelector('.timer-btn.active');
    const timerDuration = timerBtn ? parseInt(timerBtn.dataset.timer) : 60;
    
    socket.emit('create_game', {
        player_name: name,
        mode: mode,
        image_type: 'custom',
        num_rounds: numRounds,
        timer_duration: timerDuration
    });
}

function joinGame() {
    const name = document.getElementById('join-name').value.trim();
    const roomCode = document.getElementById('room-code').value.trim().toUpperCase();
    
    if (!name) {
        showToast('Inserisci il tuo nome!', 'error');
        return;
    }
    
    if (!roomCode || roomCode.length !== 4) {
        showToast('Inserisci un codice stanza valido!', 'error');
        return;
    }
    
    // Salva temporaneamente per poter tentare il rejoin se fallisce
    pendingJoinData = { name, roomCode };
    
    socket.emit('join_game', {
        player_name: name,
        room_code: roomCode
    });
}

// Dati del tentativo di join pendente
let pendingJoinData = null;

function startGame() {
    socket.emit('start_game', {
        room_code: gameState.roomCode
    });
}

function submitMeme() {
    const text1 = document.getElementById('text-input-1').value.trim();
    const text2 = document.getElementById('text-input-2').value.trim();
    
    if (!text1 && !text2) {
        showToast('Scrivi almeno un testo!', 'error');
        return;
    }
    
    // Ferma il timer
    stopTimer();
    
    // Combina i due testi per la caption
    const caption = text2 ? `${text1} / ${text2}` : text1;
    
    socket.emit('submit_meme', {
        room_code: gameState.roomCode,
        caption: caption,
        text1: text1,
        text2: text2
    });
    
    // Show waiting state
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) submitBtn.style.display = 'none';
    document.getElementById('text-input-1').disabled = true;
    document.getElementById('text-input-2').disabled = true;
    document.getElementById('waiting-others').style.display = 'flex';
}

// submitVote replaced by submitVoteValue in voting_start handler

function nextRound() {
    socket.emit('next_round', {
        room_code: gameState.roomCode
    });
}

function forceAdvance() {
    socket.emit('force_advance', {
        room_code: gameState.roomCode
    });
    
    // Nascondi il pulsante dopo averlo usato
    hideForceAdvanceButton();
}

function showForceAdvanceButton() {
    // Mostra il pulsante "Forza Avanzamento" solo se sono l'host
    if (!gameState.isHost) return;
    
    let forceBtn = document.getElementById('force-advance-btn');
    if (!forceBtn) {
        // Crea il pulsante se non esiste
        forceBtn = document.createElement('button');
        forceBtn.id = 'force-advance-btn';
        forceBtn.className = 'btn btn-warning force-advance-btn';
        forceBtn.innerHTML = '<span class="btn-icon">⏩</span><span class="btn-text">Salta Disconnessi</span>';
        forceBtn.onclick = forceAdvance;
    }
    forceBtn.style.display = 'flex';
    
    // Aggiungi il pulsante nella fase corrente
    const waitingOthers = document.getElementById('waiting-others');
    const votingWaiting = document.getElementById('voting-waiting');
    
    if (waitingOthers && waitingOthers.style.display !== 'none') {
        if (!waitingOthers.contains(forceBtn)) {
            waitingOthers.appendChild(forceBtn);
        }
    } else if (votingWaiting && votingWaiting.style.display !== 'none') {
        if (!votingWaiting.contains(forceBtn)) {
            votingWaiting.appendChild(forceBtn);
        }
    }
}

function hideForceAdvanceButton() {
    const forceBtn = document.getElementById('force-advance-btn');
    if (forceBtn) {
        forceBtn.style.display = 'none';
    }
}

// ===================================
// Socket Event Handlers
// ===================================

socket.on('connect', () => {
    console.log('Connected to server');
    
    // Check if there's a pending room code to join
    const pendingCode = sessionStorage.getItem('pendingRoomCode');
    if (pendingCode) {
        sessionStorage.removeItem('pendingRoomCode');
        document.getElementById('room-code').value = pendingCode;
        showScreen('join-screen');
        return;
    }
    
    // Try to rejoin a previous session
    const session = getSavedSession();
    if (session.roomCode && session.playerName) {
        showRejoinBanner(session);
    }
});

// Show rejoin banner
function showRejoinBanner(session) {
    // Check if banner already exists
    let banner = document.getElementById('rejoin-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'rejoin-banner';
        banner.className = 'rejoin-banner';
        banner.innerHTML = `
            <div class="rejoin-content">
                <span class="rejoin-text">🎮 Partita in corso trovata: <strong>${session.roomCode}</strong></span>
                <div class="rejoin-buttons">
                    <button class="btn btn-primary rejoin-btn" onclick="attemptRejoin()">Rientra</button>
                    <button class="btn btn-secondary rejoin-dismiss" onclick="dismissRejoinBanner()">✕</button>
                </div>
            </div>
        `;
        document.body.insertBefore(banner, document.body.firstChild);
    }
    banner.style.display = 'flex';
}

// Attempt to rejoin the game
function attemptRejoin() {
    const session = getSavedSession();
    if (session.roomCode && session.playerName) {
        socket.emit('rejoin_game', {
            room_code: session.roomCode,
            player_name: session.playerName,
            old_player_id: session.playerId
        });
        
        // Show loading state
        const banner = document.getElementById('rejoin-banner');
        if (banner) {
            const content = banner.querySelector('.rejoin-content');
            if (content) {
                content.innerHTML = `
                    <span class="rejoin-text">⏳ Riconnessione in corso...</span>
                `;
            }
        }
    }
}

// Dismiss rejoin banner
function dismissRejoinBanner() {
    const banner = document.getElementById('rejoin-banner');
    if (banner) {
        banner.style.display = 'none';
    }
    clearSession();
}

socket.on('error', (data) => {
    // Se la partita è già iniziata e abbiamo dati di join pendenti, tenta il rejoin
    if (data.message === 'Partita già iniziata!' && pendingJoinData) {
        console.log('Partita già iniziata, tento il rejoin...');
        socket.emit('rejoin_game', {
            room_code: pendingJoinData.roomCode,
            player_name: pendingJoinData.name,
            old_player_id: ''
        });
        pendingJoinData = null;
        return;
    }
    
    pendingJoinData = null;
    showToast(data.message, 'error');
});

socket.on('game_created', (data) => {
    gameState.roomCode = data.room_code;
    gameState.playerId = data.player_id;
    gameState.isHost = data.is_host;
    gameState.mode = data.mode;
    gameState.numRounds = data.num_rounds;
    gameState.timerDuration = data.timer_duration || 60;
    
    document.getElementById('display-room-code').textContent = data.room_code;
    document.getElementById('mode-badge').textContent = MODE_LABELS[data.mode];
    document.getElementById('rounds-badge').textContent = `${data.num_rounds} Round`;
    document.getElementById('timer-badge').textContent = `⏱️ ${gameState.timerDuration}s`;
    
    updatePlayersList(data.players);
    showScreen('lobby-screen');
    showToast('Stanza creata!', 'success');
    
    // Salva la sessione per permettere il rejoin (passa il nome dal form)
    const playerName = document.getElementById('create-name').value.trim();
    saveSession(playerName);
    dismissRejoinBanner();
});

socket.on('game_joined', (data) => {
    gameState.roomCode = data.room_code;
    gameState.playerId = data.player_id;
    gameState.isHost = data.is_host;
    gameState.mode = data.mode;
    gameState.numRounds = data.num_rounds;
    gameState.timerDuration = data.timer_duration || 60;
    
    document.getElementById('display-room-code').textContent = data.room_code;
    document.getElementById('mode-badge').textContent = MODE_LABELS[data.mode];
    document.getElementById('rounds-badge').textContent = `${data.num_rounds} Round`;
    document.getElementById('timer-badge').textContent = `⏱️ ${gameState.timerDuration}s`;
    
    updatePlayersList(data.players);
    showScreen('lobby-screen');
    showToast('Ti sei unito alla stanza!', 'success');
    
    // Salva la sessione per permettere il rejoin (passa il nome dal form)
    const playerName = document.getElementById('join-name').value.trim();
    saveSession(playerName);
    dismissRejoinBanner();
});

socket.on('player_joined', (data) => {
    updatePlayersList(data.players);
    showToast(`${data.player_name} si è unito!`, 'info');
});

socket.on('player_left', (data) => {
    updatePlayersList(data.players);
    showToast(`${data.player_name} ha lasciato la partita`, 'info');
});

socket.on('player_disconnected', (data) => {
    updatePlayersList(data.players);
    showToast(`${data.player_name} si è disconnesso`, 'warning');
    
    // Se sono l'host, mostro il pulsante per forzare l'avanzamento
    if (gameState.isHost && data.disconnected_count > 0) {
        showForceAdvanceButton();
    }
});

socket.on('new_host', (data) => {
    gameState.isHost = (data.host_id === gameState.playerId);
    if (gameState.isHost) {
        showToast('Sei diventato l\'host!', 'success');
    }
    updatePlayersList(gameState.players);
});

// Rejoin success - restore game state
socket.on('rejoin_success', (data) => {
    console.log('Rejoin success:', data);
    
    gameState.roomCode = data.room_code;
    gameState.playerId = data.player_id;
    gameState.isHost = data.is_host;
    gameState.mode = data.mode;
    gameState.numRounds = data.num_rounds;
    gameState.timerDuration = data.timer_duration || 60;
    gameState.currentRound = data.current_round;
    
    // Aggiorna la UI della lobby
    document.getElementById('display-room-code').textContent = data.room_code;
    document.getElementById('mode-badge').textContent = MODE_LABELS[data.mode];
    document.getElementById('rounds-badge').textContent = `${data.num_rounds} Round`;
    document.getElementById('timer-badge').textContent = `⏱️ ${gameState.timerDuration}s`;
    
    updatePlayersList(data.players);
    dismissRejoinBanner();
    
    // Ripristina lo stato in base alla fase corrente
    if (data.phase === 'lobby') {
        showScreen('lobby-screen');
    } else if (data.phase === 'creating') {
        restoreCreatingPhase(data);
    } else if (data.phase === 'voting') {
        restoreVotingPhase(data);
    } else if (data.phase === 'results') {
        showScreen('game-screen');
        showGamePhase('results-phase');
    }
    
    // Aggiorna la sessione salvata con il nuovo player_id
    saveSession();
    showToast('Riconnesso alla partita!', 'success');
});

// Rejoin failed
socket.on('rejoin_failed', (data) => {
    console.log('Rejoin failed:', data);
    dismissRejoinBanner();
    
    if (data.reason === 'use_normal_join') {
        // La partita è in lobby, si può unire normalmente
        const session = getSavedSession();
        if (session.roomCode) {
            document.getElementById('room-code').value = session.roomCode;
            if (session.playerName) {
                document.getElementById('join-name').value = session.playerName;
            }
            showScreen('join-screen');
            showToast('La partita è in lobby, unisciti normalmente', 'info');
        }
        // Non cancellare la sessione, potrebbe servire per unirsi
    } else if (data.reason === 'player_not_found') {
        // Il giocatore non era nella partita, mostra messaggio
        showToast('Non sei stato trovato in questa partita. Prova a unirti normalmente.', 'error');
        clearSession();
    } else if (data.reason === 'room_not_found') {
        // La stanza non esiste più
        showToast('La partita non esiste più', 'error');
        clearSession();
    } else {
        showToast(data.message || 'Impossibile riconnettersi', 'error');
        clearSession();
    }
});

// Player reconnected notification
socket.on('player_reconnected', (data) => {
    updatePlayersList(data.players);
    showToast(`${data.player_name} si è riconnesso!`, 'success');
    hideForceAdvanceButton();
});

// Restore creating phase state
function restoreCreatingPhase(data) {
    // Update round indicator
    document.getElementById('round-number').textContent = data.current_round;
    document.getElementById('round-total').textContent = data.total_rounds;
    
    // Set template
    if (data.template) {
        document.getElementById('template-name').textContent = data.template.name || '';
        
        const templateImage = document.getElementById('template-image');
        const imagePlaceholder = document.getElementById('image-placeholder');
        
        if (data.template.image) {
            templateImage.src = `/static/images/memes/${data.template.image}`;
            templateImage.style.display = 'block';
            templateImage.classList.remove('no-image');
            if (imagePlaceholder) imagePlaceholder.style.display = 'none';
        }
    }
    
    // Show topic if in theme mode
    const topicDisplay = document.getElementById('topic-display');
    if (data.theme) {
        topicDisplay.style.display = 'flex';
        document.getElementById('topic-text').textContent = data.theme;
    } else {
        topicDisplay.style.display = 'none';
    }
    
    // Reset inputs
    document.getElementById('text-input-1').value = '';
    document.getElementById('text-input-2').value = '';
    document.getElementById('preview-text-1').textContent = 'Testo 1';
    document.getElementById('preview-text-2').textContent = 'Testo 2';
    
    // Meme changes counter
    memeChangesLeft = data.meme_changes_left || 5;
    updateMemeChangesCounter();
    
    // Check if already submitted
    if (data.has_submitted) {
        document.getElementById('text-input-1').disabled = true;
        document.getElementById('text-input-2').disabled = true;
        const submitBtn = document.querySelector('.submit-btn');
        if (submitBtn) submitBtn.style.display = 'none';
        document.getElementById('waiting-others').style.display = 'flex';
    } else {
        document.getElementById('text-input-1').disabled = false;
        document.getElementById('text-input-2').disabled = false;
        const submitBtn = document.querySelector('.submit-btn');
        if (submitBtn) submitBtn.style.display = 'flex';
        document.getElementById('waiting-others').style.display = 'none';
        
        // Riavvia il timer (approssimativo - il giocatore avrà meno tempo)
        startTimer(30); // Dà 30 secondi al giocatore riconnesso
    }
    
    showScreen('game-screen');
    showGamePhase('creating-phase');
}

// Restore voting phase state
function restoreVotingPhase(data) {
    if (data.current_meme) {
        currentVotingMeme = data.current_meme;
        displayMemeToVote(data.current_meme);
    }
    
    // Check if already voted for current meme
    if (data.has_voted) {
        document.getElementById('vote-buttons').style.display = 'none';
        document.getElementById('voting-waiting').style.display = 'flex';
    }
    
    showScreen('game-screen');
    showGamePhase('voting-phase');
}

socket.on('round_start', (data) => {
    gameState.currentRound = data.round;
    
    // Reset super vote all'inizio di una nuova partita (round 1)
    if (data.round === 1) {
        superVoteUsed = false;
        superVoteForCurrentMeme = false;
    }
    
    // Update round indicator
    document.getElementById('round-number').textContent = data.round;
    document.getElementById('round-total').textContent = data.total_rounds;
    
    // Update progress bar
    const progress = (data.round / data.total_rounds) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
    
    // Set template name
    document.getElementById('template-name').textContent = data.template.name;
    
    // Set template image
    const templateImage = document.getElementById('template-image');
    const imagePlaceholder = document.getElementById('image-placeholder');
    
    if (data.template.image) {
        templateImage.src = `/static/images/memes/${data.template.image}`;
        templateImage.style.display = 'block';
        templateImage.classList.remove('no-image');
        if (imagePlaceholder) imagePlaceholder.style.display = 'none';
    } else {
        templateImage.src = '';
        templateImage.style.display = 'none';
        if (imagePlaceholder) imagePlaceholder.style.display = 'flex';
    }
    
    // Show topic if in theme mode
    const topicDisplay = document.getElementById('topic-display');
    if (data.theme) {
        topicDisplay.style.display = 'flex';
        document.getElementById('topic-text').textContent = data.theme;
    } else {
        topicDisplay.style.display = 'none';
    }
    
    // Reset inputs
    document.getElementById('text-input-1').value = '';
    document.getElementById('text-input-2').value = '';
    document.getElementById('text-input-1').disabled = false;
    document.getElementById('text-input-2').disabled = false;
    document.getElementById('preview-text-1').textContent = 'Testo 1';
    document.getElementById('preview-text-2').textContent = 'Testo 2';
    
    // Reset meme changes counter for new round
    memeChangesLeft = 5;
    updateMemeChangesCounter();
    
    // Show submit button
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) submitBtn.style.display = 'flex';
    document.getElementById('waiting-others').style.display = 'none';
    
    // Show creating phase
    showGamePhase('creating-phase');
    showScreen('game-screen');
    
    // Start timer
    const timerDuration = data.timer_duration || gameState.timerDuration || 60;
    gameState.timerDuration = timerDuration;
    startTimer(timerDuration);
});

socket.on('player_ready', (data) => {
    document.getElementById('ready-count').textContent = `${data.ready_count}/${data.total_players}`;
});

socket.on('new_meme', (data) => {
    // Update template with new meme
    document.getElementById('template-name').textContent = data.template.name;
    
    const templateImage = document.getElementById('template-image');
    const imagePlaceholder = document.getElementById('image-placeholder');
    
    if (data.template.image) {
        templateImage.src = `/static/images/memes/${data.template.image}`;
        templateImage.style.display = 'block';
        templateImage.classList.remove('no-image');
        if (imagePlaceholder) imagePlaceholder.style.display = 'none';
    } else {
        templateImage.src = '';
        templateImage.style.display = 'none';
        if (imagePlaceholder) imagePlaceholder.style.display = 'flex';
    }
    
    // Update counter
    memeChangesLeft = data.changes_left;
    updateMemeChangesCounter();
    
    showToast('Nuovo meme!', 'success');
});

// Current meme being voted
let currentVotingMeme = null;

// Super vote tracking - può essere usato solo UNA volta per partita
let superVoteUsed = false;
let superVoteForCurrentMeme = false; // Se il super vote è stato usato per il meme corrente

socket.on('voting_start', (data) => {
    // Ferma il timer della fase creazione
    stopTimer();
    
    currentVotingMeme = data.current_meme;
    displayMemeToVote(data.current_meme);
    showGamePhase('voting-phase');
});

socket.on('next_meme_to_vote', (data) => {
    currentVotingMeme = data.current_meme;
    displayMemeToVote(data.current_meme);
});

function displayMemeToVote(meme) {
    // Update counter
    document.getElementById('current-meme-index').textContent = meme.index;
    document.getElementById('total-memes').textContent = meme.total;
    
    // Update progress bar
    const progress = (meme.index / meme.total) * 100;
    document.getElementById('voting-progress-bar').style.width = `${progress}%`;
    
    // Update meme display
    document.getElementById('voting-text-1').textContent = meme.text1 || meme.caption || '';
    document.getElementById('voting-text-2').textContent = meme.text2 || '';
    
    // Update image
    const memeImage = document.getElementById('voting-meme-image');
    if (meme.template && meme.template.image) {
        memeImage.src = `/static/images/memes/${meme.template.image}`;
        memeImage.style.display = 'block';
    } else {
        memeImage.src = '';
        memeImage.style.display = 'none';
    }
    
    // Reset super vote for current meme (ma non il flag superVoteUsed)
    superVoteForCurrentMeme = false;
    
    // Update super vote button state
    const superBtn = document.getElementById('super-vote-btn');
    if (superBtn) {
        if (superVoteUsed) {
            superBtn.classList.add('used');
            superBtn.disabled = true;
        } else {
            superBtn.classList.remove('used');
            superBtn.disabled = false;
        }
    }
    
    // Check if this is the player's own meme
    const isOwnMeme = meme.creator_id === gameState.playerId;
    const voteButtons = document.getElementById('vote-buttons');
    const yourMemeBadge = document.getElementById('your-meme-badge');
    
    if (isOwnMeme) {
        // Auto-skip own meme after a delay
        voteButtons.style.display = 'none';
        yourMemeBadge.style.display = 'block';
        
        // Auto submit a "skip" vote after 2 seconds
        setTimeout(() => {
            submitVoteValue(0, true);
        }, 2000);
    } else {
        voteButtons.style.display = 'flex';
        yourMemeBadge.style.display = 'none';
    }
    
    // Hide waiting indicator
    document.getElementById('voting-waiting').style.display = 'none';
}

function useSuperVote() {
    if (superVoteUsed) {
        showToast('Hai già usato il super voto!', 'error');
        return;
    }
    
    // Marca il super vote come usato per questo meme
    superVoteForCurrentMeme = true;
    
    // Aggiorna UI del bottone
    const superBtn = document.getElementById('super-vote-btn');
    if (superBtn) {
        superBtn.classList.add('used');
        superBtn.disabled = true;
    }
    
    showToast('+3 punti bonus attivato!', 'success');
}

function submitVoteValue(value, isSkip = false) {
    socket.emit('submit_vote', {
        room_code: gameState.roomCode,
        vote_value: value,
        super_vote: superVoteForCurrentMeme
    });
    
    // Se abbiamo usato il super vote per questo meme, marcalo come usato definitivamente
    if (superVoteForCurrentMeme) {
        superVoteUsed = true;
    }
    superVoteForCurrentMeme = false;
    
    // Show waiting state
    const voteButtons = document.getElementById('vote-buttons');
    const yourMemeBadge = document.getElementById('your-meme-badge');
    
    voteButtons.style.display = 'none';
    yourMemeBadge.style.display = 'none';
    document.getElementById('voting-waiting').style.display = 'flex';
}

socket.on('player_voted', (data) => {
    document.getElementById('vote-count').textContent = `${data.vote_count}/${data.total_players}`;
});

socket.on('round_results', (data) => {
    if (data.is_final) {
        // Show final results
        showFinalResults(data);
    } else {
        // Show round results
        showRoundResults(data);
    }
});

socket.on('back_to_lobby', (data) => {
    updatePlayersList(data.players);
    showScreen('lobby-screen');
    showToast('Torna alla lobby per una nuova partita!', 'info');
    
    // La sessione rimane valida finché si è in lobby
    saveSession();
});

// ===================================
// Display Results
// ===================================

function showGamePhase(phaseId) {
    document.querySelectorAll('.game-phase').forEach(phase => {
        phase.style.display = 'none';
    });
    document.getElementById(phaseId).style.display = 'flex';
}

function showRoundResults(data) {
    const container = document.getElementById('round-results');
    
    container.innerHTML = data.results.map((result, index) => `
        <div class="result-item" style="animation-delay: ${index * 0.1}s">
            <div class="result-header">
                <span class="result-player">${result.player_name}</span>
                <span class="result-votes">+${result.round_score} punti</span>
            </div>
            <div class="result-meme-preview">
                <div class="result-meme-text-top">${result.text1 || result.caption || ''}</div>
                <div class="result-meme-image-wrapper">
                    ${result.template && result.template.image 
                        ? `<img src="/static/images/memes/${result.template.image}" alt="Meme" class="result-meme-image">`
                        : `<div class="result-meme-placeholder">🖼️</div>`
                    }
                    ${result.text2 ? `<div class="result-meme-text-overlay">${result.text2}</div>` : ''}
                </div>
            </div>
        </div>
    `).join('');
    
    // Update leaderboard
    updateLeaderboard('leaderboard', data.leaderboard);
    
    // Host controls
    const nextBtn = document.getElementById('next-round-btn');
    const waitingMsg = document.getElementById('results-waiting');
    
    if (gameState.isHost) {
        nextBtn.style.display = 'flex';
        waitingMsg.style.display = 'none';
    } else {
        nextBtn.style.display = 'none';
        waitingMsg.style.display = 'block';
    }
    
    document.getElementById('results-title').textContent = '📊 Risultati del Round';
    showGamePhase('results-phase');
}

function showFinalResults(data) {
    const winner = data.winner;
    
    // Set winner info
    document.getElementById('winner-name').textContent = winner.name;
    document.getElementById('winner-score').textContent = `${winner.score} punti`;
    
    // Update final leaderboard
    updateLeaderboard('final-leaderboard', data.leaderboard);
    
    // Host controls
    const playAgainBtn = document.getElementById('play-again-btn');
    const waitingMsg = document.getElementById('final-waiting');
    
    if (gameState.isHost) {
        playAgainBtn.style.display = 'flex';
        waitingMsg.style.display = 'none';
    } else {
        playAgainBtn.style.display = 'none';
        waitingMsg.style.display = 'block';
    }
    
    showGamePhase('final-phase');
}

function updateLeaderboard(elementId, leaderboard) {
    const container = document.getElementById(elementId);
    
    const medals = ['🥇', '🥈', '🥉'];
    
    container.innerHTML = leaderboard.map((player, index) => `
        <div class="leaderboard-item">
            <span class="leaderboard-rank">${medals[index] || (index + 1)}</span>
            <span class="leaderboard-name">${player.name}</span>
            <span class="leaderboard-score">${player.score} pts</span>
        </div>
    `).join('');
}

// ===================================
// Event Listeners
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // Caption input character counter
    const captionInput = document.getElementById('caption-input');
    if (captionInput) {
        captionInput.addEventListener('input', updateCharCount);
    }
    
    // Room code input - auto uppercase
    const roomCodeInput = document.getElementById('room-code');
    if (roomCodeInput) {
        roomCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }
    
    // Enter key handling for inputs
    document.getElementById('create-name')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createGame();
    });
    
    document.getElementById('join-name')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('room-code').focus();
    });
    
    document.getElementById('room-code')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGame();
    });
    
    // Setup image upload
    setupImageUpload();
});


// ===================================
// Image Upload Functions
// ===================================

let selectedFiles = [];

function toggleUploadSection() {
    const panel = document.getElementById('upload-panel');
    const arrow = document.getElementById('toggle-arrow');
    const card = document.querySelector('.upload-section-card');
    
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        arrow.textContent = '▲';
        if (card) card.classList.add('open');
    } else {
        panel.style.display = 'none';
        arrow.textContent = '▼';
        if (card) card.classList.remove('open');
    }
}

function setupImageUpload() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadForm = document.getElementById('upload-form');
    
    if (!dropZone || !fileInput) return;
    
    // Drag and drop events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });
    
    // File input change
    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
    });
    
    // Form submit
    if (uploadForm) {
        uploadForm.addEventListener('submit', uploadImages);
    }
}

function handleFiles(files) {
    selectedFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/')
    );
    
    updateImagePreview();
}

function updateImagePreview() {
    const container = document.getElementById('preview-container');
    const uploadBtn = document.getElementById('upload-btn');
    
    if (!container) return;
    
    if (selectedFiles.length === 0) {
        container.innerHTML = '';
        if (uploadBtn) uploadBtn.style.display = 'none';
        return;
    }
    
    if (uploadBtn) uploadBtn.style.display = 'flex';
    
    container.innerHTML = selectedFiles.map((file, index) => {
        const url = URL.createObjectURL(file);
        return `
            <div class="preview-item">
                <img src="${url}" alt="${file.name}">
                <button type="button" class="preview-remove" onclick="removePreviewFile(${index})">×</button>
                <span class="preview-name">${file.name}</span>
            </div>
        `;
    }).join('');
}

function removePreviewFile(index) {
    selectedFiles.splice(index, 1);
    updateImagePreview();
}

async function uploadImages(e) {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
        showToast('Seleziona almeno un\'immagine!', 'error');
        return;
    }
    
    const formData = new FormData();
    // Leggi il tipo immagine dall'input hidden
    const imageTypeInput = document.querySelector('input[name="image_type"]');
    const imageType = imageTypeInput ? imageTypeInput.value : 'custom';
    
    formData.append('image_type', imageType);
    selectedFiles.forEach(file => {
        formData.append('images', file);
    });
    
    const uploadBtn = document.getElementById('upload-btn');
    const dropZone = document.getElementById('drop-zone');
    
    // Mostra stato di caricamento
    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.classList.add('uploading');
        uploadBtn.innerHTML = '<span class="btn-icon spinning">⏳</span><span class="btn-text">Caricamento in corso...</span>';
    }
    if (dropZone) {
        dropZone.classList.add('uploading');
    }
    
    try {
        const response = await fetch('/api/images/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Mostra animazione di successo
            showUploadSuccess(result.uploaded.length);
            selectedFiles = [];
            updateImagePreview();
            document.getElementById('file-input').value = '';
        } else {
            showToast(result.message || 'Errore durante l\'upload', 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Errore di connessione', 'error');
    } finally {
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.classList.remove('uploading');
            uploadBtn.innerHTML = '<span class="btn-icon">⬆️</span><span class="btn-text">Carica Immagini</span>';
        }
        if (dropZone) {
            dropZone.classList.remove('uploading');
        }
    }
}

// Mostra animazione di successo upload
function showUploadSuccess(count) {
    const container = document.getElementById('preview-container');
    if (container) {
        container.innerHTML = `
            <div class="upload-success-animation">
                <span class="success-icon">✅</span>
                <span class="success-text">${count} ${count === 1 ? 'immagine caricata' : 'immagini caricate'} con successo!</span>
            </div>
        `;
        
        // Nascondi il messaggio dopo 3 secondi
        setTimeout(() => {
            container.innerHTML = '';
            const uploadBtn = document.getElementById('upload-btn');
            if (uploadBtn) uploadBtn.style.display = 'none';
        }, 3000);
    }
    
    showToast(`${count} ${count === 1 ? 'immagine caricata' : 'immagini caricate'}!`, 'success');
}


