# ─────────────────────────────────────────
# APP.PY - Flask Backend
# Job: Save workouts, track history, 
#       return summaries and personal bests
# ─────────────────────────────────────────

from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import datetime
import os

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────
# DATABASE SETUP
# SQLite is a simple database
# It saves everything in one file: workout.db
# Think of it like Excel but for code
# ─────────────────────────────────────────
DB_PATH = 'workouts.db'

def init_db():
    # Connect to database (creates file if not exists)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create table if it doesn't exist
    # A table is like a spreadsheet with columns
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS workouts (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            exercise   TEXT    NOT NULL,
            reps       INTEGER NOT NULL,
            duration   INTEGER NOT NULL,
            date       TEXT    NOT NULL,
            time       TEXT    NOT NULL
        )
    ''')

    conn.commit()
    conn.close()
    print('Database ready!')

# Run database setup when server starts
init_db()


# ─────────────────────────────────────────
# HELPER - get database connection
# ─────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    # This makes rows return as dictionaries
    # So we get {'exercise': 'pushup'} instead of ('pushup',)
    conn.row_factory = sqlite3.Row
    return conn


# ─────────────────────────────────────────
# ROUTE 1 - Test server is running
# ─────────────────────────────────────────
@app.route('/')
def home():
    return jsonify({ 'status': 'Rep Counter backend running!' })


# ─────────────────────────────────────────
# ROUTE 2 - Save a workout
# JS calls this when user finishes a session
# ─────────────────────────────────────────
@app.route('/save-workout', methods=['POST'])
def save_workout():
    try:
        data     = request.get_json()
        exercise = data['exercise']
        reps     = data['reps']
        duration = data['duration']  # seconds

        # Get current date and time
        now  = datetime.datetime.now()
        date = now.strftime('%Y-%m-%d')   # 2024-01-15
        time = now.strftime('%H:%M:%S')   # 14:30:00

        # Save to database
        conn   = get_db()
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO workouts (exercise, reps, duration, date, time)
            VALUES (?, ?, ?, ?, ?)
        ''', (exercise, reps, duration, date, time))

        conn.commit()

        # Get personal best for this exercise
        cursor.execute('''
            SELECT MAX(reps) as best
            FROM workouts
            WHERE exercise = ?
        ''', (exercise,))

        best = cursor.fetchone()['best']

        # Get total reps ever for this exercise
        cursor.execute('''
            SELECT SUM(reps) as total
            FROM workouts
            WHERE exercise = ?
        ''', (exercise,))

        total = cursor.fetchone()['total']

        # Get how many times user did this exercise
        cursor.execute('''
            SELECT COUNT(*) as sessions
            FROM workouts
            WHERE exercise = ?
        ''', (exercise,))

        sessions = cursor.fetchone()['sessions']

        conn.close()

        # Check if this is a new personal best!
        is_new_best = reps >= best

        # Send summary back to frontend
        return jsonify({
            'success'    : True,
            'message'    : 'Workout saved!',
            'summary'    : {
                'exercise'   : exercise,
                'reps'       : reps,
                'duration'   : duration,
                'date'       : date,
                'personalBest': best,
                'isNewBest'  : is_new_best,
                'totalReps'  : total,
                'sessions'   : sessions
            }
        })

    except Exception as e:
        return jsonify({ 'success': False, 'error': str(e) }), 500


# ─────────────────────────────────────────
# ROUTE 3 - Get workout history
# JS calls this to show history page
# ─────────────────────────────────────────
@app.route('/history', methods=['GET'])
def get_history():
    try:
        conn   = get_db()
        cursor = conn.cursor()

        # Get last 20 workouts
        cursor.execute('''
            SELECT * FROM workouts
            ORDER BY id DESC
            LIMIT 20
        ''')

        rows     = cursor.fetchall()
        workouts = [dict(row) for row in rows]

        # Get personal bests for each exercise
        cursor.execute('''
            SELECT exercise, MAX(reps) as best, SUM(reps) as total, COUNT(*) as sessions
            FROM workouts
            GROUP BY exercise
        ''')

        rows  = cursor.fetchall()
        bests = [dict(row) for row in rows]

        conn.close()

        return jsonify({
            'success'  : True,
            'workouts' : workouts,
            'bests'    : bests
        })

    except Exception as e:
        return jsonify({ 'success': False, 'error': str(e) }), 500


# ─────────────────────────────────────────
# ROUTE 4 - Get stats for home page
# Shows quick overview when app opens
# ─────────────────────────────────────────
@app.route('/stats', methods=['GET'])
def get_stats():
    try:
        conn   = get_db()
        cursor = conn.cursor()

        # Total workouts ever
        cursor.execute('SELECT COUNT(*) as total FROM workouts')
        total_workouts = cursor.fetchone()['total']

        # Total reps ever
        cursor.execute('SELECT SUM(reps) as total FROM workouts')
        total_reps = cursor.fetchone()['total'] or 0

        # Workouts this week
        week_ago = (datetime.datetime.now() - datetime.timedelta(days=7)).strftime('%Y-%m-%d')
        cursor.execute('''
            SELECT COUNT(*) as total FROM workouts
            WHERE date >= ?
        ''', (week_ago,))
        this_week = cursor.fetchone()['total']

        conn.close()

        return jsonify({
            'success'       : True,
            'totalWorkouts' : total_workouts,
            'totalReps'     : total_reps,
            'thisWeek'      : this_week
        })

    except Exception as e:
        return jsonify({ 'success': False, 'error': str(e) }), 500


# Start server
if __name__ == '__main__':
    print('Starting Rep Counter backend...')
    print('Open http://localhost:5000 to test')
    app.run(debug=True, port=5000)