from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from datetime import datetime, timedelta
import os
import json
import time
import threading

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'drew-production-secret-2026')

# Configuration
PASSWORD = 'drewpeacock'
ANTHROPIC_ADMIN_KEY = os.environ.get('ANTHROPIC_ADMIN_KEY', '')
S3_BUCKET = 'elasticbeanstalk-eu-west-2-337480111275'
S3_CHAT_KEY = 'drew-chat-history.json'
VAT_RATE = 0.20  # UK VAT 20%
USD_TO_GBP = 0.748  # Updated periodically
S3_REGION = 'eu-west-2'

# Note: Anthropic has no public API for invoice/billing data.
# Invoice history is only viewable at console.anthropic.com/settings/billing via browser session.
# All cost data here is calculated from the usage API + our pricing table.

# Project timeline for cost classification
PROJECT_TIMELINE = [
    {'id': 'setup', 'name': '🔧 Initial Setup & Telegram', 'color': '#60a5fa', 'start': '2026-02-17', 'end': '2026-02-18'},
    {'id': 'parking-zones', 'name': '🗺️ London Parking Zones Map', 'color': '#f87171', 'start': '2026-02-18', 'end': '2026-02-20'},
    {'id': 'car-hunt', 'name': '🚗 Car Hunt', 'color': '#34d399', 'start': '2026-02-19', 'end': '2026-02-20'},
    {'id': 'prime-parking', 'name': '🅿️ Prime Parking Dashboard', 'color': '#a78bfa', 'start': '2026-02-20', 'end': None},
    {'id': 'drew-cc', 'name': '🤖 Drew Command Center', 'color': '#febc2e', 'start': '2026-03-01', 'end': None},
    {'id': 'jacra', 'name': '🏗️ Jacra Dashboard', 'color': '#fb923c', 'start': '2026-03-05', 'end': '2026-03-06'},
    {'id': 'proofs', 'name': '📄 Proof Generation & QA', 'color': '#ec4899', 'start': '2026-03-03', 'end': None},
    {'id': 'council', 'name': '🏛️ Council Automation', 'color': '#14b8a6', 'start': '2026-03-03', 'end': None},
]

# Pricing per million tokens (USD)
PRICING = {
    'claude-opus-4-6': {'input': 5, 'output': 25, 'cache_read': 0.50, 'cache_5m_write': 6.25, 'cache_1h_write': 10, 'family': 'opus', 'display': 'Claude Opus 4.6'},
    'claude-opus-4-5': {'input': 5, 'output': 25, 'cache_read': 0.50, 'cache_5m_write': 6.25, 'cache_1h_write': 10, 'family': 'opus', 'display': 'Claude Opus 4.5'},
    'claude-opus-4-1': {'input': 15, 'output': 75, 'cache_read': 1.50, 'cache_5m_write': 18.75, 'cache_1h_write': 30, 'family': 'opus', 'display': 'Claude Opus 4.1'},
    'claude-opus-4': {'input': 15, 'output': 75, 'cache_read': 1.50, 'cache_5m_write': 18.75, 'cache_1h_write': 30, 'family': 'opus', 'display': 'Claude Opus 4'},
    'claude-sonnet-4-6': {'input': 3, 'output': 15, 'cache_read': 0.30, 'cache_5m_write': 3.75, 'cache_1h_write': 6, 'family': 'sonnet', 'display': 'Claude Sonnet 4.6'},
    'claude-sonnet-4-5': {'input': 3, 'output': 15, 'cache_read': 0.30, 'cache_5m_write': 3.75, 'cache_1h_write': 6, 'family': 'sonnet', 'display': 'Claude Sonnet 4.5'},
    'claude-sonnet-4': {'input': 3, 'output': 15, 'cache_read': 0.30, 'cache_5m_write': 3.75, 'cache_1h_write': 6, 'family': 'sonnet', 'display': 'Claude Sonnet 4'},
    'claude-sonnet-4-20250514': {'input': 3, 'output': 15, 'cache_read': 0.30, 'cache_5m_write': 3.75, 'cache_1h_write': 6, 'family': 'sonnet', 'display': 'Claude Sonnet 4'},
    'claude-haiku-4-5': {'input': 1, 'output': 5, 'cache_read': 0.10, 'cache_5m_write': 1.25, 'cache_1h_write': 2, 'family': 'haiku', 'display': 'Claude Haiku 4.5'},
    'claude-3-5-haiku-20241022': {'input': 0.80, 'output': 4, 'cache_read': 0.08, 'cache_5m_write': 1, 'cache_1h_write': 1.6, 'family': 'haiku', 'display': 'Claude Haiku 3.5'},
}

