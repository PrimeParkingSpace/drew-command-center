from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from datetime import datetime, timedelta
import os
import json
from db import init_db, get_db_connection
import psycopg2.extras

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
        return f"<h1>Drew Command Center</h1><p>Loading...</p><script>setTimeout(() => location.reload(), 2000);</script>"

# Models API Endpoints

@app.route('/api/models')
@require_auth
def api_models():
    """Return list of available models with metadata"""
    models = [
        {
            'id': 'anthropic/claude-opus-4-6',
            'name': 'Claude Opus 4.6',
            'provider': 'anthropic',
            'provider_emoji': '🟣',
            'pricing': {
                'input': 15.0,
                'output': 75.0,
                'cache_read': 1.875,
                'cache_write': 18.75
            },
            'speed': 2,
            'quality': 5,
            'best_for': [
                'Complex reasoning',
                'Multi-step planning', 
                'Nuanced judgment',
                'Architecture decisions',
                'Tricky debugging'
            ],
            'limitations': [
                'Expensive',
                'Slower',
                'Overkill for simple tasks'
            ],
            'description': 'The most capable model for complex reasoning and nuanced tasks'
        },
        {
            'id': 'anthropic/claude-sonnet-4-20250514',
            'name': 'Claude Sonnet 4',
            'provider': 'anthropic',
            'provider_emoji': '🟣',
            'pricing': {
                'input': 3.0,
                'output': 15.0,
                'cache_read': 0.375,
                'cache_write': 3.75
            },
            'speed': 4,
            'quality': 4,
            'best_for': [
                'Code generation',
                'Data processing',
                'Routine tasks',
                'Sub-agent work',
                'Bulk operations'
            ],
            'limitations': [
                'Less nuanced reasoning than Opus',
                'May miss subtle context'
            ],
            'description': 'Fast and capable for most everyday tasks'
        },
        {
            'id': 'openai/gpt-5.2',
            'name': 'GPT 5.2',
            'provider': 'openai',
            'provider_emoji': '🟢',
            'pricing': {
                'input': 2.5,
                'output': 10.0,
                'cache_read': 0,
                'cache_write': 0
            },
            'speed': 4,
            'quality': 4,
            'best_for': [
                'Creative writing',
                'Different perspective',
                'Broad knowledge',
                'Catching blind spots'
            ],
            'limitations': [
                'Different personality/style',
                'Less tool-use reliability'
            ],
            'description': 'OpenAI\'s flagship model for creative and diverse thinking'
        },
        {
            'id': 'openai/gpt-5.1-codex',
            'name': 'GPT 5.1 Codex',
            'provider': 'openai',
            'provider_emoji': '🟢',
            'pricing': {
                'input': 3.0,
                'output': 15.0,
                'cache_read': 0,
                'cache_write': 0
            },
            'speed': 3,
            'quality': 4.5,
            'best_for': [
                'Pure code implementation',
                'Large refactors',
                'Code review',
                'Technical documentation'
            ],
            'limitations': [
                'Code-focused',
                'Less conversational'
            ],
            'description': 'Specialized model optimized for coding tasks'
        }
    ]
    
    return jsonify(models)

