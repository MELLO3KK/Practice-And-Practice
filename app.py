from flask import Flask, render_template, request, jsonify, send_from_directory, redirect, url_for
import os
import json
import uuid
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'quiz-master-secret-key'
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
app.config['QUIZ_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'quizzes')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

# Ensure directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['QUIZ_FOLDER'], exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp3', 'wav', 'ogg', 'mp4', 'webm'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/create')
def create_quiz():
    return render_template('creator.html')

@app.route('/edit')
def edit_quiz():
    return render_template('edit.html')

@app.route('/take')
def take_quiz():
    return render_template('taker.html')

@app.route('/api/quizzes', methods=['GET'])
def get_quizzes():
    """Get list of saved quizzes"""
    quizzes = []
    if os.path.exists(app.config['QUIZ_FOLDER']):
        for filename in os.listdir(app.config['QUIZ_FOLDER']):
            if filename.endswith('.json'):
                filepath = os.path.join(app.config['QUIZ_FOLDER'], filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        quiz_data = json.load(f)
                        quizzes.append({
                            'id': filename[:-5],
                            'title': quiz_data.get('title', 'Untitled Quiz'),
                            'filename': filename,
                            'created': quiz_data.get('created', '')
                        })
                except Exception as e:
                    print(f"Error loading quiz {filename}: {e}")
    return jsonify(quizzes)

@app.route('/api/quiz/<quiz_id>', methods=['GET'])
def get_quiz(quiz_id):
    """Get a specific quiz by ID"""
    filepath = os.path.join(app.config['QUIZ_FOLDER'], f"{quiz_id}.json")
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                quiz_data = json.load(f)
            return jsonify(quiz_data)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    return jsonify({'error': 'Quiz not found'}), 404

@app.route('/api/quiz/save', methods=['POST'])
def save_quiz():
    """Save a quiz to the server"""
    try:
        quiz_data = request.json
        if not quiz_data:
            return jsonify({'error': 'No data provided'}), 400
        
        quiz_id = quiz_data.get('id') or str(uuid.uuid4())
        quiz_data['id'] = quiz_id
        quiz_data['updated'] = datetime.now().isoformat()
        
        if 'created' not in quiz_data:
            quiz_data['created'] = quiz_data['updated']
        
        filepath = os.path.join(app.config['QUIZ_FOLDER'], f"{quiz_id}.json")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(quiz_data, f, indent=2, ensure_ascii=False)
        
        return jsonify({'success': True, 'id': quiz_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/quiz/delete/<quiz_id>', methods=['DELETE'])
def delete_quiz(quiz_id):
    """Delete a quiz"""
    filepath = os.path.join(app.config['QUIZ_FOLDER'], f"{quiz_id}.json")
    if os.path.exists(filepath):
        os.remove(filepath)
        return jsonify({'success': True})
    return jsonify({'error': 'Quiz not found'}), 404

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Upload media file for questions"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        # Generate unique filename
        ext = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{uuid.uuid4()}.{ext}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Return the relative URL for the file
        file_url = f'/static/uploads/{filename}'
        file_type = 'image' if ext in ['png', 'jpg', 'jpeg', 'gif', 'webp'] else \
                    'audio' if ext in ['mp3', 'wav', 'ogg'] else \
                    'video' if ext in ['mp4', 'webm'] else 'unknown'
        
        return jsonify({
            'success': True,
            'url': file_url,
            'type': file_type,
            'filename': filename
        })
    
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/api/quiz/export', methods=['POST'])
def export_quiz():
    """Export quiz as JSON download"""
    try:
        quiz_data = request.json
        title = quiz_data.get('title', 'quiz').replace('/', '_').replace('\\', '_')
        filename = f"{title}.json"
        
        # Return as JSON response with download header
        response = app.response_class(
            response=json.dumps(quiz_data, indent=2, ensure_ascii=False),
            status=200,
            mimetype='application/json'
        )
        response.headers['Content-Disposition'] = f'attachment; filename={filename}'
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/settings')
def settings():
    return render_template('settings.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
