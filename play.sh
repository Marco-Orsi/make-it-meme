#!/bin/bash

# Script di avvio per Make it Meme - Terminal Edition

echo "🎮 Avvio Make it Meme..."
echo ""

# Controlla se Python è installato
if ! command -v python3 &> /dev/null
then
    echo "❌ Python 3 non è installato!"
    echo "Installa Python 3 e riprova."
    exit 1
fi

# Esegui il gioco
cd "$(dirname "$0")"
python3 main.py
