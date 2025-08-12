// Get references to all elements we'll need to interact with
const loginContainer = document.getElementById('login-container');
const terminalContainer = document.getElementById('terminal-container');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loginMessage = document.getElementById('login-message');

const displayCanvas = document.getElementById('displayCanvas');
const ctx = displayCanvas.getContext('2d');
const processingSpinner = document.getElementById('processing-spinner');
const cardNumberInput = document.getElementById('cardNumber');
const expiryInput = document.getElementById('expiry');
const cvvInput = document.getElementById('cvv');
const amountInput = document.getElementById('amount');
const currencySelect = document.getElementById('currencySelect');
const authCodeInput = document.getElementById('authCode');
const protocolSelect = document.getElementById('protocolSelect');
const networkSelect = document.getElementById('networkSelect');
const merchantWalletInput = document.getElementById('merchantWallet');
const confirmBtn = document.getElementById('confirmBtn');
const clearBtn = document.getElementById('clearBtn');
const printBtn = document.getElementById('printBtn');
const historyBtn = document.getElementById('historyBtn');
const logoutBtn = document.getElementById('logoutBtn');
const historyModal = document.getElementById('history-modal');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const historyList = document.getElementById('history-list');

let auth_code_length = 4; // Default based on initial protocol selection
let transactionHistory = [];
let lastTransaction = null;

const DUMMY_WALLETS = {
    'ERC-20': '0x06674B3fa1d1d6e5813cDC18d4091D499084Bdd8',
    'TRC-20': 'TKMpfYsTRWJ8W4QUUiUc6XT8cJ8UWkzSLT'
};

const BACKEND_URL = "https://benz-wyw5.onrender.com";
const isTestMode = true; // Use this flag to switch between Test and Production modes

const canvasWidth = displayCanvas.width;
const canvasHeight = displayCanvas.height;

function drawInitialDisplay() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#4b5563';
    ctx.font = '700 32px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Ready to Process', canvasWidth / 2, canvasHeight / 2 - 15);
    ctx.fillStyle = '#111827';
    ctx.font = '300 50px Inter, sans-serif';
    ctx.fillText(`$0.00`, canvasWidth / 2, canvasHeight / 2 + 45);
}

function updateDisplay(status, amount = null, color = 'gray', details = null) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    terminalContainer.classList.remove('glow-green', 'glow-red', 'glow-blue', 'glow-orange');

    if (color === 'green') terminalContainer.classList.add('glow-green');
    else if (color === 'red') terminalContainer.classList.add('glow-red');
    else if (color === 'blue') terminalContainer.classList.add('glow-blue');
    else if (color === 'orange') terminalContainer.classList.add('glow-orange');

    ctx.fillStyle = '#4b5563';
    ctx.font = '700 32px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(status, canvasWidth / 2, canvasHeight / 2 - 40);

    if (amount !== null) {
        ctx.fillStyle = '#111827';
        ctx.font = '300 50px Inter, sans-serif';
        const displayAmount = `${currencySelect.value} ${parseFloat(amount).toFixed(2)}`;
        ctx.fillText(displayAmount, canvasWidth / 2, canvasHeight / 2 + 10);
    }

    if (details) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '400 16px Inter, sans-serif';
        ctx.fillText(details, canvasWidth / 2, canvasHeight / 2 + 50);
    }
}