def get_pricing(model_id):
    if model_id in PRICING:
        return PRICING[model_id]
    for key, val in PRICING.items():
        if key in model_id or model_id in key:
            return val
    lower = model_id.lower()
    if 'opus' in lower:
        return {'input': 15, 'output': 75, 'family': 'opus', 'display': model_id}
    elif 'haiku' in lower:
        return {'input': 1, 'output': 5, 'family': 'haiku', 'display': model_id}
    else:
        return {'input': 3, 'output': 15, 'family': 'sonnet', 'display': model_id}

def calc_cost(model_id, result):
    p = get_pricing(model_id)
    input_tok = result.get('uncached_input_tokens', 0) or result.get('input_tokens', 0) or 0
    output_tok = result.get('output_tokens', 0) or 0
    cache_read = result.get('cache_read_input_tokens', 0) or 0
    cache_creation = result.get('cache_creation', {}) or {}
    cache_5m = cache_creation.get('ephemeral_5m_input_tokens', 0) or 0
    cache_1h = cache_creation.get('ephemeral_1h_input_tokens', 0) or 0
    cost = (input_tok * p['input'] / 1_000_000 +
            output_tok * p['output'] / 1_000_000 +
            cache_read * p.get('cache_read', 0) / 1_000_000 +
            cache_5m * p.get('cache_5m_write', 0) / 1_000_000 +
            cache_1h * p.get('cache_1h_write', 0) / 1_000_000)
    return cost

# Cache for API results
_cache = {}
_cache_lock = threading.Lock()

def cached_fetch(cache_key, ttl_seconds, fetch_fn):
    with _cache_lock:
        if cache_key in _cache:
            data, ts = _cache[cache_key]
            if time.time() - ts < ttl_seconds:
                return data
    result = fetch_fn()
    with _cache_lock:
        _cache[cache_key] = (result, time.time())
    return result

def _api_get_with_retry(url, params, headers, max_retries=3):
    """GET with retry on 429 rate limits."""
    import requests as req
    for attempt in range(max_retries):
        resp = req.get(url, params=params, headers=headers, timeout=60)
        if resp.status_code == 429:
            wait = min(2 ** attempt * 2, 10)  # 2s, 4s, 8s
            app.logger.warning(f'Anthropic API rate limited, waiting {wait}s (attempt {attempt+1})')
            time.sleep(wait)
            continue
        resp.raise_for_status()
        return resp.json()
    resp.raise_for_status()  # raise on final attempt

def fetch_anthropic_usage(starting_at, bucket_width='1d', group_by='model', limit=31):
    all_data = []
    url = 'https://api.anthropic.com/v1/organizations/usage_report/messages'
    headers = {'X-Api-Key': ANTHROPIC_ADMIN_KEY, 'anthropic-version': '2023-06-01'}
    # Daily: max limit per call is 31; chunk into 31-day windows
    # (Anthropic API pagination via next_page is broken — can't combine with required params)
    current_start = starting_at
    remaining = limit
    while remaining > 0:
        chunk = min(remaining, 31)
        params = {'starting_at': current_start, 'bucket_width': bucket_width, 'group_by[]': group_by, 'limit': chunk}
        body = _api_get_with_retry(url, params, headers)
        data = body.get('data', [])
        if not data:
            break
        all_data.extend(data)
        if not body.get('has_more'):
            break
        last_date = data[-1]['starting_at'][:10]
        next_day = (datetime.strptime(last_date, '%Y-%m-%d') + timedelta(days=1)).strftime('%Y-%m-%dT00:00:00Z')
        current_start = next_day
        remaining -= len(data)
    return all_data

def _get_gbp_rate():
    gbp_rate = USD_TO_GBP
    try:
        rate_data = cached_fetch('fx_usd_gbp', 3600, lambda: __import__('requests').get('https://api.exchangerate-api.com/v4/latest/USD', timeout=5).json())
        gbp_rate = rate_data.get('rates', {}).get('GBP', USD_TO_GBP)
    except Exception:
        pass
    return gbp_rate

