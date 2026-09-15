// 1. YOUR GOOGLE APPS SCRIPT WEB APP URL (Verified Link)
const API_URL = "https://script.google.com/macros/s/AKfycbyOm02wepjqjwNJua6Jv8fgIAYCv86EjmhuvKbllPDd2_9Cri2i4rF5lbb3sosJZI3yRQ/exec";

// Master list arrays cached locally for interface filters
let globalProperties = [];
let activeSubTabs = { projects: "proj-oneoff", shopping: "shop-crew" };

// MAIN PARENT TAB NAVIGATION ROUTING
function openMainTab(evt, tabName) {
    const tabcontents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabcontents.length; i++) tabcontents[i].style.display = "none";
    
    const tablinks = document.getElementsByClassName("tab-link");
    for (let i = 0; i < tablinks.length; i++) tablinks[i].className = tablinks[i].className.replace(" active", "");
    
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
    
    closeAllCombos();
}

// NESTED CHILD SUB-TAB NAVIGATION ROUTING
function openSubTab(evt, parentId, subTabId) {
    const parentContainer = document.getElementById(parentId);
    const subContents = parentContainer.getElementsByClassName("sub-tab-content");
    for (let i = 0; i < subContents.length; i++) subContents[i].style.display = "none";
    
    const subLinks = parentContainer.getElementsByClassName("sub-tab-link");
    for (let i = 0; i < subLinks.length; i++) subLinks[i].className = subLinks[i].className.replace(" active", "");
    
    document.getElementById(subTabId).style.display = "block";
    evt.currentTarget.className += " active";
    activeSubTabs[parentId] = subTabId;
}

// SEARCHABLE COMBOBOX DROPDOWN PROCESSING SCRIPTS
function toggleCombo(inputEl) {
    closeAllCombos();
    const dropdown = inputEl.parentElement.querySelector(".combo-dropdown");
    dropdown.style.display = "block";
    renderComboItems(dropdown, globalProperties, inputEl);
}

function arrowToggleCombo(btnEl, event) {
    event.stopPropagation();
    const input = btnEl.parentElement.querySelector(".combo-input");
    toggleCombo(input);
}

function filterCombo(inputEl) {
    const dropdown = inputEl.parentElement.querySelector(".combo-dropdown");
    const val = inputEl.value.toLowerCase().trim();
    const filtered = globalProperties.filter(p => p.toLowerCase().includes(val));
    renderComboItems(dropdown, filtered, inputEl);
}

function renderComboItems(dropdown, list, inputEl) {
    if(list.length === 0) {
        dropdown.innerHTML = '<div class="combo-item" style="color:#888; font-style:italic;">No matches found</div>';
        return;
    }
    dropdown.innerHTML = list.map(item => `<div class="combo-item" onclick="selectComboItem('${item.replace(/'/g, "\\'")}', '${inputEl.id}')">${item}</div>`).join('');
}

function selectComboItem(value, inputId) {
    const input = document.getElementById(inputId);
    input.value = value;
    closeAllCombos();
}

function closeAllCombos() {
    const drawers = document.getElementsByClassName("combo-dropdown");
    for(let i=0; i<drawers.length; i++) drawers[i].style.display = "none";
}

document.addEventListener("click", function(e) {
    if(!e.target.closest(".combobox-wrapper")) closeAllCombos();
});

// JSONP CHANNEL DATA RECEIVERS
function handlePropertyOptions(properties) {
    globalProperties = properties;
    // Safely update open combo lists if a dropdown happens to be active during load
    const activeInput = document.activeElement;
    if (activeInput && activeInput.classList.contains('combo-input')) {
        filterCombo(activeInput);
    }
}

