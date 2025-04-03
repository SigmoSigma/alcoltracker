import { register, login, getGroups, createGroup, joinGroup, addExpense, getExpenses, getExpenseStats, deleteExpense, getGroupDetails, deleteGroup, leaveGroup } from './api.js';

// Stato dell'applicazione
let currentUser = null;
let expenses = [];
let groups = [];
let typeChart = null;
let quantityChart = null;

// Gestione degli utenti registrati
let registeredUsers = [];
try {
    registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
} catch (error) {
    console.error('Errore nel caricamento degli utenti:', error);
    registeredUsers = [];
}

// Configurazione API
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : 'https://la-tua-app.vercel.app/api';  // Questo URL verrà aggiornato dopo il deploy

// Funzione per verificare se l'utente è autenticato
async function checkAuth() {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('currentUser');
    
    if (!token || !savedUser) {
        window.location.href = '/';
        return false;
    }

    try {
        currentUser = JSON.parse(savedUser);
        // Verifica che il token sia ancora valido
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            window.location.href = '/';
            return false;
        }

        return true;
    } catch (error) {
        console.error('Errore nella verifica dell\'autenticazione:', error);
        window.location.href = '/';
        return false;
    }
}

// Funzione per gestire il logout
function handleLogout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    currentUser = null;
    expenses = [];
    groups = [];
    
    if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
        window.location.href = '/';
    }
}

// Inizializzazione dell'applicazione
async function initApp() {
    try {
        // Verifica se siamo nella pagina di login
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            return;
        }

        // Verifica l'autenticazione
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('Token non trovato, reindirizzamento al login');
            window.location.href = '/';
            return;
        }

        // Inizializza gli elementi comuni
        const menuToggle = document.querySelector('.menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        if (menuToggle && navLinks) {
            menuToggle.addEventListener('click', () => {
                navLinks.classList.toggle('active');
            });
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        // Verifica che il server sia raggiungibile
        try {
            const response = await fetch(`${API_URL}/health-check`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error('Server non raggiungibile');
            }
        } catch (error) {
            console.error('Errore di connessione al server:', error);
            alert('Impossibile connettersi al server. Assicurati che il server sia in esecuzione.');
            return;
        }

        // Inizializza la pagina corrente
        const path = window.location.pathname;
        console.log('Inizializzazione pagina:', path);

        if (path.includes('dashboard.html')) {
            await initDashboard();
        } else if (path.includes('expenses.html')) {
            await initExpensesPage();
        } else if (path.includes('groups.html')) {
            // Inizializza i pulsanti dei gruppi
            const createGroupBtn = document.getElementById('createGroupBtn');
            const joinGroupBtn = document.getElementById('joinGroupBtn');
            const createGroupModal = document.getElementById('createGroupModal');
            const joinGroupModal = document.getElementById('joinGroupModal');
            const createGroupForm = document.getElementById('createGroupForm');
            const joinGroupForm = document.getElementById('joinGroupForm');
            const closeButtons = document.querySelectorAll('.close');

            if (createGroupBtn) {
                createGroupBtn.addEventListener('click', () => {
                    createGroupModal.classList.add('active');
                });
            }

            if (joinGroupBtn) {
                joinGroupBtn.addEventListener('click', () => {
                    joinGroupModal.classList.add('active');
                });
            }

            closeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    createGroupModal.classList.remove('active');
                    joinGroupModal.classList.remove('active');
                });
            });

            if (createGroupForm) {
                createGroupForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(createGroupForm);
                    try {
                        await createGroup({
                            name: formData.get('groupName'),
                            description: formData.get('groupDescription'),
                            code: formData.get('groupCode')
                        });
                        createGroupModal.classList.remove('active');
                        await loadGroups();
                    } catch (error) {
                        console.error('Errore nella creazione del gruppo:', error);
                        alert('Errore nella creazione del gruppo: ' + error.message);
                    }
                });
            }

            if (joinGroupForm) {
                joinGroupForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(joinGroupForm);
                    try {
                        await joinGroup({
                            name: formData.get('groupName'),
                            code: formData.get('groupCode')
                        });
                        joinGroupModal.classList.remove('active');
                        await loadGroups();
                    } catch (error) {
                        console.error('Errore nell\'unirsi al gruppo:', error);
                        alert('Errore nell\'unirsi al gruppo: ' + error.message);
                    }
                });
            }

            await loadGroups();
        } else if (path.includes('group-details.html')) {
            const urlParams = new URLSearchParams(window.location.search);
            const groupId = urlParams.get('id');
            if (!groupId) {
                console.error('ID gruppo mancante');
                alert('ID del gruppo non specificato');
                window.location.href = '/groups.html';
                return;
            }
            await initGroupDetailsPage();
        }
    } catch (error) {
        console.error('Errore nell\'inizializzazione dell\'app:', error);
        alert('Si è verificato un errore. Riprova più tardi.');
    }
}