@app.route('/api/models/active')
@require_auth
def api_models_active():
    """Return the currently active model"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    cur.execute("SELECT value FROM settings WHERE key = 'active_model'")
    result = cur.fetchone()
    
    cur.close()
    conn.close()
    
    active_model = result['value'] if result else 'anthropic/claude-opus-4-6'
    return jsonify({'active_model': active_model})

@app.route('/api/models/select', methods=['POST'])
@require_auth
def api_models_select():
    """Select a model as the default"""
    data = request.json
    model_id = data.get('model')
    
    if not model_id:
        return jsonify({'error': 'Model ID is required'}), 400
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Update or insert the active model setting
    cur.execute("""
        INSERT INTO settings (key, value, updated_at)
        VALUES ('active_model', %s, NOW())
        ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = EXCLUDED.updated_at
    """, (model_id,))
    
    # Log the model change
    cur.execute("""
        INSERT INTO activity_log (action, summary, details, session_type)
        VALUES (%s, %s, %s, %s)
    """, (
        'model_changed',
        f'Active model changed to {model_id}',
        json.dumps({'model': model_id}),
        'web'
    ))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({'success': True, 'active_model': model_id})

# API Endpoints

@app.route('/api/stats')
@require_auth
def api_stats():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    # Basic counts
    cur.execute("SELECT COUNT(*) FROM tasks WHERE status = 'active'")
    active_tasks = cur.fetchone()['count']
    
    cur.execute("SELECT COUNT(*) FROM tasks WHERE DATE(completed_at) = CURRENT_DATE")
    completed_today = cur.fetchone()['count']
    
    cur.execute("SELECT COUNT(*) FROM scheduled_jobs WHERE status = 'active'")
    scheduled_jobs = cur.fetchone()['count']
    
    cur.execute("SELECT COUNT(*) FROM chat_messages WHERE DATE(timestamp) = CURRENT_DATE")
    messages_today = cur.fetchone()['count']
    
    # Enhanced stats
    
    # Total counts
    cur.execute("SELECT COUNT(*) as total, status FROM tasks GROUP BY status")
    task_status_breakdown = dict((row['status'], row['total']) for row in cur.fetchall())
    
    cur.execute("SELECT COUNT(*) FROM activity_log")
    total_activity_entries = cur.fetchone()['count']
    
    cur.execute("SELECT COUNT(*) FROM chat_messages")
    total_chat_messages = cur.fetchone()['count']
    
    # Tasks completed per week (last 4 weeks)
    cur.execute("""
        SELECT DATE_TRUNC('week', completed_at) as week, COUNT(*) as completed
        FROM tasks 
        WHERE completed_at >= CURRENT_DATE - INTERVAL '4 weeks'
        GROUP BY week
        ORDER BY week
    """)
    weekly_completed = cur.fetchall()
    
    # Most active categories
    cur.execute("""
        SELECT category, COUNT(*) as count
        FROM tasks 
        WHERE category IS NOT NULL AND category != ''
        GROUP BY category
        ORDER BY count DESC
        LIMIT 5
    """)
    active_categories = cur.fetchall()
    
    # Activity by type breakdown
    cur.execute("""
        SELECT action, COUNT(*) as count
        FROM activity_log
        GROUP BY action
        ORDER BY count DESC
        LIMIT 10
    """)
    activity_breakdown = cur.fetchall()
    
    # First activity date
    cur.execute("SELECT MIN(timestamp) as first_activity FROM activity_log")
    first_activity_row = cur.fetchone()
    first_activity = first_activity_row['first_activity'] if first_activity_row['first_activity'] else None
    
    days_since_first = None
    if first_activity:
        days_since_first = (datetime.now() - first_activity).days
    
    # Cost tracking data
    cur.execute("""
        SELECT 
            SUM(estimated_cost) as total_cost,
            AVG(estimated_cost) as avg_daily_cost,
            SUM(input_tokens + output_tokens + cache_read_tokens + cache_write_tokens) as total_tokens
        FROM cost_tracking
    """)
    cost_summary = cur.fetchone()
    
    # Daily costs for chart
    cur.execute("""
        SELECT date, estimated_cost, model, 
               input_tokens, output_tokens, cache_read_tokens, cache_write_tokens
        FROM cost_tracking 
        ORDER BY date
    """)
    daily_costs = cur.fetchall()
    
    # Cost by model
    cur.execute("""
        SELECT model, SUM(estimated_cost) as cost, COUNT(*) as days
        FROM cost_tracking
        GROUP BY model
        ORDER BY cost DESC
    """)
    cost_by_model = cur.fetchall()
    
    # Daily cost with project attribution from activity_log
    cur.execute("""
        SELECT c.date, 
               SUM(c.estimated_cost) as daily_cost,
               SUM(c.input_tokens) as daily_input,
               SUM(c.output_tokens) as daily_output,
               SUM(c.cache_read_tokens) as daily_cache_read,
               SUM(c.cache_write_tokens) as daily_cache_write,
               COALESCE(
                   (SELECT json_agg(DISTINCT a.summary) 
                    FROM activity_log a 
                    WHERE DATE(a.timestamp) = c.date 
                    AND a.action IN ('feature','deploy','milestone','bugfix','config','analysis','research','operations','documentation','cron_created')),
                   '[]'
               ) as activities
        FROM cost_tracking c
        GROUP BY c.date
        ORDER BY c.date
    """)
    daily_cost_details = cur.fetchall()
    
    # Running total
    running = 0
    for d in daily_cost_details:
        running += float(d['daily_cost'])
        d['running_total'] = round(running, 2)
        d['daily_cost'] = float(d['daily_cost'])
        if d['date']:
            d['date'] = d['date'].isoformat()
        # Parse activities JSON string if needed
        if isinstance(d['activities'], str):
            d['activities'] = json.loads(d['activities'])
    
    # Max daily cost for sparkline scaling
    max_daily = max((d['daily_cost'] for d in daily_cost_details), default=0)
    
    cur.close()
    conn.close()
    
    # Format dates for JSON serialization
    for week_data in weekly_completed:
        if week_data['week']:
            week_data['week'] = week_data['week'].isoformat()
    
    for cost_data in daily_costs:
        if cost_data['date']:
            cost_data['date'] = cost_data['date'].isoformat()
    
    return jsonify({
        # Basic dashboard stats
        'active_tasks': active_tasks,
        'completed_today': completed_today,
        'scheduled_jobs': scheduled_jobs,
        'messages_today': messages_today,
        'uptime': '99.9%',
        
        # Enhanced stats
        'total_tasks': sum(task_status_breakdown.values()),
        'task_status_breakdown': task_status_breakdown,
        'total_activity_entries': total_activity_entries,
        'total_chat_messages': total_chat_messages,
        'weekly_completed': weekly_completed,
        'active_categories': active_categories,
        'activity_breakdown': activity_breakdown,
        'first_activity': first_activity.isoformat() if first_activity else None,
        'days_since_first_boot': days_since_first,
        
        # Cost tracking
        'total_estimated_cost': float(cost_summary['total_cost'] or 0),
        'avg_daily_cost': float(cost_summary['avg_daily_cost'] or 0),
        'total_tokens': int(cost_summary['total_tokens'] or 0),
        'daily_costs': daily_costs,
        'cost_by_model': cost_by_model,
        'daily_cost_details': daily_cost_details,
        'max_daily_cost': max_daily
    })

@app.route('/api/tasks')
@require_auth
def api_tasks():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    status = request.args.get('status')
    priority = request.args.get('priority')
    
    query = "SELECT * FROM tasks WHERE 1=1"
    params = []
    
    if status:
        query += " AND status = %s"
        params.append(status)
    if priority:
        query += " AND priority = %s"
        params.append(priority)
        
    query += " ORDER BY created_at DESC"
    
    cur.execute(query, params)
    tasks = cur.fetchall()
    
    cur.close()
    conn.close()
    
    # Convert datetime objects to ISO format
    for task in tasks:
        if task['created_at']:
            task['created_at'] = task['created_at'].isoformat()
        if task['completed_at']:
            task['completed_at'] = task['completed_at'].isoformat()
    
    return jsonify(tasks)

@app.route('/api/tasks', methods=['POST'])
@require_auth
def api_create_task():
    data = request.json
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    cur.execute("""
        INSERT INTO tasks (title, description, status, priority, category, notes)
        VALUES (%s, %s, %s, %s, %s, %s) RETURNING *
    """, (
        data.get('title', ''),
        data.get('description', ''),
        data.get('status', 'queued'),
        data.get('priority', 'normal'),
        data.get('category', ''),
        data.get('notes', '')
    ))
    
    task = cur.fetchone()
    
    # Log activity
    cur.execute("""
        INSERT INTO activity_log (action, summary, details, session_type)
        VALUES (%s, %s, %s, %s)
    """, (
        'task_created',
        f'Created task: {data.get("title", "")}',
        json.dumps({'task_id': task['id']}),
        'web'
    ))
    
    conn.commit()
    cur.close()
    conn.close()
    
    if task['created_at']:
        task['created_at'] = task['created_at'].isoformat()
    
    return jsonify(task), 201

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
@require_auth
def api_update_task(task_id):
    data = request.json
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    # Handle completed status
    completed_at = None
    if data.get('status') == 'completed':
        completed_at = datetime.now()
    
    cur.execute("""
        UPDATE tasks 
        SET title = %s, description = %s, status = %s, priority = %s, 
            category = %s, notes = %s, completed_at = %s
        WHERE id = %s RETURNING *
    """, (
        data.get('title'),
        data.get('description'),
        data.get('status'),
        data.get('priority'),
        data.get('category'),
        data.get('notes'),
        completed_at,
        task_id
    ))
    
    task = cur.fetchone()
    
    if not task:
        cur.close()
        conn.close()
        return jsonify({'error': 'Task not found'}), 404
    
    # Log activity
    cur.execute("""
        INSERT INTO activity_log (action, summary, details, session_type)
        VALUES (%s, %s, %s, %s)
    """, (
        'task_updated',
        f'Updated task: {task["title"]}',
        json.dumps({'task_id': task_id, 'status': data.get('status')}),
        'web'
    ))
    
    conn.commit()
    cur.close()
    conn.close()
    
    if task['created_at']:
        task['created_at'] = task['created_at'].isoformat()
    if task['completed_at']:
        task['completed_at'] = task['completed_at'].isoformat()
    
    return jsonify(task)

@app.route('/api/scheduled')
@require_auth
def api_scheduled():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    cur.execute("SELECT * FROM scheduled_jobs ORDER BY next_run ASC")
    jobs = cur.fetchall()
    
    cur.close()
    conn.close()
    
    # Convert datetime objects to ISO format
    for job in jobs:
        if job['last_run']:
            job['last_run'] = job['last_run'].isoformat()
        if job['next_run']:
            job['next_run'] = job['next_run'].isoformat()
    
    return jsonify(jobs)

@app.route('/api/activity')
@require_auth
def api_activity():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    limit = request.args.get('limit', 20, type=int)
    action_filter = request.args.get('action')
    
    query = "SELECT * FROM activity_log WHERE 1=1"
    params = []
    
    if action_filter:
        query += " AND action = %s"
        params.append(action_filter)
    
    query += f" ORDER BY timestamp DESC LIMIT {limit}"
    
    cur.execute(query, params)
    activities = cur.fetchall()
    
    cur.close()
    conn.close()
    
    # Convert datetime objects to ISO format
    for activity in activities:
        if activity['timestamp']:
            activity['timestamp'] = activity['timestamp'].isoformat()
    
    return jsonify(activities)

MAC_SERVER_URL = os.environ.get('MAC_SERVER_URL', 'https://mac.primeparking.space')

@app.route('/api/chat/live')
@require_auth
def api_chat_live():
    """Proxy to Mac server's OpenClaw history endpoint for live chat."""
    import urllib.request
    import ssl
    try:
        after = request.args.get('after', '')
        limit = request.args.get('limit', '100')
        url = f"{MAC_SERVER_URL}/openclaw/history?limit={limit}"
        if after:
            url += f"&after={after}"
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            data = json.loads(resp.read())
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e), 'messages': []}), 200