function handleSheetData(items) {
    try {
        const subCategories = ['overview', 'proj-oneoff', 'proj-current', 'proj-upcoming', 'proj-major', 'issue', 'walkthrough', 'shop-crew', 'shop-steph'];
        const counts = { projects: 0, issue: 0, walkthrough: 0, shopping: 0 };
        
        // Wipe UI containers cleanly before rendering data stream
        subCategories.forEach(c => {
            const el = document.getElementById(`${c}-container`);
            if(el) el.innerHTML = '';
        });
        
        const urgentStream = document.getElementById('urgent-stream-container');
        if (urgentStream) urgentStream.innerHTML = '';

        let overviewCount = 0;
        let overviewHtml = '';

        items.forEach(item => {
            const cleanId = item.id || Math.random().toString(36).substring(2, 9);
            
            // Map counter configurations dynamically
            if (item.type.startsWith('proj-')) counts.projects++;
            if (item.type === 'issue') counts.issue++;
            if (item.type === 'walkthrough') counts.walkthrough++;
            if (item.type.startsWith('shop-')) counts.shopping++;

            const cardHtml = `
                <div class="task-card ${item.type}-card" id="card-${cleanId}">
                    <div class="task-details">
                        <div class="property-name">${item.property}</div>
                        <div class="task-text">${item.text}</div>
                    </div>
                    <button class="done-btn" onclick="removeCard(this, '${cleanId}')">Complete</button>
                </div>
            `;

            // Safety check container existence before innerHTML push
            const container = document.getElementById(`${item.type}-container`);
            if (container) {
                container.innerHTML += cardHtml;
            }

            // Overview Dashboard feed generation rules
            if (item.type === 'overview' || item.type === 'issue' || item.type === 'walkthrough' || overviewCount < 3) {
                if (!item.type.startsWith('shop-')) {
                    overviewHtml += cardHtml;
                    overviewCount++;
                }
            }
        });

        // Push calculated badges numbers onto menu titles
        const cProj = document.getElementById('count-projects');
        const cIss = document.getElementById('count-issue');
        const cWalk = document.getElementById('count-walkthrough');
        const cShop = document.getElementById('count-shopping');
        
        if (cProj) cProj.innerText = counts.projects;
        if (cIss) cIss.innerText = counts.issue;
        if (cWalk) cWalk.innerText = counts.walkthrough;
        if (cShop) cShop.innerText = counts.shopping;

        // Render localized empty register fallback elements
        subCategories.forEach(c => {
            const container = document.getElementById(`${c}-container`);
            if(container && container.innerHTML === '') {
                container.innerHTML = '<div class="loading-placeholder">No active items inside this register.</div>';
            }
        });
        
        if (urgentStream) {
            urgentStream.innerHTML = overviewHtml || '<div class="loading-placeholder">Dashboard operational clear. No tasks pending.</div>';
        }

    } catch (error) {
        console.error("Layout engine error trace:", error);
    }
}

// TIMED LOADING EXECUTION MAPPING LOOPS
function loadDashboard() {
    if (!API_URL || API_URL === "") return;
    
    // Channel 1: dynamic background script to grab dynamic properties list mapping
    const propScript = document.createElement('script');
    propScript.src = `${API_URL}?getData=properties&callback=handlePropertyOptions&nocache=${Date.now()}`;
    document.body.appendChild(propScript);

    // Channel 2: load system task arrays data parameters
    const subCategories = ['proj-oneoff', 'proj-current', 'proj-upcoming', 'proj-major', 'issue', 'walkthrough', 'shop-crew', 'shop-steph'];
    subCategories.forEach(c => {
        const container = document.getElementById(`${c}-container`);
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

// SUBMISSIONS PIPELINES ROUTERS
function addCustomItem(typeKey, propInputId, textInputId) {
    executeFormPost(typeKey, propInputId, textInputId);
}

function addContextualItem(parentTabKey, propInputId, textInputId) {
    const contextualType = activeSubTabs[parentTabKey];
    executeFormPost(contextualType, propInputId, textInputId);
}

async function executeFormPost(targetType, propId, textId) {
    const property = document.getElementById(propId).value.trim();
    const text = document.getElementById(textId).value.trim();

    if (!property || !text) {
        alert("Please complete both properties and tasks descriptions fields.");
        return;
    }

    const cleanId = Math.random().toString(36).substring(2, 9);
    const payload = { action: 'add', id: cleanId, property: property, text: text, type: targetType };

    document.getElementById(propId).value = '';
    document.getElementById(textId).value = '';
    document.activeElement.blur(); 

    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        setTimeout(loadDashboard, 1500);
    } catch (error) {
        console.error("Posting data error:", error);
    }
}

async function removeCard(buttonElement, itemId) {
    const card = buttonElement.closest('.task-card');
    buttonElement.innerText = "Syncing...";
    card.style.opacity = '0';
    setTimeout(() => card.remove(), 400);

    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'delete', id: itemId })
        });
    } catch (error) {
console.error("Removal failure log:", error);}}// Boot configurationloadDashboard();
