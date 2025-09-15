from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp
import os
import tempfile
import threading
import time
from datetime import datetime
import hashlib
import json

app = Flask(__name__)
CORS(app)

# Configurações
DOWNLOAD_DIR = "downloads"
TEMP_DIR = "temp"
MAX_FILE_AGE = 3600  # 1 hora em segundos

# Criar diretórios se não existirem
os.makedirs(DOWNLOAD_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# Armazenar status dos downloads
download_status = {}

def clean_old_files():
    """Remove arquivos antigos periodicamente"""
    while True:
        try:
            current_time = time.time()
            for filename in os.listdir(DOWNLOAD_DIR):
                filepath = os.path.join(DOWNLOAD_DIR, filename)
                if os.path.isfile(filepath):
                    if current_time - os.path.getmtime(filepath) > MAX_FILE_AGE:
                        os.remove(filepath)
                        print(f"Arquivo removido: {filename}")
        except Exception as e:
            print(f"Erro na limpeza de arquivos: {e}")
        time.sleep(300)  # Verifica a cada 5 minutos

# Iniciar thread de limpeza
cleanup_thread = threading.Thread(target=clean_old_files, daemon=True)
cleanup_thread.start()

def generate_filename(url, format_type):
    """Gera um nome único para o arquivo baseado na URL e formato"""
    hash_object = hashlib.md5(f"{url}_{format_type}_{datetime.now()}".encode())
    return hash_object.hexdigest()

def get_ydl_opts(format_type, output_path):
    """Configura as opções do yt-dlp baseado no formato desejado"""
    base_opts = {
        'outtmpl': output_path,
        'restrictfilenames': True,
        'noplaylist': True,
    }
    
    if format_type.lower() == 'mp3':
        base_opts.update({
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }]
        })
    elif format_type.lower() == 'mp4':
        base_opts.update({
            'format': 'best[ext=mp4]/best',
            'postprocessors': [{
                'key': 'FFmpegVideoConvertor',
                'preferedformat': 'mp4',
            }]
        })
    
    return base_opts

def download_content(url, format_type, download_id):
    """Função para baixar o conteúdo em thread separada"""
    try:
        download_status[download_id]['status'] = 'downloading'
        
        filename = generate_filename(url, format_type)
        output_path = os.path.join(DOWNLOAD_DIR, f"{filename}.%(ext)s")
        
        ydl_opts = get_ydl_opts(format_type, output_path)
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extrair informações do vídeo
            info = ydl.extract_info(url, download=False)
            title = info.get('title', 'Unknown')
            duration = info.get('duration', 0)
            
            download_status[download_id].update({
                'title': title,
                'duration': duration,
                'progress': 0
            })
            
            # Configurar hook de progresso
            def progress_hook(d):
                if d['status'] == 'downloading':
                    if 'total_bytes' in d and d['total_bytes']:
                        progress = (d['downloaded_bytes'] / d['total_bytes']) * 100
                        download_status[download_id]['progress'] = round(progress, 2)
                elif d['status'] == 'finished':
                    download_status[download_id]['progress'] = 100
                    download_status[download_id]['filename'] = os.path.basename(d['filename'])
            
            ydl_opts['progress_hooks'] = [progress_hook]
            
            # Baixar o arquivo
            with yt_dlp.YoutubeDL(ydl_opts) as ydl_download:
                ydl_download.download([url])
            
            download_status[download_id]['status'] = 'completed'
            
    except Exception as e:
        download_status[download_id]['status'] = 'error'
        download_status[download_id]['error'] = str(e)

@app.route('/', methods=['GET'])
def home():
    """Endpoint de informações da API"""
    return jsonify({
        'message': 'API de Downloads com yt-dlp',
        'version': '1.0',
        'endpoints': {
            'youtube': '/api/download/youtube',
            'facebook': '/api/download/facebook',
            'instagram': '/api/download/instagram',
            'status': '/api/status/<download_id>',
            'download_file': '/api/file/<download_id>'
        },
        'supported_formats': ['mp3', 'mp4'],
        'parameters': {
            'url': 'URL do vídeo/áudio',
            'format': 'mp3 ou mp4'
        }
    })

@app.route('/api/download/youtube', methods=['POST'])
def download_youtube():
    """Endpoint para download do YouTube"""
    return handle_download('youtube')

@app.route('/api/download/facebook', methods=['POST'])
def download_facebook():
    """Endpoint para download do Facebook"""
    return handle_download('facebook')

@app.route('/api/download/instagram', methods=['POST'])
def download_instagram():
    """Endpoint para download do Instagram"""
    return handle_download('instagram')

def handle_download(platform):
    """Função genérica para lidar com downloads"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'JSON inválido'}), 400
        
        url = data.get('url')
        format_type = data.get('format', 'mp4').lower()
        
        # Validações
        if not url:
            return jsonify({'error': 'URL é obrigatória'}), 400
        
        if format_type not in ['mp3', 'mp4']:
            return jsonify({'error': 'Formato deve ser mp3 ou mp4'}), 400
        
        # Validações específicas por plataforma
        platform_domains = {
            'youtube': ['youtube.com', 'youtu.be'],
            'facebook': ['facebook.com', 'fb.com', 'fb.watch'],
            'instagram': ['instagram.com']
        }
        
        if not any(domain in url.lower() for domain in platform_domains[platform]):
            return jsonify({'error': f'URL deve ser do {platform.title()}'}), 400
        
        # Gerar ID único para o download
        download_id = generate_filename(url, format_type)
        
        # Inicializar status do download
        download_status[download_id] = {
            'platform': platform,
            'url': url,
            'format': format_type,
            'status': 'initiated',
            'created_at': datetime.now().isoformat(),
            'progress': 0
        }
        
        # Iniciar download em thread separada
        thread = threading.Thread(
            target=download_content, 
            args=(url, format_type, download_id)
        )
        thread.start()
        
        return jsonify({
            'message': f'Download do {platform.title()} iniciado',
            'download_id': download_id,
            'status_url': f'/api/status/{download_id}',
            'download_url': f'/api/file/{download_id}'
        }), 202
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/status/<download_id>', methods=['GET'])
def get_download_status(download_id):
    """Verificar status do download"""
    if download_id not in download_status:
        return jsonify({'error': 'Download não encontrado'}), 404
    
    return jsonify(download_status[download_id])

@app.route('/api/file/<download_id>', methods=['GET'])
def download_file(download_id):
    """Baixar o arquivo processado"""
    if download_id not in download_status:
        return jsonify({'error': 'Download não encontrado'}), 404
    
    status = download_status[download_id]
    
    if status['status'] != 'completed':
        return jsonify({
            'error': 'Download ainda não foi concluído',
            'current_status': status['status']
        }), 400
    
    filename = status.get('filename')
    if not filename:
        return jsonify({'error': 'Arquivo não encontrado'}), 404
    
    filepath = os.path.join(DOWNLOAD_DIR, filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'Arquivo não existe no servidor'}), 404
    
    return send_file(filepath, as_attachment=True)

@app.route('/api/downloads', methods=['GET'])
def list_downloads():
    """Listar todos os downloads"""
    return jsonify({
        'downloads': download_status,
        'total': len(download_status)
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check da API"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'active_downloads': len([d for d in download_status.values() if d['status'] == 'downloading'])
    })

if __name__ == '__main__':
    print("🚀 Iniciando API de Downloads...")
    print("📱 Plataformas suportadas: YouTube, Facebook, Instagram")
    print("🎵 Formatos: MP3, MP4")
    print("🌐 Acesse: http://localhost:8000")
    
    app.run(debug=True, host='0.0.0.0', port=8000)
