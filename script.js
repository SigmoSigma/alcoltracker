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

// Funzioni per la persistenza dei dati
function saveData() {
    try {
        if (currentUser) {
            localStorage.setItem(`expenses_${currentUser.id}`, JSON.stringify(expenses));
            localStorage.setItem('groups', JSON.stringify(groups));
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

// Carica i gruppi all'avvio dell'applicazione
function loadGroups() {
    try {
        const savedGroups = localStorage.getItem('groups');
        if (savedGroups) {
            groups = JSON.parse(savedGroups);
        }
    } catch (error) {
        console.error('Errore nel caricamento dei gruppi:', error);
        groups = [];
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

// Funzione per mostrare/nascondere il modale
function toggleModal(modal, show) {
    if (modal) {
        if (show) {
            modal.classList.add('active');
        } else {
            modal.classList.remove('active');
        }
    }
}

// Gestione Autenticazione
function showLoginModal() {
    toggleModal(elements.loginModal, true);
    toggleModal(elements.registerModal, false);
}

function showRegisterModal() {
    toggleModal(elements.registerModal, true);
    toggleModal(elements.loginModal, false);
}

// Event listeners per i pulsanti di login/registrazione
if (elements.welcomeLoginBtn) elements.welcomeLoginBtn.addEventListener('click', showLoginModal);
if (elements.welcomeRegisterBtn) elements.welcomeRegisterBtn.addEventListener('click', showRegisterModal);
if (elements.loginBtn) elements.loginBtn.addEventListener('click', showLoginModal);
if (elements.registerBtn) elements.registerBtn.addEventListener('click', showRegisterModal);

// Chiudi modali quando si clicca fuori
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Gestione form di login
if (elements.loginForm) {
    elements.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = elements.loginForm.querySelector('input[type="text"]').value;
        const password = elements.loginForm.querySelector('input[type="password"]').value;
        
        // Verifica se l'utente esiste e la password è corretta
        const user = registeredUsers.find(u => u.username === username && u.password === password);
        
        if (user) {
            currentUser = { username: user.username, id: user.id };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            toggleModal(elements.loginModal, false);
            window.location.href = 'dashboard.html';
        } else {
            alert('Nome utente o password non validi!');
        }
    });
}

// Gestione form di registrazione
if (elements.registerForm) {
    elements.registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            alert('Le password non coincidono!');
            return;
        }
        
        // Verifica se l'utente esiste già
        if (registeredUsers.some(u => u.username === username)) {
            alert('Nome utente già in uso!');
            return;
        }
        
        // Crea nuovo utente
        const newUser = {
            id: Date.now(), // Usa timestamp come ID univoco
            username,
            password
        };
        
        // Aggiungi l'utente alla lista degli utenti registrati
        registeredUsers.push(newUser);
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
        
        // Effettua il login automatico
        currentUser = { username: newUser.username, id: newUser.id };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        toggleModal(elements.registerModal, false);
        window.location.href = 'dashboard.html';
    });
}

// Gestione logout
if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });
}

// Controllo autenticazione
function checkAuth() {
    const user = localStorage.getItem('currentUser');
    if (user) {
        currentUser = JSON.parse(user);
        loadData();
    } else if (!window.location.pathname.endsWith('index.html')) {
        window.location.href = 'index.html';
    }
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    // Carica i gruppi prima di tutto
    loadGroups();
    
    checkAuth();
    
    // Inizializza la pagina corrente
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage === 'dashboard.html') {
        initDashboard();
    } else if (currentPage === 'expenses.html') {
        initExpenses();
    } else if (currentPage === 'groups.html') {
        initGroups();
    } else if (currentPage === 'group-details.html') {
        initGroupDetails();
    }
});

// Funzioni per inizializzare le varie pagine
function initDashboard() {
    updatePeriodSelector();
    updateDashboard();
    
    // Aggiungi event listener per il cambio di periodo
    const periodSelect = document.getElementById('periodSelect');
    if (periodSelect) {
        periodSelect.addEventListener('change', () => {
            updateDashboard();
        });
    }
}