function initializeCommonElements() {
    // Inizializza il menu mobile
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Inizializza il pulsante di logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// Elementi DOM
const elements = {
    loginBtn: document.getElementById('loginBtn'),
    registerBtn: document.getElementById('registerBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    welcomeLoginBtn: document.getElementById('welcomeLoginBtn'),
    welcomeRegisterBtn: document.getElementById('welcomeRegisterBtn'),
    loginModal: document.getElementById('loginModal'),
    registerModal: document.getElementById('registerModal'),
    expenseModal: document.getElementById('expenseModal'),
    createGroupModal: document.getElementById('createGroupModal'),
    addExpenseBtn: document.getElementById('addExpenseBtn'),
    createGroupBtn: document.getElementById('createGroupBtn'),
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    expenseForm: document.getElementById('expenseForm'),
    createGroupForm: document.getElementById('createGroupForm'),
    groupsList: document.getElementById('groupsList'),
    menuToggle: document.querySelector('.menu-toggle'),
    navLinks: document.querySelector('.nav-links'),
    joinGroupBtn: document.getElementById('joinGroupBtn'),
    joinGroupModal: document.getElementById('joinGroupModal'),
    joinGroupForm: document.getElementById('joinGroupForm')
};

// Funzioni UI
function toggleModal(modal, show) {
    if (modal) {
        if (show) {
            modal.classList.add('active');
        } else {
            modal.classList.remove('active');
        }
    }
}

function showLoginModal() {
    toggleModal(elements.loginModal, true);
    toggleModal(elements.registerModal, false);
}

function showRegisterModal() {
    toggleModal(elements.registerModal, true);
    toggleModal(elements.loginModal, false);
}

// Carica i gruppi dall'API
async function loadGroups() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Utente non autenticato');
        }

        const response = await fetch(`${API_URL}/groups`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Errore nel caricamento dei gruppi');
        }

        const loadedGroups = await response.json();
        groups = Array.isArray(loadedGroups) ? loadedGroups : [];
        updateGroupsList();
    } catch (error) {
        console.error('Errore nel caricamento dei gruppi:', error);
        alert('Errore nel caricamento dei gruppi: ' + error.message);
        groups = [];
        updateGroupsList();
    }
}

// Aggiorna la lista dei gruppi nell'UI
function updateGroupsList() {
    const groupsList = document.getElementById('groupsList');
    if (!groupsList) return;

    groupsList.innerHTML = '';

    if (!groups || groups.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.innerHTML = `
            <p>Non sei ancora membro di nessun gruppo.</p>
            <p>Crea un nuovo gruppo o unisciti a uno esistente!</p>
        `;
        groupsList.appendChild(emptyMessage);
        return;
    }

    groups.forEach(group => {
        const groupElement = document.createElement('div');
        groupElement.className = 'group-item';
        groupElement.innerHTML = `
            <h3>${group.name}</h3>
            <p>${group.description || 'Nessuna descrizione'}</p>
            <p>Membri: ${group.members ? group.members.length : 0}</p>
            <button onclick="window.location.href='group-details.html?id=${group._id}'">
                Visualizza Dettagli
            </button>
        `;
        groupsList.appendChild(groupElement);
    });
}

// Event Listeners per i form
if (elements.loginForm) {
    elements.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const data = await login(username, password);
            currentUser = data.user;
            toggleModal(elements.loginModal, false);
            window.location.href = '/dashboard.html';
        } catch (error) {
            console.error('Errore durante il login:', error);
            alert(error.message);
        }
    });
}

if (elements.registerForm) {
    elements.registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            alert('Le password non coincidono');
            return;
        }
        
        try {
            const data = await register(username, password);
            currentUser = data.user;
            toggleModal(elements.registerModal, false);
            window.location.href = '/dashboard.html';
        } catch (error) {
            console.error('Errore durante la registrazione:', error);
            alert(error.message);
        }
    });
}

if (elements.createGroupForm) {
    elements.createGroupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = elements.createGroupForm.querySelector('input[name="groupName"]').value;
        const description = elements.createGroupForm.querySelector('textarea[name="groupDescription"]').value;
        const code = elements.createGroupForm.querySelector('input[name="groupCode"]').value;
        
        try {
            await createGroup(name, description, code);
            toggleModal(elements.createGroupModal, false);
            loadGroups();
        } catch (error) {
            alert(error.message);
        }
    });
}

if (elements.joinGroupForm) {
    elements.joinGroupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const groupName = elements.joinGroupForm.querySelector('input[name="groupName"]').value;
        const code = elements.joinGroupForm.querySelector('input[name="groupCode"]').value;
        
        try {
            await joinGroup(groupName, code);
            toggleModal(elements.joinGroupModal, false);
            loadGroups();
        } catch (error) {
            alert(error.message);
        }
    });
}

// Event listeners per i pulsanti dei modali
if (elements.welcomeLoginBtn) elements.welcomeLoginBtn.addEventListener('click', () => toggleModal(elements.loginModal, true));
if (elements.welcomeRegisterBtn) elements.welcomeRegisterBtn.addEventListener('click', () => toggleModal(elements.registerModal, true));
if (elements.loginBtn) elements.loginBtn.addEventListener('click', () => toggleModal(elements.loginModal, true));
if (elements.registerBtn) elements.registerBtn.addEventListener('click', () => toggleModal(elements.registerModal, true));
if (elements.createGroupBtn) elements.createGroupBtn.addEventListener('click', () => toggleModal(elements.createGroupModal, true));
if (elements.joinGroupBtn) elements.joinGroupBtn.addEventListener('click', () => toggleModal(elements.joinGroupModal, true));

