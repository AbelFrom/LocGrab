// ctf-server.js
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = 3000;

// Dummy user database
const users = {
    alice: { password: 'alice123', role: 'user' },
    admin: { password: 'admin123', role: 'admin' }
};

const flags = {
    lfi: "FLAG-LFI-12345",
    sql: "FLAG-SQLI-67890",
    xss: "FLAG-XSS-ABCDE",
    cmd: "FLAG-CMD-54321"
};

app.use(bodyParser.urlencoded({ extended: true }));

// Serve the HTML page
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>CTF Playground</title>
<style>
body { font-family: Arial, sans-serif; margin: 40px; }
h1 { color: #cc0000; }
form { margin-bottom: 20px; }
input, textarea { width: 300px; margin-bottom: 10px; }
button { padding: 5px 10px; }
pre { background: #eee; padding: 10px; }
</style>
</head>
<body>
<h1>CTF Playground</h1>

<h2>Login (vulnerable)</h2>
<form method="POST" action="/login">
    Username: <input name="username"><br>
    Password: <input type="password" name="password"><br>
    <button type="submit">Login</button>
</form>

<h2>LFI (Local File Inclusion)</h2>
<form method="GET" action="/view">
    File: <input name="file" placeholder="e.g., server.js"><br>
    <button type="submit">View File</button>
</form>

<h2>SQL Injection Simulation</h2>
<form method="GET" action="/profile">
    Username: <input name="user" placeholder="alice"><br>
    <button type="submit">Get Profile</button>
</form>

<h2>Stored XSS</h2>
<form method="POST" action="/comment">
    Comment: <textarea name="msg"></textarea><br>
    <button type="submit">Add Comment</button>
</form>
<a href="/comments" target="_blank">View All Comments</a>

<h2>Command Injection (Ping)</h2>
<form method="GET" action="/ping">
    Host: <input name="host" placeholder="127.0.0.1"><br>
    <button type="submit">Ping</button>
</form>

<h2>File Upload</h2>
<form method="POST" action="/upload" enctype="multipart/form-data">
    Select file: <input type="file" name="file"><br>
    <button type="submit">Upload</button>
</form>

</body>
</html>
    `);
});

// Simple login (vulnerable)
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if(users[username] && users[username].password === password){
        res.send(`Welcome ${username}. Role: ${users[username].role}`);
    } else {
        res.send("Invalid login.");
    }
});

// LFI endpoint
app.get('/view', (req, res) => {
    const file = req.query.file; // NO validation
    if (!file) return res.send("No file specified.");
    fs.readFile(path.join(__dirname, file), 'utf8', (err, data) => {
        if(err) return res.send("File not found.");
        res.type('text/plain').send(data + "\nFlag: " + flags.lfi);
    });
});

// SQLi simulation (insecure string concat)
app.get('/profile', (req, res) => {
    const user = req.query.user; // no sanitization
    if(users[user]){
        res.send(`User found: ${user}. Password: ${users[user].password}. Flag: ${flags.sql}`);
    } else {
        res.send("User not found.");
    }
});

// Stored XSS
let comments = [];
app.post('/comment', (req, res) => {
    const { msg } = req.body;
    comments.push(msg); // No sanitization
    res.send("Comment added!");
});
app.get('/comments', (req, res) => {
    res.send(comments.join('<br>') + "<br>Flag: " + flags.xss);
});

// Command Injection
app.get('/ping', (req, res) => {
    const host = req.query.host;
    const { exec } = require('child_process');
    exec(`ping -c 1 ${host}`, (err, stdout, stderr) => {
        if(err) return res.send("Error pinging host.");
        res.send(`<pre>${stdout}</pre>\nFlag: ${flags.cmd}`);
    });
});

// Insecure file upload
app.post('/upload', upload.single('file'), (req, res) => {
    res.send(`File uploaded: ${req.file.originalname}`);
});

app.listen(PORT, () => console.log(`CTF server running on http://localhost:${PORT}`));