function initExpenses() {
    // Inizializza la lista delle spese all'avvio
    updateExpensesList();

    // Gestione del pulsante "Aggiungi Spesa"
    const addExpenseBtn = document.getElementById('addExpenseBtn');
    const expenseModal = document.getElementById('expenseModal');
    const dateInput = document.getElementById('date');
    
    if (addExpenseBtn && expenseModal) {
        addExpenseBtn.addEventListener('click', () => {
            // Imposta la data corrente come valore predefinito
            const today = new Date().toISOString().split('T')[0];
            if (dateInput) {
                dateInput.value = today;
            }
            toggleModal(expenseModal, true);
        });
    }

    // Gestione del form delle spese
    const expenseForm = document.getElementById('expenseForm');
    if (expenseForm) {
        expenseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Ottieni i valori dal form
            const formData = new FormData(expenseForm);
            const amount = Number(formData.get('amount')) || 0;
            const type = formData.get('type');
            const quantity = Number(formData.get('quantity')) || 0;
            const date = formData.get('date');
            
            // Validazione
            if (isNaN(amount) || isNaN(quantity)) {
                alert('Inserisci valori numerici validi!');
                return;
            }
            
            if (amount < 0 || quantity < 0) {
                alert('Importo e quantità non possono essere negativi!');
                return;
            }
            
            if (!type) {
                alert('Seleziona un tipo di spesa!');
                return;
            }
            
            if (!date) {
                alert('Seleziona una data!');
                return;
            }
            
            // Crea la nuova spesa
            const expense = {
                id: Date.now(),
                amount,
                type,
                quantity,
                date,
                userId: currentUser.id
            };
            
            // Aggiungi la spesa all'array
            expenses.push(expense);
            
            // Salva i dati
            saveData();
            
            // Chiudi il modale e resetta il form
            toggleModal(expenseModal, false);
            expenseForm.reset();
            
            // Imposta di nuovo la data corrente
            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
            
            // Aggiorna la lista delle spese
            updateExpensesList();
            
            // Aggiorna la dashboard se siamo nella pagina dashboard
            if (window.location.pathname.includes('dashboard.html')) {
                updateDashboard();
            }
        });
    }
}

