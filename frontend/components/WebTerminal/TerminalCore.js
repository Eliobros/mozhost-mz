import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

export const initializeTerminal = (container, options = {}) => {
  const {
    theme = {},
    fontSize = 14,
    onData = () => {}
  } = options;

  // Configuração do terminal
  const term = new Terminal({
    fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace',
    fontSize,
    fontWeight: 400,
    fontWeightBold: 700,
    lineHeight: 1.2,
    letterSpacing: 0,
    
    cursorBlink: true,
    cursorStyle: 'block',
    cursorWidth: 1,
    
    theme,
    
    scrollback: 50000,
    smoothScrollDuration: 100,
    fastScrollModifier: 'shift',
    fastScrollSensitivity: 5,
    
    rendererType: 'canvas',
    allowTransparency: false,
    drawBoldTextInBrightColors: true,
    
    minimumContrastRatio: 4.5,
    tabStopWidth: 4,
    bellStyle: 'none',
    
    // Desabilitar input local (será controlado pelo backend)
    disableStdin: false,
    convertEol: true
  });

  // Addons
  const fitAddon = new FitAddon();
  const webLinksAddon = new WebLinksAddon();

  term.loadAddon(fitAddon);
  term.loadAddon(webLinksAddon);

  // Montar no DOM
  term.open(container);
  fitAddon.fit();

  // Handler de input
  term.onData(onData);

  // Redimensionar ao mudar janela
  const resizeHandler = () => {
    try {
      fitAddon.fit();
    } catch (e) {
      console.error('Erro ao redimensionar terminal:', e);
    }
  };

  window.addEventListener('resize', resizeHandler);

  // Retornar instância + cleanup
  return {
    terminal: term,
    fitAddon,
    write: (data) => term.write(data),
    writeln: (data) => term.writeln(data),
    clear: () => term.clear(),
    getSelection: () => term.getSelection(),
    focus: () => term.focus(),
    dispose: () => {
      window.removeEventListener('resize', resizeHandler);
      term.dispose();
    }
  };
};

export const cleanupTerminal = (termInstance) => {
  if (termInstance && termInstance.dispose) {
    termInstance.dispose();
  }
};

// Função auxiliar para limpar códigos ANSI (se necessário)
export const cleanAnsiCodes = (text) => {
  return text
    .replace(/\x1B\[[?]?[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1B\][0-9];[^\x07]*\x07/g, '')
    .replace(/\[\?2004[hl]/g, '')
    .replace(/\x07/g, '')
    .replace(/\r/g, '')
    .replace(/\x1B\([01]/g, '');
};
