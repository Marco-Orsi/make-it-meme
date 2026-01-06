"""
Modulo Display - Gestisce l'interfaccia visuale del gioco
"""

import os
import sys


class Display:
    """Classe per la gestione dell'output visuale"""
    
    # Colori ANSI
    COLORS = {
        'reset': '\033[0m',
        'bold': '\033[1m',
        'red': '\033[91m',
        'green': '\033[92m',
        'yellow': '\033[93m',
        'blue': '\033[94m',
        'magenta': '\033[95m',
        'cyan': '\033[96m',
        'white': '\033[97m',
    }
    
    def __init__(self):
        self.width = 60
    
    @staticmethod
    def clear():
        """Pulisce lo schermo"""
        os.system('cls' if os.name == 'nt' else 'clear')
    
    def color(self, text, color='white', bold=False):
        """Colora il testo"""
        color_code = self.COLORS.get(color, self.COLORS['white'])
        bold_code = self.COLORS['bold'] if bold else ''
        return f"{bold_code}{color_code}{text}{self.COLORS['reset']}"
    
    def show_logo(self):
        """Mostra il logo del gioco"""
        logo = f"""
{self.color('╔═══════════════════════════════════════════════════════════╗', 'cyan', True)}
{self.color('║', 'cyan')}  {self.color('███╗   ███╗ █████╗ ██╗  ██╗███████╗    ██╗████████╗', 'magenta', True)}  {self.color('║', 'cyan')}
{self.color('║', 'cyan')}  {self.color('████╗ ████║██╔══██╗██║ ██╔╝██╔════╝    ██║╚══██╔══╝', 'magenta', True)}  {self.color('║', 'cyan')}
{self.color('║', 'cyan')}  {self.color('██╔████╔██║███████║█████╔╝ █████╗      ██║   ██║   ', 'magenta', True)}  {self.color('║', 'cyan')}
{self.color('║', 'cyan')}  {self.color('██║╚██╔╝██║██╔══██║██╔═██╗ ██╔══╝      ██║   ██║   ', 'magenta', True)}  {self.color('║', 'cyan')}
{self.color('║', 'cyan')}  {self.color('██║ ╚═╝ ██║██║  ██║██║  ██╗███████╗    ██║   ██║   ', 'magenta', True)}  {self.color('║', 'cyan')}
{self.color('║', 'cyan')}  {self.color('╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝    ╚═╝   ╚═╝   ', 'magenta', True)}  {self.color('║', 'cyan')}
{self.color('║', 'cyan')}                                                             {self.color('║', 'cyan')}
{self.color('║', 'cyan')}  {self.color('███╗   ███╗███████╗███╗   ███╗███████╗', 'yellow', True)}                {self.color('║', 'cyan')}
{self.color('║', 'cyan')}  {self.color('████╗ ████║██╔════╝████╗ ████║██╔════╝', 'yellow', True)}                {self.color('║', 'cyan')}
{self.color('║', 'cyan')}  {self.color('██╔████╔██║█████╗  ██╔████╔██║█████╗  ', 'yellow', True)}                {self.color('║', 'cyan')}
{self.color('║', 'cyan')}  {self.color('██║╚██╔╝██║██╔══╝  ██║╚██╔╝██║██╔══╝  ', 'yellow', True)}                {self.color('║', 'cyan')}
{self.color('║', 'cyan')}  {self.color('██║ ╚═╝ ██║███████╗██║ ╚═╝ ██║███████╗', 'yellow', True)}                {self.color('║', 'cyan')}
{self.color('║', 'cyan')}  {self.color('╚═╝     ╚═╝╚══════╝╚═╝     ╚═╝╚══════╝', 'yellow', True)}                {self.color('║', 'cyan')}
{self.color('╚═══════════════════════════════════════════════════════════╝', 'cyan', True)}
        """
        print(logo)
    
    def show_round_header(self, current_round, total_rounds):
        """Mostra l'intestazione del round"""
        print("\n" + "="*60)
        print(self.color(f"  🎮 ROUND {current_round}/{total_rounds}", 'cyan', True))
        print("="*60)
    
    def show_template(self, template):
        """Mostra un template di meme"""
        print("\n" + self.color("┌" + "─"*58 + "┐", 'yellow'))
        print(self.color("│", 'yellow') + self.color(" 🖼️  TEMPLATE MEME", 'yellow', True) + " "*40 + self.color("│", 'yellow'))
        print(self.color("├" + "─"*58 + "┤", 'yellow'))
        print(self.color("│", 'yellow') + f"  Nome: {self.color(template['name'], 'white', True)}" + " "*(50-len(template['name'])) + self.color("│", 'yellow'))
        print(self.color("│", 'yellow') + f"  {template['description']}" + " "*(56-len(template['description'])) + self.color("│", 'yellow'))
        print(self.color("└" + "─"*58 + "┘", 'yellow'))
    
    def show_scoreboard(self, players_scores):
        """Mostra la classifica"""
        print("\n" + self.color("┌" + "─"*58 + "┐", 'green'))
        print(self.color("│", 'green') + self.color(" 🏆 CLASSIFICA", 'green', True) + " "*44 + self.color("│", 'green'))
        print(self.color("├" + "─"*58 + "┤", 'green'))
        
        sorted_players = sorted(players_scores.items(), key=lambda x: x[1], reverse=True)
        
        for i, (player, score) in enumerate(sorted_players, 1):
            medal = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else "  "
            player_text = f"  {medal} {i}. {player}"
            score_text = f"{score} punti"
            spaces = 60 - len(player_text) - len(score_text) - 2
            print(self.color("│", 'green') + player_text + " "*spaces + score_text + self.color("│", 'green'))
        
        print(self.color("└" + "─"*58 + "┘", 'green'))
    
    def show_winner(self, winner, score):
        """Mostra il vincitore finale"""
        self.clear()
        winner_banner = f"""
{self.color('╔═══════════════════════════════════════════════════════════╗', 'yellow', True)}
{self.color('║', 'yellow')}                                                             {self.color('║', 'yellow')}
{self.color('║', 'yellow')}           {self.color('🎉 ABBIAMO UN VINCITORE! 🎉', 'green', True)}              {self.color('║', 'yellow')}
{self.color('║', 'yellow')}                                                             {self.color('║', 'yellow')}
{self.color('║', 'yellow')}              {self.color(winner.center(30), 'cyan', True)}               {self.color('║', 'yellow')}
{self.color('║', 'yellow')}                                                             {self.color('║', 'yellow')}
{self.color('║', 'yellow')}              {self.color(f'Punteggio: {score}'.center(30), 'white', True)}          {self.color('║', 'yellow')}
{self.color('║', 'yellow')}                                                             {self.color('║', 'yellow')}
{self.color('╚═══════════════════════════════════════════════════════════╝', 'yellow', True)}
        """
        print(winner_banner)
    
    def show_voting_options(self, memes, current_player):
        """Mostra le opzioni di voto"""
        print("\n" + self.color(f"  {current_player}, è il tuo turno di votare!", 'cyan', True))
        print("\n" + "─"*60)
        
        for i, (player, caption) in enumerate(memes, 1):
            if player != current_player:
                print(f"\n  {self.color(f'{i}.', 'yellow', True)} {self.color(player, 'cyan')}")
                print(f"     {self.color('❝', 'white')}{caption}{self.color('❞', 'white')}")
        
        print("\n" + "─"*60)
    
    def show_theme(self, theme):
        """Mostra il tema del round"""
        print("\n" + self.color("┌" + "─"*58 + "┐", 'magenta'))
        print(self.color("│", 'magenta') + self.color(f" 🎯 TEMA: {theme}", 'magenta', True) + " "*(50-len(theme)) + self.color("│", 'magenta'))
        print(self.color("└" + "─"*58 + "┘", 'magenta'))
