import 'dotenv/config';
import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware per il logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
    console.log('Headers:', req.headers);
    next();
});

// Configura CORS prima di tutto
app.use((req, res, next) => {
    const allowedOrigins = [
        'https://alcoltracker.vercel.app',
        'https://alcoltracker-git-main-antonios-projects-38f3e0d1.vercel.app',
        'https://la-tua-app.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001'
    ];

    const origin = req.headers.origin;
    
    // Log dettagliato della richiesta CORS
    console.log('🔒 CORS Request Details:', {
        method: req.method,
        path: req.path,
        origin: origin,
        headers: req.headers
    });

    // Imposta l'origine corretta
    if (origin) {
        if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
            res.setHeader('Access-Control-Max-Age', '86400'); // 24 ore

            // Log degli header CORS impostati
            console.log('🔒 CORS Headers Set:', {
                origin: res.getHeader('Access-Control-Allow-Origin'),
                methods: res.getHeader('Access-Control-Allow-Methods'),
                headers: res.getHeader('Access-Control-Allow-Headers'),
                credentials: res.getHeader('Access-Control-Allow-Credentials')
            });
        }
    }

    // Gestione preflight OPTIONS
    if (req.method === 'OPTIONS') {
        console.log('👉 Handling OPTIONS request for path:', req.path);
        res.status(204).end();
        return;
    }

    next();
});

// Middleware per il parsing del body JSON con gestione errori
app.use(express.json({
    verify: (req, res, buf) => {
        try {
            JSON.parse(buf);
        } catch (e) {
            console.error('❌ Invalid JSON:', e);
            res.status(400).json({ message: 'Invalid JSON payload' });
            throw new Error('Invalid JSON payload');
        }
    }
}));

// Middleware per il logging delle richieste
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    
    if (req.method === 'POST' || req.method === 'PUT') {
        console.log('Body:', JSON.stringify(req.body, null, 2));
    }
    
    // Intercetta la risposta
    const oldJson = res.json;
    res.json = function(data) {
        console.log('Response:', JSON.stringify(data, null, 2));
        return oldJson.apply(res, arguments);
    };
    
    next();
});

// Servi i file statici
app.use(express.static(__dirname));

// Middleware per gestire le richieste non-API
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/groups', (req, res) => {
    res.sendFile(path.join(__dirname, 'groups.html'));
});

app.get('/expenses', (req, res) => {
    res.sendFile(path.join(__dirname, 'expenses.html'));
});

// Connessione MongoDB
let db;
const client = new MongoClient(process.env.MONGODB_URI);

async function connectToDb() {
    try {
        await client.connect();
        db = client.db('alcoltracker');
        console.log('✅ Connesso al database MongoDB');
    } catch (error) {
        console.error('❌ Errore di connessione al database:', error);
        process.exit(1);
    }
}

// Middleware di autenticazione
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token non fornito' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token non valido' });
        }
        req.user = user;
        next();
    });
};

// API per la registrazione
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Verifica se l'utente esiste già
        const existingUser = await db.collection('users').findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username già in uso' });
        }

        // Cripta la password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crea il nuovo utente
        const result = await db.collection('users').insertOne({
            username,
            password: hashedPassword,
            createdAt: new Date()
        });

        // Genera il token
        const token = jwt.sign(
            { id: result.insertedId, username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: { id: result.insertedId, username }
        });
    } catch (error) {
        console.error('Errore durante la registrazione:', error);
        res.status(500).json({ message: 'Errore durante la registrazione' });
    }
});

// API per il login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Trova l'utente
        const user = await db.collection('users').findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Username o password non validi' });
        }

        // Verifica la password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Username o password non validi' });
        }

        // Genera il token
        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: { id: user._id, username: user.username }
        });
    } catch (error) {
        console.error('Errore durante il login:', error);
        res.status(500).json({ message: 'Errore durante il login' });
    }
});

// API per i gruppi
// Ottieni tutti i gruppi dell'utente
app.get('/api/groups', authenticateToken, async (req, res) => {
    try {
        const groups = await db.collection('groups')
            .find({ 'members.id': req.user.id.toString() })
            .toArray();
        res.json(groups);
    } catch (error) {
        console.error('Errore nel recupero dei gruppi:', error);
        res.status(500).json({ message: 'Errore nel recupero dei gruppi' });
    }
});

