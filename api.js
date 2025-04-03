// Configurazione API
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : 'https://alcoltracker.vercel.app/api';

// Funzioni per l'autenticazione
export async function register(username, password) {
    const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore durante la registrazione');
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    return data;
}

export async function login(username, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore durante il login');
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    return data;
}

// Funzioni per la gestione delle spese
export async function addExpense(type, amount, quantity, date = null, groupId = null) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Utente non autenticato');

    const data = {
        type,
        amount: parseFloat(amount),
        quantity: parseFloat(quantity),
        date: date || new Date().toISOString(),
        groupId
    };

    const response = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore durante l\'aggiunta della spesa');
    }

    return await response.json();
}

export async function getExpenses() {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Utente non autenticato');

    const response = await fetch(`${API_URL}/expenses`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore durante il recupero delle spese');
    }

    return await response.json();
}

export async function deleteExpense(expenseId) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Utente non autenticato');

    const response = await fetch(`${API_URL}/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore durante l\'eliminazione della spesa');
    }

    return await response.json();
}

export async function getExpenseStats() {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Utente non autenticato');

    const response = await fetch(`${API_URL}/expenses/stats`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore durante il recupero delle statistiche');
    }

    return await response.json();
}

// Funzioni per la gestione dei gruppi
export async function createGroup(name, description, code) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Utente non autenticato');

    const response = await fetch(`${API_URL}/groups`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description, code }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore durante la creazione del gruppo');
    }

    return await response.json();
}

export async function joinGroup(groupName, code) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Utente non autenticato');

    const response = await fetch(`${API_URL}/groups/join`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ groupName, code }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore durante l\'accesso al gruppo');
    }

    return await response.json();
}

export async function getGroups() {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Utente non autenticato');

    const response = await fetch(`${API_URL}/groups`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore durante il recupero dei gruppi');
    }

    return await response.json();
}

export async function getGroupDetails(groupId) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Utente non autenticato');

    try {
        // Assicuriamoci che l'URL sia corretto
        const url = `${API_URL}/groups/${encodeURIComponent(groupId)}`;
        console.log('Requesting URL:', url); // Debug log

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server response:', errorText); // Debug log
            throw new Error(`Errore nel caricamento dei dettagli del gruppo (${response.status})`);
        }

        const groupData = await response.json();
        console.log('Dati gruppo ricevuti:', groupData); // Debug log

        if (!groupData || !groupData._id) {
            throw new Error('Dati del gruppo non validi');
        }

        if (!groupData.members || !Array.isArray(groupData.members)) {
            groupData.members = []; // Inizializza come array vuoto se non presente
        }

        return groupData;
    } catch (error) {
        console.error('Errore in getGroupDetails:', error);
        throw new Error('Errore nel caricamento dei dettagli del gruppo: ' + error.message);
    }
}

export async function getGroupStats(groupId) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Utente non autenticato');

    const response = await fetch(`${API_URL}/groups/${groupId}/stats`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore durante il recupero delle statistiche del gruppo');
    }

    return await response.json();
}

export async function deleteGroup(groupId) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Utente non autenticato');

    const response = await fetch(`${API_URL}/groups/${groupId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore durante l\'eliminazione del gruppo');
    }

    return await response.json();
}

export async function leaveGroup(groupId) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Utente non autenticato');

    const response = await fetch(`${API_URL}/groups/${groupId}/leave`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore durante l\'uscita dal gruppo');
    }

    return await response.json();
}

// Funzioni per la gestione dei record
export async function getRecords() {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Utente non autenticato');

    const response = await fetch(`${API_URL}/records`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore durante il recupero dei record');
    }

    return await response.json();
}

export async function addRecord(date, drinks) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Utente non autenticato');

    const response = await fetch(`${API_URL}/records`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ date, drinks }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore durante l\'aggiunta del record');
    }

    return await response.json();
}

export async function updateRecord(recordId, date, drinks) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Utente non autenticato');

    const response = await fetch(`${API_URL}/records/${recordId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ date, drinks }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore durante l\'aggiornamento del record');
    }

    return await response.json();
}

export async function deleteRecord(recordId) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Utente non autenticato');

    const response = await fetch(`${API_URL}/records/${recordId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore durante l\'eliminazione del record');
    }

    return await response.json();
}

export async function getRecordStats() {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Utente non autenticato');

    const response = await fetch(`${API_URL}/records/stats`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore durante il recupero delle statistiche');
    }

    return await response.json();
} 