"""
Modulo Game Logic - Gestisce la logica del gioco
"""

import random
import time
from .display import Display


class GameLogic:
    """Classe che gestisce la logica del gioco"""
    
    def __init__(self, players, num_rounds, mode, templates_db):
        self.players = players
        self.num_rounds = num_rounds
        self.mode = mode
        self.templates_db = templates_db
        self.display = Display()
        self.scores = {player: 0 for player in players}
        self.current_round = 0
        
        # Temi per la modalità temi
        self.themes = [
            "Lavoro e Ufficio",
            "Relazioni e Amore",
            "Tecnologia",
            "Cibo",
            "Sport",
            "Scuola e Studio",
            "Weekend e Festa",
            "Famiglia",
            "Animali",
            "Viaggi"
        ]
    
    def play(self):
        """Avvia il gioco"""
        print(f"\n  🎮 Iniziamo! {len(self.players)} giocatori, {self.num_rounds} round!")
        print(f"  📋 Modalità: {self.mode.upper()}")
        time.sleep(2)
        
        for round_num in range(1, self.num_rounds + 1):
            self.current_round = round_num
            self.play_round()
            
            if round_num < self.num_rounds:
                input("\n  Premi INVIO per il prossimo round...")
        
        self.show_final_results()
    
    def play_round(self):
        """Gioca un singolo round"""
        self.display.clear()
        self.display.show_round_header(self.current_round, self.num_rounds)
        
        # Scegli template(s) in base alla modalità
        if self.mode == 'same_meme':
            # Tutti ricevono lo stesso template
            template = self.templates_db.get_random_template()
            templates = {player: template for player in self.players}
        elif self.mode == 'themes':
            # Scegli un tema casuale
            theme = random.choice(self.themes)
            self.display.show_theme(theme)
            time.sleep(1)
            templates = {player: self.templates_db.get_random_template() for player in self.players}
        else:
            # Normal o Relaxed - template casuali
            templates = {player: self.templates_db.get_random_template() for player in self.players}
        
        # Fase 1: Creazione dei meme
        memes = {}
        for player in self.players:
            self.display.clear()
            self.display.show_round_header(self.current_round, self.num_rounds)
            
            if self.mode == 'themes':
                self.display.show_theme(theme)
            
            print(f"\n  {self.display.color(f'Turno di: {player}', 'cyan', True)}")
            self.display.show_template(templates[player])
            
            caption = input(f"\n  💬 {player}, scrivi la tua didascalia: ").strip()
            
            while not caption:
                print("  ❌ La didascalia non può essere vuota!")
                caption = input(f"\n  💬 {player}, scrivi la tua didascalia: ").strip()
            
            memes[player] = caption
            print(f"\n  ✅ Meme creato con successo!")
            time.sleep(1)
        
        # Fase 2: Votazione (solo se non è modalità rilassata)
        if self.mode != 'relaxed':
            round_votes = {player: 0 for player in self.players}
            
            for voter in self.players:
                self.display.clear()
                self.display.show_round_header(self.current_round, self.num_rounds)
                
                # Crea lista di meme da votare (escludendo il proprio)
                votable_memes = [(p, memes[p]) for p in self.players if p != voter]
                
                # Mostra i meme
                self.display.show_voting_options(votable_memes, voter)
                
                # Richiedi voto
                while True:
                    try:
                        vote_idx = int(input(f"\n  {voter}, quale meme voti? (1-{len(votable_memes)}): "))
                        if 1 <= vote_idx <= len(votable_memes):
                            # Trova l'indice reale del giocatore votato
                            actual_idx = 0
                            count = 0
                            for i, p in enumerate(self.players):
                                if p != voter:
                                    count += 1
                                    if count == vote_idx:
                                        actual_idx = i
                                        break
                            
                            voted_player = self.players[actual_idx]
                            round_votes[voted_player] += 1
                            print(f"\n  ✅ Voto registrato per {voted_player}!")
                            time.sleep(1)
                            break
                        else:
                            print(f"  ❌ Inserisci un numero tra 1 e {len(votable_memes)}!")
                    except ValueError:
                        print("  ❌ Inserisci un numero valido!")
            
            # Assegna i punti
            for player, votes in round_votes.items():
                self.scores[player] += votes
            
            # Mostra risultati del round
            self.show_round_results(memes, round_votes)
        else:
            # In modalità rilassata, mostra solo i meme
            self.show_relaxed_results(memes)
    
    def show_round_results(self, memes, votes):
        """Mostra i risultati del round"""
        self.display.clear()
        print("\n" + "="*60)
        print(self.display.color("  📊 RISULTATI DEL ROUND", 'yellow', True))
        print("="*60)
        
        # Ordina per voti ricevuti
        sorted_results = sorted(votes.items(), key=lambda x: x[1], reverse=True)
        
        print("\n  " + self.display.color("Meme e voti ricevuti:", 'cyan', True))
        for player, vote_count in sorted_results:
            print(f"\n  {self.display.color('●', 'yellow')} {self.display.color(player, 'cyan', True)} - {vote_count} voti")
            print(f"    {self.display.color('❝', 'white')}{memes[player]}{self.display.color('❞', 'white')}")
        
        # Mostra classifica generale
        self.display.show_scoreboard(self.scores)
        
    def show_relaxed_results(self, memes):
        """Mostra i risultati in modalità rilassata"""
        self.display.clear()
        print("\n" + "="*60)
        print(self.display.color("  😌 TUTTI I MEME CREATI", 'cyan', True))
        print("="*60)
        
        for player, caption in memes.items():
            print(f"\n  {self.display.color('●', 'yellow')} {self.display.color(player, 'cyan', True)}")
            print(f"    {self.display.color('❝', 'white')}{caption}{self.display.color('❞', 'white')}")
        
        print("\n" + "="*60)
        print("  💫 Modalità rilassata - nessun punteggio!")
    
    def show_final_results(self):
        """Mostra i risultati finali"""
        if self.mode == 'relaxed':
            self.display.clear()
            print("\n" + "="*60)
            print(self.display.color("  🎉 PARTITA TERMINATA!", 'green', True))
            print("="*60)
            print("\n  Grazie per aver giocato in modalità rilassata!")
            print("  Spero vi siate divertiti! 😊")
            print("\n" + "="*60)
        else:
            # Trova il vincitore
            winner = max(self.scores.items(), key=lambda x: x[1])
            
            self.display.show_winner(winner[0], winner[1])
            self.display.show_scoreboard(self.scores)
        
        input("\n  Premi INVIO per tornare al menu principale...")
