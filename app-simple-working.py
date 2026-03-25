from flask import Flask
import os

# Create Flask app
app = Flask(__name__)

@app.route('/')
def hello():
    return '''
    <html>
    <head><title>Drew Command Center</title></head>
    <body style="font-family: Arial; text-align: center; margin-top: 100px;">
        <h1>🦊 Drew Command Center</h1>
        <h2 style="color: green;">✅ AWS DEPLOYMENT WORKING!</h2>
        <p>Version: simple-working-v1</p>
        <p>Environment: AWS Elastic Beanstalk</p>
        <p>Status: Running successfully</p>
        <p>Date: March 2, 2026</p>
        <hr>
        <p><strong>Next:</strong> Full features coming soon!</p>
        <p><strong>Password:</strong> drewpeacock</p>
    </body>
    </html>
    '''

@app.route('/health')
def health():
    return {
        'status': 'ok',
        'message': 'AWS deployment successful!',
        'version': 'simple-working-v1'
    }

if __name__ == '__main__':
    # This is the key - bind to all interfaces and use AWS port
    port = int(os.environ.get('PORT', 8000))
    app.run(debug=False, host='0.0.0.0', port=port)