// Chiudi modali quando si clicca fuori
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Funzioni per la persistenza dei dati
function saveData() {
    try {
        if (currentUser) {
            localStorage.setItem(`expenses_${currentUser.id}`, JSON.stringify(expenses));
        }
    } catch (error) {
        console.error('Errore nel salvataggio dei dati:', error);
    }
}

function loadData() {
    try {
        if (currentUser) {
            const savedExpenses = localStorage.getItem(`expenses_${currentUser.id}`);
            const savedGroups = localStorage.getItem('groups');
            
            if (savedExpenses) {
                expenses = JSON.parse(savedExpenses);
            }
            if (savedGroups) {
                groups = JSON.parse(savedGroups);
            }
        }
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        expenses = [];
        groups = [];
    }
}

// Funzioni per inizializzare le varie pagine
async function initDashboard() {
    try {
        // Inizializza il selettore del periodo
        initPeriodSelector();
        
        // Aggiorna la dashboard con il periodo iniziale
        await updateDashboard();
        
        // Aggiungi event listener per il cambio periodo
        const periodSelect = document.getElementById('periodSelect');
        if (periodSelect) {
            periodSelect.addEventListener('change', updateDashboard);
        }
    } catch (error) {
        console.error('Errore nell\'inizializzazione della dashboard:', error);
    }
}

// Funzione per popolare il selettore dei gruppi
async function populateGroupSelect() {
    try {
        const groups = await getGroups();
        const groupSelect = document.getElementById('expenseGroup');
        if (groupSelect) {
            // Mantieni solo l'opzione "Nessun gruppo"
            groupSelect.innerHTML = '<option value="">Nessun gruppo</option>';
            
            // Aggiungi i gruppi disponibili
            groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group._id;
                option.textContent = group.name;
                groupSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Errore nel caricamento dei gruppi:', error);
    }
}

// Funzione per ottenere l'ID del gruppo corrente
async function getCurrentGroupId() {
    try {
        const groups = await getGroups();
        if (groups && groups.length > 0) {
            return groups[0]._id; // Restituisce l'ID del primo gruppo
        }
        return null;
    } catch (error) {
        console.error('Errore nel recupero del gruppo:', error);
        return null;
    }
}

// Funzione per inizializzare il modale delle spese
function initExpenseModal(groupId = null) {
    const addExpenseBtn = document.getElementById('addExpenseBtn');
    const expenseModal = document.getElementById('expenseModal');
    const expenseForm = document.getElementById('expenseForm');
    const closeButtons = document.getElementsByClassName('close');

    // Rimuovi tutti gli event listener esistenti dal form
    if (expenseForm) {
        const newForm = expenseForm.cloneNode(true);
        expenseForm.parentNode.replaceChild(newForm, expenseForm);
        
        // Nascondi sempre il selettore dei gruppi
        const groupSelect = newForm.querySelector('#expenseGroup');
        if (groupSelect) {
            groupSelect.parentElement.style.display = 'none';
        }
        
        // Aggiungi il nuovo event listener
        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Disabilita il form durante l'invio
            const submitButton = newForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
            }
            
            try {
                const type = document.getElementById('expenseType').value;
                const amount = parseFloat(document.getElementById('expenseAmount').value);
                const quantity = parseFloat(document.getElementById('expenseQuantity').value);
                const date = document.getElementById('expenseDate').value;

                // Se siamo nella pagina dei dettagli del gruppo, usa l'ID del gruppo corrente
                let currentGroupId = null;
                if (window.location.pathname.includes('group-details.html')) {
                    currentGroupId = new URLSearchParams(window.location.search).get('id');
                } else {
                    // Se siamo nella dashboard o nella pagina spese, ottieni l'ID del primo gruppo
                    currentGroupId = await getCurrentGroupId();
                }

                // Aggiungi la spesa
                await addExpense(type, amount, quantity, date, currentGroupId);
                
                // Chiudi il modale
                if (expenseModal) {
                    expenseModal.style.display = 'none';
                }
                
                // Resetta il form
                newForm.reset();
                
                // Aggiorna la UI
                const expenses = await getExpenses();
                
                // Se siamo nella pagina dei dettagli del gruppo
                if (currentGroupId) {
                    try {
                        const group = await getGroupDetails(currentGroupId);
                        await updateGroupDetails(group);
                    } catch (error) {
                        console.error('Errore nell\'aggiornamento dei dettagli del gruppo:', error);
                    }
                }
                
                // Aggiorna sempre la dashboard/spese
                updateExpensesList(expenses);
                updateExpenseStats(expenses);
                
                if (window.location.pathname.includes('dashboard.html')) {
                    updateCharts(expenses);
                    updateDrinksSummary(expenses);
                }
            } catch (error) {
                console.error('Errore nell\'aggiunta della spesa:', error);
                alert('Errore nell\'aggiunta della spesa: ' + error.message);
            } finally {
                // Riabilita il form
                if (submitButton) {
                    submitButton.disabled = false;
                }
            }
        });
    }

    // Gestione del pulsante di aggiunta
    if (addExpenseBtn && expenseModal) {
        // Rimuovi eventuali listener esistenti
        const newBtn = addExpenseBtn.cloneNode(true);
        addExpenseBtn.parentNode.replaceChild(newBtn, addExpenseBtn);
        
        newBtn.addEventListener('click', () => {
            const today = new Date().toISOString().split('T')[0];
            if (document.getElementById('expenseDate')) {
                document.getElementById('expenseDate').value = today;
            }
            expenseModal.style.display = 'block';
        });
    }

    // Gestione dei pulsanti di chiusura
    Array.from(closeButtons).forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', () => {
            if (expenseModal) {
                expenseModal.style.display = 'none';
            }
        });
    });

    // Gestione della chiusura cliccando fuori dal modale
    window.removeEventListener('click', handleModalOutsideClick);
    window.addEventListener('click', handleModalOutsideClick);
}

