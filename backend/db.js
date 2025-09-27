// SQLite database setup for fitness tracker
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DB_PATH = path.join(__dirname, 'fitness.db');

const db = new sqlite3.Database(DB_PATH);

// Create tables if not exist
const init = () => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        duration INTEGER,
        calories INTEGER,
        date TEXT,
        user_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
    // Ensure 'completed' column exists (SQLite allows ADD COLUMN without IF NOT EXISTS on newer versions; ignore error if already exists)
    db.run('ALTER TABLE workouts ADD COLUMN completed INTEGER DEFAULT 0', (err) => {
        if (err && !String(err.message).includes('duplicate column name')) {
            // Log once; non-fatal
            console.warn('ALTER TABLE add completed column warning:', err.message);
        }
    });
};

module.exports = { db, init };
