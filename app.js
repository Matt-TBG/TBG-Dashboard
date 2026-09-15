// 1. YOUR GOOGLE APPS SCRIPT WEB APP URL (Must end in /exec)
const API_URL = "https://script.google.com/macros/s/AKfycbyOm02wepjqjwNJua6Jv8fgIAYCv86EjmhuvKbllPDd2_9Cri2i4rF5lbb3sosJZI3yRQ/exec";

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

// JSONP DATA RECEIVER: PROCESSES 6 CATEGORIES & OVERVIEW FEED
function handleSheetData(items) {
    try {
        const types = ['oneoff', 'issue', 'currentproject', 'bigproject', 'walkthrough', 'shopping'];
        const counts = { oneoff: 0, issue: 0, currentproject: 0, bigproject: 0, walkthrough: 0, shopping: 0 };
        
        // Clear all layout divs
        types.forEach(t => document.getElementById(`${t}-container`).innerHTML = '');
        document.getElementById('urgent-stream-container').innerHTML = '';

        let urgentCardsHtml = '';
        let urgentCount = 0;

        items.forEach(item => {
            const cleanId = item.id || Math.random().toString(36).substring(2, 9);
            
            // Increment category counter values
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

            // Append cards to their corresponding tab container
            const container = document.getElementById(`${item.type}-container`);
            if (container) container.innerHTML += cardHtml;

            // OVERVIEW STRATEGY ROUTING: Send issues and the first 3 tasks straight to the landing hero element
            if ((item.type === 'issue' || urgentCount < 3) && item.type !== 'shopping') {
                urgentCardsHtml += cardHtml;
                urgentCount++;
            }
        });

        // Set text notification indicators inside the navigation menu tags
        types.forEach(t => {
            document.getElementById(`count-${t}`).innerText = counts[t];
            const container = document.getElementById(`${t}-container`);
            if (counts[t] === 0 && container) {
                container.innerHTML = '<div class="loading-placeholder">No active items in this category.</div>';
            }
        });

        // Populate Overview feed panel
        document.getElementById('urgent-stream-container').innerHTML = urgentCardsHtml || 
            '<div class="loading-placeholder">System clear! No urgent items requiring priority attention.</div>';

    } catch (error) {
        console.error("Error organizing tab array collections:", error);
    }
}

// FETCH REAL-TIME PULL CHANGES VIA THE TIMED 5-SECOND VALIDATION PIPELINE
function loadDashboard() {
    if (!API_URL || API_URL === "") return;
    
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
    script.src = `${API_URL}?callback=handleSheetData&nocache=${cacheWindow}`;
    
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

    // Reset forms immediately
    document.getElementById('property-input').value = '';
    document.getElementById('task-input').value = '';

    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        
        // Immediate fetch callback loops
        setTimeout(loadDashboard, 1200);
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

