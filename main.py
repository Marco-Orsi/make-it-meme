#!/usr/bin/env python3
"""
Make it Meme - Terminal Edition
Un gioco multiplayer locale dove i giocatori creano meme divertenti!
"""

import os
import sys
import time
import random
from utils.display import Display
from utils.game_logic import GameLogic
from data.templates_db import TemplatesDB


class MakeItMeme:
    def __init__(self):
        self.display = Display()
        self.templates_db = TemplatesDB()
        self.game_logic = None
        
    def show_welcome(self):
        """Mostra schermata di benvenuto"""
        self.display.clear()
        self.display.show_logo()
        print("\n" + "="*60)
        print("  Benvenuto in MAKE IT MEME - Terminal Edition!")
        print("="*60)
        time.sleep(1)
        
    def main_menu(self):
        """Menu principale del gioco"""
        while True:
            self.display.clear()
            self.display.show_logo()
            print("\n" + "="*60)
            print("  MENU PRINCIPALE")
            print("="*60)
            print("\n  1. 🎮 Gioco Veloce (Modalità Normale)")
            print("  2. 🎯 Modalità Temi")
            print("  3. 🎨 Modalità Stesso Meme")
            print("  4. 😌 Modalità Rilassata")
            print("  5. 📊 Gestisci Template")
            print("  6. ❓ Come Giocare")
            print("  7. 🚪 Esci")
            print("\n" + "="*60)
            
            choice = input("\n  Seleziona un'opzione (1-7): ").strip()
            
            if choice == '1':
                self.start_game('normal')
            elif choice == '2':
                self.start_game('themes')
            elif choice == '3':
                self.start_game('same_meme')
            elif choice == '4':
                self.start_game('relaxed')
            elif choice == '5':
                self.manage_templates()
            elif choice == '6':
                self.show_instructions()
            elif choice == '7':
                self.display.clear()
                print("\n  👋 Grazie per aver giocato! Ci vediamo presto!\n")
                sys.exit(0)
            else:
                print("\n  ❌ Opzione non valida!")
                time.sleep(1)
    
    def start_game(self, mode):
        """Avvia una nuova partita"""
        self.display.clear()
        print("\n" + "="*60)
        print(f"  Avvio modalità: {mode.upper()}")
        print("="*60)
        
        # Richiedi numero di giocatori
        while True:
            try:
                num_players = int(input("\n  Quanti giocatori? (2-8): "))
                if 2 <= num_players <= 8:
                    break
                print("  ❌ Inserisci un numero tra 2 e 8!")
            except ValueError:
                print("  ❌ Inserisci un numero valido!")
        
        # Richiedi nomi giocatori
        players = []
        for i in range(num_players):
            while True:
                name = input(f"\n  Nome Giocatore {i+1}: ").strip()
                if name and len(name) <= 20:
                    players.append(name)
                    break
                print("  ❌ Nome non valido (max 20 caratteri)!")
        
        # Richiedi numero di round
        while True:
            try:
                num_rounds = int(input("\n  Numero di round? (3-10): "))
                if 3 <= num_rounds <= 10:
                    break
                print("  ❌ Inserisci un numero tra 3 e 10!")
            except ValueError:
                print("  ❌ Inserisci un numero valido!")
        
        # Avvia il gioco
        self.game_logic = GameLogic(players, num_rounds, mode, self.templates_db)
        self.game_logic.play()
        
    def manage_templates(self):
        """Gestione dei template"""
        while True:
            self.display.clear()
            print("\n" + "="*60)
            print("  GESTIONE TEMPLATE")
            print("="*60)
            print("\n  1. 📋 Visualizza Template")
            print("  2. ➕ Aggiungi Template")
            print("  3. ➕ Aggiungi Template da Categoria")
            print("  4. 🔙 Torna al Menu")
            print("\n" + "="*60)
            
            choice = input("\n  Seleziona un'opzione (1-4): ").strip()
            
            if choice == '1':
                self.view_templates()
            elif choice == '2':
                self.add_custom_template()
            elif choice == '3':
                self.add_category_template()
            elif choice == '4':
                break
            else:
                print("\n  ❌ Opzione non valida!")
                time.sleep(1)
    
    def view_templates(self):
        """Visualizza tutti i template disponibili"""
        self.display.clear()
        templates = self.templates_db.get_all_templates()
        
        print("\n" + "="*60)
        print(f"  TEMPLATE DISPONIBILI ({len(templates)} totali)")
        print("="*60)
        
        for i, template in enumerate(templates, 1):
            category = template.get('category', 'Generale')
            print(f"\n  {i}. {template['name']}")
            print(f"     Categoria: {category}")
            print(f"     Descrizione: {template['description']}")
        
        input("\n  Premi INVIO per continuare...")
    
    def add_custom_template(self):
        """Aggiungi un template personalizzato"""
        self.display.clear()
        print("\n" + "="*60)
        print("  AGGIUNGI TEMPLATE PERSONALIZZATO")
        print("="*60)
        
        name = input("\n  Nome del template: ").strip()
        if not name:
            print("  ❌ Nome non valido!")
            time.sleep(1)
            return
        
        description = input("  Descrizione: ").strip()
        if not description:
            print("  ❌ Descrizione non valida!")
            time.sleep(1)
            return
        
        category = input("  Categoria (Generale/Reazioni/Animali/etc.): ").strip() or "Generale"
        
        self.templates_db.add_template(name, description, category)
        print("\n  ✅ Template aggiunto con successo!")
        time.sleep(1)
    
    def add_category_template(self):
        """Aggiungi template da una categoria predefinita"""
        self.display.clear()
        print("\n" + "="*60)
        print("  AGGIUNGI TEMPLATE DA CATEGORIA")
        print("="*60)
        print("\n  Categorie disponibili:")
        print("  1. Reazioni")
        print("  2. Animali")
        print("  3. Film e TV")
        print("  4. Internet Culture")
        print("  5. Situazioni Quotidiane")
        
        choice = input("\n  Seleziona categoria (1-5): ").strip()
        
        categories = {
            '1': 'Reazioni',
            '2': 'Animali',
            '3': 'Film e TV',
            '4': 'Internet Culture',
            '5': 'Situazioni Quotidiane'
        }
        
        if choice in categories:
            self.templates_db.add_random_templates_by_category(categories[choice], 3)
            print(f"\n  ✅ Aggiunti 3 template dalla categoria '{categories[choice]}'!")
        else:
            print("\n  ❌ Categoria non valida!")
        
        time.sleep(1)
    
    def show_instructions(self):
        """Mostra le istruzioni del gioco"""
        self.display.clear()
        print("\n" + "="*60)
        print("  COME GIOCARE A MAKE IT MEME")
        print("="*60)
        
        instructions = """
  📜 REGOLE DEL GIOCO:
  
  1. Ogni round, tutti i giocatori ricevono un template di meme
  2. I giocatori devono scrivere la didascalia più divertente possibile
  3. Dopo che tutti hanno scritto, inizia la fase di votazione
  4. Ogni giocatore vota il meme più divertente (non il proprio!)
  5. I punti vengono assegnati in base ai voti ricevuti
  6. Chi ha più punti alla fine vince!
  
  🎮 MODALITÀ DI GIOCO:
  
  • NORMALE: Template casuali ogni round
  • TEMI: Ogni round ha un tema specifico
  • STESSO MEME: Tutti ricevono lo stesso template
  • RILASSATA: Nessun punteggio, solo per divertimento
  
  💡 CONSIGLI:
  
  • Sii creativo e originale!
  • Usa riferimenti alla cultura pop
  • Il timing è tutto - pensa veloce!
  • Divertiti e non prenderti troppo sul serio!
        """
        
        print(instructions)
        print("="*60)
        input("\n  Premi INVIO per tornare al menu...")
    
    def run(self):
        """Avvia il gioco"""
        self.show_welcome()
        self.main_menu()


if __name__ == "__main__":
    try:
        game = MakeItMeme()
        game.run()
    except KeyboardInterrupt:
        print("\n\n  👋 Gioco interrotto. Arrivederci!\n")
        sys.exit(0)