function initGroups() {
    updateGroupsList();
    
    // Gestione del pulsante "Crea Gruppo"
    if (elements.createGroupBtn && elements.createGroupModal) {
        elements.createGroupBtn.addEventListener('click', () => {
            toggleModal(elements.createGroupModal, true);
        });
    }
    
    // Gestione del pulsante "Unisciti a un Gruppo"
    if (elements.joinGroupBtn && elements.joinGroupModal) {
        elements.joinGroupBtn.addEventListener('click', () => {
            toggleModal(elements.joinGroupModal, true);
        });
    }
    
    // Gestione del form per creare un gruppo
    if (elements.createGroupForm) {
        elements.createGroupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const userName = document.getElementById('userNameCreate').value.trim();
            const groupName = document.getElementById('groupName').value;
            const groupDescription = document.getElementById('groupDescription').value;
            const groupCode = document.getElementById('groupCode').value;
            
            console.log('Tentativo di creazione gruppo:', { userName, groupName, groupCode });
            
            if (!userName || !groupName || !groupDescription || !groupCode) {
                alert('Compila tutti i campi richiesti!');
                return;
            }
            
            // Verifica se esiste già un gruppo con lo stesso codice
            if (groups.some(g => g.code === groupCode)) {
                alert('Esiste già un gruppo con questo codice. Scegline un altro.');
                return;
            }
            
            // Crea il nuovo gruppo con il nome utente
            const newGroup = {
                id: Date.now(),
                name: groupName,
                description: groupDescription,
                code: groupCode,
                members: [{
                    id: currentUser.id,
                    username: userName
                }],
                createdBy: {
                    id: currentUser.id,
                    username: userName
                },
                createdAt: new Date().toISOString()
            };
            
            // Aggiungi il gruppo all'array
            groups.push(newGroup);
            
            // Salva i dati
            saveData();
            
            // Chiudi il modale e resetta il form
            toggleModal(elements.createGroupModal, false);
            elements.createGroupForm.reset();
            
            // Aggiorna la lista dei gruppi
            updateGroupsList();
            
            alert('Gruppo creato con successo! Condividi il codice con i membri che vuoi invitare.');
        });
    }
    
    // Gestione del form per unirsi a un gruppo
    if (elements.joinGroupForm) {
        elements.joinGroupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const userName = document.getElementById('userNameJoin').value.trim();
            const groupName = document.getElementById('groupNameJoin').value.trim();
            const groupCode = document.getElementById('groupCodeJoin').value.trim();
            
            console.log('Tentativo di unione al gruppo:', { userName, groupName, groupCode });
            console.log('Gruppi disponibili:', groups);
            
            if (!userName || !groupName || !groupCode) {
                alert('Inserisci tutti i campi richiesti!');
                return;
            }
            
            // Cerca il gruppo con il nome e il codice inseriti
            const group = groups.find(g => {
                const match = g.name.trim() === groupName && g.code.trim() === groupCode;
                console.log('Confronto gruppo:', { 
                    groupName: g.name, 
                    inputName: groupName, 
                    groupCode: g.code, 
                    inputCode: groupCode, 
                    match 
                });
                return match;
            });
            
            if (!group) {
                alert('Gruppo non trovato! Verifica il nome e il codice inseriti.');
                return;
            }
            
            // Verifica se l'utente è già membro del gruppo
            if (group.members.some(member => member.id === currentUser.id)) {
                alert('Sei già membro di questo gruppo!');
                return;
            }
            
            // Aggiungi l'utente al gruppo
            group.members.push({
                id: currentUser.id,
                username: userName
            });
            
            // Salva i dati
            saveData();
            
            // Chiudi il modale e resetta il form
            toggleModal(elements.joinGroupModal, false);
            elements.joinGroupForm.reset();
            
            // Aggiorna la lista dei gruppi
            updateGroupsList();
            
            alert('Ti sei unito al gruppo con successo!');
        });
    }
}

