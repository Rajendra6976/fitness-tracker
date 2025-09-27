
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;
const { db, init } = require('./db');

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Session configuration
app.use(session({
    secret: 'fitness-tracker-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Initialize DB tables
init();

// Guest user bootstrap and session helper
let GUEST_USER_ID = null;
function getOrCreateGuest(callback) {
    if (GUEST_USER_ID) return callback(GUEST_USER_ID);
    db.get('SELECT id FROM users WHERE username = ? LIMIT 1', ['guest'], (err, row) => {
        if (err) {
            console.error('Error reading guest user:', err);
            return callback(null);
        }
        if (row && row.id) {
            GUEST_USER_ID = row.id;
            return callback(GUEST_USER_ID);
        }
        db.run('INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)', ['guest', ''], function(insErr) {
            if (insErr) {
                console.error('Error creating guest user:', insErr);
                return callback(null);
            }
            db.get('SELECT id FROM users WHERE username = ? LIMIT 1', ['guest'], (gErr, gRow) => {
                if (gErr) {
                    console.error('Error fetching guest user after insert:', gErr);
                    return callback(null);
                }
                GUEST_USER_ID = gRow ? gRow.id : null;
                callback(GUEST_USER_ID);
            });
        });
    });
}

// Assign guest session automatically if not logged in
app.use((req, res, next) => {
    if (req.session && req.session.userId) return next();
    getOrCreateGuest((guestId) => {
        if (guestId) {
            req.session.userId = guestId;
            req.session.username = 'guest';
        }
        next();
    });
});

// Function to save workout to file backup
function saveWorkoutToFile(workoutData) {
    const backupDir = path.join(__dirname, 'backups');
    const today = new Date().toISOString().slice(0, 10);
    const filename = `workouts_${today}.json`;
    const filepath = path.join(backupDir, filename);
    
    // Create backups directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    let workouts = [];
    
    // Read existing file if it exists
    if (fs.existsSync(filepath)) {
        try {
            const data = fs.readFileSync(filepath, 'utf8');
            workouts = JSON.parse(data);
        } catch (err) {
            console.error('Error reading backup file:', err);
            workouts = [];
        }
    }
    
    // Add new workout
    workouts.push(workoutData);
    
    // Write back to file
    try {
        fs.writeFileSync(filepath, JSON.stringify(workouts, null, 2));
        console.log(`Workout saved to backup file: ${filename}`);
    } catch (err) {
        console.error('Error writing backup file:', err);
    }
}

// Serve index.html at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Serve logout.html for GET /logout so direct navigation works
app.get('/logout', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/logout.html'));
});
// Get all workouts for logged-in user
app.get('/api/workouts', (req, res) => {
    db.all('SELECT * FROM workouts WHERE user_id = ?', [req.session.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json(rows);
    });
});

// Add a workout
app.post('/api/workouts', (req, res) => {
    const { type, duration, calories, date } = req.body;
    const username = req.session.username;
    
    db.run('INSERT INTO workouts (type, duration, calories, date, user_id, completed) VALUES (?, ?, ?, ?, ?, ?)',
        [type, duration, calories, date, req.session.userId, 0],
        function(err) {
            if (err) return res.status(500).json({ error: 'DB error' });
            
            // Save to file backup
            const workoutData = {
                id: this.lastID,
                type,
                duration: parseInt(duration),
                calories: parseInt(calories),
                date,
                username,
                userId: req.session.userId,
                timestamp: new Date().toISOString()
            };
            
            saveWorkoutToFile(workoutData);
            
            res.json({ id: this.lastID, type, duration, calories, date, completed: 0 });
        }
    );
});

// Delete a workout
app.delete('/api/workouts/:id', (req, res) => {
    db.run('DELETE FROM workouts WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId], function(err) {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json({ success: true });
    });
});

// Toggle completed status
app.patch('/api/workouts/:id/toggle', (req, res) => {
    db.get('SELECT completed FROM workouts WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (!row) return res.status(404).json({ error: 'Not found' });
        const newVal = row.completed ? 0 : 1;
        db.run('UPDATE workouts SET completed = ? WHERE id = ? AND user_id = ?', [newVal, req.params.id, req.session.userId], function(updErr) {
            if (updErr) return res.status(500).json({ error: 'DB error' });
            res.json({ id: Number(req.params.id), completed: newVal });
        });
    });
});

// User registration
app.post('/api/signup', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], function(err) {
        if (err) {
            if (err.code === 'SQLITE_CONSTRAINT') {
                return res.status(409).json({ error: 'Username already exists' });
            }
            return res.status(500).json({ error: 'DB error' });
        }
        res.json({ success: true });
    });
});

// User login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (user) {
            req.session.userId = user.id;
            req.session.username = user.username;
            res.json({ success: true, userId: user.id, username: user.username });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

// User logout
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: 'Logout failed' });
        res.json({ success: true });
    });
});

// Check if user is logged in
app.get('/api/check-session', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true, userId: req.session.userId, username: req.session.username });
    } else {
        res.json({ loggedIn: false });
    }
});

// Get backup files list
app.get('/api/backups', (req, res) => {
    
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
        return res.json([]);
    }
    
    try {
        const files = fs.readdirSync(backupDir)
            .filter(file => file.endsWith('.json'))
            .map(file => ({
                filename: file,
                date: file.replace('workouts_', '').replace('.json', ''),
                path: path.join(backupDir, file)
            }))
            .sort((a, b) => b.date.localeCompare(a.date));
        
        res.json(files);
    } catch (err) {
        res.status(500).json({ error: 'Error reading backup files' });
    }
});

// Get specific backup file content
app.get('/api/backups/:filename', (req, res) => {
    
    const filename = req.params.filename;
    const filepath = path.join(__dirname, 'backups', filename);
    
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    try {
        const data = fs.readFileSync(filepath, 'utf8');
        const workouts = JSON.parse(data);
        res.json(workouts);
    } catch (err) {
        res.status(500).json({ error: 'Error reading file' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
