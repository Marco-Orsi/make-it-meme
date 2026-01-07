#!/usr/bin/env python3
"""
Make it Meme - Web Edition
Un gioco multiplayer web dove i giocatori creano meme divertenti!
"""

import os
import random
import string
import json
import uuid
from datetime import datetime
from flask import Flask, render_template, session, request, redirect, url_for, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.utils import secure_filename
from data.templates_db import TemplatesDB

# Configurazione upload
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

app = Flask(__name__, template_folder='web/templates', static_folder='web/static')
app.secret_key = 'makeitmeme_secret_key_2024'
socketio = SocketIO(app, cors_allowed_origins="*")

# Database dei template
templates_db = TemplatesDB()

# Gestione delle partite attive
games = {}

# Temi disponibili per la modalità temi
THEMES = [
    "Lavoro e Ufficio 💼",
    "Relazioni e Amore 💕",
    "Tecnologia 💻",
    "Cibo 🍕",
    "Sport ⚽",
    "Scuola e Studio 📚",
    "Weekend e Festa 🎉",
    "Famiglia 👨‍👩‍👧‍👦",
    "Animali 🐱",
    "Viaggi ✈️"
]


def generate_room_code():
    """Genera un codice stanza univoco di 4 caratteri"""
    while True:
        code = ''.join(random.choices(string.ascii_uppercase, k=4))
        if code not in games:
            return code