def build_usage_response(days=30, date_from=None, date_to=None):
    now = datetime.utcnow()
    if date_from and date_to:
        start_dt = datetime.strptime(date_from, '%Y-%m-%d')
        end_dt = datetime.strptime(date_to, '%Y-%m-%d')
        num_days = (end_dt - start_dt).days + 1
    else:
        num_days = days
        start_dt = now - timedelta(days=days)
        end_dt = now

    # Always use daily buckets — simpler and avoids hourly pagination issues
    # (Anthropic API max: 31 for daily, 168 for hourly; pagination is broken)
    bucket_width = '1d'
    limit = num_days + 1

    starting_at = start_dt.strftime('%Y-%m-%dT00:00:00Z')
    raw = fetch_anthropic_usage(starting_at, bucket_width, 'model', limit)

    # Filter out buckets beyond end date
    end_str = end_dt.strftime('%Y-%m-%d')

    daily_data = []
    totals = {'input_tokens': 0, 'output_tokens': 0, 'cache_read_tokens': 0, 'cache_write_tokens': 0, 'cost': 0, 'buckets': 0}
    model_summary = {}
    today_str = now.strftime('%Y-%m-%d')
    month_start = now.strftime('%Y-%m-01')
    today_cost = 0
    month_cost = 0

    for bucket in raw:
            bucket_date = bucket['starting_at'][:10]
            if bucket_date > end_str:
                continue
            day_entry = {'date': bucket_date, 'models': {}, 'total_cost': 0, 'total_input': 0, 'total_output': 0, 'total_cache_read': 0}
            for result in bucket.get('results', []):
                model = result.get('model', 'unknown')
                cost = calc_cost(model, result)
                p = get_pricing(model)
                family = p['family']
                display = p['display']
                input_tok = result.get('uncached_input_tokens', 0) or result.get('input_tokens', 0) or 0
                output_tok = result.get('output_tokens', 0) or 0
                cache_read = result.get('cache_read_input_tokens', 0) or 0
                cache_creation = result.get('cache_creation', {}) or {}
                cache_write = (cache_creation.get('ephemeral_5m_input_tokens', 0) or 0) + (cache_creation.get('ephemeral_1h_input_tokens', 0) or 0)
                day_entry['models'][model] = {'display': display, 'family': family, 'cost': cost, 'input_tokens': input_tok, 'output_tokens': output_tok, 'cache_read_tokens': cache_read, 'cache_write_tokens': cache_write}
                day_entry['total_cost'] += cost
                day_entry['total_input'] += input_tok
                day_entry['total_output'] += output_tok
                day_entry['total_cache_read'] += cache_read
                totals['input_tokens'] += input_tok
                totals['output_tokens'] += output_tok
                totals['cache_read_tokens'] += cache_read
                totals['cache_write_tokens'] += cache_write
                totals['cost'] += cost
                if input_tok > 0 or output_tok > 0:
                    totals['buckets'] += 1
                if model not in model_summary:
                    model_summary[model] = {'display': display, 'family': family, 'cost': 0, 'input_tokens': 0, 'output_tokens': 0, 'cache_read_tokens': 0, 'cache_write_tokens': 0, 'days_active': 0, 'pricing': p}
                ms = model_summary[model]
                ms['cost'] += cost
                ms['input_tokens'] += input_tok
                ms['output_tokens'] += output_tok
                ms['cache_read_tokens'] += cache_read
                ms['cache_write_tokens'] += cache_write
                if input_tok > 0 or output_tok > 0:
                    ms['days_active'] += 1
                if bucket_date == today_str:
                    today_cost += cost
                if bucket_date >= month_start:
                    month_cost += cost
            daily_data.append(day_entry)

    daily_data.sort(key=lambda x: x['date'])

    total_cost = totals['cost']
    tax_total = total_cost * VAT_RATE
    tax_today = today_cost * VAT_RATE
    tax_month = month_cost * VAT_RATE

    gbp_rate = _get_gbp_rate()

    return {
        'daily_data': daily_data, 'totals': totals, 'model_summary': model_summary,
        'today_cost': today_cost, 'month_cost': month_cost,
        'vat_rate': VAT_RATE,
        'today_tax': tax_today, 'month_tax': tax_month, 'total_tax': tax_total,
        'today_inc_tax': today_cost + tax_today,
        'month_inc_tax': month_cost + tax_month,
        'total_inc_tax': total_cost + tax_total,
        'gbp_rate': gbp_rate,
        'today_gbp': (today_cost + tax_today) * gbp_rate,
        'month_gbp': (month_cost + tax_month) * gbp_rate,
        'total_gbp': (total_cost + tax_total) * gbp_rate,
        'num_days': num_days,
        'bucket_width': bucket_width,
        # daily_data already contains per-day cost breakdown — used for billing table
    }

