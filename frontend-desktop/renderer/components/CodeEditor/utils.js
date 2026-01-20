// WebTerminal/utils.js
// Funções utilitárias para o editor

export const getFileLanguage = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'md': 'markdown',
    'yml': 'yaml',
    'yaml': 'yaml',
    'env': 'shell',
    'sh': 'shell',
    'txt': 'plaintext'
  };
  return languageMap[ext] || 'plaintext';
};

export const getFileTemplate = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase();

  const templates = {
    'js': `// ${filename}
console.log('Hello from MozHost! 🚀');

// Adicione seu código aqui`,

    'py': `# ${filename}
print("Hello from MozHost! 🚀")

# Adicione seu código aqui`,

    'json': `{
  "name": "${filename.replace('.json', '')}",
  "version": "1.0.0",
  "description": "Criado na MozHost",
  "main": "index.js"
}`,

    'html': `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MozHost</title>
</head>
<body>
    <h1>Hello from MozHost! 🚀</h1>
</body>
</html>`,

    'css': `/* ${filename} */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}`,

    'md': `# ${filename.replace('.md', '')}

Criado na **MozHost** 🚀

## Sobre

Adicione sua documentação aqui.

## Como usar

\`\`\`bash
npm install
npm start
\`\`\``
  };

  return templates[ext] || `// ${filename}\n// Criado na MozHost 🚀\n\n`;
};

export const API_BASE_URL = 'https://api.mozhost.topaziocoin.online/api';

export const getAuthHeaders = () => {
  const token = localStorage.getItem('mozhost_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('mozhost_token');
  }
  return null;
};
