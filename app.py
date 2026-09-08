"""
Quiz Master - Flask Web Application
A functionally equivalent Flask version of the Electron Quiz Master app.

Note: Quiz storage is now client-side using localStorage.
Server only handles media file uploads.
"""

import os
import uuid
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['SECRET_KEY'] = 'quiz-master-secret-key-change-in-production'
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp3', 'wav', 'ogg', 'mp4', 'webm', 'avi'}

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def home():
    """Home screen with main navigation."""
    return render_template('home.html')


@app.route('/create')
def create_quiz():
    """Quiz creator page."""
    return render_template('create.html')


@app.route('/edit')
def edit_quiz():
    """Quiz editor page - load existing quiz from localStorage."""
    return render_template('edit.html')


@app.route('/take')
def take_quiz():
    """Quiz taker page."""
    return render_template('take.html')


@app.route('/settings')
def settings():
    """Settings page."""
    return render_template('settings.html')


@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Upload media file for questions."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400
    
    # Generate unique filename
    ext = file.filename.rsplit('.', 1)[1].lower()
    unique_filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
    
    try:
        file.save(filepath)
        file_url = f'/uploads/{unique_filename}'
        file_type = 'image' if ext in ['png', 'jpg', 'jpeg', 'gif', 'webp'] else \
                    'audio' if ext in ['mp3', 'wav', 'ogg'] else 'video'
        return jsonify({
            'success': True,
            'url': file_url,
            'type': file_type,
            'original_name': file.filename
        })
    except IOError as e:
        return jsonify({'error': str(e)}), 500


@app.route('/uploads/<filename>')
def serve_upload(filename):
    """Serve uploaded files."""
    filename = secure_filename(filename)
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