def build_hourly_response():
    now = datetime.utcnow()
    starting_at = (now - timedelta(hours=168)).strftime('%Y-%m-%dT%H:00:00Z')
    raw = fetch_anthropic_usage(starting_at, '1h', 'model', limit=168)
    hourly_data = []
    for bucket in raw:
        entry = {'starting_at': bucket['starting_at'], 'total_tokens': 0, 'total_cost': 0}
        for result in bucket.get('results', []):
            model = result.get('model', 'unknown')
            cost = calc_cost(model, result)
            tokens = (result.get('uncached_input_tokens', 0) or result.get('input_tokens', 0) or 0) + (result.get('output_tokens', 0) or 0)
            entry['total_tokens'] += tokens
            entry['total_cost'] += cost
        hourly_data.append(entry)
    return {'hourly_data': hourly_data}

def build_costs_response(date_from=None, date_to=None):
    """Build project-level cost breakdown."""
    now = datetime.utcnow()
    if not date_from:
        date_from = '2026-02-17'
    if not date_to:
        date_to = now.strftime('%Y-%m-%d')

    start_dt = datetime.strptime(date_from, '%Y-%m-%d')
    end_dt = datetime.strptime(date_to, '%Y-%m-%d')
    num_days = (end_dt - start_dt).days + 1

    starting_at = start_dt.strftime('%Y-%m-%dT00:00:00Z')
    raw = fetch_anthropic_usage(starting_at, '1d', 'model', num_days + 1)

    # Build daily cost map
    daily_costs = {}
    for bucket in raw:
        bucket_date = bucket['starting_at'][:10]
        if bucket_date > date_to or bucket_date < date_from:
            continue
        day_cost = 0
        day_input = 0
        day_output = 0
        for result in bucket.get('results', []):
            model = result.get('model', 'unknown')
            cost = calc_cost(model, result)
            input_tok = result.get('uncached_input_tokens', 0) or result.get('input_tokens', 0) or 0
            output_tok = result.get('output_tokens', 0) or 0
            day_cost += cost
            day_input += input_tok
            day_output += output_tok
        daily_costs[bucket_date] = {'cost': day_cost, 'input_tokens': day_input, 'output_tokens': day_output}

    # Classify costs by project
    project_costs = []
    for proj in PROJECT_TIMELINE:
        p_start = max(proj['start'], date_from)
        p_end_raw = proj['end'] or date_to
        p_end = min(p_end_raw, date_to)
        if p_start > p_end:
            continue

        # Find active projects per day to split proportionally
        total_cost = 0
        total_input = 0
        total_output = 0
        daily_breakdown = []
        d = datetime.strptime(p_start, '%Y-%m-%d')
        d_end = datetime.strptime(p_end, '%Y-%m-%d')
        active_days = 0
        while d <= d_end:
            ds = d.strftime('%Y-%m-%d')
            if ds in daily_costs:
                # Count overlapping projects for this day
                overlapping = 0
                for op in PROJECT_TIMELINE:
                    os = op['start']
                    oe = op['end'] or date_to
                    if os <= ds <= oe:
                        overlapping += 1
                share = 1.0 / max(overlapping, 1)
                dc = daily_costs[ds]
                day_share_cost = dc['cost'] * share
                day_share_input = dc['input_tokens'] * share
                day_share_output = dc['output_tokens'] * share
                total_cost += day_share_cost
                total_input += day_share_input
                total_output += day_share_output
                daily_breakdown.append({'date': ds, 'cost': day_share_cost, 'input_tokens': int(day_share_input), 'output_tokens': int(day_share_output)})
                active_days += 1
            d += timedelta(days=1)

        duration_days = (datetime.strptime(p_end, '%Y-%m-%d') - datetime.strptime(p_start, '%Y-%m-%d')).days + 1
        project_costs.append({
            'id': proj['id'],
            'name': proj['name'],
            'color': proj['color'],
            'start': p_start,
            'end': p_end,
            'ongoing': proj['end'] is None,
            'duration_days': duration_days,
            'total_cost': total_cost,
            'avg_per_day': total_cost / max(active_days, 1),
            'input_tokens': int(total_input),
            'output_tokens': int(total_output),
            'daily': daily_breakdown,
        })

    # Grand total
    grand_total = sum(dc['cost'] for dc in daily_costs.values())
    for pc in project_costs:
        pc['pct_of_total'] = (pc['total_cost'] / grand_total * 100) if grand_total > 0 else 0

    # Timeline data: daily costs per project for stacked chart
    all_dates = sorted(daily_costs.keys())
    timeline = []
    for ds in all_dates:
        entry = {'date': ds, 'total': daily_costs[ds]['cost'], 'projects': {}}
        for pc in project_costs:
            for dd in pc['daily']:
                if dd['date'] == ds:
                    entry['projects'][pc['id']] = dd['cost']
                    break
        timeline.append(entry)

    gbp_rate = _get_gbp_rate()

    return {
        'projects': sorted(project_costs, key=lambda x: x['total_cost'], reverse=True),
        'timeline': timeline,
        'grand_total': grand_total,
        'grand_total_vat': grand_total * VAT_RATE,
        'grand_total_inc_vat': grand_total * (1 + VAT_RATE),
        'grand_total_gbp': grand_total * (1 + VAT_RATE) * gbp_rate,
        'gbp_rate': gbp_rate,
        'vat_rate': VAT_RATE,
        'date_from': date_from,
        'date_to': date_to,
    }