@app.route('/api/chat/live/send', methods=['POST'])
@require_auth
def api_chat_live_send():
    """Proxy message send to Mac server → OpenClaw."""
    import urllib.request
    import ssl
    try:
        data = request.json
        url = f"{MAC_SERVER_URL}/openclaw/send"
        payload = json.dumps(data).encode()
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
            result = json.loads(resp.read())
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/messages')
@require_auth
def api_chat_messages():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    limit = request.args.get('limit', 50, type=int)
    
    cur.execute("""
        SELECT * FROM chat_messages 
        ORDER BY timestamp DESC 
        LIMIT %s
    """, (limit,))
    
    messages = cur.fetchall()
    messages.reverse()  # Show oldest first
    
    cur.close()
    conn.close()
    
    # Convert datetime objects to ISO format
    for message in messages:
        if message['timestamp']:
            message['timestamp'] = message['timestamp'].isoformat()
    
    return jsonify(messages)

@app.route('/api/chat/search')
@require_auth
def api_chat_search():
    query = request.args.get('q', '').strip()
    
    if not query:
        return jsonify([])
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    # Search chat messages using ILIKE for case-insensitive search
    cur.execute("""
        SELECT * FROM chat_messages 
        WHERE content ILIKE %s OR role ILIKE %s
        ORDER BY timestamp DESC 
        LIMIT 50
    """, (f'%{query}%', f'%{query}%'))
    
    messages = cur.fetchall()
    
    cur.close()
    conn.close()
    
    # Convert datetime objects to ISO format
    for message in messages:
        if message['timestamp']:
            message['timestamp'] = message['timestamp'].isoformat()
    
    return jsonify(messages)

