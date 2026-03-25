#!/usr/bin/env python3
"""
Simplified Drew Command Center for AWS deployment
No database dependencies - just the core chat interface
"""

from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from datetime import datetime
import os
import json

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['APP_PASSWORD'] = os.environ.get('APP_PASSWORD', 'drewpeacock')

def require_auth(f):
    """Decorator to require authentication"""
    def decorated_function(*args, **kwargs):
        if not session.get('authenticated'):
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Authentication required'}), 401
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        password = request.form.get('password') or request.json.get('password')
        if password == app.config['APP_PASSWORD']:
            session['authenticated'] = True
            return redirect(url_for('index'))
        return jsonify({'error': 'Invalid password'}), 401
    
    return '''
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Drew Command Center - Login</title>
        <style>
            body { 
                font-family: system-ui, -apple-system, sans-serif; 
                background: #0a0a1a; 
                color: #e0e0e0; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                margin: 0; 
            }
            .login-form { 
                background: #12122a; 
                padding: 2rem; 
                border-radius: 12px; 
                border: 1px solid #1e2040;
                min-width: 300px;
            }
            .login-form h2 { 
                text-align: center; 
                margin-bottom: 1.5rem; 
                color: #6c5ce7; 
            }
            .form-group { 
                margin-bottom: 1rem; 
            }
            .form-group label { 
                display: block; 
                margin-bottom: 0.5rem; 
                color: #8b8fa3; 
            }
            .form-group input { 
                width: 100%; 
                padding: 0.75rem; 
                border: 1px solid #1e2040; 
                border-radius: 8px; 
                background: #0a0a1a; 
                color: #e0e0e0; 
                box-sizing: border-box; 
            }
            .btn { 
                width: 100%; 
                padding: 0.75rem; 
                border: none; 
                border-radius: 8px; 
                background: #6c5ce7; 
                color: white; 
                cursor: pointer; 
                font-size: 1rem; 
            }
            .btn:hover { 
                background: #5a4fcf; 
            }
        </style>
    </head>
    <body>
        <div class="login-form">
            <h2>🦊 Drew Command Center</h2>
            <form method="POST">
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" name="password" id="password" required>
                </div>
                <button type="submit" class="btn">Login</button>
            </form>
        </div>
    </body>
    </html>
    '''

@app.route('/logout')
def logout():
    session.pop('authenticated', None)
    return redirect(url_for('login'))

@app.route('/')
@require_auth
def index():
    """Main dashboard page"""
    try:
        return render_template('index.html')
    except Exception as e:
        print(f"Error rendering index: {e}")
        # Simple fallback HTML if template fails
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <title>🦊 Drew Command Center</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { 
                    font-family: system-ui; 
                    background: #0a0a1a; 
                    color: #e0e0e0; 
                    padding: 2rem; 
                    text-align: center; 
                }
                h1 { color: #6c5ce7; }
                .btn { 
                    background: #6c5ce7; 
                    color: white; 
                    padding: 1rem 2rem; 
                    border: none; 
                    border-radius: 8px; 
                    text-decoration: none; 
                    display: inline-block; 
                    margin: 1rem; 
                }
            </style>
        </head>
        <body>
            <h1>🦊 Drew Command Center</h1>
            <p>Welcome to your premium AWS-hosted command center!</p>
            <p>Full interface loading...</p>
            <a href="/logout" class="btn">Logout</a>
        </body>
        </html>
        """

@app.route('/api/chat/send', methods=['POST'])
@require_auth
def api_chat_send():
    data = request.json
    content = data.get('content', '').strip()
    
    if not content:
        return jsonify({'error': 'Message content is required'}), 400
    
    # Simple response without database
    responses = [
        "I'm processing that request now! 🦊",
        "Got it! Let me take care of that for you.",
        "On it! I'll get back to you with updates.",
        "Perfect! I'm handling this task now.",
        "Thanks for the heads up! I'm on this.",
        "Understood! Working on it right away.",
        "Roger that! I'll keep you posted on progress.",
        "Database is offline but I'm still here! The full interface will be available soon.",
    ]
    
    import random
    drew_response = random.choice(responses)
    
    return jsonify({
        'user_message': {
            'id': 999,
            'role': 'user',
            'content': content,
            'timestamp': datetime.utcnow().isoformat(),
            'channel': 'web'
        },
        'assistant_message': {
            'id': 1000,
            'role': 'assistant', 
            'content': drew_response,
            'timestamp': datetime.utcnow().isoformat(),
            'channel': 'web'
        }
    })

@app.route('/health')
def health_check():
    """Health check endpoint for AWS"""
    return jsonify({
        'status': 'ok', 
        'timestamp': datetime.utcnow().isoformat(),
        'message': 'Drew Command Center - AWS Deployment Successful! 🦊'
    })

if __name__ == '__main__':
    print("🚀 Starting Drew Command Center (Simplified AWS Version)")
    print("⚠️  Running without database for reliable startup")
    
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))