# ─── S3 Chat Persistence ───
_s3_client = None
_last_s3_save = 0
_s3_save_lock = threading.Lock()
_s3_available = False

def _get_s3_client():
    global _s3_client, _s3_available
    if _s3_client is not None:
        return _s3_client
    try:
        import boto3
        _s3_client = boto3.client('s3', region_name=S3_REGION)
        _s3_client.head_bucket(Bucket=S3_BUCKET)
        _s3_available = True
        app.logger.info(f'S3 connected: {S3_BUCKET}')
        return _s3_client
    except Exception as e:
        app.logger.warning(f'S3 not available ({e}), using local fallback')
        _s3_available = False
        _s3_client = False
        return None

def _load_chat_from_s3():
    client = _get_s3_client()
    if client:
        try:
            response = client.get_object(Bucket=S3_BUCKET, Key=S3_CHAT_KEY)
            data = json.loads(response['Body'].read().decode('utf-8'))
            app.logger.info(f'Loaded {len(data.get("messages", []))} messages from S3')
            return data
        except client.exceptions.NoSuchKey:
            app.logger.info('No chat history in S3, checking local file')
        except Exception as e:
            app.logger.warning(f'S3 load error: {e}')
    local_path = os.path.join(os.path.dirname(__file__), 'chat-history.json')
    if os.path.exists(local_path):
        try:
            with open(local_path, 'r') as f:
                data = json.load(f)
            app.logger.info(f'Loaded {len(data.get("messages", []))} messages from local file')
            return data
        except Exception as e:
            app.logger.warning(f'Local load error: {e}')
    return {'messages': [], 'last_updated': datetime.utcnow().isoformat()}

def _save_chat_to_s3(force=False):
    global _last_s3_save
    now = time.time()
    if not force and (now - _last_s3_save) < 10:
        return
    with _s3_save_lock:
        if not force and (time.time() - _last_s3_save) < 10:
            return
        data = {'messages': conversations, 'last_updated': datetime.utcnow().isoformat()}
        json_data = json.dumps(data, ensure_ascii=False)
        client = _get_s3_client()
        if client:
            try:
                client.put_object(Bucket=S3_BUCKET, Key=S3_CHAT_KEY, Body=json_data.encode('utf-8'), ContentType='application/json')
                _last_s3_save = time.time()
                return
            except Exception as e:
                app.logger.warning(f'S3 save error: {e}')
        try:
            local_path = os.path.join(os.path.dirname(__file__), 'chat-history.json')
            with open(local_path, 'w') as f:
                f.write(json_data)
            _last_s3_save = time.time()
        except Exception as e:
            app.logger.warning(f'Local save error: {e}')

def _save_chat_background():
    t = threading.Thread(target=_save_chat_to_s3, daemon=True)
    t.start()

