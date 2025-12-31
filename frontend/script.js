/**
 * Frontend JavaScript for Dynamic AI Assistant Platform
 * Handles navigation, form submission, and chat functionality
 */

// Global state
let currentAssistantId = null;
let currentAssistantName = null;

// API Base URL (adjust if needed)
const API_BASE_URL = window.location.origin;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeFileUpload();
    initializeChatInput();
});

// Mobile Menu Toggle
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('active');
}

// Close mobile menu when clicking a link
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

// Page Navigation
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
    
    // Clear previous messages except welcome
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

// Data Source UI Updates
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
        
        // Update accepted file types
        if (selectedType === 'csv') {
            fileInput.setAttribute('accept', '.csv');
        } else if (selectedType === 'json') {
            fileInput.setAttribute('accept', '.json');
        }
    }
}

// File Upload Handler
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

// Reset Form
function resetForm() {
    document.getElementById('assistant-form').reset();
    document.getElementById('file-name').textContent = 'Choose a file...';
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('error-message').classList.add('hidden');
    document.getElementById('submit-btn').disabled = false;
    updateDataSourceUI();
}

// Create Assistant
async function createAssistant(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = document.getElementById('submit-btn');
    const loadingState = document.getElementById('loading-state');
    const errorMessage = document.getElementById('error-message');
    
    // Show loading state
    submitBtn.disabled = true;
    loadingState.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    
    try {
        // Prepare form data
        const formData = new FormData(form);
        
        // Convert checkbox values to boolean
        formData.set('enable_statistics', formData.get('enable_statistics') === 'true');
        formData.set('enable_alerts', formData.get('enable_alerts') === 'true');
        formData.set('enable_recommendations', formData.get('enable_recommendations') === 'true');
        
        // Send request
        const response = await fetch(`${API_BASE_URL}/api/assistants/create`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || error.error || 'Failed to create assistant');
        }
        
        const result = await response.json();
        
        // Success! Show chat interface
        showChat(result.assistant_id, result.name);
        
    } catch (error) {
        console.error('Error creating assistant:', error);
        errorMessage.textContent = error.message;
        errorMessage.classList.remove('hidden');
        submitBtn.disabled = false;
        loadingState.classList.add('hidden');
    }
}

// Chat Input Auto-resize
function initializeChatInput() {
    const chatInput = document.getElementById('chat-input');
    
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
    });
    
    // Allow Enter to send, Shift+Enter for new line
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('chat-form').dispatchEvent(new Event('submit'));
        }
    });
}

// Send Message
async function sendMessage(event) {
    event.preventDefault();
    
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const message = chatInput.value.trim();
    
    if (!message || !currentAssistantId) return;
    
    // Disable input
    chatInput.disabled = true;
    sendBtn.disabled = true;
    
    // Add user message to chat
    addMessageToChat('user', message);
    
    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    
    try {
        // Send request
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
            throw new Error(error.detail || error.error || 'Failed to get response');
        }
        
        const result = await response.json();
        
        // Add assistant response to chat
        addMessageToChat('assistant', result.assistant_response, result.sources_used);
        
    } catch (error) {
        console.error('Error sending message:', error);
        addMessageToChat('assistant', `Sorry, I encountered an error: ${error.message}`);
    } finally {
        // Re-enable input
        chatInput.disabled = false;
        sendBtn.disabled = false;
        chatInput.focus();
    }
}

// Add Message to Chat
function addMessageToChat(sender, text, sourcesUsed = null) {
    const chatMessages = document.getElementById('chat-messages');
    const welcomeMessage = chatMessages.querySelector('.welcome-message');
    
    // Remove welcome message if it exists
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
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Utility: Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
}

// Utility: Format Date
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

// Error Handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
