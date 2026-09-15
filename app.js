// 1. YOUR GOOGLE APPS SCRIPT WEB APP URL (Must end in /exec)
const API_URL = "https://google.com";

// FRONTEND INTERACTIVE TAB NAVIGATOR TOGGLE
function openTab(evt, tabName) {
    const tabcontents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabcontents.length; i++) {
        tabcontents[i].style.display = "none";
    }
    const tablinks = document.getElementsByClassName("tab-link");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

// DATA RECEIVER 1: POPULATES DYNAMIC AUTOCOMPLETE DROPDOWN OPTIONS
function handlePropertyOptions(properties) {
    try {
        const datalist = document.getElementById('properties-dataset');
        if (!datalist) return;
        
        // Render property item block strings
        datalist.innerHTML = properties.map(prop => `<option value="${prop}"></option>`).join('');
    } catch (error) {
        console.error("Error setting up filter list:", error);
    }
}

// DATA RECEIVER 2: PROCESSES 6 CATEGORIES & OVERVIEW FEED
function handleSheetData(items) {
    try {
        const types = ['oneoff', 'issue', 'currentproject', 'bigproject', 'walkthrough', 'shopping'];
        const counts = { oneoff: 0, issue: 0, currentproject: 0, bigproject: 0, walkthrough: 0, shopping: 0 };
        
        types.forEach(t => document.getElementById(`${t}-container`).innerHTML = '');
        document.getElementById('urgent-stream-container').innerHTML = '';

        let urgentCardsHtml = '';
        let urgentCount = 0;

        items.forEach(item => {
            const cleanId = item.id || Math.random().toString(36).substring(2, 9);
            if (counts[item.type] !== undefined) counts[item.type]++;

            const cardHtml = `
                <div class="task-card ${item.type}-card" id="card-${cleanId}">
                    <div class="task-details">
                        <div class="property-name">${item.property}</div>
                        <div class="task-text">${item.text}</div>
                    </div>
                    <button class="done-btn" onclick="removeCard(this, '${cleanId}')">Complete</button>
                </div>
            `;

            const container = document.getElementById(`${item.type}-container`);
            if (container) container.innerHTML += cardHtml;

            if ((item.type === 'issue' || urgentCount < 3) && item.type !== 'shopping') {
                urgentCardsHtml += cardHtml;
                urgentCount++;
            }
        });

        types.forEach(t => {
            document.getElementById(`count-${t}`).innerText = counts[t];
            const container = document.getElementById(`${t}-container`);
            if (counts[t] === 0 && container) {
                container.innerHTML = '<div class="loading-placeholder">No active items in this category.</div>';
            }
        });

        document.getElementById('urgent-stream-container').innerHTML = urgentCardsHtml || 
            '<div class="loading-placeholder">System clear! No urgent items requiring priority attention.</div>';

    } catch (error) {
        console.error("Error organizing tab array collections:", error);
    }
}

// MAIN PULL LOADING CONTROLLER: TRIGGERS BOTH DYNAMIC FETCH CHANNELS
function loadDashboard() {
    if (!API_URL || API_URL === "") return;
    
    // 1. Trigger background script tag to pull live properties data tab mapping list
    const oldPropScript = document.getElementById('jsonp-properties-script');
    if (oldPropScript) oldPropScript.remove();
    
    const propScript = document.createElement('script');
    propScript.id = 'jsonp-properties-script';
    propScript.src = `${API_URL}?getData=properties&callback=handlePropertyOptions&nocache=${Date.now()}`;
    document.body.appendChild(propScript);

    // 2. Trigger active task load script blocks
    const types = ['oneoff', 'issue', 'currentproject', 'bigproject', 'walkthrough', 'shopping'];
    types.forEach(t => {
        const container = document.getElementById(`${t}-container`);
        if (container) container.innerHTML = '<div class="loading-placeholder">Syncing data...</div>';
    });

    const oldScript = document.getElementById('jsonp-script');
    if (oldScript) oldScript.remove();

    const cacheWindow = Math.round(Date.now() / 5000);
    const script = document.createElement('script');
    script.id = 'jsonp-script';
    script.src = `${API_URL}?getData=tasks&callback=handleSheetData&nocache=${cacheWindow}`;
    
    document.body.appendChild(script);
}

// WRITE DATA SUBMISSIONS ROUTING PAYLOAD DOWN TO GOOGLE SHEETS
async function addItem() {
    const property = document.getElementById('property-input').value.trim();
    const text = document.getElementById('task-input').value.trim();
    const type = document.getElementById('column-select').value;

    if (!property || !text) {
        alert("Please specify the Property and Task text.");
        return;
    }

    const cleanId = Math.random().toString(36).substring(2, 9);
    const payload = { action: 'add', id: cleanId, property: property, text: text, type: type };

    document.getElementById('property-input').value = '';
    document.getElementById('task-input').value = '';

    // Wipe autocomplete input focus state natively after submission to clean mobile keyboard layouts
    document.activeElement.blur();

    const targetContainerId = `${type}-container`;
    const cardHtml = `
        <div class="task-card ${type}-card" id="card-${cleanId}">
            <div class="task-details">
                <div class="property-name">${property}</div>
                <div class="task-text">${text}</div>
            </div>
            <button class="done-btn" onclick="removeCard(this, '${cleanId}')">Complete</button>
        </div>
    `;
    
    const currentUiHtml = document.getElementById(targetContainerId).innerHTML;
    if (currentUiHtml.includes("loading-placeholder") || currentUiHtml.includes("Loading")) {
        document.getElementById(targetContainerId).innerHTML = cardHtml;
    } else {
        document.getElementById(targetContainerId).innerHTML += cardHtml;
    }

    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        setTimeout(loadDashboard, 1500);
    } catch (error) {
        console.error("Transmission fault:", error);
    }
}

// REMOVE ROW ITEM INSTANTLY WITH A TRANSITION EXIT ANIMATION EFFECT
async function removeCard(buttonElement, itemId) {
    const card = buttonElement.closest('.task-card');
    buttonElement.innerText = "Syncing...";
    buttonElement.style.backgroundColor = "#888";

    card.style.opacity = '0';
    card.style.transform = 'scale(0.96)';
    setTimeout(() => card.remove(), 400);

    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'delete', id: itemId })
        });
    } catch (error) {
        console.error("Removal verification failure:", error);
    }
}

// Boot setup
loadDashboard();