@app.route('/api/chat/send', methods=['POST'])
@require_auth
def api_chat_send():
    data = request.json
    content = data.get('content', '').strip()
    
    if not content:
        return jsonify({'error': 'Message content is required'}), 400
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    # Save user message
    cur.execute("""
        INSERT INTO chat_messages (role, content, channel, metadata)
        VALUES (%s, %s, %s, %s) RETURNING *
    """, ('user', content, 'web', json.dumps({})))
    
    user_message = cur.fetchone()
    
    # Generate Drew's response (placeholder for now)
    responses = [
        "I'm processing that request now! 🦊",
        "Got it! Let me take care of that for you.",
        "On it! I'll get back to you with updates.",
        "Perfect! I'm handling this task now.",
        "Thanks for the heads up! I'm on this.",
        "Understood! Working on it right away.",
        "Roger that! I'll keep you posted on progress.",
    ]
    
    import random
    drew_response = random.choice(responses)
    
    # Save Drew's response
    cur.execute("""
        INSERT INTO chat_messages (role, content, channel, metadata)
        VALUES (%s, %s, %s, %s) RETURNING *
    """, ('assistant', drew_response, 'web', json.dumps({'avatar': '🦊'})))
    
    drew_message = cur.fetchone()
    
    # Log chat activity
    cur.execute("""
        INSERT INTO activity_log (action, summary, details, session_type)
        VALUES (%s, %s, %s, %s)
    """, (
        'chat',
        'Chat message exchanged',
        json.dumps({'user_message': content[:100]}),
        'web'
    ))
    
    conn.commit()
    cur.close()
    conn.close()
    
    # Convert datetime objects to ISO format
    if user_message['timestamp']:
        user_message['timestamp'] = user_message['timestamp'].isoformat()
    if drew_message['timestamp']:
        drew_message['timestamp'] = drew_message['timestamp'].isoformat()
    
    return jsonify({
        'user_message': user_message,
        'assistant_message': drew_message
    })