async function processTransaction() {
    const amount = amountInput.value;
    const cardNumber = cardNumberInput.value;
    const currency = currencySelect.value;
    const protocol = protocolSelect.value;
    const expiry = expiryInput.value;
    const cvv = cvvInput.value;
    const authCode = authCodeInput.value;
    const merchantWallet = merchantWalletInput.value;
    const payoutNetwork = networkSelect.value;
    const fullProtocolName = protocolSelect.options[protocolSelect.selectedIndex].text;
    
    if (!cardNumber || !expiry || !cvv || !amount || !authCode || !merchantWallet) {
        updateDisplay('Please fill all fields', amount, 'red');
        return;
    }

    if (authCode.length !== auth_code_length) {
        updateDisplay(`Auth code must be ${auth_code_length} digits`, amount, 'red');
        return;
    }

    const offledgerProtocols = ["POS Terminal -101.8 (PIN-LESS transaction)", "POS Terminal -201.3 (6-digit approval)", "POS Terminal -201.5 (6-digit approval)"];
    const isOffledger = offledgerProtocols.includes(fullProtocolName);
    const payoutType = isOffledger ? `USDT-${payoutNetwork}` : null;
    const requestType = isOffledger ? 'Offline Sale' : 'Online Sale';

    processingSpinner.classList.remove('hidden');
    updateDisplay(`Processing ${requestType} request...`, amount, 'blue');
    confirmBtn.disabled = true;

    try {
        const payload = {
            card_number: cardNumber,
            expiry: expiry,
            cvv: cvv,
            amount: parseFloat(amount),
            currency: currency,
            auth_code: authCode,
            protocol: fullProtocolName,
            payout_type: payoutType,
            merchant_wallet: merchantWallet,
            is_test: isTestMode // <-- NEW: Send the test mode flag to the backend
        };
        
        const response = await fetch(`${BACKEND_URL}/api/v1/payments/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();

        if (response.ok) {
            const status = "Confirmed Success";
            const color = result.payout_type ? 'orange' : 'green';
            const details = result.tx_hash ? `Hash: ${result.tx_hash.substring(0, 10)}...` : `Auth Code: ${result.transaction_id.substring(4, 10)}`;
            updateDisplay(status, amount, color, details);
            printBtn.classList.remove('hidden');
            lastTransaction = {
                id: transactionHistory.length + 1,
                status: status,
                amount: amount,
                currency: currency,
                protocol: fullProtocolName,
                details: details
            };
            transactionHistory.push(lastTransaction);
        } else {
            updateDisplay('Rejected', amount, 'red', result.message);
        }
    } catch (error) {
        console.error("API call failed:", error);
        updateDisplay('Rejected', amount, 'red', 'Network Error');
    } finally {
        processingSpinner.classList.add('hidden');
        confirmBtn.disabled = false;
    }
}

async function populateHistory() {
    historyList.innerHTML = `<p class="text-gray-500 text-center">Loading history...</p>`;
    try {
        const response = await fetch(`${BACKEND_URL}/api/v1/history`);
        if (response.ok) {
            const history = await response.json();
            transactionHistory = history;
            renderHistory(history);
        } else {
            historyList.innerHTML = `<p class="text-center text-red-500">Failed to load history.</p>`;
        }
    } catch (error) {
        console.error("Error fetching history:", error);
        historyList.innerHTML = `<p class="text-center text-red-500">Network error. Please try again.</p>`;
    }
}

function renderHistory(history) {
    historyList.innerHTML = '';
    if (history.length === 0) {
        historyList.innerHTML = `<p class="text-gray-500 text-center">No history available.</p>`;
        return;
    }

    history.forEach(tx => {
        const historyItem = document.createElement('div');
        historyItem.className = 'bg-gray-50 rounded-xl p-4 flex justify-between items-center';
        const statusColor = tx.status === 'success' || tx.status === 'approved' ? 'text-green-600' : 'text-red-600';
        const protocolName = tx.protocol || 'N/A';
        const details = tx.tx_hash ? `Hash: ${tx.tx_hash.substring(0, 10)}...` : (tx.transaction_id ? `Auth Code: ${tx.transaction_id}` : 'No details');

        historyItem.innerHTML = `
            <div>
                <p class="font-semibold text-gray-800">${tx.status}</p>
                <p class="text-sm text-gray-500">${protocolName}</p>
            </div>
            <div class="text-right">
                <p class="font-bold text-lg ${statusColor}">${tx.currency || 'USD'} ${parseFloat(tx.amount).toFixed(2)}</p>
                <p class="text-xs text-gray-400">${details}</p>
            </div>
        `;
        historyList.appendChild(historyItem);
    });
}

function printReceipt() {
    if (!lastTransaction) {
        alert("No transaction to print.");
        return;
    }

    const receiptWindow = window.open('', '_blank');
    if (receiptWindow) {
        let txDetails = lastTransaction.details;
        
        const receiptContent = `
            <div style="font-family: 'Inter', sans-serif; padding: 20px;">
                <h1 style="font-size: 24px; font-weight: bold; text-align: center;">Transaction Receipt</h1>
                <hr style="margin: 10px 0;">
                <p><strong>Status:</strong> ${lastTransaction.status}</p>
                <p><strong>Protocol:</strong> ${lastTransaction.protocol}</p>
                <p><strong>Amount:</strong> ${lastTransaction.currency} ${parseFloat(lastTransaction.amount).toFixed(2)}</p>
                <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Details:</strong> ${txDetails}</p>
            </div>
        `;
        
        receiptWindow.document.write(receiptContent);
        receiptWindow.document.close();
        receiptWindow.print();
    } else {
        alert("Please allow popups to print the receipt.");
    }
}

confirmBtn.addEventListener('click', processTransaction);

clearBtn.addEventListener('click', () => {
    cardNumberInput.value = '';
    expiryInput.value = '';
    cvvInput.value = '';
    amountInput.value = '';
    authCodeInput.value = '';
    protocolSelect.value = '101.1';
    currencySelect.value = 'USD';
    networkSelect.value = 'ERC-20';
    merchantWalletInput.value = DUMMY_WALLETS['ERC-20'];
    printBtn.classList.add('hidden');
    drawInitialDisplay();
    terminalContainer.classList.remove('glow-green', 'glow-red', 'glow-blue', 'glow-orange');
});

printBtn.addEventListener('click', printReceipt);

historyBtn.addEventListener('click', () => {
    populateHistory();
    historyModal.classList.remove('hidden');
});

closeHistoryBtn.addEventListener('click', () => {
    historyModal.classList.add('hidden');
});

logoutBtn.addEventListener('click', () => {
    loginContainer.classList.remove('hidden');
    terminalContainer.classList.add('hidden');
    clearBtn.click();
    transactionHistory = [];
});

amountInput.addEventListener('input', () => {
    const amount = amountInput.value;
    if (amount) {
        updateDisplay(null, amount, 'gray');
    } else {
        updateDisplay(null, null, 'gray');
    }
});

currencySelect.addEventListener('change', () => {
     updateDisplay(null, amountInput.value, 'gray');
});

protocolSelect.addEventListener('change', (e) => {
    const protocols = {
        "101.1": 4, "101.4": 6, "101.6": 6, "101.7": 4,
        "101.8": 4, "201.1": 6, "201.3": 6, "201.5": 6
    };
    auth_code_length = protocols[e.target.value];
    authCodeInput.placeholder = `e.g., ${'X'.repeat(auth_code_length)}`;
});

networkSelect.addEventListener('change', (e) => {
    merchantWalletInput.value = DUMMY_WALLETS[e.target.value];
});

cardNumberInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\s+/g, '');
    let formattedValue = '';
    for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) {
            formattedValue += ' ';
        }
        formattedValue += value[i];
    }
    e.target.value = formattedValue;
});

expiryInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\s+/g, '').replace(/\//g, '');
    if (value.length > 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    e.target.value = value;
});

loginBtn.addEventListener('click', () => {
    const username = usernameInput.value;
    const password = passwordInput.value;
    const validUsername = "admin";
    const validPassword = "password";

    if (username === validUsername && password === validPassword) {
        loginContainer.classList.add('hidden');
        terminalContainer.classList.remove('hidden');
        drawInitialDisplay();
        merchantWalletInput.value = DUMMY_WALLETS['ERC-20'];
    } else {
        loginMessage.classList.remove('hidden');
    }
});

window.onload = () => {
    drawInitialDisplay();
    protocolSelect.dispatchEvent(new Event('change'));
};
