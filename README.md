# Quiz Master - Flask Web Application

A functionally equivalent Flask version of the Electron Quiz Master app. Create, edit, and take quizzes with support for images, audio, and video.

## Features

- Create custom quizzes with multiple question types
- Support for media uploads (images, audio, video)
- Edit existing quizzes
- Take quizzes interactively
- Save and load quiz files
- Download quizzes as JSON

## Requirements

- Python 3.8 or higher
- pip (Python package manager)

## Installation

### Windows (Git Bash Terminal)

1. **Open Git Bash Terminal**
   - Right-click in your project folder and select "Git Bash Here"
   - Or open Git Bash from the Start menu and navigate to the project directory:
     ```bash
     cd /c/path/to/Quiz-Master-Flask
     ```

2. **Create a Virtual Environment**
   ```bash
   python -m venv venv
   ```

3. **Activate the Virtual Environment**
   ```bash
   source venv/Scripts/activate
   ```
   You should see `(venv)` at the beginning of your command prompt.

4. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

### macOS/Linux

1. **Open Terminal** and navigate to the project directory:
   ```bash
   cd path/to/Quiz-Master-Flask
   ```

2. **Create a Virtual Environment**
   ```bash
   python3 -m venv venv
   ```

3. **Activate the Virtual Environment**
   ```bash
   source venv/bin/activate
   ```

4. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

1. **Ensure the virtual environment is activated** (you should see `(venv)` in your terminal)

2. **Run the Flask application**
   ```bash
   python app.py
   ```

3. **Open your web browser** and navigate to:
   ```
   http://localhost:5000
   ```

## Project Structure

```
Quiz-Master-Flask/
├── app.py              # Main Flask application
├── requirements.txt    # Python dependencies
├── templates/          # HTML templates
│   ├── home.html
│   ├── create.html
│   ├── edit.html
│   ├── take.html
│   └── settings.html
├── static/             # Static files (CSS, JS, media)
│   ├── css/
│   ├── js/
│   └── *.mp3
├── uploads/            # Uploaded media files (created automatically)
└── quizzes/            # Saved quiz files (created automatically)
```

## Usage

1. **Home Page**: Navigate to create, edit, take quizzes, or access settings
2. **Create Quiz**: Build new quizzes with custom questions and media
3. **Edit Quiz**: Load and modify existing quiz files
4. **Take Quiz**: Answer questions from saved quizzes
5. **Settings**: Configure application preferences

## Deactivating the Virtual Environment

When you're done working with the application, deactivate the virtual environment:

```bash
deactivate
```

## Troubleshooting

### Windows Git Bash Issues

If `python` command is not found in Git Bash, try:
```bash
py -m venv venv
source venv/Scripts/activate
```

Or use the full path to Python:
```bash
/usr/bin/python -m venv venv
```

### Port Already in Use

If port 5000 is already in use, modify the last line in `app.py`:
```python
app.run(debug=True, host='0.0.0.0', port=5001)  # Change port number
```

## License

This project is open source.