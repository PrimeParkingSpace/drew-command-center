import os
from urllib.parse import urlparse

# Try to import psycopg2, but don't crash if it's not available
try:
    import psycopg2
    import psycopg2.extras
    POSTGRES_AVAILABLE = True
    print("✅ PostgreSQL libraries loaded successfully")
except ImportError as e:
    print(f"⚠️  PostgreSQL libraries not available: {e}")
    print("⚠️  App will run in database-free mode")
    psycopg2 = None
    POSTGRES_AVAILABLE = False

def get_db_connection():
    """Get database connection using Railway's DATABASE_URL or local fallback"""
    if not POSTGRES_AVAILABLE:
        print("⚠️  PostgreSQL not available, skipping database connection")
        return None
        
    database_url = os.environ.get('DATABASE_URL')
    
    try:
        if database_url:
            # Parse Railway's DATABASE_URL
            parsed = urlparse(database_url)
            conn = psycopg2.connect(
                host=parsed.hostname,
                port=parsed.port,
                user=parsed.username,
                password=parsed.password,
                database=parsed.path[1:],  # Remove leading slash
                connect_timeout=10  # Add timeout
            )
        else:
            # Local development fallback
            conn = psycopg2.connect(
                host='localhost',
                port=5432,
                user='postgres',
                password='postgres',
                database='drew_command_center',
                connect_timeout=10
            )
        return conn
    except Exception as e:
        print(f"Database connection failed: {e}")
        return None

def init_db():
    """Initialize database with required tables"""
    conn = get_db_connection()
    if conn is None:
        print("⚠️  Database connection failed, skipping database initialization")
        return False
    
    try:
        cur = conn.cursor()
    
    # Create tasks table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status VARCHAR(20) DEFAULT 'queued',
            priority VARCHAR(10) DEFAULT 'normal',
            category VARCHAR(50),
            created_at TIMESTAMP DEFAULT NOW(),
            completed_at TIMESTAMP,
            deliverables JSONB,
            notes TEXT
        )
    """)
    
    # Create scheduled_jobs table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS scheduled_jobs (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            schedule TEXT,
            last_run TIMESTAMP,
            last_result TEXT,
            next_run TIMESTAMP,
            status VARCHAR(20) DEFAULT 'active',
            job_type VARCHAR(30),
            config JSONB
        )
    """)
    
    # Create activity_log table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS activity_log (
            id SERIAL PRIMARY KEY,
            timestamp TIMESTAMP DEFAULT NOW(),
            action VARCHAR(50),
            summary TEXT,
            details JSONB,
            session_type VARCHAR(20)
        )
    """)
    
    # Create chat_messages table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS chat_messages (
            id SERIAL PRIMARY KEY,
            timestamp TIMESTAMP DEFAULT NOW(),
            role VARCHAR(10),
            content TEXT,
            channel VARCHAR(20),
            metadata JSONB
        )
    """)
    
    # Create cost_tracking table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS cost_tracking (
            id SERIAL PRIMARY KEY,
            date DATE NOT NULL,
            model VARCHAR(100),
            input_tokens INTEGER DEFAULT 0,
            output_tokens INTEGER DEFAULT 0,
            cache_read_tokens INTEGER DEFAULT 0,
            cache_write_tokens INTEGER DEFAULT 0,
            estimated_cost DECIMAL(10,4) DEFAULT 0,
            session_count INTEGER DEFAULT 0,
            notes TEXT
        )
    """)
    
    # Create settings table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key VARCHAR(100) PRIMARY KEY,
            value TEXT,
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)
    
    # Insert some sample data if tables are empty
    cur.execute("SELECT COUNT(*) FROM tasks")
    task_count = cur.fetchone()[0]
    
    if task_count == 0:
        # Sample tasks
        sample_tasks = [
            ('Check parking revenue', 'Review daily parking metrics and resolve any payment issues', 'active', 'high', 'parking'),
            ('Wedding venue coordination', 'Follow up with venue about catering arrangements', 'queued', 'urgent', 'wedding'),
            ('Update dashboard UI', 'Implement new dark theme for command center', 'completed', 'normal', 'tech'),
            ('Daily system backup', 'Verify all systems backed up successfully', 'queued', 'normal', 'tech')
        ]
        
        for title, desc, status, priority, category in sample_tasks:
            cur.execute("""
                INSERT INTO tasks (title, description, status, priority, category)
                VALUES (%s, %s, %s, %s, %s)
            """, (title, desc, status, priority, category))
    
    # Sample scheduled jobs
    cur.execute("SELECT COUNT(*) FROM scheduled_jobs")
    job_count = cur.fetchone()[0]
    
    if job_count == 0:
        sample_jobs = [
            ('Daily Backup', '0 2 * * *', 'active', 'cron'),
            ('Parking Revenue Sync', '*/30 * * * *', 'active', 'sync'),
            ('System Health Check', '*/15 * * * *', 'active', 'heartbeat'),
            ('Weekly Reports', '0 9 * * 1', 'active', 'cron')
        ]
        
        for name, schedule, status, job_type in sample_jobs:
            cur.execute("""
                INSERT INTO scheduled_jobs (name, schedule, status, job_type)
                VALUES (%s, %s, %s, %s)
            """, (name, schedule, status, job_type))
    
    # Sample activity log entries
    cur.execute("SELECT COUNT(*) FROM activity_log")
    activity_count = cur.fetchone()[0]
    
    if activity_count == 0:
        sample_activities = [
            ('heartbeat', 'System health check completed', 'main'),
            ('task_created', 'New parking task created', 'web'),
            ('cron_run', 'Daily backup job completed successfully', 'subagent'),
            ('chat', 'User message received', 'web')
        ]
        
        for action, summary, session_type in sample_activities:
            cur.execute("""
                INSERT INTO activity_log (action, summary, session_type)
                VALUES (%s, %s, %s)
            """, (action, summary, session_type))
    
    # Sample chat messages
    cur.execute("SELECT COUNT(*) FROM chat_messages")
    chat_count = cur.fetchone()[0]
    
    if chat_count == 0:
        sample_chats = [
            ('user', 'Hey Drew, how are the parking metrics looking today?', 'web'),
            ('assistant', 'Looking good! Revenue is up 12% from yesterday. All payment systems are running smoothly. 🦊', 'web'),
            ('user', 'Great! Can you check if there are any venue tasks for the wedding?', 'web'),
            ('assistant', 'I found 3 wedding-related tasks in your queue. The venue coordination is marked as urgent - shall I prioritize that?', 'web')
        ]
        
        for role, content, channel in sample_chats:
            cur.execute("""
                INSERT INTO chat_messages (role, content, channel)
                VALUES (%s, %s, %s)
            """, (role, content, channel))
    
    # Initialize default active model
    cur.execute("SELECT COUNT(*) FROM settings WHERE key = 'active_model'")
    settings_count = cur.fetchone()[0]
    
    if settings_count == 0:
        cur.execute("""
            INSERT INTO settings (key, value)
            VALUES ('active_model', 'anthropic/claude-opus-4-6')
        """)
    
        conn.commit()
        cur.close()
        conn.close()
        print("✅ Database initialized successfully!")
        return True
    
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        if conn:
            conn.close()
        return False

if __name__ == '__main__':
    init_db()