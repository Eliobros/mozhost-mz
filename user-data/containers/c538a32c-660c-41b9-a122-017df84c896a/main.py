from flask import Flask, jsonify
from datetime import datetime
import os

app = Flask(__name__)
PORT = int(os.environ.get('PORT', 8000))

@app.route('/')
def hello():
    return jsonify({
        'message': 'Hello from MozHost!',
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT, debug=False)