// Crea un nuovo gruppo
app.post('/api/groups', authenticateToken, async (req, res) => {
    try {
        const { name, description, code } = req.body;

        // Verifica se esiste già un gruppo con lo stesso codice
        const existingGroup = await db.collection('groups').findOne({ code });
        if (existingGroup) {
            return res.status(400).json({ message: 'Codice gruppo già in uso' });
        }

        // Ottieni i dati dell'utente dal database per assicurare coerenza
        const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });
        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        const group = {
            name,
            description,
            code,
            members: [{
                id: user._id.toString(),
                username: user.username
            }],
            createdBy: {
                id: user._id.toString(),
                username: user.username
            },
            createdAt: new Date()
        };

        const result = await db.collection('groups').insertOne(group);
        res.status(201).json({ ...group, _id: result.insertedId });
    } catch (error) {
        console.error('Errore nella creazione del gruppo:', error);
        res.status(500).json({ message: 'Errore nella creazione del gruppo' });
    }
});

// Unisciti a un gruppo
app.post('/api/groups/join', authenticateToken, async (req, res) => {
    try {
        const { groupName, code } = req.body;

        // Trova il gruppo
        const group = await db.collection('groups').findOne({ 
            name: groupName,
            code: code
        });

        if (!group) {
            return res.status(404).json({ message: 'Gruppo non trovato' });
        }

        // Verifica se l'utente è già membro
        const existingMember = group.members.find(member => 
            member.id === req.user.id || 
            member.id === req.user.id.toString()
        );

        if (existingMember) {
            return res.status(400).json({ message: 'Sei già membro di questo gruppo' });
        }

        // Ottieni i dati dell'utente dal database per assicurare coerenza
        const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });
        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        // Aggiungi l'utente al gruppo usando i dati dal database
        await db.collection('groups').updateOne(
            { _id: group._id },
            {
                $push: {
                    members: {
                        id: user._id.toString(),
                        username: user.username
                    }
                }
            }
        );

        res.json({ message: 'Unito al gruppo con successo' });
    } catch (error) {
        console.error('Errore durante l\'unione al gruppo:', error);
        res.status(500).json({ message: 'Errore durante l\'unione al gruppo' });
    }
});

// Ottieni dettagli di un gruppo specifico
app.get('/api/groups/:id', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.id;
        
        // Verifica che l'ID sia valido
        if (!ObjectId.isValid(groupId)) {
            return res.status(400).json({ message: 'ID gruppo non valido' });
        }

        // Trova il gruppo
        const group = await db.collection('groups').findOne({ 
            _id: new ObjectId(groupId),
            'members.id': req.user.id.toString()
        });

        if (!group) {
            return res.status(404).json({ message: 'Gruppo non trovato o accesso non autorizzato' });
        }

        // Trova tutte le spese associate al gruppo
        const expenses = await db.collection('expenses')
            .find({ 
                $or: [
                    { groupId: groupId },
                    { groupId: new ObjectId(groupId) }
                ]
            })
            .toArray();

        // Ottieni i dati completi dell'utente corrente
        const currentUser = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });
        if (!currentUser) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        // Aggiungi le spese e i dati dell'utente corrente ai dati del gruppo
        const groupWithExpenses = {
            ...group,
            expenses: expenses,
            currentUser: {
                id: currentUser._id.toString(),
                username: currentUser.username,
                email: currentUser.email,
                createdAt: currentUser.createdAt
            }
        };

        res.json(groupWithExpenses);
    } catch (error) {
        console.error('Errore nel recupero dei dettagli del gruppo:', error);
        res.status(500).json({ message: 'Errore nel recupero dei dettagli del gruppo' });
    }
});

// API per le spese
// Ottieni tutte le spese dell'utente
app.get('/api/expenses', authenticateToken, async (req, res) => {
    try {
        const expenses = await db.collection('expenses')
            .find({ userId: req.user.id.toString() })
            .sort({ date: -1 })
            .toArray();
        res.json(expenses);
    } catch (error) {
        console.error('Errore nel recupero delle spese:', error);
        res.status(500).json({ message: 'Errore nel recupero delle spese' });
    }
});

// Aggiungi una nuova spesa
app.post('/api/expenses', authenticateToken, async (req, res) => {
    try {
        const { type, amount, quantity, date, groupId } = req.body;
        
        const expense = {
            type,
            amount: parseFloat(amount),
            quantity: parseFloat(quantity),
            userId: req.user.id.toString(),
            username: req.user.username,
            date: date ? new Date(date) : new Date(),
            groupId: groupId ? new ObjectId(groupId) : null
        };

        // Verifica che il gruppo esista e che l'utente ne sia membro
        if (groupId) {
            const group = await db.collection('groups').findOne({
                _id: new ObjectId(groupId),
                'members.id': req.user.id.toString()
            });

            if (!group) {
                return res.status(403).json({ message: 'Gruppo non trovato o accesso non autorizzato' });
            }
        }

        const result = await db.collection('expenses').insertOne(expense);
        res.status(201).json({ ...expense, _id: result.insertedId });
    } catch (error) {
        console.error('Errore nell\'aggiunta della spesa:', error);
        res.status(500).json({ message: 'Errore nell\'aggiunta della spesa' });
    }
});

