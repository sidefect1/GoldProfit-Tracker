
/**
 * Simple Node.js Backend for GoldProfit Pro
 * 
 * Instructions:
 * 1. Ensure you have Node.js installed.
 * 2. Create a folder, put this file in it.
 * 3. Run `npm init -y`.
 * 4. Run `npm install express cors body-parser`.
 * 5. Run `node server.js`.
 * 6. Your frontend App (App.tsx) will automatically connect to http://localhost:3001
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Support large data

// Helper to read DB
const readDb = () => {
    if (!fs.existsSync(DB_FILE)) {
        return [];
    }
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Error reading DB", e);
        return [];
    }
};

// Helper to write DB
const writeDb = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// Status Check
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', time: Date.now() });
});

// GET All Projects
app.get('/api/projects', (req, res) => {
    const projects = readDb();
    res.json(projects);
});

// SAVE All Projects (Full Sync)
app.post('/api/projects', (req, res) => {
    const projects = req.body;
    if (!Array.isArray(projects)) {
        return res.status(400).json({ error: "Expected array of projects" });
    }
    writeDb(projects);
    console.log(`Saved ${projects.length} projects at ${new Date().toLocaleTimeString()}`);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`GoldProfit Backend running on http://localhost:${PORT}`);
});