function handleModalOutsideClick(event) {
    const expenseModal = document.getElementById('expenseModal');
    if (event.target === expenseModal) {
        expenseModal.style.display = 'none';
    }
}

// Rimuovo tutti gli altri event listener duplicati per il form delle spese
if (elements.expenseForm) {
    elements.expenseForm.replaceWith(elements.expenseForm.cloneNode(true));
}

if (elements.addExpenseBtn) {
    elements.addExpenseBtn.replaceWith(elements.addExpenseBtn.cloneNode(true));
}

// Modifica la funzione initExpensesPage
async function initExpensesPage() {
    try {
        initPeriodSelector();
        const expenses = await getExpenses();
        updateExpensesList(expenses);
        initExpenseModal(null);
        
        // Aggiorna il selettore dei gruppi quando si apre il modale
        const addExpenseBtn = document.getElementById('addExpenseBtn');
        if (addExpenseBtn) {
            addExpenseBtn.addEventListener('click', () => {
                populateGroupSelect();
            });
        }
        
        const periodSelect = document.getElementById('periodSelect');
        if (periodSelect) {
            const newSelect = periodSelect.cloneNode(true);
            periodSelect.parentNode.replaceChild(newSelect, periodSelect);
            
            newSelect.addEventListener('change', async () => {
                const currentExpenses = await getExpenses();
                updateExpensesList(currentExpenses);
            });
        }
    } catch (error) {
        console.error('Errore nell\'inizializzazione della pagina spese:', error);
        alert('Errore nell\'inizializzazione della pagina: ' + error.message);
    }
}

// Rimuovo la vecchia implementazione di handleDeleteExpense e la sostituisco con una nuova versione pulita
window.handleDeleteExpense = async function(expenseId) {
    if (!expenseId) return;
    
    if (confirm('Sei sicuro di voler eliminare questa spesa?')) {
        try {
            await deleteExpense(expenseId);
            const expenses = await getExpenses();
            updateExpensesList(expenses);
            updateExpenseStats(expenses);
            
            if (window.location.pathname.includes('dashboard.html')) {
                updateCharts(expenses);
                updateDrinksSummary(expenses);
            }
        } catch (error) {
            console.error('Errore nell\'eliminazione della spesa:', error);
            alert('Errore nell\'eliminazione della spesa');
        }
    }
};

// Funzione per aggiornare l'interfaccia utente
function updateUI() {
    const isAuthenticated = !!localStorage.getItem('token');
    const currentPath = window.location.pathname;

    // Aggiorna la visibilità dei pulsanti di navigazione
    if (elements.logoutBtn) {
        elements.logoutBtn.style.display = isAuthenticated ? 'block' : 'none';
    }

    // Aggiorna la pagina dei gruppi se siamo nella pagina gruppi
    if (currentPath.includes('groups')) {
        // Rimuovo questi controlli perché i pulsanti devono essere sempre visibili nella pagina dei gruppi
        // se l'utente è già autenticato (altrimenti non potrebbe accedere alla pagina)
        updateGroupsList();
    }

    // Aggiorna la pagina delle spese se siamo nella pagina spese
    if (currentPath.includes('expenses')) {
        if (elements.addExpenseBtn) {
            elements.addExpenseBtn.style.display = isAuthenticated ? 'block' : 'none';
        }
        updateExpensesList();
    }
}

// Funzione per inizializzare il selettore del periodo
function initPeriodSelector() {
    const periodSelect = document.getElementById('periodSelect');
    if (!periodSelect) return;

    // Svuota il selettore
    periodSelect.innerHTML = '';

    // Aggiungi l'opzione per l'anno intero
    const yearOption = document.createElement('option');
    yearOption.value = '2025';
    yearOption.textContent = 'Anno 2025';
    periodSelect.appendChild(yearOption);

    // Aggiungi le opzioni per i mesi
    const months = [
        'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];

    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = `2025-${(index + 1).toString().padStart(2, '0')}`;
        option.textContent = `${month} 2025`;
        periodSelect.appendChild(option);
    });

    // Aggiungi l'event listener per il cambio di periodo
    periodSelect.addEventListener('change', () => {
        updateDashboard();
    });
}