// Funzione per aggiornare la lista delle spese
function updateExpensesList() {
    const expensesList = document.getElementById('expensesList');
    if (!expensesList) {
        console.log('Elemento expensesList non trovato');
        return;
    }

    console.log('Aggiornamento lista spese:', expenses);
    
    expensesList.innerHTML = '';
    
    expenses.forEach(expense => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(expense.date).toLocaleDateString()}</td>
            <td>${getTypeLabel(expense.type)}</td>
            <td>€${expense.amount.toFixed(2)}</td>
            <td>${expense.quantity.toFixed(2)} L</td>
            <td>
                <button class="btn delete" onclick="deleteExpense('${expense.id}')"><i class="fas fa-trash"></i> Elimina</button>
            </td>
        `;
        expensesList.appendChild(row);
    });
}

// Funzione per ottenere l'etichetta del tipo di spesa
function getTypeLabel(type) {
    const typeLabels = {
        'beer': 'Birra',
        'wine': 'Vino',
        'spirits': 'Superalcolici',
        'spritz': 'Spritz'
    };
    return typeLabels[type] || type;
}

// Funzione per eliminare una spesa
function deleteExpense(expenseId) {
    if (confirm('Sei sicuro di voler eliminare questa spesa?')) {
        expenses = expenses.filter(exp => exp.id !== parseInt(expenseId));
        saveData();
        updateExpensesList();
        if (window.location.pathname.includes('dashboard.html')) {
            updateDashboard();
        }
    }
}

// Funzione per aggiornare la lista dei gruppi
function updateGroupsList() {
    if (!elements.groupsList) return;
    
    elements.groupsList.innerHTML = '';
    
    // Filtra i gruppi per mostrare solo quelli di cui l'utente è membro
    const userGroups = groups.filter(group => 
        group.members.some(member => member.id === currentUser.id)
    );
    
    userGroups.forEach(group => {
        const groupCard = document.createElement('div');
        groupCard.className = 'group-card';
        
        groupCard.innerHTML = `
            <h3>${group.name}</h3>
            <p>${group.description}</p>
            <div class="group-members">
                <span>${group.members.length} membri</span>
            </div>
            <div class="group-actions">
                <button class="btn" onclick="viewGroupDetails(${group.id})">
                    <i class="fas fa-eye"></i> Dettagli
                </button>
                ${group.createdBy.id === currentUser.id ? 
                    `<button class="btn delete" onclick="deleteGroup(${group.id})">
                        <i class="fas fa-trash"></i> Elimina
                    </button>` : 
                    `<button class="btn" onclick="leaveGroup(${group.id})">
                        <i class="fas fa-sign-out-alt"></i> Esci
                    </button>`
                }
            </div>
        `;
        
        elements.groupsList.appendChild(groupCard);
    });
}

function viewGroupDetails(groupId) {
    // Salva l'ID del gruppo nel localStorage
    localStorage.setItem('currentGroupId', groupId);
    // Reindirizza alla pagina dei dettagli
    window.location.href = 'group-details.html';
}

function leaveGroup(groupId) {
    const groupIndex = groups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;
    
    const group = groups[groupIndex];
    if (group.members.length === 1) {
        groups.splice(groupIndex, 1);
    } else {
        group.members = group.members.filter(member => member.id !== currentUser.id);
    }
    
    saveData(); // Salva i dati dopo aver lasciato un gruppo
    updateGroupsList();
}

// Funzione per eliminare un gruppo
function deleteGroup(groupId) {
    if (!confirm('Sei sicuro di voler eliminare questo gruppo?')) {
        return;
    }
    
    const groupIndex = groups.findIndex(g => g.id === groupId);
    if (groupIndex !== -1) {
        groups.splice(groupIndex, 1);
        saveData();
        updateGroupsList();
    }
}

// Funzioni di Utility
function updateUI() {
    const isLoggedIn = currentUser !== null;
    
    document.getElementById('welcome').classList.toggle('hidden', isLoggedIn);
    document.getElementById('dashboard').classList.toggle('hidden', !isLoggedIn);
    document.getElementById('groups').classList.toggle('hidden', !isLoggedIn);
    elements.loginBtn.classList.toggle('hidden', isLoggedIn);
    elements.registerBtn.classList.toggle('hidden', isLoggedIn);
    elements.logoutBtn.classList.toggle('hidden', !isLoggedIn);
}

function getFilteredExpenses() {
    const periodSelect = document.getElementById('periodSelect');
    const period = periodSelect ? periodSelect.value : '2025';
    
    if (period === '2025') {
        return expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getFullYear() === 2025;
        });
    } else {
        // Il periodo è nel formato "YYYY-MM"
        const [year, month] = period.split('-');
        return expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getFullYear() === parseInt(year) && 
                   expenseDate.getMonth() === parseInt(month) - 1; // I mesi in JavaScript sono 0-based
        });
    }
}

function updatePeriodSelector() {
    const periodSelect = document.getElementById('periodSelect');
    if (!periodSelect) return;

    // Salva la selezione corrente
    const currentSelection = periodSelect.value;

    // Pulisci le opzioni esistenti
    periodSelect.innerHTML = '';

    // Aggiungi l'opzione per il 2025
    periodSelect.add(new Option('2025', '2025'));

    // Aggiungi le opzioni per ogni mese del 2025
    const months = [
        'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];

    months.forEach((month, index) => {
        const value = `2025-${String(index + 1).padStart(2, '0')}`;
        periodSelect.add(new Option(`${month} 2025`, value));
    });

    // Ripristina la selezione precedente
    periodSelect.value = currentSelection;
}

function updateDashboard() {
    // Aggiorna statistiche
    const filteredExpenses = getFilteredExpenses();
    const totalExpense = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalLiters = filteredExpenses.reduce((sum, exp) => sum + exp.quantity, 0);
    
    document.getElementById('totalYearExpense').textContent = `€${totalExpense.toFixed(2)}`;
    document.getElementById('monthlyExpense').textContent = `${totalLiters.toFixed(2)} L`;
    
    // Aggiorna grafici
    updateCharts();
    // Aggiorna tabella dettagli
    updateDetailsTable();
}

function updateCharts() {
    const filteredExpenses = getFilteredExpenses();
    
    // Grafico distribuzione spese per tipo
    const typeData = {
        beer: filteredExpenses.filter(exp => exp.type === 'beer').reduce((sum, exp) => sum + exp.amount, 0),
        wine: filteredExpenses.filter(exp => exp.type === 'wine').reduce((sum, exp) => sum + exp.amount, 0),
        spirits: filteredExpenses.filter(exp => exp.type === 'spirits').reduce((sum, exp) => sum + exp.amount, 0),
        spritz: filteredExpenses.filter(exp => exp.type === 'spritz').reduce((sum, exp) => sum + exp.amount, 0)
    };
    
    const typeQuantityData = {
        beer: filteredExpenses.filter(exp => exp.type === 'beer').reduce((sum, exp) => sum + exp.quantity, 0),
        wine: filteredExpenses.filter(exp => exp.type === 'wine').reduce((sum, exp) => sum + exp.quantity, 0),
        spirits: filteredExpenses.filter(exp => exp.type === 'spirits').reduce((sum, exp) => sum + exp.quantity, 0),
        spritz: filteredExpenses.filter(exp => exp.type === 'spritz').reduce((sum, exp) => sum + exp.quantity, 0)
    };
    
    // Grafico spese per tipo
    const typeChartCtx = document.getElementById('typeChart');
    if (typeChart) {
        typeChart.destroy();
    }
    
    typeChart = new Chart(typeChartCtx, {
        type: 'pie',
        data: {
            labels: ['Birra', 'Vino', 'Superalcolici', 'Spritz'],
            datasets: [{
                data: [typeData.beer, typeData.wine, typeData.spirits, typeData.spritz],
                backgroundColor: ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f']
            }]
        },
        options: {
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const quantity = typeQuantityData[context.dataIndex === 0 ? 'beer' : 
                                               context.dataIndex === 1 ? 'wine' : 
                                               context.dataIndex === 2 ? 'spirits' : 'spritz'];
                            return `${label}: €${value.toFixed(2)} (${quantity.toFixed(2)}L)`;
                        }
                    }
                }
            }
        }
    });

    // Grafico litri per tipo
    const quantityChartCtx = document.getElementById('quantityChart');
    if (quantityChart) {
        quantityChart.destroy();
    }
    
    quantityChart = new Chart(quantityChartCtx, {
        type: 'pie',
        data: {
            labels: ['Birra', 'Vino', 'Superalcolici', 'Spritz'],
            datasets: [{
                data: [typeQuantityData.beer, typeQuantityData.wine, typeQuantityData.spirits, typeQuantityData.spritz],
                backgroundColor: ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f']
            }]
        },
        options: {
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const amount = typeData[context.dataIndex === 0 ? 'beer' : 
                                                 context.dataIndex === 1 ? 'wine' : 
                                                 context.dataIndex === 2 ? 'spirits' : 'spritz'];
                            return `${label}: ${value.toFixed(2)}L (€${amount.toFixed(2)})`;
                        }
                    }
                }
            }
        }
    });
}

function updateDetailsTable() {
    const filteredExpenses = getFilteredExpenses();
    const types = ['beer', 'wine', 'spirits', 'spritz'];
    const typeLabels = ['Birra', 'Vino', 'Superalcolici', 'Spritz'];
    
    const tableBody = document.getElementById('expenseTableBody');
    tableBody.innerHTML = '';
    
    types.forEach((type, index) => {
        const typeExpenses = filteredExpenses.filter(exp => exp.type === type);
        const totalAmount = typeExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const totalQuantity = typeExpenses.reduce((sum, exp) => sum + exp.quantity, 0);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${typeLabels[index]}</td>
            <td>€${totalAmount.toFixed(2)}</td>
            <td>${totalQuantity.toFixed(2)} L</td>
        `;
        tableBody.appendChild(row);
    });
}

