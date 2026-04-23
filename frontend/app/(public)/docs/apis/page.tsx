// app/docs/apis/page.tsx
import Link from 'next/link'

export default function ApisPage() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <Link href="/docs" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Voltar à introdução
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">🌐 Hospedar APIs na MozHost</h1>
        <p className="text-xl text-gray-600">
          Aprenda a fazer deploy de APIs REST na MozHost usando Node.js (Express.js, Fastify) ou Python (Flask, FastAPI).
        </p>
      </div>

      {/* Frameworks Suportados */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Frameworks Suportados</h2>
        <p className="text-gray-700 mb-6">
          A MozHost suporta os principais frameworks para construção de APIs. Escolha o que melhor se adapta ao seu projecto:
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border-2 border-green-500 bg-green-50 rounded-lg p-4 text-center">
            <span className="text-3xl block mb-2">🟢</span>
            <h3 className="font-semibold text-gray-900 mb-1">Express.js</h3>
            <p className="text-xs text-gray-600">Node.js — Mais popular</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 text-center hover:border-blue-500 transition">
            <span className="text-3xl block mb-2">⚡</span>
            <h3 className="font-semibold text-gray-900 mb-1">Fastify</h3>
            <p className="text-xs text-gray-600">Node.js — Alta performance</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 text-center hover:border-blue-500 transition">
            <span className="text-3xl block mb-2">🐍</span>
            <h3 className="font-semibold text-gray-900 mb-1">Flask</h3>
            <p className="text-xs text-gray-600">Python — Leve e flexível</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 text-center hover:border-blue-500 transition">
            <span className="text-3xl block mb-2">🚀</span>
            <h3 className="font-semibold text-gray-900 mb-1">FastAPI</h3>
            <p className="text-xs text-gray-600">Python — Moderno e rápido</p>
          </div>
        </div>
      </section>

      {/* Passo a Passo para Deploy */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Passo a Passo para Fazer Deploy de uma API</h2>

        {/* Passo 1 */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Crie um Container</h3>
              <p className="text-gray-700 mb-4">
                Acesse o painel da MozHost e crie um novo container. Escolha <strong>Node.js</strong> para Express/Fastify ou <strong>Python</strong> para Flask/FastAPI.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
                <p className="text-gray-700">
                  <strong>💡 Dica:</strong> Veja o guia completo em{' '}
                  <Link href="/docs/primeiro-container" className="text-blue-600 hover:underline font-medium">
                    Criar seu Primeiro Container
                  </Link>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Passo 2 */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              2
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Prepare o seu Código</h3>
              <p className="text-gray-700 mb-4">
                Certifique-se de que o seu projecto tem um ficheiro de entrada (ex: <code className="bg-gray-100 px-2 py-1 rounded text-sm">index.js</code>, <code className="bg-gray-100 px-2 py-1 rounded text-sm">app.py</code>) e as dependências listadas (<code className="bg-gray-100 px-2 py-1 rounded text-sm">package.json</code> ou <code className="bg-gray-100 px-2 py-1 rounded text-sm">requirements.txt</code>).
              </p>
            </div>
          </div>
        </div>

        {/* Passo 3 */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              3
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Faça Upload do Código</h3>
              <p className="text-gray-700 mb-4">
                Envie os ficheiros do seu projecto para o container através do painel ou usando a{' '}
                <Link href="/docs/cli" className="text-blue-600 hover:underline font-medium">
                  CLI da MozHost
                </Link>.
              </p>
            </div>
          </div>
        </div>

        {/* Passo 4 */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              4
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Configure as Variáveis de Ambiente</h3>
              <p className="text-gray-700 mb-4">
                Adicione as variáveis necessárias (PORT, credenciais de banco de dados, chaves de API, etc.) no painel do container.
              </p>
            </div>
          </div>
        </div>

        {/* Passo 5 */}
        <div className="mb-8">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              5
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-3">Inicie o Container</h3>
              <p className="text-gray-700 mb-4">
                Clique em "Iniciar" no painel. O sistema vai instalar as dependências automaticamente e executar a sua API. Acesse-a pelo URL/domínio do container.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Exemplo Express.js */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Exemplo: API REST com Express.js</h2>
        <p className="text-gray-700 mb-4">
          Aqui está um exemplo completo de uma API REST simples usando Express.js com rotas de CRUD:
        </p>

        <div className="mb-4">
          <p className="font-medium text-gray-900 mb-2">package.json:</p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`{
  "name": "minha-api",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0"
  }
}`}
            </pre>
          </div>
        </div>

        <div className="mb-4">
          <p className="font-medium text-gray-900 mb-2">index.js:</p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Dados em memória (substitua por um banco de dados)
let produtos = [
  { id: 1, nome: 'Capulana', preco: 350 },
  { id: 2, nome: 'Maheu', preco: 50 },
];

// GET - Listar todos os produtos
app.get('/api/produtos', (req, res) => {
  res.json({ success: true, data: produtos });
});

// GET - Buscar produto por ID
app.get('/api/produtos/:id', (req, res) => {
  const produto = produtos.find(p => p.id === Number(req.params.id));
  if (!produto) {
    return res.status(404).json({ success: false, message: 'Produto não encontrado' });
  }
  res.json({ success: true, data: produto });
});

// POST - Criar produto
app.post('/api/produtos', (req, res) => {
  const { nome, preco } = req.body;
  const novoProduto = { id: produtos.length + 1, nome, preco };
  produtos.push(novoProduto);
  res.status(201).json({ success: true, data: novoProduto });
});

// PUT - Actualizar produto
app.put('/api/produtos/:id', (req, res) => {
  const index = produtos.findIndex(p => p.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Produto não encontrado' });
  }
  produtos[index] = { ...produtos[index], ...req.body };
  res.json({ success: true, data: produtos[index] });
});

// DELETE - Remover produto
app.delete('/api/produtos/:id', (req, res) => {
  produtos = produtos.filter(p => p.id !== Number(req.params.id));
  res.json({ success: true, message: 'Produto removido' });
});

app.listen(PORT, () => {
  console.log(\`API rodando na porta \${PORT}\`);
});`}
            </pre>
          </div>
        </div>
      </section>

      {/* Exemplo Flask */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Exemplo: API REST com Flask</h2>
        <p className="text-gray-700 mb-4">
          Um exemplo equivalente usando Flask (Python):
        </p>

        <div className="mb-4">
          <p className="font-medium text-gray-900 mb-2">requirements.txt:</p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`flask==3.0.0
flask-cors==4.0.0`}
            </pre>
          </div>
        </div>

        <div className="mb-4">
          <p className="font-medium text-gray-900 mb-2">app.py:</p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`import os
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

produtos = [
    {"id": 1, "nome": "Capulana", "preco": 350},
    {"id": 2, "nome": "Maheu", "preco": 50},
]

@app.route("/api/produtos", methods=["GET"])
def listar_produtos():
    return jsonify({"success": True, "data": produtos})

@app.route("/api/produtos/<int:id>", methods=["GET"])
def buscar_produto(id):
    produto = next((p for p in produtos if p["id"] == id), None)
    if not produto:
        return jsonify({"success": False, "message": "Produto não encontrado"}), 404
    return jsonify({"success": True, "data": produto})

@app.route("/api/produtos", methods=["POST"])
def criar_produto():
    dados = request.get_json()
    novo = {"id": len(produtos) + 1, "nome": dados["nome"], "preco": dados["preco"]}
    produtos.append(novo)
    return jsonify({"success": True, "data": novo}), 201

@app.route("/api/produtos/<int:id>", methods=["DELETE"])
def remover_produto(id):
    global produtos
    produtos = [p for p in produtos if p["id"] != id]
    return jsonify({"success": True, "message": "Produto removido"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    app.run(host="0.0.0.0", port=port)`}
            </pre>
          </div>
        </div>
      </section>

      {/* Variáveis de Ambiente */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Configurar Variáveis de Ambiente</h2>
        <p className="text-gray-700 mb-4">
          As variáveis de ambiente permitem que você configure a sua API sem alterar o código. Use-as para guardar credenciais, portas e configurações sensíveis.
        </p>

        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
          <p className="text-gray-700">
            <strong>💡 Como adicionar:</strong> No painel do container, acesse a aba <strong>"Variáveis de Ambiente"</strong> e adicione as variáveis no formato <code className="bg-white px-1 rounded">CHAVE=VALOR</code>.
          </p>
        </div>

        <p className="font-medium text-gray-900 mb-2">Exemplo de variáveis comuns:</p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
          <pre className="text-sm">
{`PORT=3000
DATABASE_URL=mysql://user:senha@host:porta/database
API_KEY=sua_chave_secreta
NODE_ENV=production
JWT_SECRET=minha_chave_jwt_segura`}
          </pre>
        </div>

        <p className="font-medium text-gray-900 mb-2">Acessando no código (Node.js):</p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
          <pre className="text-sm">
{`const port = process.env.PORT || 3000;
const dbUrl = process.env.DATABASE_URL;
const apiKey = process.env.API_KEY;`}
          </pre>
        </div>

        <p className="font-medium text-gray-900 mb-2">Acessando no código (Python):</p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">
{`import os

port = int(os.environ.get("PORT", 3000))
db_url = os.environ.get("DATABASE_URL")
api_key = os.environ.get("API_KEY")`}
          </pre>
        </div>
      </section>

      {/* Conectar ao Banco de Dados */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Conectar a um Banco de Dados</h2>
        <p className="text-gray-700 mb-4">
          Para conectar a sua API a um banco de dados, primeiro{' '}
          <Link href="/docs/criar-database" className="text-blue-600 hover:underline font-medium">
            crie um database na MozHost
          </Link>{' '}
          e use as credenciais fornecidas.
        </p>

        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Node.js com MySQL (mysql2):</h3>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.get('/api/produtos', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM produtos');
  res.json({ success: true, data: rows });
});`}
            </pre>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Node.js com MongoDB (mongoose):</h3>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`const mongoose = require('mongoose');

mongoose.connect(process.env.DATABASE_URL);

const ProdutoSchema = new mongoose.Schema({
  nome: String,
  preco: Number,
});

const Produto = mongoose.model('Produto', ProdutoSchema);

app.get('/api/produtos', async (req, res) => {
  const produtos = await Produto.find();
  res.json({ success: true, data: produtos });
});`}
            </pre>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Python com MySQL (pymysql):</h3>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`import os
import pymysql

connection = pymysql.connect(
    host=os.environ.get("DB_HOST"),
    port=int(os.environ.get("DB_PORT", 3306)),
    user=os.environ.get("DB_USER"),
    password=os.environ.get("DB_PASSWORD"),
    database=os.environ.get("DB_NAME"),
)

@app.route("/api/produtos", methods=["GET"])
def listar_produtos():
    with connection.cursor(pymysql.cursors.DictCursor) as cursor:
        cursor.execute("SELECT * FROM produtos")
        produtos = cursor.fetchall()
    return jsonify({"success": True, "data": produtos})`}
            </pre>
          </div>
        </div>
      </section>

      {/* Domínio / Subdomínio */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Acessar a API pelo Domínio</h2>
        <p className="text-gray-700 mb-4">
          Após o deploy, a sua API estará disponível automaticamente através do subdomínio do container:
        </p>

        <div className="bg-white border-2 border-blue-500 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600 mb-1">URL da sua API:</p>
          <code className="text-blue-600 font-mono text-lg break-all">
            https://nome-do-container.mozhost.app
          </code>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600 mb-2">Exemplos de endpoints:</p>
          <div className="space-y-2">
            <div className="bg-gray-50 p-2 rounded">
              <code className="text-sm text-gray-700">GET https://minha-api.mozhost.app/api/produtos</code>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <code className="text-sm text-gray-700">POST https://minha-api.mozhost.app/api/produtos</code>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <code className="text-sm text-gray-700">DELETE https://minha-api.mozhost.app/api/produtos/1</code>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border-l-4 border-green-600 p-4">
          <p className="text-gray-700">
            <strong>✅ Domínio personalizado:</strong> Você também pode configurar um domínio próprio (ex: <code className="bg-white px-1 rounded">api.meusite.co.mz</code>) nas configurações do container, apontando o DNS para a MozHost.
          </p>
        </div>
      </section>

      {/* Dicas e Boas Práticas */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dicas e Boas Práticas</h2>

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <span className="text-green-600 text-xl">✅</span>
            <div>
              <p className="font-medium text-gray-900">Use a variável PORT do ambiente</p>
              <p className="text-sm text-gray-600">
                Sempre leia a porta de <code className="bg-gray-100 px-1 rounded">process.env.PORT</code> (Node.js) ou <code className="bg-gray-100 px-1 rounded">os.environ.get(&quot;PORT&quot;)</code> (Python). A MozHost define essa variável automaticamente.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <span className="text-green-600 text-xl">✅</span>
            <div>
              <p className="font-medium text-gray-900">Configure o CORS correctamente</p>
              <p className="text-sm text-gray-600">
                Se o seu frontend acessa a API de outro domínio, habilite o CORS. Em Node.js use o pacote <code className="bg-gray-100 px-1 rounded">cors</code>, em Python use <code className="bg-gray-100 px-1 rounded">flask-cors</code>.
              </p>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mt-2">
                <pre className="text-sm">
{`// Node.js - Permitir origens específicas
const cors = require('cors');
app.use(cors({
  origin: ['https://meusite.co.mz', 'https://www.meusite.co.mz']
}));`}
                </pre>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <span className="text-green-600 text-xl">✅</span>
            <div>
              <p className="font-medium text-gray-900">Use Helmet para segurança (Node.js)</p>
              <p className="text-sm text-gray-600">
                O <code className="bg-gray-100 px-1 rounded">helmet</code> adiciona headers de segurança HTTP automaticamente, protegendo contra ataques comuns como XSS e clickjacking.
              </p>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mt-2">
                <pre className="text-sm">
{`const helmet = require('helmet');
app.use(helmet());`}
                </pre>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <span className="text-green-600 text-xl">✅</span>
            <div>
              <p className="font-medium text-gray-900">Nunca exponha credenciais no código</p>
              <p className="text-sm text-gray-600">
                Use sempre variáveis de ambiente para guardar senhas, chaves de API e tokens. Nunca faça commit de ficheiros <code className="bg-gray-100 px-1 rounded">.env</code> no repositório.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <span className="text-green-600 text-xl">✅</span>
            <div>
              <p className="font-medium text-gray-900">Escute em 0.0.0.0</p>
              <p className="text-sm text-gray-600">
                Em Python (Flask/FastAPI), certifique-se de escutar em <code className="bg-gray-100 px-1 rounded">0.0.0.0</code> e não em <code className="bg-gray-100 px-1 rounded">127.0.0.1</code>, para que o container consiga receber pedidos externos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Próximos Passos */}
      <section className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Próximos Passos</h2>
        <p className="text-gray-700 mb-4">
          Agora que você sabe como hospedar APIs na MozHost, pode:
        </p>
        <div className="space-y-3 mb-6">
          <div className="flex items-center space-x-2 text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Criar um container e fazer deploy da sua primeira API</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Conectar a API a um banco de dados</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Configurar variáveis de ambiente e domínio personalizado</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-700">
            <span className="text-green-600">✓</span>
            <span>Integrar a API com o Email Service da MozHost</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/docs/criar-database"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Criar Database →
          </Link>
          <Link
            href="/docs/email-service"
            className="bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition font-medium"
          >
            Email Service →
          </Link>
        </div>
      </section>
    </div>
  )
}