@app.route('/api/upload', methods=['POST'])
@require_auth
def api_upload():
    """Handle file uploads"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Create uploads directory if it doesn't exist
    upload_dir = os.path.join('static', 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename to avoid conflicts
    import uuid
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    try:
        file.save(file_path)
        
        # Return file info
        return jsonify({
            'success': True,
            'filename': file.filename,
            'path': f"/static/uploads/{unique_filename}",
            'size': os.path.getsize(file_path),
            'type': file.content_type or 'application/octet-stream'
        })
    except Exception as e:
        return jsonify({'error': f'Failed to save file: {str(e)}'}), 500

@app.route('/api/costs/refresh', methods=['POST'])
@require_auth
def api_costs_refresh():
    """Pull real usage data from Anthropic Usage API and update cost_tracking table"""
    import urllib.request
    import ssl
    
    admin_key = os.environ.get('ANTHROPIC_ADMIN_KEY', '')
    if not admin_key:
        return jsonify({'error': 'ANTHROPIC_ADMIN_KEY not configured'}), 500
    
    pricing = {
        'claude-opus-4-6': {'input': 15, 'output': 75, 'cr': 1.875, 'cw5': 18.75, 'cw1': 22.50},
        'claude-sonnet-4-20250514': {'input': 3, 'output': 15, 'cr': 0.375, 'cw5': 3.75, 'cw1': 4.50},
        'claude-3-5-sonnet-20241022': {'input': 3, 'output': 15, 'cr': 0.375, 'cw5': 3.75, 'cw1': 3.75},
    }
    
    # Fetch all pages from Anthropic
    all_buckets = []
    page = None
    ctx = ssl.create_default_context()
    
    try:
        while True:
            url = (
                f"https://api.anthropic.com/v1/organizations/usage_report/messages?"
                f"starting_at=2026-02-17T00:00:00Z&"
                f"ending_at={datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')}&"
                f"bucket_width=1d&group_by[]=model"
            )
            if page:
                url += f"&page={page}"
            
            req = urllib.request.Request(url, headers={
                'anthropic-version': '2023-06-01',
                'x-api-key': admin_key
            })
            with urllib.request.urlopen(req, context=ctx) as resp:
                d = json.loads(resp.read())
            
            all_buckets.extend(d.get('data', []))
            if not d.get('has_more'):
                break
            page = d.get('next_page')
        
        # Update database
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM cost_tracking")
        
        total_cost = 0
        rows = 0
        for bucket in all_buckets:
            date = bucket['starting_at'][:10]
            for r in bucket['results']:
                model = r.get('model') or 'unknown'
                p = pricing.get('claude-opus-4-6')
                for k in pricing:
                    if k in model:
                        p = pricing[k]
                        break
                
                inp = r['uncached_input_tokens']
                c5 = r['cache_creation']['ephemeral_5m_input_tokens']
                c1 = r['cache_creation']['ephemeral_1h_input_tokens']
                cr = r['cache_read_input_tokens']
                out = r['output_tokens']
                
                cost = (inp*p['input'] + out*p['output'] + cr*p['cr'] + c5*p['cw5'] + c1*p.get('cw1', p['cw5'])) / 1e6
                total_cost += cost
                rows += 1
                
                cur.execute("""
                    INSERT INTO cost_tracking (date, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, estimated_cost, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (date, model, inp, out, cr, c5+c1, round(cost, 4), 'Anthropic Usage API'))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'status': 'ok', 'rows': rows, 'total_cost': round(total_cost, 2)})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health')
def health_check():
    """Health check endpoint for Railway"""
    return jsonify({'status': 'ok', 'timestamp': datetime.utcnow().isoformat()})

if __name__ == '__main__':
    try:
        init_db()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Database initialization failed: {e}")
        print("App will still start, but database features may not work")
    
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))