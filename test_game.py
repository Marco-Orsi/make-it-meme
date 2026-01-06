#!/usr/bin/env python3
"""
Test rapido per Make it Meme
Questo script testa le funzionalità principali senza interazione utente
"""

import sys
import os

# Aggiungi la directory corrente al path
sys.path.insert(0, os.path.dirname(__file__))

from utils.display import Display
from data.templates_db import TemplatesDB
from utils.game_logic import GameLogic

def test_display():
    """Test del modulo Display"""
    print("\n" + "="*60)
    print("TEST: Modulo Display")
    print("="*60)
    
    display = Display()
    display.show_logo()
    
    print("\n✅ Logo visualizzato correttamente")
    
    # Test colori
    print("\nTest colori:")
    print(display.color("Testo rosso", "red"))
    print(display.color("Testo verde", "green"))
    print(display.color("Testo giallo", "yellow"))
    print(display.color("Testo blu", "blue"))
    print(display.color("Testo magenta", "magenta"))
    print(display.color("Testo cyan", "cyan"))
    print(display.color("Testo bianco grassetto", "white", True))
    
    print("\n✅ Colori funzionanti")
    
    return True

def test_templates():
    """Test del database dei template"""
    print("\n" + "="*60)
    print("TEST: Database Template")
    print("="*60)
    
    db = TemplatesDB()
    templates = db.get_all_templates()
    
    print(f"\n📊 Template totali: {len(templates)}")
    
    # Mostra alcuni template di esempio
    print("\n🎨 Esempi di template:")
    for i, template in enumerate(templates[:5], 1):
        print(f"\n  {i}. {template['name']}")
        print(f"     Categoria: {template.get('category', 'N/A')}")
        print(f"     Descrizione: {template['description'][:60]}...")
    
    # Test template casuale
    random_template = db.get_random_template()
    print(f"\n🎲 Template casuale: {random_template['name']}")
    
    print("\n✅ Database funzionante")
    
    return True

def test_game_structure():
    """Test della struttura del gioco"""
    print("\n" + "="*60)
    print("TEST: Struttura del Gioco")
    print("="*60)
    
    # Verifica file e directory
    required_files = [
        'main.py',
        'README.md',
        'utils/display.py',
        'utils/game_logic.py',
        'data/templates_db.py'
    ]
    
    all_ok = True
    for file in required_files:
        if os.path.exists(file):
            print(f"✅ {file}")
        else:
            print(f"❌ {file} - MANCANTE!")
            all_ok = False
    
    if all_ok:
        print("\n✅ Struttura del progetto completa")
    else:
        print("\n❌ Alcuni file mancano!")
    
    return all_ok

def run_all_tests():
    """Esegue tutti i test"""
    display = Display()
    display.clear()
    display.show_logo()
    
    print("\n" + "="*60)
    print(display.color("  🧪 SUITE DI TEST - MAKE IT MEME", "cyan", True))
    print("="*60)
    
    tests = [
        ("Display", test_display),
        ("Database Template", test_templates),
        ("Struttura Progetto", test_game_structure)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ Errore in {test_name}: {e}")
            results.append((test_name, False))
    
    # Riepilogo
    print("\n" + "="*60)
    print(display.color("  📊 RIEPILOGO TEST", "yellow", True))
    print("="*60)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"\n  {status} - {test_name}")
    
    all_passed = all(result for _, result in results)
    
    if all_passed:
        print("\n" + display.color("🎉 TUTTI I TEST SUPERATI!", "green", True))
        print("\n  Il gioco è pronto per essere giocato!")
        print("\n  Esegui: python3 main.py")
    else:
        print("\n" + display.color("⚠️  ALCUNI TEST FALLITI", "red", True))
        print("\n  Controlla gli errori sopra")
    
    print("\n" + "="*60)

if __name__ == "__main__":
    run_all_tests()
