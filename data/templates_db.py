"""
Database dei template per Make it Meme
Supporta due tipi di immagini: Classiche e Personalizzate
"""

import random
import json
import os
import glob


class TemplatesDB:
    """Gestisce i template dei meme"""
    
    # Percorsi delle immagini
    IMAGES_BASE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                     'web', 'static', 'images', 'memes')
    CLASSIC_PATH = os.path.join(IMAGES_BASE_PATH, 'classic')
    CUSTOM_PATH = os.path.join(IMAGES_BASE_PATH, 'custom')
    
    def __init__(self):
        self.db_file = os.path.join(os.path.dirname(__file__), 'templates.json')
        self.templates = self.load_templates()
        
        # Se il database è vuoto, carica i template predefiniti
        if not self.templates:
            self.initialize_default_templates()
    
    def load_templates(self):
        """Carica i template dal file JSON"""
        if os.path.exists(self.db_file):
            try:
                with open(self.db_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return []
        return []
    
    def save_templates(self):
        """Salva i template nel file JSON"""
        with open(self.db_file, 'w', encoding='utf-8') as f:
            json.dump(self.templates, f, indent=2, ensure_ascii=False)
    
    def get_custom_images(self):
        """Ottiene la lista delle immagini personalizzate dalla cartella custom"""
        if not os.path.exists(self.CUSTOM_PATH):
            return []
        
        images = []
        extensions = ['*.jpg', '*.jpeg', '*.png', '*.gif', '*.webp']
        
        for ext in extensions:
            pattern = os.path.join(self.CUSTOM_PATH, ext)
            images.extend(glob.glob(pattern))
            # Anche maiuscole
            images.extend(glob.glob(pattern.upper()))
        
        # Restituisci solo i nomi dei file
        return [os.path.basename(img) for img in images]
    
    def get_classic_images(self):
        """Ottiene la lista delle immagini classiche dalla cartella classic"""
        if not os.path.exists(self.CLASSIC_PATH):
            return []
        
        images = []
        extensions = ['*.jpg', '*.jpeg', '*.png', '*.gif', '*.webp']
        
        for ext in extensions:
            pattern = os.path.join(self.CLASSIC_PATH, ext)
            images.extend(glob.glob(pattern))
            images.extend(glob.glob(pattern.upper()))
        
        return [os.path.basename(img) for img in images]
    
    def get_random_template(self, image_type='classic'):
        """
        Ottiene un template casuale
        image_type: 'classic' per meme classici, 'custom' per immagini personalizzate
        """
        if image_type == 'custom':
            return self.get_random_custom_template()
        else:
            return self.get_random_classic_template()
    
    def get_random_custom_template(self):
        """Ottiene un template con immagine personalizzata casuale"""
        custom_images = self.get_custom_images()
        
        if custom_images:
            image = random.choice(custom_images)
            # Per le immagini custom, usa il nome file come nome template
            name = os.path.splitext(image)[0].replace('-', ' ').replace('_', ' ').title()
            return {
                "name": name,
                "description": "Crea una didascalia divertente per questa immagine!",
                "category": "Personalizzate",
                "image": f"custom/{image}",
                "image_type": "custom"
            }
        else:
            # Fallback: template senza immagine
            return {
                "name": "Immagine Misteriosa",
                "description": "Nessuna immagine personalizzata trovata. Aggiungi immagini nella cartella custom!",
                "category": "Personalizzate",
                "image": None,
                "image_type": "custom"
            }
    
    def get_random_classic_template(self):
        """Ottiene un template classico casuale"""
        # Prima controlla se ci sono immagini nella cartella classic
        classic_images = self.get_classic_images()
        
        if classic_images:
            # Usa le immagini dalla cartella
            image = random.choice(classic_images)
            # Cerca il template corrispondente
            image_base = os.path.splitext(image)[0].lower()
            
            for template in self.templates:
                if template.get('image_file', '').lower() == image_base:
                    return {
                        **template,
                        "image": f"classic/{image}",
                        "image_type": "classic"
                    }
            
            # Se non trova corrispondenza, usa il nome file
            name = image_base.replace('-', ' ').replace('_', ' ').title()
            return {
                "name": name,
                "description": "Crea una didascalia divertente per questo meme classico!",
                "category": "Classici",
                "image": f"classic/{image}",
                "image_type": "classic"
            }
        
        # Fallback: usa i template dal database senza immagine
        if self.templates:
            template = random.choice(self.templates)
            return {
                **template,
                "image": None,
                "image_type": "classic"
            }
        
        # Ultimo fallback
        return {
            "name": "Meme Classico",
            "description": "Aggiungi immagini nella cartella classic per vedere i meme!",
            "category": "Classici",
            "image": None,
            "image_type": "classic"
        }
    
    def initialize_default_templates(self):
        """Inizializza il database con template classici predefiniti"""
        # Template classici con riferimento al nome file immagine
        default_templates = [
            # Reazioni
            {
                "name": "Drake che approva/disapprova",
                "description": "Drake che rifiuta qualcosa (sopra) e approva qualcos'altro (sotto)",
                "category": "Reazioni",
                "image_file": "drake"
            },
            {
                "name": "Distracted Boyfriend",
                "description": "Ragazzo che si gira a guardare un'altra ragazza mentre la fidanzata lo guarda male",
                "category": "Reazioni",
                "image_file": "distracted-boyfriend"
            },
            {
                "name": "Two Buttons",
                "description": "Personaggio che deve scegliere tra due pulsanti e suda",
                "category": "Reazioni",
                "image_file": "two-buttons"
            },
            {
                "name": "Is This a Pigeon?",
                "description": "Personaggio che indica una farfalla chiedendo 'è questo un piccione?'",
                "category": "Reazioni",
                "image_file": "is-this-a-pigeon"
            },
            {
                "name": "Surprised Pikachu",
                "description": "Pikachu con espressione sorpresa",
                "category": "Reazioni",
                "image_file": "surprised-pikachu"
            },
            
            # Animali
            {
                "name": "Woman Yelling at Cat",
                "description": "Donna che urla vs gatto seduto a tavola con espressione confusa",
                "category": "Animali",
                "image_file": "woman-yelling-cat"
            },
            {
                "name": "Doge",
                "description": "Shiba Inu con pensieri in Comic Sans",
                "category": "Animali",
                "image_file": "doge"
            },
            {
                "name": "Grumpy Cat",
                "description": "Gatto dall'espressione costantemente imbronciata",
                "category": "Animali",
                "image_file": "grumpy-cat"
            },
            {
                "name": "Success Kid",
                "description": "Bambino con pugno alzato in segno di vittoria",
                "category": "Animali",
                "image_file": "success-kid"
            },
            
            # Film e TV
            {
                "name": "This Is Fine",
                "description": "Cane seduto in una stanza in fiamme che dice 'va tutto bene'",
                "category": "Film e TV",
                "image_file": "this-is-fine"
            },
            {
                "name": "Expanding Brain",
                "description": "Serie di cervelli che si espandono progressivamente",
                "category": "Film e TV",
                "image_file": "expanding-brain"
            },
            {
                "name": "Change My Mind",
                "description": "Steven Crowder seduto a un tavolo con cartello 'cambia la mia opinione'",
                "category": "Film e TV",
                "image_file": "change-my-mind"
            },
            
            # Internet Culture
            {
                "name": "Galaxy Brain",
                "description": "Testa che diventa sempre più luminosa e galattica",
                "category": "Internet Culture",
                "image_file": "galaxy-brain"
            },
            {
                "name": "Stonks",
                "description": "Meme man davanti a grafico in salita con scritta 'stonks'",
                "category": "Internet Culture",
                "image_file": "stonks"
            },
            {
                "name": "They're The Same Picture",
                "description": "Pam di The Office che mostra due immagini identiche",
                "category": "Internet Culture",
                "image_file": "same-picture"
            },
            
            # Situazioni Quotidiane
            {
                "name": "Sleeping vs Waking Up",
                "description": "Persona rilassata dormendo vs stressata svegliandosi",
                "category": "Situazioni Quotidiane",
                "image_file": "sleeping-waking"
            },
            {
                "name": "Me Explaining",
                "description": "Persona che spiega appassionatamente a qualcuno disinteressato",
                "category": "Situazioni Quotidiane",
                "image_file": "me-explaining"
            },
            {
                "name": "Ancient Aliens Guy",
                "description": "Giorgio Tsoukalos con capelli pazzi che dice 'aliens'",
                "category": "Situazioni Quotidiane",
                "image_file": "ancient-aliens"
            },
            {
                "name": "Hide the Pain Harold",
                "description": "Uomo anziano con sorriso forzato che nasconde il dolore",
                "category": "Situazioni Quotidiane",
                "image_file": "hide-pain-harold"
            },
            {
                "name": "Roll Safe",
                "description": "Uomo che si tocca la tempia con espressione intelligente",
                "category": "Situazioni Quotidiane",
                "image_file": "roll-safe"
            }
        ]
        
        self.templates = default_templates
        self.save_templates()
    
    def get_all_templates(self):
        """Ottiene tutti i template"""
        return self.templates
    
    def add_template(self, name, description, category="Generale", image_file=None):
        """Aggiunge un nuovo template"""
        template = {
            "name": name,
            "description": description,
            "category": category
        }
        if image_file:
            template["image_file"] = image_file
        
        self.templates.append(template)
        self.save_templates()
    
    def get_image_stats(self):
        """Restituisce statistiche sulle immagini disponibili"""
        return {
            "classic": len(self.get_classic_images()),
            "custom": len(self.get_custom_images()),
            "classic_list": self.get_classic_images(),
            "custom_list": self.get_custom_images()
        }