class Game:
    """Classe che rappresenta una partita"""
    
    def __init__(self, room_code, host_id, host_name, mode='normal', num_rounds=5, image_type='custom', timer_duration=60):
        self.room_code = room_code
        self.host_id = host_id
        self.mode = mode
        self.num_rounds = num_rounds
        self.image_type = image_type  # 'classic' o 'custom'
        self.timer_duration = timer_duration  # 60 o 90 secondi
        self.current_round = 0
        self.phase = 'lobby'  # lobby, creating, voting, results, final
        self.players = {host_id: {'name': host_name, 'score': 0, 'ready': False}}
        self.player_order = [host_id]
        self.memes = {}  # {player_id: {caption, text1, text2}}
        self.votes = {}  # {meme_creator_id: {voter_id: vote_value}}
        self.round_scores = {}  # {player_id: total_score}
        self.meme_order = []  # Ordine dei meme da votare
        self.current_meme_index = 0  # Indice del meme corrente in votazione
        self.votes_for_current = {}  # {voter_id: True} - chi ha votato il meme corrente
        self.templates = {}  # {player_id: template}
        self.current_theme = None
        self.meme_changes = {}  # {player_id: changes_left}
        
    def add_player(self, player_id, player_name):
        """Aggiunge un giocatore alla partita"""
        if len(self.players) >= 8:
            return False
        self.players[player_id] = {'name': player_name, 'score': 0, 'ready': False}
        self.player_order.append(player_id)
        return True
    
    def remove_player(self, player_id):
        """Rimuove un giocatore dalla partita"""
        if player_id in self.players:
            del self.players[player_id]
            self.player_order.remove(player_id)
    
    def start_round(self):
        """Inizia un nuovo round"""
        self.current_round += 1
        self.phase = 'creating'
        self.memes = {}
        self.votes = {}
        self.round_votes = {pid: 0 for pid in self.players}
        
        # Resetta lo stato ready e i cambi meme
        for pid in self.players:
            self.players[pid]['ready'] = False
            self.meme_changes[pid] = 5  # 5 cambi disponibili per round
        
        # Scegli i template in base alla modalità e al tipo di immagine
        if self.mode == 'same_meme':
            template = templates_db.get_random_template(self.image_type)
            self.templates = {pid: template for pid in self.players}
        else:
            self.templates = {pid: templates_db.get_random_template(self.image_type) for pid in self.players}
        
        # Scegli un tema se in modalità temi
        if self.mode == 'themes':
            self.current_theme = random.choice(THEMES)
        else:
            self.current_theme = None
    
    def submit_meme(self, player_id, caption, text1='', text2=''):
        """Sottometti un meme"""
        self.memes[player_id] = {
            'caption': caption,
            'text1': text1,
            'text2': text2
        }
        self.players[player_id]['ready'] = True
        
        # Controlla se tutti hanno sottomesso
        return len(self.memes) == len(self.players)
    
    def start_voting(self):
        """Inizia la fase di votazione"""
        self.phase = 'voting'
        for pid in self.players:
            self.players[pid]['ready'] = False
        
        # Crea ordine casuale dei meme e inizializza
        self.meme_order = list(self.memes.keys())
        random.shuffle(self.meme_order)
        self.current_meme_index = 0
        self.votes_for_current = {}
        self.votes = {pid: {} for pid in self.meme_order}
        self.round_scores = {pid: 0 for pid in self.players}
    
    def get_current_meme(self):
        """Ottiene il meme corrente da votare"""
        if self.current_meme_index >= len(self.meme_order):
            return None
        
        creator_id = self.meme_order[self.current_meme_index]
        meme_data = self.memes[creator_id]
        template = self.templates.get(creator_id, {})
        
        return {
            'creator_id': creator_id,
            'creator_name': self.players[creator_id]['name'],
            'text1': meme_data.get('text1', ''),
            'text2': meme_data.get('text2', ''),
            'caption': meme_data.get('caption', ''),
            'template': template,
            'index': self.current_meme_index + 1,
            'total': len(self.meme_order)
        }
    
    def submit_vote_for_meme(self, voter_id, vote_value):
        """Sottometti un voto per il meme corrente"""
        if self.current_meme_index >= len(self.meme_order):
            return False, False
        
        creator_id = self.meme_order[self.current_meme_index]
        
        # Non puoi votare il tuo meme (ma devi comunque "passare")
        if voter_id != creator_id:
            self.votes[creator_id][voter_id] = vote_value
            # Aggiorna punteggio
            if vote_value > 0:
                self.round_scores[creator_id] += 2  # +2 per like
            elif vote_value == 0:
                self.round_scores[creator_id] += 1  # +1 per meh
            # -1 non dà punti
        
        self.votes_for_current[voter_id] = True
        
        # Controlla se tutti hanno votato
        all_voted = len(self.votes_for_current) == len(self.players)
        
        return True, all_voted
    
    def next_meme(self):
        """Passa al prossimo meme"""
        self.current_meme_index += 1
        self.votes_for_current = {}
        
        # Controlla se abbiamo finito tutti i meme
        return self.current_meme_index >= len(self.meme_order)
    
    def submit_vote(self, voter_id, voted_id):
        """Sottometti un voto"""
        if voter_id == voted_id:
            return False, False
        
        self.votes[voter_id] = voted_id
        self.round_votes[voted_id] = self.round_votes.get(voted_id, 0) + 1
        self.players[voter_id]['ready'] = True
        
        # Controlla se tutti hanno votato
        all_voted = len(self.votes) == len(self.players)
        return True, all_voted
    
    def calculate_scores(self):
        """Calcola i punteggi del round"""
        for player_id, vote_count in self.round_votes.items():
            self.players[player_id]['score'] += vote_count
    
    def show_results(self):
        """Mostra i risultati del round"""
        self.phase = 'results'
        self.calculate_scores()
    
    def get_sorted_results(self):
        """Ottiene i risultati ordinati per punteggio"""
        return sorted(
            [(pid, p['name'], p['score']) for pid, p in self.players.items()],
            key=lambda x: x[2],
            reverse=True
        )
    
    def is_game_over(self):
        """Controlla se il gioco è finito"""
        return self.current_round >= self.num_rounds
    
    def get_winner(self):
        """Ottiene il vincitore"""
        results = self.get_sorted_results()
        return results[0] if results else None


@app.route('/')
def index():
    """Pagina principale"""
    return render_template('index.html')


@app.route('/game/<room_code>')
def game_room(room_code):
    """Pagina della partita"""
    if room_code not in games:
        return render_template('index.html', error="Stanza non trovata!")
    return render_template('game.html', room_code=room_code)


# ===================================
# Image Upload Routes
# ===================================

