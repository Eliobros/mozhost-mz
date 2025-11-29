// src/components/WebTerminal/TerminalThemes.js

export const THEMES = {
  'mozhost-dark': {
    background: '#0a0e27',
    foreground: '#00d9ff',
    cursor: '#00d9ff',
    cursorAccent: '#000000',
    selectionBackground: '#1e3a5f',
    
    black: '#000000',
    red: '#ff6b6b',
    green: '#51cf66',
    yellow: '#ffd43b',
    blue: '#339af0',
    magenta: '#ae3ec9',
    cyan: '#00d9ff',
    white: '#e9ecef',
    
    brightBlack: '#495057',
    brightRed: '#ff8787',
    brightGreen: '#8ce99a',
    brightYellow: '#ffe066',
    brightBlue: '#74c0fc',
    brightMagenta: '#d0bfff',
    brightCyan: '#99e9f2',
    brightWhite: '#ffffff'
  },

  'mozhost-light': {
    background: '#f8f9fa',
    foreground: '#212529',
    cursor: '#339af0',
    selectionBackground: '#d0ebff',
    
    black: '#212529',
    red: '#c92a2a',
    green: '#2b8a3e',
    yellow: '#e67700',
    blue: '#1864ab',
    magenta: '#862e9c',
    cyan: '#0b7285',
    white: '#f8f9fa',
    
    brightBlack: '#868e96',
    brightRed: '#fa5252',
    brightGreen: '#51cf66',
    brightYellow: '#ffd43b',
    brightBlue: '#339af0',
    brightMagenta: '#ae3ec9',
    brightCyan: '#22b8cf',
    brightWhite: '#ffffff'
  },

  'vscode-dark': {
    background: '#1e1e1e',
    foreground: '#cccccc',
    cursor: '#ffffff',
    selectionBackground: '#264f78',
    
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
    
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#ffffff'
  },

  'matrix': {
    background: '#000000',
    foreground: '#00ff00',
    cursor: '#00ff00',
    selectionBackground: '#003300',
    
    black: '#000000',
    red: '#00ff00',
    green: '#00ff00',
    yellow: '#00ff00',
    blue: '#00ff00',
    magenta: '#00ff00',
    cyan: '#00ff00',
    white: '#00ff00',
    
    brightBlack: '#006600',
    brightRed: '#00ff00',
    brightGreen: '#00ff00',
    brightYellow: '#33ff33',
    brightBlue: '#00ff00',
    brightMagenta: '#00ff00',
    brightCyan: '#66ff66',
    brightWhite: '#99ff99'
  }
};

export const QUICK_COMMANDS = [
  { 
    icon: '📋',
    label: 'ls -la', 
    command: 'ls -la', 
    desc: 'Listar arquivos detalhado' 
  },
  { 
    icon: '📁',
    label: 'pwd', 
    command: 'pwd', 
    desc: 'Diretório atual' 
  },
  { 
    icon: '👤',
    label: 'whoami', 
    command: 'whoami', 
    desc: 'Usuário atual' 
  },
  { 
    icon: '📦',
    label: 'npm install', 
    command: 'npm install', 
    desc: 'Instalar dependências' 
  },
  { 
    icon: '🚀',
    label: 'npm start', 
    command: 'npm start', 
    desc: 'Iniciar aplicação' 
  },
  { 
    icon: '🔧',
    label: 'pm2 list', 
    command: 'pm2 list', 
    desc: 'Ver processos PM2' 
  },
  { 
    icon: '▶️',
    label: 'pm2 start bot.js', 
    command: 'pm2 start bot.js --name bot', 
    desc: 'Iniciar bot (persistente)' 
  },
  { 
    icon: '📜',
    label: 'pm2 logs', 
    command: 'pm2 logs', 
    desc: 'Ver logs PM2' 
  },
  { 
    icon: '🔄',
    label: 'pm2 restart bot', 
    command: 'pm2 restart bot', 
    desc: 'Reiniciar bot' 
  },
  { 
    icon: '🐍',
    label: 'python main.py', 
    command: 'python main.py', 
    desc: 'Executar Python' 
  },
  { 
    icon: '📝',
    label: 'cat package.json', 
    command: 'cat package.json', 
    desc: 'Ver package.json' 
  },
  { 
    icon: '🔍',
    label: 'ps aux', 
    command: 'ps aux', 
    desc: 'Ver processos rodando' 
  }
];