// Endpoint per ottenere le statistiche delle spese
app.get('/api/expenses/stats', authenticateToken, async (req, res) => {
    try {
        const expenses = await db.collection('expenses')
            .find({ userId: req.user.id.toString() })
            .toArray();
        const stats = {
            totalAmount: 0,
            totalQuantity: 0,
            byType: {}
        };

        expenses.forEach(expense => {
            stats.totalAmount += expense.amount;
            stats.totalQuantity += expense.quantity;

            if (!stats.byType[expense.type]) {
                stats.byType[expense.type] = { amount: 0, quantity: 0 };
            }
            stats.byType[expense.type].amount += expense.amount;
            stats.byType[expense.type].quantity += expense.quantity;
        });

        res.json(stats);
    } catch (error) {
        console.error('Errore nel recupero delle statistiche:', error);
        res.status(500).json({ message: 'Errore nel recupero delle statistiche' });
    }
});

// Elimina una spesa
app.delete('/api/expenses/:id', authenticateToken, async (req, res) => {
    try {
        const result = await db.collection('expenses').deleteOne({
            _id: new ObjectId(req.params.id),
            userId: req.user.id.toString()
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Spesa non trovata' });
        }

        res.json({ message: 'Spesa eliminata con successo' });
    } catch (error) {
        console.error('Errore nell\'eliminazione della spesa:', error);
        res.status(500).json({ message: 'Errore nell\'eliminazione della spesa' });
    }
});

// Endpoint per la verifica del token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// Endpoint per il controllo dello stato del server
app.get('/api/health-check', (req, res) => {
    res.status(200).json({ 
        status: 'ok',
        dbStatus: db ? 'connected' : 'disconnected',
        mongoUri: process.env.MONGODB_URI ? 'configured' : 'missing',
        jwtSecret: process.env.JWT_SECRET ? 'configured' : 'missing'
    });
});

// Elimina un gruppo
app.delete('/api/groups/:id', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.id;
        
        // Verifica che l'ID sia valido
        if (!ObjectId.isValid(groupId)) {
            return res.status(400).json({ message: 'ID gruppo non valido' });
        }

        // Trova il gruppo e verifica che l'utente sia il creatore
        const group = await db.collection('groups').findOne({ 
            _id: new ObjectId(groupId)
        });

        if (!group) {
            return res.status(404).json({ message: 'Gruppo non trovato' });
        }

        if (group.createdBy.id !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Solo il creatore del gruppo può eliminarlo' });
        }

        // Elimina tutte le spese associate al gruppo
        await db.collection('expenses').deleteMany({ 
            groupId: groupId 
        });

        // Elimina il gruppo
        await db.collection('groups').deleteOne({ 
            _id: new ObjectId(groupId)
        });

        res.json({ message: 'Gruppo eliminato con successo' });
    } catch (error) {
        console.error('Errore nell\'eliminazione del gruppo:', error);
        res.status(500).json({ message: 'Errore nell\'eliminazione del gruppo' });
    }
});

// Endpoint per lasciare un gruppo
app.post('/api/groups/:id/leave', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.id;
        
        // Verifica che l'ID sia valido
        if (!ObjectId.isValid(groupId)) {
            return res.status(400).json({ message: 'ID gruppo non valido' });
        }

        // Trova il gruppo
        const group = await db.collection('groups').findOne({ 
            _id: new ObjectId(groupId)
        });

        if (!group) {
            return res.status(404).json({ message: 'Gruppo non trovato' });
        }

        // Verifica che l'utente sia un membro del gruppo
        const isMember = group.members.some(member => member.id === req.user.id.toString());
        if (!isMember) {
            return res.status(403).json({ message: 'Non sei un membro di questo gruppo' });
        }

        // Verifica che l'utente non sia il creatore del gruppo
        if (group.createdBy.id === req.user.id.toString()) {
            return res.status(403).json({ message: 'Il creatore non può lasciare il gruppo. Usa l\'opzione di eliminazione invece.' });
        }

        // Elimina tutte le spese dell'utente nel gruppo
        await db.collection('expenses').deleteMany({
            groupId: groupId,
            userId: req.user.id.toString()
        });

        // Rimuovi l'utente dalla lista dei membri
        await db.collection('groups').updateOne(
            { _id: new ObjectId(groupId) },
            { $pull: { members: { id: req.user.id.toString() } } }
        );

        res.json({ message: 'Hai lasciato il gruppo con successo' });
    } catch (error) {
        console.error('Errore nell\'uscita dal gruppo:', error);
        res.status(500).json({ message: 'Errore nell\'uscita dal gruppo' });
    }
});

