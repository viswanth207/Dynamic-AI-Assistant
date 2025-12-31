let currentAssistantId = null;
let currentAssistantName = null;

const API_BASE_URL = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
    initializeFileUpload();
    initializeChatInput();
});

function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('active');
}

document.addEventListener('click', (e) => {
    const navLinks = document.querySelector('.nav-links');
    const navToggle = document.querySelector('.nav-toggle');
    
    if (e.target.classList.contains('nav-link')) {
        navLinks.classList.remove('active');
    }
    
    if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('active');
    }
});

function showLanding() {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('landing-page').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showCreateForm() {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('create-form-page').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    resetForm();
}

function showChat(assistantId, assistantName) {
    currentAssistantId = assistantId;
    currentAssistantName = assistantName;
    
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('chat-page').classList.add('active');
    
    document.getElementById('chat-assistant-name').textContent = assistantName;
    
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-icon">🤖</div>
            <h3>Welcome to ${assistantName}!</h3>
            <p>Your assistant is ready. Ask me anything about your data!</p>
        </div>
    `;
    
    document.getElementById('chat-input').focus();
}

function updateDataSourceUI() {
    const selectedType = document.querySelector('input[name="data_source_type"]:checked').value;
    const fileUploadGroup = document.getElementById('file-upload-group');
    const urlInputGroup = document.getElementById('url-input-group');
    const fileInput = document.getElementById('file-upload');
    const urlInput = document.getElementById('data-url');
    
    if (selectedType === 'url') {
        fileUploadGroup.classList.add('hidden');
        urlInputGroup.classList.remove('hidden');
        fileInput.removeAttribute('required');
        urlInput.setAttribute('required', 'required');
    } else {
        fileUploadGroup.classList.remove('hidden');
        urlInputGroup.classList.add('hidden');
        fileInput.setAttribute('required', 'required');
        urlInput.removeAttribute('required');
        
        if (selectedType === 'csv') {
            fileInput.setAttribute('accept', '.csv');
        } else if (selectedType === 'json') {
            fileInput.setAttribute('accept', '.json');
        }
    }
}

function initializeFileUpload() {
    const fileInput = document.getElementById('file-upload');
    const fileNameDisplay = document.getElementById('file-name');
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileNameDisplay.textContent = file.name;
        } else {
            fileNameDisplay.textContent = 'Choose a file...';
        }
    });
}

function resetForm() {
    document.getElementById('assistant-form').reset();
    document.getElementById('file-name').textContent = 'Choose a file...';
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('error-message').classList.add('hidden');
    document.getElementById('submit-btn').disabled = false;
    updateDataSourceUI();
}

async function createAssistant(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = document.getElementById('submit-btn');
    const loadingState = document.getElementById('loading-state');
    const errorMessage = document.getElementById('error-message');
    
    submitBtn.disabled = true;
    loadingState.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    
    try {
        const formData = new FormData(form);
        
        formData.set('enable_statistics', formData.get('enable_statistics') === 'true');
        formData.set('enable_alerts', formData.get('enable_alerts') === 'true');
        formData.set('enable_recommendations', formData.get('enable_recommendations') === 'true');
        
        const response = await fetch(`${API_BASE_URL}/api/assistants/create`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || error.error || 'Failed to create assistant');
        }
        
        const result = await response.json();
        
        showChat(result.assistant_id, result.name);
        
    } catch (error) {
        console.error('Error creating assistant:', error);
        errorMessage.textContent = error.message;
        errorMessage.classList.remove('hidden');
        submitBtn.disabled = false;
        loadingState.classList.add('hidden');
    }
}

function initializeChatInput() {
    const chatInput = document.getElementById('chat-input');
    
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
    });
    
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('chat-form').dispatchEvent(new Event('submit'));
        }
    });
}

async function sendMessage(event) {
    event.preventDefault();
    
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const message = chatInput.value.trim();
    
    if (!message || !currentAssistantId) return;
    
    chatInput.disabled = true;
    sendBtn.disabled = true;
    
    addMessageToChat('user', message);
    
    chatInput.value = '';
    chatInput.style.height = 'auto';
    
    const thinkingMessage = addThinkingIndicator();
    const thinkingStartTime = Date.now();
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                assistant_id: currentAssistantId,
                message: message
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            removeThinkingIndicator(thinkingMessage);
            throw new Error(error.detail || error.error || 'Failed to get response');
        }
        
        const result = await response.json();
        
        const thinkingDuration = Date.now() - thinkingStartTime;
        const minThinkingTime = 800;
        
        if (thinkingDuration < minThinkingTime) {
            await new Promise(resolve => setTimeout(resolve, minThinkingTime - thinkingDuration));
        }
        
        removeThinkingIndicator(thinkingMessage);
        addMessageToChat('assistant', result.assistant_response, result.sources_used);
        
    } catch (error) {
        console.error('Error sending message:', error);
        removeThinkingIndicator(thinkingMessage);
        addMessageToChat('assistant', `Sorry, I encountered an error: ${error.message}`);
    } finally {
        chatInput.disabled = false;
        sendBtn.disabled = false;
        chatInput.focus();
    }
}

function addMessageToChat(sender, text, sourcesUsed = null) {
    const chatMessages = document.getElementById('chat-messages');
    const welcomeMessage = chatMessages.querySelector('.welcome-message');
    
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const avatar = sender === 'user' ? '👤' : '🤖';
    const time = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    let metaHTML = `<span>${time}</span>`;
    if (sender === 'assistant' && sourcesUsed !== null) {
        metaHTML += `<span>• ${sourcesUsed} sources</span>`;
    }
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-text">${escapeHtml(text)}</div>
            <div class="message-meta">${metaHTML}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addThinkingIndicator() {
    const chatMessages = document.getElementById('chat-messages');
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'message assistant-message thinking-message';
    thinkingDiv.id = 'thinking-indicator';
    
    thinkingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="message-text">
                <span class="thinking-dots">
                    <span>.</span><span>.</span><span>.</span>
                </span>
                Thinking
            </div>
        </div>
    `;
    
    chatMessages.appendChild(thinkingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return thinkingDiv;
}

function removeThinkingIndicator(thinkingMessage) {
    if (thinkingMessage && thinkingMessage.parentNode) {
        thinkingMessage.remove();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