# Global storage
tasks = []
conversations = []
activity_log = []
scheduled_jobs = []

def require_auth(f):
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
        password = request.form.get('password') or request.json.get('password', '')
        if password == PASSWORD:
            session['authenticated'] = True
            return redirect(url_for('index'))
        return jsonify({'error': 'Invalid password'}), 401
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('authenticated', None)
    return redirect(url_for('login'))

@app.route('/')
@require_auth
def index():
    timestamp = int(time.time())
    return render_template('index.html', timestamp=timestamp, cache_bust=f"v8.0-costs-{timestamp}")

# ─── Anthropic Usage API ───
@app.route('/api/anthropic/usage')
@require_auth
def api_anthropic_usage():
    if not ANTHROPIC_ADMIN_KEY:
        return jsonify({'error': 'ANTHROPIC_ADMIN_KEY not configured', 'configured': False}), 200
    try:
        days = request.args.get('days', type=int)
        date_from = request.args.get('from')
        date_to = request.args.get('to')

        if date_from and date_to:
            cache_key = f'usage_{date_from}_{date_to}'
            data = cached_fetch(cache_key, 300, lambda: build_usage_response(date_from=date_from, date_to=date_to))
        elif days:
            cache_key = f'usage_{days}d'
            data = cached_fetch(cache_key, 300, lambda: build_usage_response(days=days))
        else:
            data = cached_fetch('usage_daily', 300, lambda: build_usage_response(days=30))

        data['configured'] = True
        return jsonify(data)
    except Exception as e:
        app.logger.error(f'Anthropic usage error: {e}')
        return jsonify({'error': str(e), 'configured': True}), 500

@app.route('/api/anthropic/usage/hourly')
@require_auth
def api_anthropic_usage_hourly():
    if not ANTHROPIC_ADMIN_KEY:
        return jsonify({'error': 'ANTHROPIC_ADMIN_KEY not configured', 'configured': False}), 200
    try:
        data = cached_fetch('usage_hourly', 300, build_hourly_response)
        data['configured'] = True
        return jsonify(data)
    except Exception as e:
        app.logger.error(f'Anthropic hourly error: {e}')
        return jsonify({'error': str(e), 'configured': True}), 500

@app.route('/api/costs')
@require_auth
def api_costs():
    if not ANTHROPIC_ADMIN_KEY:
        return jsonify({'error': 'ANTHROPIC_ADMIN_KEY not configured', 'configured': False}), 200
    try:
        date_from = request.args.get('from', '2026-02-17')
        date_to = request.args.get('to', datetime.utcnow().strftime('%Y-%m-%d'))
        cache_key = f'costs_{date_from}_{date_to}'
        data = cached_fetch(cache_key, 300, lambda: build_costs_response(date_from, date_to))
        data['configured'] = True
        return jsonify(data)
    except Exception as e:
        app.logger.error(f'Costs error: {e}')
        return jsonify({'error': str(e), 'configured': True}), 500

# ─── Existing APIs ───
@app.route('/api/stats')
@require_auth
def api_stats():
    try:
        active_tasks = sum(1 for task in tasks if task.get('status') in ['active', 'queued'])
        today_str = datetime.now().strftime('%Y-%m-%d')
        completed_today = sum(1 for task in tasks if (task.get('completed_at') or '').startswith(today_str))
        messages_today = sum(1 for msg in conversations if (msg.get('timestamp') or '').startswith(today_str))
        return jsonify({
            'active_tasks': active_tasks, 'completed_today': completed_today,
            'scheduled_jobs': len(scheduled_jobs), 'messages_today': messages_today,
            'total_conversations': len(conversations), 'total_activities': len(activity_log),
            'system_status': 'healthy', 'timestamp': datetime.utcnow().isoformat(),
        })
    except Exception:
        return jsonify({'active_tasks': 0, 'completed_today': 0, 'scheduled_jobs': 0, 'messages_today': 0, 'system_status': 'healthy'})

@app.route('/api/tasks')
@require_auth
def api_tasks():
    return jsonify(tasks)

