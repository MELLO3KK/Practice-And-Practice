"""
Quiz Master - Flask Web Application
A functionally equivalent Flask version of the Electron Quiz Master app.
"""

import os
import json
import uuid
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory, redirect, url_for
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['SECRET_KEY'] = 'quiz-master-secret-key-change-in-production'
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
app.config['QUIZZES_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'quizzes')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp3', 'wav', 'ogg', 'mp4', 'webm', 'avi'}

# Ensure folders exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['QUIZZES_FOLDER'], exist_ok=True)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_quiz_files():
    """Get list of saved quiz files."""
    quizzes = []
    if os.path.exists(app.config['QUIZZES_FOLDER']):
        for filename in os.listdir(app.config['QUIZZES_FOLDER']):
            if filename.endswith('.json'):
                filepath = os.path.join(app.config['QUIZZES_FOLDER'], filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        quiz_data = json.load(f)
                        quizzes.append({
                            'filename': filename,
                            'title': quiz_data.get('title', 'Untitled'),
                            'created_at': datetime.fromtimestamp(os.path.getctime(filepath)).strftime('%Y-%m-%d %H:%M'),
                            'question_count': len([q for q in quiz_data.get('questions', []) if q.get('type') == 'question'])
                        })
                except (json.JSONDecodeError, IOError):
                    pass
    return sorted(quizzes, key=lambda x: x['created_at'], reverse=True)


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
    """Quiz editor page - load existing quiz."""
    return render_template('edit.html')


@app.route('/take')
def take_quiz():
    """Quiz taker page."""
    return render_template('take.html')


@app.route('/settings')
def settings():
    """Settings page."""
    return render_template('settings.html')


@app.route('/api/quiz/save', methods=['POST'])
def save_quiz():
    """Save quiz to server."""
    data = request.json
    if not data or 'title' not in data:
        return jsonify({'error': 'Invalid quiz data'}), 400
    
    # Generate unique filename
    quiz_id = str(uuid.uuid4())[:8]
    safe_title = ''.join(c if c.isalnum() else '_' for c in data['title'])[:50]
    filename = f"{safe_title}_{quiz_id}.json"
    filepath = os.path.join(app.config['QUIZZES_FOLDER'], filename)
    
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return jsonify({'success': True, 'filename': filename, 'message': 'Quiz saved successfully'})
    except IOError as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/quiz/load/<filename>')
def load_quiz_file(filename):
    """Load a specific quiz file."""
    filename = secure_filename(filename)
    filepath = os.path.join(app.config['QUIZZES_FOLDER'], filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'Quiz not found'}), 404
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            quiz_data = json.load(f)
        return jsonify(quiz_data)
    except (json.JSONDecodeError, IOError) as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/quiz/list')
def list_quizzes():
    """List all saved quizzes."""
    return jsonify(get_quiz_files())


@app.route('/api/quiz/delete/<filename>', methods=['DELETE'])
def delete_quiz_file(filename):
    """Delete a quiz file."""
    filename = secure_filename(filename)
    filepath = os.path.join(app.config['QUIZZES_FOLDER'], filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'Quiz not found'}), 404
    
    try:
        os.remove(filepath)
        return jsonify({'success': True, 'message': 'Quiz deleted successfully'})
    except IOError as e:
        return jsonify({'error': str(e)}), 500


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


@app.route('/api/download/<filename>')
def download_quiz(filename):
    """Download quiz as JSON file."""
    filename = secure_filename(filename)
    filepath = os.path.join(app.config['QUIZZES_FOLDER'], filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'Quiz not found'}), 404
    
    return send_from_directory(app.config['QUIZZES_FOLDER'], filename, as_attachment=True)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
