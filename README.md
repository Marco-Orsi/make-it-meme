# Make it Meme - Terminal Edition 🎮

Un gioco multiplayer locale dove i giocatori creano meme divertenti e votano i loro preferiti!

## 📋 Caratteristiche

- **4 Modalità di Gioco**:
  - 🎮 **Normale**: Template casuali ogni round
  - 🎯 **Temi**: Ogni round ha un tema specifico
  - 🎨 **Stesso Meme**: Tutti ricevono lo stesso template
  - 😌 **Rilassata**: Nessun punteggio, solo divertimento

- **Sistema di Votazione**: I giocatori votano i meme più divertenti
- **Classifica in Tempo Reale**: Vedi chi è in testa durante la partita
- **Template Personalizzabili**: Aggiungi i tuoi template preferiti
- **Interfaccia Colorata**: Esperienza visiva piacevole nel terminale
- **2-8 Giocatori**: Perfetto per piccoli e grandi gruppi

## 🚀 Installazione

### Requisiti
- Python 3.6 o superiore
- Sistema operativo: Linux, macOS, o Windows

### Installazione

1. Scarica o clona il progetto
2. Naviga nella cartella del gioco:
```bash
cd makeitmeme_game
```

3. Il gioco è pronto! Nessuna dipendenza esterna richiesta.

## 🎮 Come Giocare

### Avvio del Gioco

Esegui il file principale:
```bash
python3 main.py
```

oppure su Windows:
```bash
python main.py
```

### Flusso di Gioco

1. **Selezione Modalità**: Scegli una delle 4 modalità disponibili
2. **Configurazione**: Inserisci numero di giocatori (2-8), nomi e numero di round (3-10)
3. **Fase Creazione**: Ogni giocatore riceve un template e scrive la sua didascalia
4. **Fase Votazione**: Tutti votano il meme più divertente (escluso il proprio)
5. **Risultati**: Vedi chi ha vinto il round e la classifica generale
6. **Vittoria**: Dopo tutti i round, viene proclamato il vincitore!

## 📚 Modalità di Gioco Dettagliate

### 🎮 Modalità Normale
Template completamente casuali per ogni giocatore. Ogni round è una sorpresa!

### 🎯 Modalità Temi
Un tema viene scelto per ogni round (es. "Lavoro", "Cibo", "Sport"). I giocatori devono creare meme che si adattano al tema.

### 🎨 Modalità Stesso Meme
Tutti i giocatori ricevono lo stesso template. Vince chi crea la didascalia più creativa!

### 😌 Modalità Rilassata
Nessun punteggio, nessuna competizione. Solo puro divertimento creativo.

## 🛠️ Gestione Template

Dal menu principale, puoi:
- **Visualizzare** tutti i template disponibili
- **Aggiungere** template personalizzati
- **Aggiungere** template da categorie predefinite

### Categorie Disponibili
- Reazioni
- Animali
- Film e TV
- Internet Culture
- Situazioni Quotidiane

## 📁 Struttura del Progetto

```
makeitmeme_game/
├── main.py              # File principale del gioco
├── README.md            # Questo file
├── utils/
│   ├── __init__.py
│   ├── display.py       # Gestione interfaccia e colori
│   └── game_logic.py    # Logica del gioco
├── data/
│   ├── __init__.py
│   ├── templates_db.py  # Database dei template
│   └── templates.json   # File JSON con i template (auto-generato)
└── templates/           # (riservato per future immagini)
```

## 🎨 Template Predefiniti

Il gioco include 20+ template classici tra cui:
- Drake che approva/disapprova
- Distracted Boyfriend
- Woman Yelling at Cat
- Surprised Pikachu
- This Is Fine
- E molti altri!

## 💡 Consigli per Giocare

1. **Sii Creativo**: Le didascalie più originali spesso vincono
2. **Conosci il Tuo Pubblico**: Usa riferimenti che gli altri giocatori capiranno
3. **Timing**: Non pensare troppo, le prime idee sono spesso le migliori
4. **Divertiti**: È un gioco, non prenderlo troppo sul serio!

## 🔧 Personalizzazione

### Aggiungere Template Personalizzati

Puoi aggiungere i tuoi template in due modi:

1. **Dal Menu**: Usa l'opzione "Gestisci Template" > "Aggiungi Template"
2. **Manualmente**: Modifica il file `data/templates.json` e aggiungi:
```json
{
  "name": "Nome del Template",
  "description": "Descrizione del template",
  "category": "Categoria"
}
```

## 🐛 Risoluzione Problemi

### I colori non si visualizzano correttamente
Alcuni terminali più vecchi potrebbero non supportare i colori ANSI. Prova un terminale moderno come:
- Linux/Mac: Terminal, iTerm2, GNOME Terminal
- Windows: Windows Terminal, PowerShell

### Errore di importazione moduli
Assicurati di eseguire il gioco dalla directory `makeitmeme_game`:
```bash
cd makeitmeme_game
python3 main.py
```

## 📝 Note di Versione

### Versione 1.0
- ✅ 4 modalità di gioco complete
- ✅ Sistema di votazione
- ✅ Gestione template personalizzabili
- ✅ Interfaccia colorata
- ✅ 20+ template predefiniti

## 🤝 Contribuire

Vuoi aggiungere nuove funzionalità? Sentiti libero di:
- Aggiungere nuovi template
- Migliorare l'interfaccia
- Aggiungere nuove modalità di gioco

## 📜 Licenza

Questo è un progetto educativo e ricreativo. Usalo liberamente!

## 🎉 Divertimento Garantito!

Buon divertimento con Make it Meme! Che vinca il memer più creativo! 🏆

---

**Fatto con ❤️ per gli amanti dei meme**
