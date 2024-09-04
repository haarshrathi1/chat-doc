const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const multer = require('multer');
const session = require('express-session');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Session configuration
app.use(session({
    secret: 'supersecretkey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: './public/uploads',
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 }
}).single('prescription');

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to check if doctor is logged in
function ensureDoctor(req, res, next) {
    if (req.session.isDoctorLoggedIn) {
        next();
    } else {
        res.status(403).send('You must be logged in as a doctor.');
    }
}

// Middleware to check if patient is verified
function ensurePatient(req, res, next) {
    if (req.session.isPatientVerified) {
        next();
    } else {
        res.status(403).send('You must verify your payment ID.');
    }
}

// Doctor login route
app.post('/doctor-login', (req, res) => {
    const { name, id, password } = req.body;

    if (name === 'abc' && id === '1234' && password === '1234') {
        req.session.isDoctorLoggedIn = true;
        req.session.doctorName = name;
        res.redirect('/doctor-chat');
    } else {
        res.status(401).send('Invalid login credentials');
    }
});

// Doctor's chat room (protected)
app.get('/doctor-chat', ensureDoctor, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'doctor-chat.html'));
});

// Patient verification route
app.post('/patient-verify', (req, res) => {
    const { paymentId } = req.body;

    if (paymentId === '1234') {
        req.session.isPatientVerified = true;
        res.redirect('/patient-chat');
    } else {
        res.status(401).send('Invalid payment ID');
    }
});

// Patient's chat room (protected)
app.get('/patient-chat', ensurePatient, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'patient-chat.html'));
});

// Prescription upload route (only doctors can upload)
app.post('/upload-prescription', ensureDoctor, (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            console.log('Upload error: ', err);
            res.status(400).send('Error uploading file.');
        } else {
            if (!req.file) {
                res.status(400).send('No file selected.');
            } else {
                // Broadcast prescription upload to patient
                io.emit('prescription uploaded', {
                    message: 'A new prescription has been uploaded.',
                    filename: req.file.filename
                });

                res.status(200).send('Prescription uploaded successfully.');
            }
        }
    });
});

// Handle chat connection
io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle incoming chat messages
    socket.on('chat message', (data) => {
        io.emit('chat message', {
            user: data.user, // 'doctor' or 'patient'
            message: data.message
        });
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