// Funzione per inizializzare la pagina dei dettagli del gruppo
function initGroupDetails() {
    const groupId = parseInt(localStorage.getItem('currentGroupId'));
    if (!groupId) {
        window.location.href = 'groups.html';
        return;
    }

    const group = groups.find(g => g.id === groupId);
    if (!group) {
        window.location.href = 'groups.html';
        return;
    }

    // Aggiorna l'intestazione
    document.getElementById('groupName').textContent = group.name;
    document.getElementById('groupDescription').textContent = group.description;

    // Inizializza il selettore del periodo
    updatePeriodSelector();

    // Aggiungi event listener per il cambio di periodo
    const periodSelect = document.getElementById('periodSelect');
    if (periodSelect) {
        periodSelect.addEventListener('change', () => {
            updateGroupDetails(group);
        });
    }

    // Aggiorna i dettagli del gruppo
    updateGroupDetails(group);
}

// Funzione per aggiornare i dettagli del gruppo
function updateGroupDetails(group) {
    // Ottieni il periodo selezionato
    const periodSelect = document.getElementById('periodSelect');
    const period = periodSelect ? periodSelect.value : '2025';

    // Carica le spese di tutti i membri del gruppo
    let groupExpenses = [];
    group.members.forEach(member => {
        const memberExpenses = JSON.parse(localStorage.getItem(`expenses_${member.id}`)) || [];
        groupExpenses = groupExpenses.concat(memberExpenses);
    });
    
    if (period === '2025') {
        groupExpenses = groupExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getFullYear() === 2025;
        });
    } else {
        // Il periodo è nel formato "YYYY-MM"
        const [year, month] = period.split('-');
        groupExpenses = groupExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getFullYear() === parseInt(year) && 
                   expenseDate.getMonth() === parseInt(month) - 1;
        });
    }

    // Calcola le statistiche del gruppo
    const totalGroupExpense = groupExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalGroupLiters = groupExpenses.reduce((sum, exp) => sum + exp.quantity, 0);

    // Aggiorna le statistiche del gruppo
    document.getElementById('totalGroupExpense').textContent = `€${totalGroupExpense.toFixed(2)}`;
    document.getElementById('totalGroupLiters').textContent = `${totalGroupLiters.toFixed(2)} L`;

    // Aggiorna le statistiche dei membri
    updateMembersStats(group, groupExpenses);

    // Aggiorna le classifiche
    updateGroupCharts(group, groupExpenses);
}