// Funzione per filtrare le spese in base al periodo selezionato
function filterExpensesByPeriod(expenses, selectedPeriod) {
    if (!selectedPeriod || !expenses || expenses.length === 0) return [];

    // Se è selezionato l'anno intero
    if (selectedPeriod === '2025') {
        return expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getFullYear() === 2025;
        });
    }

    // Se è selezionato un mese specifico
    const [year, month] = selectedPeriod.split('-');
    return expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getFullYear() === parseInt(year) &&
               expenseDate.getMonth() === parseInt(month) - 1;
    });
}

// Modifica la funzione updateExpensesList per gestire il filtro del periodo
function updateExpensesList(expenses = []) {
    const expensesList = document.getElementById('recentExpensesList');
    if (!expensesList) return;

    // Ottieni il periodo selezionato
    const periodSelect = document.getElementById('periodSelect');
    const selectedPeriod = periodSelect ? periodSelect.value : '2025';

    // Filtra le spese per il periodo selezionato
    let filteredExpenses = [];
    if (selectedPeriod === '2025') {
        filteredExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getFullYear() === 2025;
        });
    } else {
        const [year, month] = selectedPeriod.split('-');
        filteredExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getFullYear() === parseInt(year) && 
                   expenseDate.getMonth() === parseInt(month) - 1;
        });
    }

    // Ordina le spese per data (più recenti prima)
    const sortedExpenses = filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Svuota la lista
    expensesList.innerHTML = '';
    
    // Aggiungi le spese alla lista
    sortedExpenses.forEach(expense => {
        const row = document.createElement('tr');
        const date = new Date(expense.date).toLocaleDateString('it-IT', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        
        row.innerHTML = `
            <td>${date}</td>
            <td>${getTypeLabel(expense.type)}</td>
            <td>€${expense.amount.toFixed(2)}</td>
            <td>${expense.quantity.toFixed(2)} L</td>
            <td>
                <button class="btn-delete" onclick="handleDeleteExpense('${expense._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        expensesList.appendChild(row);
    });
}

// Modifica la funzione updateExpenseStats per gestire correttamente il caso in cui non ci sono spese
function updateExpenseStats(expenses) {
    // Se expenses è undefined o null, usa un array vuoto
    const expensesList = expenses || [];
    
    // Calcola i totali
    const totalExpense = expensesList.reduce((sum, exp) => sum + exp.amount, 0);
    const totalLiters = expensesList.reduce((sum, exp) => sum + exp.quantity, 0);

    // Aggiorna i valori nell'interfaccia
    const totalExpenseEl = document.getElementById('totalExpense');
    const totalLitersEl = document.getElementById('totalLiters');
    
    if (totalExpenseEl) {
        totalExpenseEl.textContent = `€${totalExpense.toFixed(2)}`;
    }
    if (totalLitersEl) {
        totalLitersEl.textContent = `${totalLiters.toFixed(2)} L`;
    }

    // Aggiorna i grafici se siamo nella dashboard
    if (window.location.pathname.includes('dashboard.html')) {
        updateCharts(expensesList);
    }
}

// Funzione per creare o aggiornare i grafici
function updateCharts(filteredExpenses) {
    const ctx1 = document.getElementById('expensesByType');
    const ctx2 = document.getElementById('quantityByType');

    if (!ctx1 || !ctx2) return;

    // Raggruppa le spese per tipo
    const typeData = {};
    filteredExpenses.forEach(expense => {
        typeData[expense.type] = (typeData[expense.type] || 0) + expense.amount;
    });

    // Distruggi i grafici esistenti se presenti
    if (typeChart) typeChart.destroy();
    if (quantityChart) quantityChart.destroy();

    // Crea il grafico per i tipi di spesa
    typeChart = new Chart(ctx1, {
        type: 'pie',
        data: {
            labels: Object.keys(typeData).map(type => getTypeLabel(type)),
            datasets: [{
                data: Object.values(typeData),
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Distribuzione Spese per Tipo'
                }
            }
        }
    });

    // Crea il grafico per le quantità
    const quantityData = {};
    filteredExpenses.forEach(expense => {
        quantityData[expense.type] = (quantityData[expense.type] || 0) + expense.quantity;
    });

    quantityChart = new Chart(ctx2, {
        type: 'pie',
        data: {
            labels: Object.keys(quantityData).map(type => getTypeLabel(type)),
            datasets: [{
                data: Object.values(quantityData),
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Distribuzione Litri per Tipo'
                }
            }
        }
    });
}

// Funzione per ottenere l'etichetta in italiano del tipo di bevanda
function getTypeLabel(type) {
    const labels = {
        'beer': 'Birra',
        'wine': 'Vino',
        'spirits': 'Superalcolici',
        'spritz': 'Spritz'
    };
    return labels[type] || type;
}

// Funzione per inizializzare la pagina dei dettagli del gruppo
async function initGroupDetailsPage() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const groupId = urlParams.get('id');
        if (!groupId) {
            throw new Error('ID gruppo non specificato');
        }

        const group = await getGroupDetails(groupId);
        await updateGroupDetails(group);

        // Inizializza il form di aggiunta spesa con l'ID del gruppo
        initExpenseModal(groupId);
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const deleteGroupBtn = document.getElementById('deleteGroupBtn');
        const leaveGroupBtn = document.getElementById('leaveGroupBtn');
        
        // Gestione del pulsante di eliminazione
        if (deleteGroupBtn) {
            // Mostra il pulsante solo se l'utente è il creatore del gruppo
            if (group.createdBy.id === currentUser.id) {
                deleteGroupBtn.style.display = 'block';
                leaveGroupBtn.style.display = 'none';
                
                deleteGroupBtn.addEventListener('click', async () => {
                    if (confirm('Sei sicuro di voler eliminare questo gruppo? Questa azione non può essere annullata.')) {
                        try {
                            await deleteGroup(groupId);
                            window.location.href = '/groups.html';
                        } catch (error) {
                            console.error('Errore nell\'eliminazione del gruppo:', error);
                            alert('Errore nell\'eliminazione del gruppo: ' + error.message);
                        }
                    }
                });
            } else {
                deleteGroupBtn.style.display = 'none';
            }
        }
        
        // Gestione del pulsante per lasciare il gruppo
        if (leaveGroupBtn) {
            // Mostra il pulsante solo se l'utente non è il creatore del gruppo
            if (group.createdBy.id !== currentUser.id) {
                leaveGroupBtn.style.display = 'block';
                
                leaveGroupBtn.addEventListener('click', async () => {
                    if (confirm('Sei sicuro di voler lasciare questo gruppo?')) {
                        try {
                            await leaveGroup(groupId);
                            window.location.href = '/groups.html';
                        } catch (error) {
                            console.error('Errore nell\'uscita dal gruppo:', error);
                            alert('Errore nell\'uscita dal gruppo: ' + error.message);
                        }
                    }
                });
            } else {
                leaveGroupBtn.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Errore nel caricamento dei dettagli del gruppo:', error);
        alert('Errore nel caricamento dei dettagli del gruppo: ' + error.message);
    }
}

// Funzione per aggiornare i dettagli del gruppo
async function updateGroupDetails(group) {
    try {
        if (!group || !group._id) {
            console.error('Gruppo non valido');
            return;
        }

        // Aggiorna il titolo e la descrizione del gruppo
        const groupNameEl = document.getElementById('groupName');
        const groupDescriptionEl = document.getElementById('groupDescription');
        if (groupNameEl) groupNameEl.textContent = group.name;
        if (groupDescriptionEl) groupDescriptionEl.textContent = group.description || 'Nessuna descrizione';

        // Ottieni il periodo selezionato
        const periodSelect = document.getElementById('periodSelect');
        const period = periodSelect ? periodSelect.value : '2025';

        // Usa le spese fornite dal server
        const groupExpenses = group.expenses || [];
        
        // Filtra le spese per periodo
        const filteredExpenses = filterExpensesByPeriod(groupExpenses, period);

        // Calcola le statistiche del gruppo
        const totalGroupExpense = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const totalGroupLiters = filteredExpenses.reduce((sum, exp) => sum + exp.quantity, 0);

        // Aggiorna le statistiche del gruppo
        const totalGroupExpenseEl = document.getElementById('totalGroupExpense');
        const totalGroupLitersEl = document.getElementById('totalGroupLiters');
        
        if (totalGroupExpenseEl) {
            totalGroupExpenseEl.textContent = `€${totalGroupExpense.toFixed(2)}`;
        }
        if (totalGroupLitersEl) {
            totalGroupLitersEl.textContent = `${totalGroupLiters.toFixed(2)} L`;
        }

        // Aggiorna le statistiche dei membri
        const membersStats = document.getElementById('membersStats');
        if (membersStats && group.members && Array.isArray(group.members)) {
            membersStats.innerHTML = '';
            
            // Per ogni membro del gruppo
            for (const member of group.members) {
                if (!member || !member.id) continue;
                
                // Filtra le spese per questo membro
                const memberExpenses = filteredExpenses.filter(exp => 
                    exp.userId === member.id || 
                    exp.userId?.toString() === member.id.toString()
                );

                const totalExpense = memberExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                const totalLiters = memberExpenses.reduce((sum, exp) => sum + exp.quantity, 0);

                const memberCard = document.createElement('div');
                memberCard.className = 'member-card';

                // Aggiungi la classe 'current-user' se questo è l'utente corrente
                if (group.currentUser && member.id === group.currentUser.id) {
                    memberCard.classList.add('current-user');
                }

                memberCard.innerHTML = `
                    <div class="member-header">
                        <h4>${member.username}${group.currentUser && member.id === group.currentUser.id ? ' (Tu)' : ''}</h4>
                    </div>
                    <div class="member-totals">
                        <span class="total-amount">€${totalExpense.toFixed(2)}</span>
                        <span class="total-liters">${totalLiters.toFixed(2)} L</span>
                    </div>
                `;

                membersStats.appendChild(memberCard);
            }
        }

        // Aggiorna i grafici del gruppo
        updateGroupCharts(group, filteredExpenses);

        // Aggiungi event listener per il cambio periodo
        if (periodSelect) {
            periodSelect.removeEventListener('change', handlePeriodChange);
            periodSelect.addEventListener('change', handlePeriodChange);
        }
    } catch (error) {
        console.error('Errore nell\'aggiornamento dei dettagli del gruppo:', error);
        alert('Errore nell\'aggiornamento delle statistiche del gruppo');
    }
}

// Funzione per gestire il cambio periodo
async function handlePeriodChange() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const groupId = urlParams.get('id');
        if (!groupId) {
            throw new Error('ID gruppo non specificato');
        }

        // Ricarica i dati del gruppo
        const group = await getGroupDetails(groupId);
        await updateGroupDetails(group);
    } catch (error) {
        console.error('Errore durante l\'aggiornamento del periodo:', error);
        alert('Errore durante l\'aggiornamento del periodo');
    }
}

// Funzione per aggiornare i grafici del gruppo
function updateGroupCharts(group, groupExpenses) {
    // Calcola le statistiche per ogni membro e tipo di alcol
    const memberStats = group.members.map(member => {
        const memberExpenses = groupExpenses.filter(exp => 
            exp.userId === member.id || 
            exp.userId?.toString() === member.id.toString()
        );
        return {
            id: member.id,
            username: member.username,
            beer: {
                expense: memberExpenses.filter(exp => exp.type === 'beer').reduce((sum, exp) => sum + exp.amount, 0),
                liters: memberExpenses.filter(exp => exp.type === 'beer').reduce((sum, exp) => sum + exp.quantity, 0)
            },
            wine: {
                expense: memberExpenses.filter(exp => exp.type === 'wine').reduce((sum, exp) => sum + exp.amount, 0),
                liters: memberExpenses.filter(exp => exp.type === 'wine').reduce((sum, exp) => sum + exp.quantity, 0)
            },
            spirits: {
                expense: memberExpenses.filter(exp => exp.type === 'spirits').reduce((sum, exp) => sum + exp.amount, 0),
                liters: memberExpenses.filter(exp => exp.type === 'spirits').reduce((sum, exp) => sum + exp.quantity, 0)
            },
            spritz: {
                expense: memberExpenses.filter(exp => exp.type === 'spritz').reduce((sum, exp) => sum + exp.amount, 0),
                liters: memberExpenses.filter(exp => exp.type === 'spritz').reduce((sum, exp) => sum + exp.quantity, 0)
            }
        };
    });

    // Funzione per ordinare i membri per spese di un tipo specifico
    const sortByExpense = (type) => {
        return [...memberStats].sort((a, b) => b[type].expense - a[type].expense);
    };

    // Funzione per ordinare i membri per litri di un tipo specifico
    const sortByLiters = (type) => {
        return [...memberStats].sort((a, b) => b[type].liters - a[type].liters);
    };

    // Funzione per generare l'HTML della classifica
    const generateLeaderboardHTML = (members, type) => {
        if (members.length === 0) {
            return '<div class="leaderboard-item">Nessun dato disponibile</div>';
        }
        
        return members.map((member, index) => `
            <div class="leaderboard-item">
                <div class="leaderboard-rank">${index + 1}</div>
                <div class="leaderboard-info">
                    <h4>${member.username}</h4>
                    <div class="leaderboard-stats">
                        <span>Spese: <span class="leaderboard-value">€${member[type].expense.toFixed(2)}</span></span>
                        <span>Litri: <span class="leaderboard-value">${member[type].liters.toFixed(2)} L</span></span>
                    </div>
                </div>
            </div>
        `).join('');
    };

    // Aggiorna le classifiche per ogni tipo di alcol
    const types = ['beer', 'wine', 'spirits', 'spritz'];
    types.forEach(type => {
        const leaderboardEl = document.getElementById(`${type}Leaderboard`);
        if (leaderboardEl) {
            // Ordina per spese
            const sortedByExpense = sortByExpense(type);
            leaderboardEl.innerHTML = generateLeaderboardHTML(sortedByExpense, type);
        }
    });

    // Gestione dei tab
    const tabBtns = document.querySelectorAll('.tab-btn');
    const leaderboardLists = document.querySelectorAll('.leaderboard-list');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Rimuovi la classe active da tutti i pulsanti e le liste
            tabBtns.forEach(b => b.classList.remove('active'));
            leaderboardLists.forEach(l => l.classList.remove('active'));

            // Aggiungi la classe active al pulsante cliccato e alla lista corrispondente
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(`${tabId}Leaderboard`).classList.add('active');
        });
    });
}

// Gestione del menu mobile
if (elements.menuToggle && elements.navLinks) {
    elements.menuToggle.addEventListener('click', () => {
        elements.navLinks.classList.toggle('active');
    });

    // Chiudi il menu quando si clicca su un link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            elements.navLinks.classList.remove('active');
        });
    });
}

// Event listeners per i pulsanti di chiusura dei modali
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        const modal = closeBtn.closest('.modal');
        if (modal) {
            toggleModal(modal, false);
        }
    });
});

// Funzioni per la gestione delle spese
async function loadExpenses() {
    try {
        const expenses = await getExpenses();
        if (!expenses) {
            console.log('Nessuna spesa trovata');
            updateExpenseStats([]);
            updateExpensesList([]);
            return [];
        }
        updateExpenseStats(expenses);
        updateExpensesList(expenses);
        return expenses;
    } catch (error) {
        console.error('Errore nel caricamento delle spese:', error);
        updateExpenseStats([]);
        updateExpensesList([]);
        return [];
    }
}

// Event listener per il form di aggiunta spesa
if (elements.expenseForm) {
    elements.expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const type = document.getElementById('expenseType').value;
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const quantity = parseFloat(document.getElementById('expenseQuantity').value);
        const date = document.getElementById('expenseDate').value;
        
        try {
            // Aggiungi la spesa
            await addExpense(type, amount, quantity, date);
            
            // Chiudi il modale e resetta il form
            toggleModal(elements.expenseModal, false);
            elements.expenseForm.reset();

            // Ricarica le spese una sola volta
            const expenses = await getExpenses();
            updateExpensesList(expenses);
            updateExpenseStats(expenses);
            
            // Se siamo nella pagina della dashboard, aggiorna i grafici
            if (window.location.pathname.includes('dashboard.html')) {
                updateCharts(expenses);
                updateDrinksSummary(expenses);
            }
            
        } catch (error) {
            console.error('Errore durante l\'aggiunta della spesa:', error);
            alert(error.message);
        }
    });
}

// Event listener per il pulsante di aggiunta spesa
if (elements.addExpenseBtn) {
    elements.addExpenseBtn.addEventListener('click', () => {
        toggleModal(elements.expenseModal, true);
    });
}

// Funzione unificata per l'eliminazione delle spese
async function handleDeleteExpense(expenseId) {
    if (confirm('Sei sicuro di voler eliminare questa spesa?')) {
        try {
            await deleteExpense(expenseId);
            const expenses = await getExpenses();
            updateExpensesList(expenses);
            updateExpenseStats(expenses);
            
            // Se siamo nella dashboard, aggiorna anche i grafici
            if (window.location.pathname.includes('dashboard.html')) {
                updateCharts(expenses);
                updateDrinksSummary(expenses);
            }
        } catch (error) {
            console.error('Errore nell\'eliminazione della spesa:', error);
            alert('Errore nell\'eliminazione della spesa');
        }
    }
}

// Inizializzazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', () => {
    // Inizializza gli elementi UI
    updateUI();

    // Carica i dati se l'utente è loggato
    if (currentUser) {
        loadExpenses();
        loadGroups();
    }

    // Inizializza i modali
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modal = closeBtn.closest('.modal');
            if (modal) {
                toggleModal(modal, false);
            }
        });
    });

    // Chiudi i modali quando si clicca fuori
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
});

// Funzione per il logout
function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    currentUser = null;
    window.location.href = '/';
}

// Aggiungi event listener per il logout
if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', logout);
}

// Event listeners per i link tra i modali
document.getElementById('showRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    toggleModal(elements.loginModal, false);
    toggleModal(elements.registerModal, true);
});

document.getElementById('showLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    toggleModal(elements.registerModal, false);
    toggleModal(elements.loginModal, true);
});

async function updateDrinksSummary(expenses) {
    const summaryList = document.getElementById('drinksSummaryList');
    if (!summaryList) return;

    // Raggruppa le spese per tipo
    const summary = expenses.reduce((acc, expense) => {
        if (!acc[expense.type]) {
            acc[expense.type] = {
                totalAmount: 0,
                totalLiters: 0
            };
        }
        acc[expense.type].totalAmount += expense.amount;
        acc[expense.type].totalLiters += expense.quantity;
        return acc;
    }, {});

    // Svuota la lista
    summaryList.innerHTML = '';

    // Aggiungi una riga per ogni tipo di bevanda
    Object.entries(summary).forEach(([type, data]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${getTypeLabel(type)}</td>
            <td>€${data.totalAmount.toFixed(2)}</td>
            <td>${data.totalLiters.toFixed(2)} L</td>
        `;
        summaryList.appendChild(row);
    });
}

// Modifica la funzione updateDashboard
async function updateDashboard() {
    try {
        const expenses = await getExpenses();
        const periodSelect = document.getElementById('periodSelect');
        const selectedPeriod = periodSelect ? periodSelect.value : '2025';
        
        // Filtra le spese per il periodo selezionato
        const filteredExpenses = filterExpensesByPeriod(expenses, selectedPeriod);
        
        // Aggiorna le statistiche con le spese filtrate
        updateExpenseStats(filteredExpenses);
        updateDrinksSummary(filteredExpenses);
        updateCharts(filteredExpenses);
    } catch (error) {
        console.error('Errore nell\'aggiornamento della dashboard:', error);
    }
}

// Inizializza l'applicazione
initApp();