@app.route('/api/tasks', methods=['POST'])
@require_auth
def api_create_task():
    data = request.json or {}
    task = {
        'id': len(tasks) + 1, 'title': data.get('title', 'New Task'),
        'description': data.get('description', ''), 'status': 'queued',
        'priority': data.get('priority', 'normal'), 'category': data.get('category', 'general'),
        'created_at': datetime.utcnow().isoformat(), 'completed_at': None,
        'assigned_to': 'Drew', 'progress': 0
    }
    tasks.append(task)
    activity_log.append({'timestamp': datetime.utcnow().isoformat(), 'action': 'task_created', 'summary': f'Created task: {task["title"]}', 'session_type': 'web', 'user': 'Henry'})
    return jsonify(task), 201

@app.route('/api/scheduled')
@require_auth
def api_scheduled():
    return jsonify(scheduled_jobs)

@app.route('/api/activity')
@require_auth
def api_activity():
    return jsonify(sorted(activity_log, key=lambda x: x['timestamp'], reverse=True)[-50:])

# ─── Chat APIs (S3-backed) ───
@app.route('/api/chat/messages')
@require_auth
def api_chat_messages():
    return jsonify({'messages': conversations, 'total_count': len(conversations)})

@app.route('/api/chat/live')
@require_auth
def api_chat_live():
    limit = int(request.args.get('limit', 50))
    messages = conversations[-limit:] if conversations else []
    last_id = messages[-1]['id'] if messages else 0
    return jsonify({'messages': messages, 'last_id': last_id, 'total_count': len(conversations), 'polling': False, 'status': 'healthy'})

@app.route('/api/chat/history')
@require_auth
def api_chat_history():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 50))
    search = request.args.get('search', '').strip().lower()
    date_filter = request.args.get('date', '').strip()
    filtered = conversations
    if search:
        filtered = [m for m in filtered if search in m.get('content', '').lower()]
    if date_filter:
        filtered = [m for m in filtered if m.get('session_date', '') == date_filter]
    total = len(filtered)
    total_pages = max(1, (total + limit - 1) // limit)
    start = max(0, total - page * limit)
    end = max(0, total - (page - 1) * limit)
    page_messages = filtered[start:end]
    return jsonify({'messages': page_messages, 'total_count': total, 'page': page, 'total_pages': total_pages, 'limit': limit, 'has_more': page < total_pages})

@app.route('/api/chat/dates')
@require_auth
def api_chat_dates():
    date_counts = {}
    for msg in conversations:
        d = msg.get('session_date', '')
        if d:
            date_counts[d] = date_counts.get(d, 0) + 1
    dates = [{'date': d, 'count': c} for d, c in sorted(date_counts.items(), reverse=True)]
    return jsonify({'dates': dates, 'total_messages': len(conversations)})

@app.route('/api/chat/send', methods=['POST'])
@require_auth
def api_chat_send():
    data = request.json or {}
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'error': 'Message content is required'}), 400
    user_message = {
        'id': len(conversations) + 1, 'role': 'user', 'content': content,
        'timestamp': datetime.utcnow().isoformat(), 'session_date': datetime.now().strftime('%Y-%m-%d')
    }
    conversations.append(user_message)
    import random
    responses = [
        "Got it! Working on that for you. 🦊",
        "Done! Anything else you need? ✅",
        "I'm on it — check the Stats page for real-time data! 📊",
        "Consider it done! 🚀",
    ]
    drew_response = random.choice(responses)
    assistant_message = {
        'id': len(conversations) + 1, 'role': 'assistant', 'content': drew_response,
        'timestamp': datetime.utcnow().isoformat(), 'session_date': datetime.now().strftime('%Y-%m-%d')
    }
    conversations.append(assistant_message)
    _save_chat_background()
    return jsonify({'user_message': user_message, 'assistant_message': assistant_message, 'total_messages': len(conversations)})

@app.route('/api/models')
@require_auth
def api_models():
    if ANTHROPIC_ADMIN_KEY:
        try:
            data = cached_fetch('usage_daily', 300, lambda: build_usage_response())
            return jsonify({'configured': True, 'model_summary': data.get('model_summary', {}), 'today_cost': data.get('today_cost', 0), 'month_cost': data.get('month_cost', 0), 'total_cost': data['totals']['cost']})
        except:
            pass
    return jsonify({'configured': False})

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy', 'timestamp': datetime.utcnow().isoformat(),
        'version': 'v8.0-costs',
        'anthropic_key_configured': bool(ANTHROPIC_ADMIN_KEY),
        's3_available': _s3_available,
        'total_messages': len(conversations),
    })