// Funzione per aggiornare le statistiche dei membri
function updateMembersStats(group, groupExpenses) {
    const membersStats = document.getElementById('membersStats');
    if (!membersStats) return;

    membersStats.innerHTML = '';

    group.members.forEach(member => {
        const memberExpenses = groupExpenses.filter(exp => exp.userId === member.id);
        const totalExpense = memberExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const totalLiters = memberExpenses.reduce((sum, exp) => sum + exp.quantity, 0);

        const memberCard = document.createElement('div');
        memberCard.className = 'member-card';
        
        memberCard.innerHTML = `
            <h4>${member.username}</h4>
            <div class="member-stats">
                <div class="member-stat">
                    <p>Totale Spese</p>
                    <span>€${totalExpense.toFixed(2)}</span>
                </div>
                <div class="member-stat">
                    <p>Totale Litri</p>
                    <span>${totalLiters.toFixed(2)} L</span>
                </div>
            </div>
        `;

        membersStats.appendChild(memberCard);
    });
}

// Funzione per aggiornare i grafici del gruppo
function updateGroupCharts(group, groupExpenses) {
    // Calcola le statistiche per ogni membro e tipo di alcol
    const memberStats = group.members.map(member => {
        const memberExpenses = groupExpenses.filter(exp => exp.userId === member.id);
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