def allowed_file(filename):
    """Verifica se l'estensione del file è consentita"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/api/images/upload', methods=['POST'])
def upload_images():
    """Carica una o più immagini"""
    if 'images' not in request.files:
        return jsonify({'success': False, 'message': 'Nessun file selezionato'}), 400
    
    files = request.files.getlist('images')
    image_type = request.form.get('image_type', 'custom')
    
    # Determina la cartella di destinazione
    if image_type == 'classic':
        upload_folder = templates_db.CLASSIC_PATH
    else:
        upload_folder = templates_db.CUSTOM_PATH
    
    # Crea la cartella se non esiste
    os.makedirs(upload_folder, exist_ok=True)
    
    uploaded = []
    errors = []
    
    for file in files:
        if file.filename == '':
            continue
        
        if not allowed_file(file.filename):
            errors.append(f'{file.filename}: formato non supportato')
            continue
        
        # Genera un nome file sicuro
        filename = secure_filename(file.filename)
        
        # Se il file esiste già, aggiungi un suffisso
        base, ext = os.path.splitext(filename)
        counter = 1
        while os.path.exists(os.path.join(upload_folder, filename)):
            filename = f"{base}_{counter}{ext}"
            counter += 1
        
        filepath = os.path.join(upload_folder, filename)
        
        try:
            file.save(filepath)
            uploaded.append({
                'name': filename,
                'type': image_type,
                'url': f'/static/images/memes/{image_type}/{filename}'
            })
        except Exception as e:
            errors.append(f'{file.filename}: errore durante il salvataggio')
    
    return jsonify({
        'success': len(uploaded) > 0,
        'uploaded': uploaded,
        'errors': errors,
        'message': f'{len(uploaded)} immagini caricate' + (f', {len(errors)} errori' if errors else '')
    })


# ===================================
# Suggestions Routes
# ===================================

SUGGESTIONS_FILE = os.path.join(os.path.dirname(__file__), 'data', 'suggestions.json')


def load_suggestions():
    """Carica i suggerimenti dal file JSON"""
    try:
        with open(SUGGESTIONS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def save_suggestions(suggestions):
    """Salva i suggerimenti nel file JSON"""
    with open(SUGGESTIONS_FILE, 'w', encoding='utf-8') as f:
        json.dump(suggestions, f, ensure_ascii=False, indent=2)


@app.route('/suggestions')
def suggestions_page():
    """Pagina dei suggerimenti"""
    suggestions = load_suggestions()
    # Ordina per voti (più votati prima)
    suggestions.sort(key=lambda x: x.get('votes', 0), reverse=True)
    total_votes = sum(s.get('votes', 0) for s in suggestions)
    return render_template('suggestions.html', suggestions=suggestions, total_votes=total_votes)


@app.route('/suggestions/submit', methods=['POST'])
def submit_suggestion():
    """Invia un nuovo suggerimento"""
    author = request.form.get('author', 'Anonimo').strip()
    category = request.form.get('category', 'other')
    content = request.form.get('content', '').strip()
    
    if not content:
        return redirect(url_for('suggestions_page'))
    
    suggestions = load_suggestions()
    
    new_suggestion = {
        'id': str(uuid.uuid4())[:8],
        'author': author[:30] if author else 'Anonimo',
        'category': category,
        'content': content[:500],
        'votes': 0,
        'date': datetime.now().strftime('%d/%m/%Y %H:%M')
    }
    
    suggestions.insert(0, new_suggestion)  # Aggiungi in cima
    save_suggestions(suggestions)
    
    return redirect(url_for('suggestions_page'))


@app.route('/suggestions/vote/<suggestion_id>', methods=['POST'])
def vote_suggestion(suggestion_id):
    """Vota un suggerimento"""
    suggestions = load_suggestions()
    
    for suggestion in suggestions:
        if suggestion.get('id') == suggestion_id:
            suggestion['votes'] = suggestion.get('votes', 0) + 1
            save_suggestions(suggestions)
            return jsonify({'success': True, 'votes': suggestion['votes']})
    
    return jsonify({'success': False}), 404


# Socket.IO Events

@socketio.on('connect')
def on_connect():
    """Gestisce la connessione di un client"""
    print(f"Client connesso: {request.sid}")


@socketio.on('disconnect')
def on_disconnect():
    """Gestisce la disconnessione di un client"""
    sid = request.sid
    print(f"Client disconnesso: {sid}")
    
    # Rimuovi il giocatore da tutte le partite
    for room_code, game in list(games.items()):
        if sid in game.players:
            player_name = game.players[sid]['name']
            game.remove_player(sid)
            leave_room(room_code)
            
            # Notifica gli altri giocatori
            emit('player_left', {
                'player_id': sid,
                'player_name': player_name,
                'players': get_players_info(game)
            }, room=room_code)
            
            # Se non ci sono più giocatori, elimina la partita
            if len(game.players) == 0:
                del games[room_code]
            # Se l'host se ne va, assegna un nuovo host
            elif sid == game.host_id and game.player_order:
                game.host_id = game.player_order[0]
                emit('new_host', {'host_id': game.host_id}, room=room_code)


@socketio.on('create_game')
def on_create_game(data):
    """Crea una nuova partita"""
    player_name = data.get('player_name', 'Giocatore')
    mode = data.get('mode', 'normal')
    image_type = data.get('image_type', 'custom')
    num_rounds = data.get('num_rounds', 5)
    timer_duration = data.get('timer_duration', 60)
    
    # Valida timer (solo 60 o 90 secondi)
    if timer_duration not in [60, 90]:
        timer_duration = 60
    
    room_code = generate_room_code()
    game = Game(room_code, request.sid, player_name, mode, num_rounds, image_type, timer_duration)
    games[room_code] = game
    
    join_room(room_code)
    
    emit('game_created', {
        'room_code': room_code,
        'player_id': request.sid,
        'is_host': True,
        'mode': mode,
        'image_type': image_type,
        'num_rounds': num_rounds,
        'timer_duration': timer_duration,
        'players': get_players_info(game)
    })


@socketio.on('join_game')
def on_join_game(data):
    """Unisciti a una partita esistente"""
    room_code = data.get('room_code', '').upper()
    player_name = data.get('player_name', 'Giocatore')
    
    if room_code not in games:
        emit('error', {'message': 'Stanza non trovata!'})
        return
    
    game = games[room_code]
    
    if game.phase != 'lobby':
        emit('error', {'message': 'Partita già iniziata!'})
        return
    
    if len(game.players) >= 8:
        emit('error', {'message': 'Stanza piena!'})
        return
    
    if not game.add_player(request.sid, player_name):
        emit('error', {'message': 'Impossibile unirsi alla partita!'})
        return
    
    join_room(room_code)
    
    # Notifica il nuovo giocatore
    emit('game_joined', {
        'room_code': room_code,
        'player_id': request.sid,
        'is_host': False,
        'mode': game.mode,
        'image_type': game.image_type,
        'num_rounds': game.num_rounds,
        'timer_duration': game.timer_duration,
        'players': get_players_info(game)
    })
    
    # Notifica gli altri giocatori
    emit('player_joined', {
        'player_id': request.sid,
        'player_name': player_name,
        'players': get_players_info(game)
    }, room=room_code, include_self=False)


@socketio.on('start_game')
def on_start_game(data):
    """Inizia la partita"""
    room_code = data.get('room_code')
    
    if room_code not in games:
        emit('error', {'message': 'Stanza non trovata!'})
        return
    
    game = games[room_code]
    
    if request.sid != game.host_id:
        emit('error', {'message': 'Solo l\'host può avviare la partita!'})
        return
    
    if len(game.players) < 2:
        emit('error', {'message': 'Servono almeno 2 giocatori!'})
        return
    
    # Inizia il primo round
    game.start_round()
    
    # Invia i template a ogni giocatore
    for pid in game.players:
        emit('round_start', {
            'round': game.current_round,
            'total_rounds': game.num_rounds,
            'template': game.templates[pid],
            'theme': game.current_theme,
            'mode': game.mode,
            'timer_duration': game.timer_duration
        }, room=pid)


@socketio.on('request_new_meme')
def on_request_new_meme(data):
    """Richiede un nuovo meme (cambio template)"""
    room_code = data.get('room_code')
    
    if room_code not in games:
        emit('error', {'message': 'Stanza non trovata!'})
        return
    
    game = games[room_code]
    player_id = request.sid
    
    # Controlla se il giocatore ha cambi disponibili
    changes_left = game.meme_changes.get(player_id, 0)
    if changes_left <= 0:
        emit('error', {'message': 'Hai esaurito i cambi meme!'})
        return
    
    # Decrementa il contatore
    game.meme_changes[player_id] = changes_left - 1
    
    # Genera un nuovo template
    new_template = templates_db.get_random_template(game.image_type)
    game.templates[player_id] = new_template
    
    # Invia il nuovo template al giocatore
    emit('new_meme', {
        'template': new_template,
        'changes_left': game.meme_changes[player_id]
    })


@socketio.on('submit_meme')
def on_submit_meme(data):
    """Sottometti un meme"""
    room_code = data.get('room_code')
    caption = data.get('caption', '').strip()
    text1 = data.get('text1', '').strip()
    text2 = data.get('text2', '').strip()
    
    if room_code not in games:
        emit('error', {'message': 'Stanza non trovata!'})
        return
    
    if not text1 and not text2:
        emit('error', {'message': 'Scrivi almeno un testo!'})
        return
    
    game = games[room_code]
    all_submitted = game.submit_meme(request.sid, caption, text1, text2)
    
    # Notifica che il giocatore ha finito
    emit('player_ready', {
        'player_id': request.sid,
        'ready_count': len(game.memes),
        'total_players': len(game.players)
    }, room=room_code)
    
    # Se tutti hanno sottomesso, inizia la votazione
    if all_submitted:
        game.start_voting()
        
        # Invia il primo meme a tutti
        current_meme = game.get_current_meme()
        
        emit('voting_start', {
            'current_meme': current_meme
        }, room=room_code)


@socketio.on('submit_vote')
def on_submit_vote(data):
    """Sottometti un voto per il meme corrente"""
    room_code = data.get('room_code')
    vote_value = data.get('vote_value', 0)  # 1 = like, 0 = meh, -1 = dislike
    
    if room_code not in games:
        emit('error', {'message': 'Stanza non trovata!'})
        return
    
    game = games[room_code]
    valid, all_voted = game.submit_vote_for_meme(request.sid, vote_value)
    
    if not valid:
        emit('error', {'message': 'Errore nel voto!'})
        return
    
    # Notifica che il giocatore ha votato
    emit('player_voted', {
        'player_id': request.sid,
        'vote_count': len(game.votes_for_current),
        'total_players': len(game.players)
    }, room=room_code)
    
    # Se tutti hanno votato per questo meme, passa al prossimo
    if all_voted:
        voting_complete = game.next_meme()
        
        if voting_complete:
            # Tutti i meme sono stati votati, mostra i risultati
            game.show_results()
            
            # Aggiorna punteggi globali
            for pid, score in game.round_scores.items():
                game.players[pid]['score'] += score
            
            # Prepara i risultati del round
            round_results = []
            for pid in game.players:
                meme_data = game.memes.get(pid, {})
                round_results.append({
                    'player_id': pid,
                    'player_name': game.players[pid]['name'],
                    'text1': meme_data.get('text1', ''),
                    'text2': meme_data.get('text2', ''),
                    'caption': meme_data.get('caption', ''),
                    'template': game.templates.get(pid, {}),
                    'round_score': game.round_scores.get(pid, 0),
                    'total_score': game.players[pid]['score']
                })
            
            # Ordina per punteggio del round
            round_results.sort(key=lambda x: x['round_score'], reverse=True)
            
            is_final = game.is_game_over()
            winner = game.get_winner() if is_final else None
            
            emit('round_results', {
                'results': round_results,
                'is_final': is_final,
                'winner': {'player_id': winner[0], 'name': winner[1], 'score': winner[2]} if winner else None,
                'leaderboard': [{'player_id': pid, 'name': name, 'score': score} 
                              for pid, name, score in game.get_sorted_results()]
            }, room=room_code)
        else:
            # Invia il prossimo meme a tutti
            current_meme = game.get_current_meme()
            emit('next_meme_to_vote', {
                'current_meme': current_meme
            }, room=room_code)


@socketio.on('next_round')
def on_next_round(data):
    """Passa al prossimo round"""
    room_code = data.get('room_code')
    
    if room_code not in games:
        emit('error', {'message': 'Stanza non trovata!'})
        return
    
    game = games[room_code]
    
    if request.sid != game.host_id:
        emit('error', {'message': 'Solo l\'host può continuare!'})
        return
    
    if game.is_game_over():
        # Torna alla lobby
        game.phase = 'lobby'
        game.current_round = 0
        for pid in game.players:
            game.players[pid]['score'] = 0
            game.players[pid]['ready'] = False
        
        emit('back_to_lobby', {
            'players': get_players_info(game)
        }, room=room_code)
    else:
        # Prossimo round
        game.start_round()
        
        for pid in game.players:
            emit('round_start', {
                'round': game.current_round,
                'total_rounds': game.num_rounds,
                'template': game.templates[pid],
                'theme': game.current_theme,
                'mode': game.mode,
                'timer_duration': game.timer_duration
            }, room=pid)


def get_players_info(game):
    """Ottiene le informazioni sui giocatori"""
    return [
        {
            'player_id': pid,
            'name': game.players[pid]['name'],
            'score': game.players[pid]['score'],
            'is_host': pid == game.host_id
        }
        for pid in game.player_order if pid in game.players
    ]


if __name__ == '__main__':
    # Crea le cartelle per i template web se non esistono
    os.makedirs('web/templates', exist_ok=True)
    os.makedirs('web/static/css', exist_ok=True)
    os.makedirs('web/static/js', exist_ok=True)
    
    print("\n🎮 Make it Meme - Web Edition")
    print("=" * 40)
    print("Avvia il browser su: http://localhost:5001")
    print("=" * 40 + "\n")
    
    socketio.run(app, host='0.0.0.0', port=5001, debug=True)