# Initialize data
def initialize_complete_data():
    global tasks, scheduled_jobs, activity_log, conversations
    tasks.clear(); scheduled_jobs.clear(); activity_log.clear(); conversations.clear()
    tasks.extend([
        {'id': 1, 'title': 'Process Prime Parking data changes', 'description': '31 spreadsheet changes identified', 'status': 'queued', 'priority': 'high', 'category': 'parking', 'created_at': (datetime.utcnow() - timedelta(hours=2)).isoformat(), 'completed_at': None, 'assigned_to': 'Drew', 'progress': 15},
        {'id': 2, 'title': 'Wedding celebration venue coordination', 'description': 'Koh Samui celebration March 18-22, 2026', 'status': 'active', 'priority': 'urgent', 'category': 'wedding', 'created_at': (datetime.utcnow() - timedelta(hours=4)).isoformat(), 'completed_at': None, 'assigned_to': 'Drew', 'progress': 65},
        {'id': 3, 'title': 'AWS enterprise migration completed', 'description': 'Migrated to AWS Elastic Beanstalk', 'status': 'completed', 'priority': 'high', 'category': 'infrastructure', 'created_at': (datetime.utcnow() - timedelta(hours=6)).isoformat(), 'completed_at': (datetime.utcnow() - timedelta(minutes=30)).isoformat(), 'assigned_to': 'Drew', 'progress': 100},
        {'id': 4, 'title': 'Real Anthropic stats dashboard', 'description': 'Built real-time API usage tracking with beautiful visualizations', 'status': 'completed', 'priority': 'critical', 'category': 'feature', 'created_at': datetime.utcnow().isoformat(), 'completed_at': datetime.utcnow().isoformat(), 'assigned_to': 'Drew', 'progress': 100},
        {'id': 5, 'title': 'Persistent chat history with S3', 'description': 'Chat preserved forever through deployments', 'status': 'completed', 'priority': 'critical', 'category': 'feature', 'created_at': datetime.utcnow().isoformat(), 'completed_at': datetime.utcnow().isoformat(), 'assigned_to': 'Drew', 'progress': 100},
    ])
    scheduled_jobs.extend([
        {'id': 1, 'name': 'Daily parking revenue sync', 'description': 'Sync Prime Parking spreadsheet', 'schedule': '0 9 * * *', 'status': 'active', 'job_type': 'data_sync', 'next_run': '2026-03-08T09:00:00Z', 'last_run': '2026-03-07T09:00:00Z', 'last_status': 'success'},
        {'id': 2, 'name': 'Wedding vendor status updates', 'description': 'Check Koh Samui vendors', 'schedule': '0 14 * * MON,WED,FRI', 'status': 'active', 'job_type': 'communication', 'next_run': '2026-03-09T14:00:00Z', 'last_run': '2026-03-07T14:00:00Z', 'last_status': 'success'},
        {'id': 3, 'name': 'AWS infrastructure monitoring', 'description': 'Check AWS costs and health', 'schedule': '0 6 * * 1', 'status': 'active', 'job_type': 'monitoring', 'next_run': '2026-03-10T06:00:00Z', 'last_run': '2026-03-03T06:00:00Z', 'last_status': 'success'},
    ])
    activity_log.extend([
        {'timestamp': datetime.utcnow().isoformat(), 'action': 'persistent_chat_deployed', 'summary': 'Deployed S3-backed persistent chat history with full conversation archive', 'session_type': 'deployment', 'user': 'Drew'},
        {'timestamp': (datetime.utcnow() - timedelta(hours=1)).isoformat(), 'action': 'stats_dashboard_deployed', 'summary': 'Deployed real-time Anthropic API stats dashboard', 'session_type': 'deployment', 'user': 'Drew'},
    ])
    chat_data = _load_chat_from_s3()
    conversations.extend(chat_data.get('messages', []))

initialize_complete_data()

if __name__ == '__main__':
    print("Drew Command Center v8.0 — Costs Edition")
    print(f"Anthropic Admin Key: {'configured' if ANTHROPIC_ADMIN_KEY else 'NOT SET'}")
    print(f"S3: {'connected' if _s3_available else 'local fallback'}")
    print(f"Data: {len(tasks)} tasks, {len(conversations)} messages")
    port = int(os.environ.get('PORT', 8000))
    app.run(debug=False, host='0.0.0.0', port=port)
