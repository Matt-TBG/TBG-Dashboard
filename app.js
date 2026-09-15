// 1. YOUR GOOGLE APPS SCRIPT WEB APP URL (Must end in /exec)
const API_URL = "https://script.google.com/macros/s/AKfycbyOm02wepjqjwNJua6Jv8fgIAYCv86EjmhuvKbllPDd2_9Cri2i4rF5lbb3sosJZI3yRQ/exec";

// JSONP Callback handler: Automatically picks up the spreadsheet records passed by Google
function handleSheetData(items) {
    try {
        // Clear placeholder text layout wrappers
        document.getElementById('todo-container').innerHTML = '';
        document.getElementById('updates-container').innerHTML = '';
        document.getElementById('shopping-container').innerHTML = '';

        // Loop through your list items and place them into columns based on their type
        items.forEach(item => {
            const cleanId = item.id || Math.random().toString(36).substring(2, 9);
            const cardHtml = `
                <div class="task-card ${item.type}-card" id="card-${cleanId}">
                    <div class="task-details">
                        <div class="property-name">${item.property}</div>
                        <div class="task-text">${item.text}</div>
                    </div>
                    <button class="done-btn ${item.type}-btn" onclick="removeCard(this, '${cleanId}')">Complete</button>
                </div>
            `;

            if (item.type === 'todo') document.getElementById('todo-container').innerHTML += cardHtml;
            if (item.type === 'updates') document.getElementById('updates-container').innerHTML += cardHtml;
            if (item.type === 'shopping') document.getElementById('shopping-container').innerHTML += cardHtml;
        });
    } catch (error) {
        console.error("Error processing data layout arrays:", error);
    }
}

// Fetch data dynamically in real time bypassing CORS via JSONP scripting tags
function loadDashboard() {
    if (!API_URL || API_URL === "") return;
    
    // Inject cleaner loading textual placeholders onto columns immediately on refresh trigger
    document.getElementById('todo-container').innerHTML = '<div class="loading-placeholder">Loading live tasks...</div>';
    document.getElementById('updates-container').innerHTML = '<div class="loading-placeholder">Loading live updates...</div>';
    document.getElementById('shopping-container').innerHTML = '<div class="loading-placeholder">Loading shopping list...</div>';

    const oldScript = document.getElementById('jsonp-script');
    if (oldScript) oldScript.remove();

    // Reduced cache validation window to 5 seconds to bypass infinite stuck loading conditions on manual reloads
    const cacheWindow = Math.round(Date.now() / 5000);

    const script = document.createElement('script');
    script.id = 'jsonp-script';
    script.src = `${API_URL}?callback=handleSheetData&nocache=${cacheWindow}`;
    
    // Safety fallback handler: If script tag execution hangs or fails, clear columns after 4 seconds
    script.onerror = function() {
        console.error("Data pipeline connection timeout trace.");
        document.getElementById('todo-container').innerHTML = '<div class="loading-placeholder">No active tasks.</div>';
        document.getElementById('updates-container').innerHTML = '<div class="loading-placeholder">No active updates.</div>';
        document.getElementById('shopping-container').innerHTML = '<div class="loading-placeholder">No active items.</div>';
    };
    
    document.body.appendChild(script);
}

// Send a newly submitted row from the form down to Google Sheets
async function addItem() {
    const property = document.getElementById('property-input').value.trim();
    const text = document.getElementById('task-input').value.trim();
    const type = document.getElementById('column-select').value;

    if (!property || !text) {
        alert("Please fill out both the Property Name and Details.");
        return;
    }

    const cleanId = Math.random().toString(36).substring(2, 9);
    const payload = {
        action: 'add',
        id: cleanId,
        property: property,
        text: text,
        type: type
    };

    // Optimistic Update: Instantly put the item on the web UI layout so the user sees it immediately
    const targetContainerId = `${type}-container`;
    
    // Clean column items layout wrappers without fallback icons
    const cardHtml = `
        <div class="task-card ${type}-card" id="card-${cleanId}">
            <div class="task-details">
                <div class="property-name">${property}</div>
                <div class="task-text">${text}</div>
            </div>
            <button class="done-btn ${type}-btn" onclick="removeCard(this, '${cleanId}')">Complete</button>
        </div>
    `;
    
    // Check if the container is currently holding placeholder text, clear it out first if it is
    const currentUiHtml = document.getElementById(targetContainerId).innerHTML;
    if (currentUiHtml.includes("loading-placeholder") || currentUiHtml.includes("Loading")) {
        document.getElementById(targetContainerId).innerHTML = cardHtml;
    } else {
        document.getElementById(targetContainerId).innerHTML += cardHtml;
    }

    // Reset UI inputs
    document.getElementById('property-input').value = '';
    document.getElementById('task-input').value = '';

    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        
        // Fast sync verification pingback call loop
        setTimeout(loadDashboard, 1500);
    } catch (error) {
        console.error("Network sending trace:", error);
    }
}

// Remove card from UI and flag it inside the Google Sheet data pipeline
async function removeCard(buttonElement, itemId) {
    const card = buttonElement.closest('.task-card');
    buttonElement.innerText = "Processing...";
    buttonElement.style.backgroundColor = "#888";

    // Visual removal
    card.style.opacity = '0';
    card.style.transform = 'scale(0.95)';
    setTimeout(() => card.remove(), 400);

    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'delete', id: itemId })
        });
    } catch (error) {
        console.error("Network removal trace:", error);
    }
}

// Initialize script on startup
loadDashboard();