// Endpoint di test completo
app.get('/api/system-check', async (req, res) => {
    try {
        // Test connessione database
        let dbTest = {
            status: 'disconnected',
            error: null
        };
        
        try {
            await db.command({ ping: 1 });
            dbTest.status = 'connected';
        } catch (error) {
            dbTest.status = 'error';
            dbTest.error = error.message;
        }

        // Test variabili d'ambiente
        const envTest = {
            MONGODB_URI: process.env.MONGODB_URI ? 'configured' : 'missing',
            JWT_SECRET: process.env.JWT_SECRET ? 'configured' : 'missing',
            NODE_ENV: process.env.NODE_ENV || 'not set'
        };

        // Test CORS
        const corsTest = {
            headers: {
                'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin') || 'not set',
                'Access-Control-Allow-Methods': res.getHeader('Access-Control-Allow-Methods') || 'not set',
                'Access-Control-Allow-Headers': res.getHeader('Access-Control-Allow-Headers') || 'not set',
                'Access-Control-Allow-Credentials': res.getHeader('Access-Control-Allow-Credentials') || 'not set'
            }
        };

        // Test collections
        let collectionsTest = {
            users: false,
            groups: false,
            expenses: false,
            error: null
        };

        try {
            const collections = await db.listCollections().toArray();
            const collectionNames = collections.map(c => c.name);
            collectionsTest.users = collectionNames.includes('users');
            collectionsTest.groups = collectionNames.includes('groups');
            collectionsTest.expenses = collectionNames.includes('expenses');
        } catch (error) {
            collectionsTest.error = error.message;
        }

        res.json({
            timestamp: new Date().toISOString(),
            server: {
                status: 'running',
                port: process.env.PORT || 3000,
                environment: process.env.NODE_ENV || 'development'
            },
            database: dbTest,
            environment: envTest,
            cors: corsTest,
            collections: collectionsTest,
            request: {
                origin: req.headers.origin || 'not set',
                method: req.method,
                path: req.path,
                headers: req.headers
            }
        });
    } catch (error) {
        console.error('Errore nel system-check:', error);
        res.status(500).json({
            status: 'error',
            message: 'Errore durante il controllo del sistema',
            error: error.message
        });
    }
});

// Endpoint di test per il login
app.post('/api/auth/test-login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Test login attempt:', { username, timestamp: new Date().toISOString() });
        
        // Log dei dettagli della richiesta
        console.log('Request headers:', req.headers);
        console.log('Request body:', req.body);
        
        // Simula una risposta di successo per il test
        res.json({
            success: true,
            message: 'Test login endpoint working',
            requestDetails: {
                headers: req.headers,
                body: req.body,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Test login error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Avvia il server
const PORT = process.env.PORT || 3001;

async function startServer() {
    try {
        await connectToDb();
        console.log('✅ Tentativo di avvio del server sulla porta', PORT);
        console.log('✅ Variabili ambiente:', {
            MONGODB_URI: process.env.MONGODB_URI ? 'configurato' : 'mancante',
            JWT_SECRET: process.env.JWT_SECRET ? 'configurato' : 'mancante',
            NODE_ENV: process.env.NODE_ENV || 'non impostato'
        });

        const server = app.listen(PORT, () => {
            console.log(`🚀 Server in esecuzione sulla porta ${PORT}`);
            console.log('✅ Database connesso:', process.env.MONGODB_URI ? 'Sì' : 'No');
            console.log('✅ JWT Secret configurato:', process.env.JWT_SECRET ? 'Sì' : 'No');
            console.log('✅ Ambiente:', process.env.NODE_ENV || 'development');
        });

        server.on('error', (error) => {
            console.error('❌ Errore del server:', error);
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ La porta ${PORT} è già in uso`);
            }
        });

    } catch (error) {
        console.error('❌ Errore durante l\'avvio del server:', error);
        console.error('❌ Dettagli errore:', error.message);
        process.exit(1);
    }
}

// Gestione degli errori non catturati con più dettagli
process.on('unhandledRejection', (error) => {
    console.error('❌ Errore non gestito (Promise):', error);
    console.error('Stack trace:', error.stack);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Eccezione non catturata:', error);
    console.error('Stack trace:', error.stack);
});

startServer(); 