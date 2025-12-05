from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
import os


# Import the download function
import youtube_to_mp3
import traceback

app = Flask(__name__, static_folder='.', static_url_path='')
# Enable CORS for all routes
CORS(app, resources={r"/*": {"origins": "*"}})
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), 'upload')

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/download', methods=['POST'])
def api_download():
    data = request.get_json() or {}
    url = data.get('url')
    if not url:
        return jsonify({'error': 'no url provided'}), 400

    try:
        # Call the downloader synchronously (yt-dlp may take time)
        mp3_path = youtube_to_mp3.download_youtube_mp3(url)
        if not mp3_path:
            return jsonify({'error': 'download failed'}), 500

        # Return relative URL for client to fetch
        filename = os.path.basename(mp3_path)
        file_url = f'/upload/{filename}'
        return jsonify({'file': file_url}), 200

    except Exception as e:
        # Log full traceback to server console for debugging
        tb = traceback.format_exc()
        print('Exception in /api/download:', tb)
        # Return concise message to client but include hint to check server log
        return jsonify({'error': str(e), 'hint': '查看伺服器日誌以取得完整錯誤資訊'}), 500

@app.route('/upload/<path:filename>')
def serve_upload(filename):
    full_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(full_path):
        abort(404)
    # Serve file with proper headers for audio playback
    response = send_from_directory(UPLOAD_DIR, filename)
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Content-Type'] = 'audio/mpeg'
    # Prevent caching to ensure fresh file is loaded
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/default.mp3')
def serve_default_mp3():
    """Serve default.mp3 with proper CORS headers"""
    default_path = os.path.join(os.path.dirname(__file__), 'default.mp3')
    if not os.path.exists(default_path):
        abort(404)
    response = send_from_directory('.', 'default.mp3')
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Content-Type'] = 'audio/mpeg'
    return response

if __name__ == '__main__':
    # Run Flask app
    app.run(host='0.0.0.0', port=5000, debug=True)