#!/usr/bin/env python3
"""Minimal test version of Drew Command Center to debug Railway deployment"""

from flask import Flask, jsonify
import os
from datetime import datetime

app = Flask(__name__)

@app.route('/')
def home():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>🦊 Drew Command Center - Test</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: system-ui; 
                background: #0a0a1a; 
                color: #e0e0e0; 
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 1rem;
            }
            h1 { color: #6c5ce7; margin-bottom: 1rem; font-size: 2rem; }
            .status { 
                background: #12122a; 
                padding: 2rem; 
                border-radius: 12px; 
                border: 1px solid #1e2040;
                max-width: 600px;
                width: 100%;
            }
            .success { color: #00d4aa; }
            .chat-container {
                margin-top: 2rem;
                width: 100%;
                max-width: 600px;
                background: #12122a;
                border-radius: 12px;
                border: 1px solid #1e2040;
                padding: 1rem;
            }
            .chat-input {
                width: 100%;
                padding: 1rem;
                background: #0a0a1a;
                border: 1px solid #1e2040;
                border-radius: 8px;
                color: #e0e0e0;
                font-size: 1rem;
                margin-bottom: 1rem;
            }
            .btn {
                background: #6c5ce7;
                color: white;
                padding: 1rem 2rem;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1rem;
                width: 100%;
            }
            .btn:hover { background: #5a4fcf; }
            @media (max-width: 768px) {
                h1 { font-size: 1.5rem; }
                .status, .chat-container { padding: 1rem; }
            }
        </style>
    </head>
    <body>
        <h1>🦊 Drew Command Center</h1>
        
        <div class="status">
            <h2>✅ System Status</h2>
            <p class="success">✅ Flask app is running!</p>
            <p class="success">✅ Railway deployment successful!</p>
            <p class="success">✅ Mobile-responsive design loaded!</p>
            <p>📱 This page should display properly on your phone now!</p>
        </div>
        
        <div class="chat-container">
            <h3>💬 Test Chat Interface</h3>
            <input type="text" class="chat-input" placeholder="Message Drew..." id="testInput">
            <button class="btn" onclick="testMessage()">Send Test Message</button>
            <div id="response" style="margin-top: 1rem; font-style: italic;"></div>
        </div>
        
        <script>
            function testMessage() {
                const input = document.getElementById('testInput');
                const response = document.getElementById('response');
                const message = input.value || 'Hello Drew!';
                
                response.innerHTML = '🦊 Hey there! I received: "' + message + '" - The interface is working! 🎉';
                input.value = '';
            }
            
            // Test mobile responsiveness
            console.log('Screen width:', window.innerWidth);
            console.log('Mobile device:', window.innerWidth <= 768 ? 'Yes' : 'No');
        </script>
    </body>
    </html>
    """

@app.route('/health')
def health():
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.utcnow().isoformat(),
        'message': 'Drew Command Center Test - Deployment Successful! 🦊'
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"🚀 Starting Drew Command Center Test on port {port}")
    app.run(debug=False, host='0.0.0.0', port=port)