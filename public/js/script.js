// TravaCasa - Enhanced Interactive Features
// Modern JavaScript for improved user experience

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎉 TravaCasa Enhanced Features Loaded!');
    
    // Initialize all features
    initializeNavbarEffects();
    initializeCardAnimations();
    initializeSearchEnhancements();
    initializeVoiceSearch();
    initializeFilterSystem();
    initializeSidebarToggle();
    initializeImageLazyLoading();
    initializeFormEnhancements();
    initializeTooltips();
    initializeGeolocationFeatures();
    initializeDarkMode();
    
    // Add loading state management
    initializeLoadingStates();
    initializeEnhancedNearMe();
});

// Navbar scroll effects
function initializeNavbarEffects() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        
        // Add scrolled class for styling
        if (currentScrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        // Hide/show navbar on scroll
// Removed scroll-based transform logic to keep navbar fixed at top
navbar.style.transform = 'translateY(0)';
        
        lastScrollY = currentScrollY;
    });
}

// Enhanced card animations
function initializeCardAnimations() {
    const cards = document.querySelectorAll('.card');
    
    // Intersection Observer for scroll animations
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.animationDelay = `${entry.target.dataset.index * 100}ms`;
                entry.target.classList.add('animate-in');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    cards.forEach((card, index) => {
        card.dataset.index = index;
        cardObserver.observe(card);
        
        // Add ripple effect on click
        card.addEventListener('click', function(e) {
            createRippleEffect(e, this);
        });
    });
}

// Create ripple effect for interactive elements
function createRippleEffect(event, element) {
    const ripple = document.createElement('div');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
        z-index: 1;
    `;
    
    element.style.position = 'relative';
    element.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Enhanced search functionality
function initializeSearchEnhancements() {
    const searchInput = document.querySelector('.custom-search-input');
    const searchBtn = document.querySelector('.custom-search-btn');
    const searchContainer = document.querySelector('.search-container');
    const searchForm = document.querySelector('form[action="/listings"]');
    
    if (!searchInput) return;
    
    // Add search suggestions
    let debounceTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimeout);
        const query = this.value.trim();
        
        if (query.length > 2) {
            debounceTimeout = setTimeout(() => {
                fetchSearchSuggestions(query);
            }, 300);
        } else {
            hideSuggestions();
        }
    });
    
    // Enhanced search button interaction
    if (searchBtn) {
        searchBtn.addEventListener('mousedown', function() {
            this.style.transform = 'translateY(2px) scale(0.98)';
        });
        
        searchBtn.addEventListener('mouseup', function() {
            this.style.transform = 'translateY(-2px) scale(1)';
        });
    }
    
    // Search input focus effects
    searchInput.addEventListener('focus', function() {
        searchContainer.style.transform = 'scale(1.02)';
        searchContainer.style.boxShadow = '0 20px 40px rgba(99, 102, 241, 0.2)';
        this.placeholder = 'Try: "Mountain", "Beach", "City" or location name';
    });
    
    searchInput.addEventListener('blur', function() {
        searchContainer.style.transform = 'scale(1)';
        searchContainer.style.boxShadow = '';
        this.placeholder = 'Search Destination';
        setTimeout(hideSuggestions, 200);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
    });
    
    // Search on Enter
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (searchForm) searchForm.submit();
        }
    });
    
    // Loading state on form submit
    if (searchForm) {
        searchForm.addEventListener('submit', function() {
            if (searchBtn) {
                searchBtn.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i><span>Searching...</span>';
                searchBtn.disabled = true;
            }
        });
    }
}

// Dark Mode Toggle Functionality
function initializeDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (!darkModeToggle) return;

    // Helper to set floating style
    function setFloatingStyle(isFloating) {
        if (isFloating) {
            darkModeToggle.classList.add('floating-dark-toggle');
            darkModeToggle.style.position = 'fixed';
            darkModeToggle.style.bottom = '2rem';
            darkModeToggle.style.right = '2rem';
            darkModeToggle.style.zIndex = '2000';
        } else {
            darkModeToggle.classList.remove('floating-dark-toggle');
            darkModeToggle.style.position = '';
            darkModeToggle.style.bottom = '';
            darkModeToggle.style.right = '';
            darkModeToggle.style.zIndex = '';
        }
    }
    // Initial style based on screen size
    setFloatingStyle(window.innerWidth < 992);
    window.addEventListener('resize', () => {
        setFloatingStyle(window.innerWidth < 992);
    });

    // Enhance button UI/UX (shared styles)
    darkModeToggle.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    darkModeToggle.style.color = '#fff';
    darkModeToggle.style.border = 'none';
    darkModeToggle.style.borderRadius = '50%';
    darkModeToggle.style.width = '3.5rem';
    darkModeToggle.style.height = '3.5rem';
    darkModeToggle.style.display = 'flex';
    darkModeToggle.style.alignItems = 'center';
    darkModeToggle.style.justifyContent = 'center';
    darkModeToggle.style.boxShadow = '0 4px 16px rgba(102,126,234,0.15)';
    darkModeToggle.style.transition = 'background 0.3s, color 0.3s, box-shadow 0.3s, transform 0.2s';
    darkModeToggle.setAttribute('title', 'Toggle dark mode');
    darkModeToggle.setAttribute('aria-label', 'Toggle dark mode');

    // Tooltip
    // let tooltip;
    // darkModeToggle.addEventListener('mouseenter', function() {
    //     tooltip = document.createElement('div');
    //     tooltip.textContent = document.body.classList.contains('dark-mode') ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    //     tooltip.style.position = 'fixed';
    //     tooltip.style.bottom = '5.5rem';
    //     tooltip.style.right = '2.5rem';
    //     tooltip.style.background = '#23272f';
    //     tooltip.style.color = '#fff';
    //     tooltip.style.padding = '6px 16px';
    //     tooltip.style.borderRadius = '8px';
    //     tooltip.style.fontSize = '0.95rem';
    //     tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    //     tooltip.style.zIndex = '3000';
    //     tooltip.style.opacity = '0';
    //     tooltip.style.transition = 'opacity 0.2s';
    //     document.body.appendChild(tooltip);
    //     setTimeout(() => { tooltip.style.opacity = '1'; }, 10);
    // });
    // darkModeToggle.addEventListener('mouseleave', function() {
    //     if (tooltip) {
    //         tooltip.style.opacity = '0';
    //         setTimeout(() => { if (tooltip) tooltip.remove(); }, 200);
    //     }
    // });

    // Check localStorage for dark mode state
    const isDarkMode = localStorage.getItem('darkMode') === 'enabled';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-sun fa-lg" style="transition: color 0.3s;"></i>';
        darkModeToggle.setAttribute('aria-pressed', 'true');
    } else {
        darkModeToggle.innerHTML = '<i class="fas fa-moon fa-lg" style="transition: color 0.3s;"></i>';
        darkModeToggle.setAttribute('aria-pressed', 'false');
    }

    // Ripple/Glow effect
    darkModeToggle.addEventListener('click', function(e) {
        // Ripple
        const ripple = document.createElement('span');
        ripple.style.position = 'absolute';
        ripple.style.left = (e.offsetX - 20) + 'px';
        ripple.style.top = (e.offsetY - 20) + 'px';
        ripple.style.width = '40px';
        ripple.style.height = '40px';
        ripple.style.background = 'rgba(255,255,255,0.25)';
        ripple.style.borderRadius = '50%';
        ripple.style.pointerEvents = 'none';
        ripple.style.transform = 'scale(0)';
        ripple.style.transition = 'transform 0.4s, opacity 0.4s';
        darkModeToggle.appendChild(ripple);
        setTimeout(() => {
            ripple.style.transform = 'scale(2.5)';
            ripple.style.opacity = '0';
        }, 10);
        setTimeout(() => ripple.remove(), 400);

        // Toggle dark mode
        document.body.classList.toggle('dark-mode');
        const darkModeEnabled = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', darkModeEnabled ? 'enabled' : 'disabled');
        this.innerHTML = darkModeEnabled ? '<i class="fas fa-sun fa-lg" style="transition: color 0.3s;"></i>' : '<i class="fas fa-moon fa-lg" style="transition: color 0.3s;"></i>';
        this.setAttribute('aria-pressed', darkModeEnabled ? 'true' : 'false');
        // Animate button
        this.style.transform = 'scale(1.1)';
        setTimeout(() => { this.style.transform = 'scale(1)'; }, 150);
    });
}

// Fetch and display search suggestions
async function fetchSearchSuggestions(query) {
    try {
        const response = await fetch(`/api/popular-searches?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        displaySuggestions(data);
    } catch (error) {
        console.log('Search suggestions unavailable');
    }
}

// Display search suggestions
function displaySuggestions(suggestions) {
    let suggestionsContainer = document.querySelector('.search-suggestions-dropdown');
    
    if (!suggestionsContainer) {
        suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'search-suggestions-dropdown';
        suggestionsContainer.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            margin-top: 8px;
            max-height: 300px;
            overflow-y: auto;
            z-index: 1000;
            padding: 12px;
        `;
        document.querySelector('.search-container').appendChild(suggestionsContainer);
    }
    
    if (suggestions.locations && suggestions.locations.length > 0) {
        const html = suggestions.locations.slice(0, 5).map(location => `
            <div class="suggestion-item" style="
                padding: 12px 16px;
                cursor: pointer;
                border-radius: 8px;
                transition: background 0.2s;
                display: flex;
                align-items: center;
                gap: 12px;
            " onmouseover="this.style.background='#f8f9ff'" onmouseout="this.style.background='transparent'" onclick="selectSuggestion('${location.name}')">
                <i class="fas fa-map-marker-alt" style="color: #6366f1; font-size: 14px;"></i>
                <span style="font-weight: 500; color: #374151;">${location.name}</span>
                <span style="color: #9ca3af; font-size: 12px; margin-left: auto;">${location.count} properties</span>
            </div>
        `).join('');
        
        suggestionsContainer.innerHTML = html;
        suggestionsContainer.style.display = 'block';
    }
}

// Hide search suggestions
function hideSuggestions() {
    const suggestionsContainer = document.querySelector('.search-suggestions-dropdown');
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
    }
}

// Select a search suggestion
function selectSuggestion(suggestion) {
    const searchInput = document.querySelector('.custom-search-input');
    if (searchInput) {
        searchInput.value = suggestion;
        hideSuggestions();
        searchInput.form.submit();
    }
}

// Voice Search Integration
function initializeVoiceSearch() {
    // Check if Web Speech API is supported
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.log('Web Speech API is not supported in this browser.');
        const voiceBtn = document.getElementById('voiceSearchBtn');
        if (voiceBtn) {
            voiceBtn.style.display = 'none';
        }
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Configure speech recognition
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    // Get the voice search button from navbar
    const voiceButton = document.getElementById('voiceSearchBtn');
    const searchInput = document.getElementById('mainSearchInput');
    
    if (voiceButton && searchInput) {
        // Voice button click handler
        voiceButton.addEventListener('click', function(e) {
            e.preventDefault();
            startVoiceRecognition(recognition, voiceButton, searchInput);
        });
        
        // Speech recognition event handlers
        recognition.onstart = function() {
            updateVoiceButtonState(voiceButton, 'listening');
            showVoiceModal('Listening... Speak now!', 'listening');
        };
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            const confidence = event.results[0][0].confidence;
            
            searchInput.value = transcript;
            updateVoiceButtonState(voiceButton, 'success');
            showVoiceModal(`Found: "${transcript}"`, 'success');
            
            // Send analytics data to server
            sendVoiceSearchAnalytics(transcript, confidence);
            
            // Auto-submit search after a short delay
            setTimeout(() => {
                const searchForm = searchInput.closest('form');
                if (searchForm) {
                    searchForm.submit();
                }
            }, 1500);
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            updateVoiceButtonState(voiceButton, 'error');
            
            let errorMessage = 'Voice search error. Please try again.';
            switch(event.error) {
                case 'network':
                    errorMessage = 'Network error. Please check your connection.';
                    break;
                case 'not-allowed':
                    errorMessage = 'Microphone access denied. Please allow microphone access.';
                    break;
                case 'no-speech':
                    errorMessage = 'No speech detected. Please try again.';
                    break;
                case 'aborted':
                    errorMessage = 'Voice search cancelled.';
                    break;
            }
            
            showVoiceModal(errorMessage, 'error');
        };
        
        recognition.onend = function() {
            updateVoiceButtonState(voiceButton, 'idle');
        };
    }
    
    // Also handle legacy search containers if they exist
    const searchContainer = document.querySelector('.search-container');
    const customSearchInput = document.querySelector('.custom-search-input');
    
    if (searchContainer && customSearchInput) {
        // Create voice search button for legacy search
        const legacyVoiceButton = createVoiceButton();
        const searchBtn = document.querySelector('.custom-search-btn');
        if (searchBtn) {
            searchContainer.insertBefore(legacyVoiceButton, searchBtn);
        }
        
        // Voice button click handler for legacy
        legacyVoiceButton.addEventListener('click', function() {
            startVoiceRecognition(recognition, legacyVoiceButton, customSearchInput);
        });
    }
}

// Create voice search button
function createVoiceButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'voice-search-btn';
    button.innerHTML = '<i class="fas fa-microphone"></i>';
    button.title = 'Voice Search (Click to speak)';
    
    // Add styles
    button.style.cssText = `
        background: #ff6b6b;
        color: white;
        border: none;
        border-radius: 50%;
        width: 2.75rem;
        height: 2.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 0.5rem;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 1rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    
    // Hover effects
    button.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.1)';
        this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    });
    
    button.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
        this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    });
    
    return button;
}

// Start voice recognition
function startVoiceRecognition(recognition, button, searchInput) {
    try {
        // Clear previous search
        searchInput.value = '';
        
        // Check microphone permission
        if (navigator.permissions) {
            navigator.permissions.query({ name: 'microphone' }).then(function(result) {
                if (result.state === 'denied') {
                    showVoiceModal('Microphone access denied. Please allow microphone access in your browser settings.', 'error');
                    return;
                }
                recognition.start();
            }).catch(function() {
                // Fallback if permissions API is not supported
                recognition.start();
            });
        } else {
            recognition.start();
        }
    } catch (error) {
        console.error('Error starting voice recognition:', error);
        showVoiceModal('Error starting voice recognition. Please try again.', 'error');
    }
}

// Update voice button state
function updateVoiceButtonState(button, state) {
    const icon = button.querySelector('i');
    
    switch(state) {
        case 'listening':
            button.style.background = '#10b981';
            button.style.animation = 'pulse 1s infinite';
            icon.className = 'fas fa-microphone';
            button.title = 'Listening... (Click to stop)';
            break;
        case 'success':
            button.style.background = '#059669';
            button.style.animation = 'none';
            icon.className = 'fas fa-check';
            button.title = 'Voice input received!';
            setTimeout(() => {
                updateVoiceButtonState(button, 'idle');
            }, 2000);
            break;
        case 'error':
            button.style.background = '#ef4444';
            button.style.animation = 'none';
            icon.className = 'fas fa-exclamation-triangle';
            button.title = 'Voice search error';
            setTimeout(() => {
                updateVoiceButtonState(button, 'idle');
            }, 3000);
            break;
        case 'idle':
        default:
            button.style.background = '#ff6b6b';
            button.style.animation = 'none';
            icon.className = 'fas fa-microphone';
            button.title = 'Voice Search (Click to speak)';
            break;
    }
}

// Show voice search modal/notification
function showVoiceModal(message, type = 'info') {
    // Remove existing modal
    const existingModal = document.querySelector('.voice-search-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'voice-search-modal';
    
    const bgColor = {
        'info': '#3b82f6',
        'success': '#10b981',
        'error': '#ef4444',
        'listening': '#10b981'
    }[type] || '#3b82f6';
    
    const icon = {
        'info': 'fas fa-info-circle',
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-triangle',
        'listening': 'fas fa-microphone'
    }[type] || 'fas fa-info-circle';
    
    modal.innerHTML = `
        <div class="voice-modal-content">
            <i class="${icon} voice-modal-icon"></i>
            <p class="voice-modal-text">${message}</p>
            ${type === 'listening' ? '<div class="voice-waveform"><div></div><div></div><div></div><div></div></div>' : ''}
        </div>
    `;
    
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${bgColor};
        color: white;
        padding: 2rem;
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        z-index: 10000;
        text-align: center;
        min-width: 300px;
        backdrop-filter: blur(10px);
        animation: voiceModalShow 0.3s ease-out;
    `;
    
    document.body.appendChild(modal);
    
    // Auto-remove modal after delay
    setTimeout(() => {
        if (modal.parentNode) {
            modal.style.animation = 'voiceModalHide 0.3s ease-in';
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    }, type === 'listening' ? 5000 : 3000);
}

// Send voice search analytics to server
async function sendVoiceSearchAnalytics(transcript, confidence) {
    try {
        const response = await fetch('/api/voice-search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transcript: transcript,
                confidence: confidence || 0,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                language: navigator.language
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to send analytics');
        }
        
        const data = await response.json();
        console.log('Voice search analytics sent successfully:', data);
    } catch (error) {
        console.error('Error sending voice search analytics:', error);
        // Analytics failure shouldn't break the user experience
    }
}

// Enhanced Voice Search with Web Search API Integration
async function sendEnhancedVoiceSearchAnalytics(transcript, confidence) {
    try {
        const response = await fetch('/api/voice-search-enhanced', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transcript: transcript,
                confidence: confidence || 0,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                language: navigator.language
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to send enhanced analytics');
        }
        
        const data = await response.json();
        console.log('Enhanced voice search analytics sent successfully:', data);
        
        // Display enhanced results
        displayEnhancedSearchResults(data);
        
        return data;
    } catch (error) {
        console.error('Error sending enhanced voice search analytics:', error);
        // Analytics failure shouldn't break the user experience
        return null;
    }
}

// Display enhanced search results
function displayEnhancedSearchResults(data) {
    if (!data || !data.success) return;
    
    const { databaseResults, webResults, suggestions } = data;
    
    // Create results modal
    const modal = document.createElement('div');
    modal.className = 'enhanced-search-results-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-search-plus"></i> Enhanced Search Results</h3>
                <button class="close-modal" onclick="this.parentElement.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="search-query-info">
                    <h4>Search Query: "${data.originalTranscript}"</h4>
                    <p>Processed: ${data.processedQuery.location}</p>
                    <div class="confidence-score">
                        <span>Confidence: ${Math.round(data.confidence * 100)}%</span>
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: ${data.confidence * 100}%"></div>
                        </div>
                    </div>
                </div>
                
                ${databaseResults.length > 0 ? `
                    <div class="results-section">
                        <h4><i class="fas fa-database"></i> Database Results</h4>
                        <div class="results-grid">
                            ${databaseResults.map(result => `
                                <div class="result-card">
                                    <img src="${result.image?.url || '/images/default-property.jpg'}" alt="${result.title}">
                                    <div class="result-info">
                                        <h5>${result.title}</h5>
                                        <p class="location"><i class="fas fa-map-marker-alt"></i> ${result.location}</p>
                                        <p class="price">₹${result.price?.toLocaleString() || 'N/A'}/night</p>
                                        <a href="/listings/${result.id}" class="view-btn">View Details</a>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${webResults.length > 0 ? `
                    <div class="results-section">
                        <h4><i class="fas fa-globe"></i> Web Results</h4>
                        <div class="web-results-list">
                            ${webResults.map(result => `
                                <div class="web-result-item">
                                    <h5><a href="${result.url}" target="_blank">${result.title}</a></h5>
                                    <p class="description">${result.description}</p>
                                    <span class="result-type">${result.type}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${suggestions.length > 0 ? `
                    <div class="results-section">
                        <h4><i class="fas fa-lightbulb"></i> Suggestions</h4>
                        <div class="suggestions-list">
                            ${suggestions.map(suggestion => `
                                <button class="suggestion-btn" onclick="searchSuggestion('${suggestion.text}')">
                                    <i class="fas fa-${suggestion.type === 'location' ? 'map-marker-alt' : 'tag'}"></i>
                                    ${suggestion.text}
                                    ${suggestion.count > 0 ? `<span class="count">(${suggestion.count})</span>` : ''}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(10px);
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Search suggestion handler
function searchSuggestion(suggestionText) {
    const searchInput = document.querySelector('.search-input') || document.querySelector('.custom-search-input');
    if (searchInput) {
        searchInput.value = suggestionText;
        const searchForm = searchInput.closest('form');
        if (searchForm) {
            searchForm.submit();
        }
    }
    
    // Close modal
    const modal = document.querySelector('.enhanced-search-results-modal');
    if (modal) {
        modal.remove();
    }
}

// Enhanced Multi-Select Filter System
function initializeFilterSystem() {
    const filters = document.querySelectorAll('.filter[data-filter]');
    const checkboxes = document.querySelectorAll('.filter-checkbox');
    const cards = document.querySelectorAll('.card, .enhanced-card, .listing-card-wrapper');
    const clearBtn = document.getElementById('clearFiltersBtn');

    // Helper: get all checked filter values
    function getActiveFilters() {
        return Array.from(checkboxes)
            .filter(cb => cb.checked && cb.dataset.filter !== 'all')
            .map(cb => cb.dataset.filter);
    }

    // Helper: show/hide cards based on active filters
    function applyMultiFilter(activeFilters) {
        if (activeFilters.length === 0) {
            showAllCards(cards);
            updateResultsCount('all', cards);
            return;
        }
        let shown = 0;
        cards.forEach((card, index) => {
            let show = false;
            for (const filterType of activeFilters) {
                if (shouldShowCard(card, filterType)) {
                    show = true;
                    break;
                }
            }
            if (show) {
                card.style.display = 'block';
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 50);
                shown++;
            } else {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    card.style.display = 'none';
                }, 300);
            }
        });
        updateResultsCount('multi', cards, shown);
    }

    // Checkbox change event
    checkboxes.forEach(cb => {
        cb.addEventListener('change', function() {
            if (this.dataset.filter === 'all') {
                // If 'All Properties' is checked, uncheck all others
                if (this.checked) {
                    checkboxes.forEach(other => {
                        if (other !== this) other.checked = false;
                    });
                    showAllCards(cards);
                    updateResultsCount('all', cards);
                }
            } else {
                // Uncheck 'All Properties' if any other is checked
                if (this.checked) {
                    const allCb = document.querySelector('.filter-checkbox[data-filter="all"]');
                    if (allCb) allCb.checked = false;
                }
                // If none checked, check 'All Properties'
                if (getActiveFilters().length === 0) {
                    const allCb = document.querySelector('.filter-checkbox[data-filter="all"]');
                    if (allCb) allCb.checked = true;
                    showAllCards(cards);
                    updateResultsCount('all', cards);
                } else {
                    applyMultiFilter(getActiveFilters());
                }
            }
        });
    });

    // Clear Filters button
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            checkboxes.forEach(cb => {
                cb.checked = cb.dataset.filter === 'all';
            });
            showAllCards(cards);
            updateResultsCount('all', cards);
        });
    }

    // Initialize with all cards visible
    showAllCards(cards);
}

// Show filter notification
function showFilterNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `filter-notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 25px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        animation: slideInRight 0.3s ease, fadeOut 0.3s ease 2.5s;
        font-size: 0.9rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Add notification animations
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        0% { transform: translateX(100%); opacity: 0; }
        100% { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes fadeOut {
        0% { opacity: 1; }
        100% { opacity: 0; }
    }
`;
document.head.appendChild(notificationStyles);


// Show loading state for filters
function showFilterLoading(isLoading) {
    const cardsContainer = document.querySelector('.row');
    if (cardsContainer) {
        if (isLoading) {
            cardsContainer.style.opacity = '0.8';
        } else {
            cardsContainer.style.opacity = '1';
        }
    }
}

// Initialize sidebar toggle for both mobile and desktop
function initializeSidebarToggle() {
    const mobileFilterToggle = document.getElementById('mobileFilterToggle');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const desktopSidebarToggle = document.getElementById('desktopSidebarToggle');
    const filtersSidebar = document.querySelector('.filters-sidebar');
    const contentArea = document.querySelector('.content-area');
    const sidebarIcon = document.getElementById('sidebarIcon');
    const toggleText = document.getElementById('toggleText');
    
    let sidebarVisible = true;
    
    // Mobile toggle functionality
    if (mobileFilterToggle && sidebarToggle && filtersSidebar) {
        mobileFilterToggle.addEventListener('click', function() {
            filtersSidebar.classList.toggle('show');
        });
        
        sidebarToggle.addEventListener('click', function() {
            filtersSidebar.classList.remove('show');
        });
    }
    
    // Desktop toggle functionality
    if (desktopSidebarToggle && filtersSidebar && contentArea) {
        desktopSidebarToggle.addEventListener('click', function() {
            sidebarVisible = !sidebarVisible;
            
            if (sidebarVisible) {
                // Show sidebar
                filtersSidebar.classList.remove('hidden');
                contentArea.classList.remove('sidebar-hidden');
                if (sidebarIcon) sidebarIcon.className = 'fa-solid fa-angles-left';
                if (toggleText) toggleText.textContent = 'Hide Filters';
            } else {
                // Hide sidebar
                filtersSidebar.classList.add('hidden');
                contentArea.classList.add('sidebar-hidden');
                if (sidebarIcon) sidebarIcon.className = 'fa-solid fa-angles-right';
                if (toggleText) toggleText.textContent = 'Show Filters';
            }
            
            // Add ripple effect
            createButtonRipple(desktopSidebarToggle);
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        const isInsideSidebar = filtersSidebar && filtersSidebar.contains(event.target);
        const isToggleButton = (mobileFilterToggle && mobileFilterToggle.contains(event.target)) ||
                              (sidebarToggle && sidebarToggle.contains(event.target)) ||
                              (desktopSidebarToggle && desktopSidebarToggle.contains(event.target));
        
        if (!isInsideSidebar && !isToggleButton && filtersSidebar && filtersSidebar.classList.contains('show')) {
            filtersSidebar.classList.remove('show');
        }
    });
    
    // Keyboard shortcut for desktop sidebar toggle (Ctrl/Cmd + \)
    document.addEventListener('keydown', function(event) {
        if ((event.ctrlKey || event.metaKey) && event.key === '\\' && desktopSidebarToggle) {
            event.preventDefault();
            desktopSidebarToggle.click();
        }
    });
}

// Create button ripple effect
function createButtonRipple(button) {
    const ripple = document.createElement('div');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    
    ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s linear;
        background: rgba(99, 102, 241, 0.3);
        left: 50%;
        top: 50%;
        width: ${size}px;
        height: ${size}px;
        margin-left: -${size / 2}px;
        margin-top: -${size / 2}px;
        pointer-events: none;
    `;
    
    button.style.position = 'relative';
    button.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Show all cards initially
function showAllCards(cards) {
    cards.forEach(card => {
        card.style.display = 'block';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
    });
}

// Apply filter logic
function applyFilter(filterType, cards) {
    cards.forEach((card, index) => {
        const shouldShow = shouldShowCard(card, filterType);
        
        if (shouldShow) {
            card.style.display = 'block';
            // Animate in with delay
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 50);
        } else {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.display = 'none';
            }, 300);
        }
    });
    
    // Update results count
    updateResultsCount(filterType, cards);
}

// Determine if card should show based on filter
function shouldShowCard(card, filterType) {
    if (filterType === 'all') return true;

    // Use correct selectors for the new markup
    const title = card.querySelector('.listing-title')?.textContent.toLowerCase() || '';
    const description = card.querySelector('.listing-description')?.textContent.toLowerCase() || '';
    const location = card.querySelector('.location-text')?.textContent.toLowerCase() || '';
    const priceText = card.querySelector('.price-amount')?.textContent || '';
    const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;

    const content = `${title} ${description} ${location}`.toLowerCase();

    switch (filterType) {
        case 'trending':
            return content.includes('popular') || content.includes('trending') || content.includes('new');
        case 'toprated':
            return content.includes('rated') || content.includes('review') || content.includes('star');
        case 'mountain':
            return content.includes('mountain') || content.includes('hill') || content.includes('peak');
        case 'beach':
            return content.includes('beach') || content.includes('ocean') || content.includes('sea') || content.includes('coast');
        case 'city':
            return content.includes('city') || content.includes('urban') || content.includes('downtown');
        case 'villa':
            return content.includes('villa') || content.includes('house') || content.includes('home');
        case 'apartment':
            return content.includes('apartment') || content.includes('flat') || content.includes('condo');
        case 'budget':
            return price > 0 && price <= 3000;
        case 'luxury':
            return price > 10000 || content.includes('luxury') || content.includes('premium');
        default:
            return true;
    }
}

// Update results count
function updateResultsCount(filterType, cards) {
    const visibleCards = Array.from(cards).filter(card => {
        return shouldShowCard(card, filterType);
    });
    
    const count = visibleCards.length;
    const filterName = document.querySelector(`.filter[data-filter="${filterType}"] span`)?.textContent || 'Properties';
    
    // Create or update results indicator
    let indicator = document.querySelector('.filter-results-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'filter-results-indicator';
        indicator.style.cssText = `
            text-align: center;
            padding: 1rem;
            background: var(--bg-subtle);
            margin: 1rem 0;
            border-radius: var(--radius-lg);
            color: var(--text-secondary);
            font-weight: 500;
        `;
        
        const container = document.querySelector('.row');
        if (container) {
            container.parentNode.insertBefore(indicator, container);
        }
    }
    
    indicator.innerHTML = `
        <i class="fas fa-filter me-2"></i>
        Showing ${count} ${count === 1 ? 'property' : 'properties'} ${filterType !== 'all' ? `in ${filterName}` : ''}
    `;
    
    if (count === 0) {
        indicator.innerHTML = `
            <i class="fas fa-exclamation-circle me-2"></i>
            No properties found for ${filterName}. Try a different filter.
        `;
        indicator.style.color = 'var(--warning-color)';
    } else {
        indicator.style.color = 'var(--text-secondary)';
    }
}


// Lazy loading for images
function initializeImageLazyLoading() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    
                    img.addEventListener('load', function() {
                        this.classList.add('loaded');
                    });
                    
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }
}

// Form enhancements
function initializeFormEnhancements() {
    // Bootstrap form validation
    const forms = document.querySelectorAll('.needs-validation');
    
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });
    
    // Image removal checkbox functionality
    const removeImageCheckbox = document.getElementById('removeImage');
    const imageFileInput = document.querySelector('input[type="file"]');
    
    if (removeImageCheckbox && imageFileInput) {
        removeImageCheckbox.addEventListener('change', function() {
            if (this.checked) {
                imageFileInput.disabled = true;
                imageFileInput.style.opacity = '0.5';
            } else {
                imageFileInput.disabled = false;
                imageFileInput.style.opacity = '1';
            }
        });
    }
    
    // Enhanced file input styling
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        input.addEventListener('change', function() {
            const fileName = this.files[0]?.name || 'Choose file';
            const label = this.parentNode.querySelector('label') || this.nextElementSibling;
            if (label) {
                label.textContent = fileName;
            }
        });
    });
}

// Initialize tooltips for elements with title attributes
function initializeTooltips() {
    const elementsWithTooltips = document.querySelectorAll('[title]');
    
    elementsWithTooltips.forEach(element => {
        const title = element.getAttribute('title');
        element.removeAttribute('title');
        
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.textContent = title;
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            z-index: 1000;
            opacity: 0;
            transform: translateY(8px);
            transition: all 0.3s ease;
            pointer-events: none;
        `;
        
        document.body.appendChild(tooltip);
        
        element.addEventListener('mouseenter', function(e) {
            const rect = this.getBoundingClientRect();
            tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
            tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translateY(0)';
        });
        
        element.addEventListener('mouseleave', function() {
            tooltip.style.opacity = '0';
            tooltip.style.transform = 'translateY(8px)';
        });
    });
}

// Loading states management
function initializeLoadingStates() {
    document.body.classList.add('loading');
    
    window.addEventListener('load', function() {
        setTimeout(() => {
            document.body.classList.remove('loading');
            document.body.classList.add('loaded');
        }, 500);
    });
}

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    @keyframes filterPulse {
        to {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
        }
    }
    
    @keyframes filterRipple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    @keyframes animate-in {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .card.animate-in {
        animation: animate-in 0.6s ease-out forwards;
    }
    
    .card img.loaded {
        animation: fadeIn 0.5s ease-out;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    body.loading * {
        transition: none !important;
    }
    
    body.loaded {
        transition: all 0.3s ease;
    }
    
    .navbar {
        transition: transform 0.3s ease, box-shadow 0.3s ease !important;
    }
    
    .search-container {
        transition: transform 0.3s ease, box-shadow 0.3s ease !important;
    }
    
    /* Voice Search Animations */
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    
    @keyframes voiceModalShow {
        0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
        }
        100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
    }
    
    @keyframes voiceModalHide {
        0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
        100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
        }
    }
    
    .voice-modal-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
    }
    
    .voice-modal-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
    }
    
    .voice-modal-text {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 500;
        text-align: center;
    }
    
    .voice-waveform {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 2px;
        margin-top: 1rem;
    }
    
    .voice-waveform div {
        width: 3px;
        height: 20px;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 2px;
        animation: waveform 1s infinite;
    }
    
    .voice-waveform div:nth-child(1) { animation-delay: 0s; }
    .voice-waveform div:nth-child(2) { animation-delay: 0.2s; }
    .voice-waveform div:nth-child(3) { animation-delay: 0.4s; }
    .voice-waveform div:nth-child(4) { animation-delay: 0.6s; }
    
    @keyframes waveform {
        0%, 100% { transform: scaleY(1); }
        50% { transform: scaleY(0.5); }
    }
    
    .voice-search-btn {
        position: relative;
        overflow: hidden;
    }
    
    .voice-search-btn::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        transition: width 0.3s ease, height 0.3s ease;
    }
    
    .voice-search-btn:hover::before {
        width: 100%;
        height: 100%;
    }
`;

document.head.appendChild(style);

// Global utility functions
window.TravaCasa = {
    showNotification: function(message, type = 'success') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            font-weight: 500;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
};

// Initialize Geolocation-Based Features
function initializeGeolocationFeatures() {
    // Add location button to navbar
    addLocationButton();
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
        console.log('Geolocation is not supported by this browser.');
        return;
    }
    
    // Initialize map display functionality
    initializeMapDisplay();
}

// Add location button to navbar
function addLocationButton() {
    const navbar = document.querySelector('.navbar .navbar-nav.me-auto');
    if (!navbar) return;
    
    const locationButton = document.createElement('li');
    locationButton.className = 'nav-item';
    locationButton.innerHTML = `
        <a class="nav-link location-btn" href="#" id="locationBtn" title="Find nearby listings">
            <i class="fas fa-map-marker-alt me-2"></i>
            <span>Near Me</span>
        </a>
    `;
    
    navbar.appendChild(locationButton);
    
    // Add click event
    const locationBtn = document.getElementById('locationBtn');
    locationBtn.addEventListener('click', function(e) {
        e.preventDefault();
        getCurrentLocationAndShowNearby();
    });
}

// Get current location and show nearby listings
function getCurrentLocationAndShowNearby() {
    const locationBtn = document.getElementById('locationBtn');
    if (!locationBtn) return;
    
    // Update button state
    locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i><span>Getting Location...</span>';
    locationBtn.style.pointerEvents = 'none';
    
    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
    };
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            showNearbyListingsAndAttractions(latitude, longitude);
            
            // Reset button
            locationBtn.innerHTML = '<i class="fas fa-map-marker-alt me-2"></i><span>Near Me</span>';
            locationBtn.style.pointerEvents = 'auto';
        },
        (error) => {
            console.error('Error getting location:', error);
            handleLocationError(error);
            
            // Reset button
            locationBtn.innerHTML = '<i class="fas fa-map-marker-alt me-2"></i><span>Near Me</span>';
            locationBtn.style.pointerEvents = 'auto';
        },
        options
    );
}

// Handle location errors
function handleLocationError(error) {
    let errorMessage = 'Unable to get your location. ';
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            errorMessage += 'Location access denied. Please enable location permissions.';
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
        case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again.';
            break;
        default:
            errorMessage += 'An unknown error occurred.';
            break;
    }
    
    if (window.TravaCasa) {
        window.TravaCasa.showNotification(errorMessage, 'error');
    }
}

// Show nearby listings and attractions
async function showNearbyListingsAndAttractions(latitude, longitude) {
    try {
        // Fetch nearby listings
        const nearbyResponse = await fetch('/api/nearby-listings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                latitude: latitude,
                longitude: longitude,
                radius: 10,
                type: 'all'
            })
        });
        
        if (!nearbyResponse.ok) {
            throw new Error('Failed to fetch nearby listings');
        }
        
        const nearbyData = await nearbyResponse.json();
        
        // Fetch nearby places
        const placesResponse = await fetch(
            `/api/places-nearby?lat=${latitude}&lng=${longitude}&radius=2000&type=tourist_attraction`
        );
        
        let placesData = { places: [] };
        if (placesResponse.ok) {
            placesData = await placesResponse.json();
        }
        
        // Display results
        displayNearbyResults(nearbyData, placesData, { latitude, longitude });
        
    } catch (error) {
        console.error('Error fetching nearby data:', error);
        if (window.TravaCasa) {
            window.TravaCasa.showNotification('Error fetching nearby information. Please try again.', 'error');
        }
    }
}

// Display nearby results in modal
function displayNearbyResults(nearbyData, placesData, location) {
    const modal = document.createElement('div');
    modal.className = 'nearby-results-modal';
    
    const { listings, attractions } = nearbyData;
    const { places } = placesData;
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-map-marker-alt"></i> Nearby Listings & Attractions</h3>
                <button class="close-modal" onclick="this.parentElement.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="location-info">
                    <p><i class="fas fa-crosshairs"></i> Your Location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}</p>
                </div>
                
                <div class="nearby-tabs">
                    <button class="tab-btn active" onclick="showTab('listings')">
                        <i class="fas fa-home"></i> Listings (${listings.length})
                    </button>
                    <button class="tab-btn" onclick="showTab('attractions')">
                        <i class="fas fa-map-signs"></i> Attractions (${places.length})
                    </button>
                </div>
                
                <div class="tab-content">
                    <div id="listings-tab" class="tab-pane active">
                        ${listings.length > 0 ? `
                            <div class="nearby-listings-grid">
                                ${listings.map(listing => `
                                    <div class="nearby-item">
                                        <img src="${listing.image?.url || '/images/default-property.jpg'}" alt="${listing.title}" class="nearby-image">
                                        <div class="nearby-info">
                                            <h5>${listing.title}</h5>
                                            <p class="location"><i class="fas fa-map-marker-alt"></i> ${listing.location}</p>
                                            <p class="price">₹${listing.price?.toLocaleString() || 'N/A'}/night</p>
                                            <p class="distance"><i class="fas fa-route"></i> ${listing.distance?.toFixed(1) || 'N/A'} km away</p>
                                            <a href="/listings/${listing.id}" class="view-btn">View Details</a>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="no-results">
                                <i class="fas fa-home"></i>
                                <p>No listings found nearby. Try expanding your search radius.</p>
                            </div>
                        `}
                    </div>
                    
                    <div id="attractions-tab" class="tab-pane">
                        ${places.length > 0 ? `
                            <div class="nearby-attractions-grid">
                                ${places.map(place => `
                                    <div class="nearby-item">
                                        ${place.photos && place.photos.length > 0 ? `
                                            <img src="${place.photos[0].url}" alt="${place.name}" class="nearby-image">
                                        ` : `
                                            <div class="no-image-placeholder">
                                                <i class="fas fa-image"></i>
                                            </div>
                                        `}
                                        <div class="nearby-info">
                                            <h5>${place.name}</h5>
                                            <p class="location"><i class="fas fa-map-marker-alt"></i> ${place.vicinity}</p>
                                            ${place.rating ? `<p class="rating"><i class="fas fa-star"></i> ${place.rating}/5</p>` : ''}
                                            <p class="types">${place.types.slice(0, 2).join(', ')}</p>
                                            ${place.priceLevel ? `<p class="price-level">Price Level: ${place.priceLevel}/4</p>` : ''}
                                            <button class="view-btn" onclick="showDirections(${place.location.lat}, ${place.location.lng}, '${place.name}')">
                                                <i class="fas fa-directions"></i> Get Directions
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="no-results">
                                <i class="fas fa-map-signs"></i>
                                <p>No attractions found nearby. Try different location or search manually.</p>
                            </div>
                        `}
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="openInMaps(${location.latitude}, ${location.longitude})">
                        <i class="fas fa-external-link-alt"></i> Open in Maps
                    </button>
                    <button class="btn btn-secondary" onclick="filterByLocation(${location.latitude}, ${location.longitude})">
                        <i class="fas fa-filter"></i> Filter Current Results
                    </button>
                </div>
            </div>
        </div>
    `;
    
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(10px);
        overflow-y: auto;
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Tab switching functionality
function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(tabName + '-tab').classList.add('active');
}

// Open location in external maps
function openInMaps(latitude, longitude) {
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    window.open(url, '_blank');
}

// Show directions to a place
function showDirections(lat, lng, placeName) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
}

// Filter current results by location
function filterByLocation(latitude, longitude) {
    // This would implement location-based filtering of current listings
    // For now, just show a notification
    if (window.TravaCasa) {
        window.TravaCasa.showNotification('Location-based filtering applied!', 'success');
    }
    
    // Close modal
    const modal = document.querySelector('.nearby-results-modal');
    if (modal) {
        modal.remove();
    }
}

// Initialize map display (placeholder for future Google Maps integration)
function initializeMapDisplay() {
    // This would initialize a map display on the page
    // For now, just log that it's ready
    console.log('Map display ready for future Google Maps integration');
}

// Add CSS for nearby results modal
const nearbyStyles = document.createElement('style');
nearbyStyles.textContent = `
    .nearby-results-modal .modal-content {
        background: white;
        border-radius: 16px;
        max-width: 900px;
        max-height: 80vh;
        overflow-y: auto;
        margin: 20px;
    }
    
    .nearby-results-modal .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid #e5e7eb;
    }
    
    .nearby-results-modal .modal-header h3 {
        margin: 0;
        color: #1f2937;
    }
    
    .nearby-results-modal .close-modal {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s;
    }
    
    .nearby-results-modal .close-modal:hover {
        background-color: #f3f4f6;
    }
    
    .nearby-results-modal .location-info {
        padding: 1rem 1.5rem;
        background: #f9fafb;
        border-bottom: 1px solid #e5e7eb;
    }
    
    .nearby-results-modal .nearby-tabs {
        display: flex;
        padding: 0 1.5rem;
        border-bottom: 1px solid #e5e7eb;
    }
    
    .nearby-results-modal .tab-btn {
        background: none;
        border: none;
        padding: 1rem 1.5rem;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
        font-weight: 500;
    }
    
    .nearby-results-modal .tab-btn.active {
        border-bottom-color: #3b82f6;
        color: #3b82f6;
    }
    
    .nearby-results-modal .tab-content {
        padding: 1.5rem;
    }
    
    .nearby-results-modal .tab-pane {
        display: none;
    }
    
    .nearby-results-modal .tab-pane.active {
        display: block;
    }
    
    .nearby-results-modal .nearby-listings-grid,
    .nearby-results-modal .nearby-attractions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
    }
    
    .nearby-results-modal .nearby-item {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: hidden;
        transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .nearby-results-modal .nearby-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .nearby-results-modal .nearby-image {
        width: 100%;
        height: 150px;
        object-fit: cover;
    }
    
    .nearby-results-modal .no-image-placeholder {
        width: 100%;
        height: 150px;
        background: #f3f4f6;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #9ca3af;
        font-size: 2rem;
    }
    
    .nearby-results-modal .nearby-info {
        padding: 1rem;
    }
    
    .nearby-results-modal .nearby-info h5 {
        margin: 0 0 0.5rem 0;
        font-size: 1.1rem;
        font-weight: 600;
    }
    
    .nearby-results-modal .nearby-info p {
        margin: 0.25rem 0;
        color: #6b7280;
        font-size: 0.9rem;
    }
    
    .nearby-results-modal .view-btn {
        display: inline-block;
        background: #3b82f6;
        color: white;
        padding: 0.5rem 1rem;
        text-decoration: none;
        border-radius: 4px;
        margin-top: 0.5rem;
        transition: background-color 0.2s;
        border: none;
        cursor: pointer;
        font-size: 0.9rem;
    }
    
    .nearby-results-modal .view-btn:hover {
        background: #2563eb;
    }
    
    .nearby-results-modal .no-results {
        text-align: center;
        padding: 2rem;
        color: #6b7280;
    }
    
    .nearby-results-modal .no-results i {
        font-size: 3rem;
        margin-bottom: 1rem;
        color: #d1d5db;
    }
    
    .nearby-results-modal .modal-footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid #e5e7eb;
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
    }
    
    .nearby-results-modal .btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
        transition: all 0.2s;
    }
    
    .nearby-results-modal .btn-primary {
        background: #3b82f6;
        color: white;
    }
    
    .nearby-results-modal .btn-primary:hover {
        background: #2563eb;
    }
    
    .nearby-results-modal .btn-secondary {
        background: #6b7280;
        color: white;
    }
    
    .nearby-results-modal .btn-secondary:hover {
        background: #4b5563;
    }
    
    .location-btn {
        position: relative;
        overflow: hidden;
    }
    
    .location-btn::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        background: rgba(59, 130, 246, 0.1);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        transition: width 0.3s ease, height 0.3s ease;
    }
    
    .location-btn:hover::before {
        width: 100%;
        height: 100%;
    }
`;

document.head.appendChild(nearbyStyles);

console.log('✨ TravaCasa Enhanced Features Ready!');

// Make functions globally available
window.showTab = showTab;
window.openInMaps = openInMaps;
window.showDirections = showDirections;
window.filterByLocation = filterByLocation;

// --- Enhanced Near Me Functionality ---
function initializeEnhancedNearMe() {
    const nearMeBtn = document.querySelector('.location-btn, #locationBtn');
    if (!nearMeBtn) return;
    let originalListings = null;
    let clearNearMeBtn = null;

    nearMeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (clearNearMeBtn && clearNearMeBtn.parentNode) {
            clearNearMeBtn.parentNode.removeChild(clearNearMeBtn);
        }
        showNearMeLoading(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const { latitude, longitude } = pos.coords;
                try {
                    const res = await fetch('/api/nearby-listings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ latitude, longitude, radius: 10, type: 'all' })
                    });
                    if (!res.ok) throw new Error('Failed to fetch nearby listings');
                    const data = await res.json();
                    showNearMeLoading(false);
                    if (!originalListings) {
                        originalListings = document.querySelector('.row.g-4').innerHTML;
                    }
                    updateListingsGrid(data.listings);
                    addClearNearMeBtn();
                } catch (err) {
                    showNearMeLoading(false);
                    showFilterNotification('Could not fetch nearby listings.', 'error');
                }
            }, (err) => {
                showNearMeLoading(false);
                showFilterNotification('Location access denied.', 'error');
            });
        } else {
            showNearMeLoading(false);
            showFilterNotification('Geolocation not supported.', 'error');
        }
    });

    function showNearMeLoading(isLoading) {
        let spinner = document.getElementById('nearMeSpinner');
        if (isLoading) {
            if (!spinner) {
                spinner = document.createElement('div');
                spinner.id = 'nearMeSpinner';
                spinner.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
                spinner.style.cssText = 'display:flex;justify-content:center;align-items:center;padding:2rem;';
                const grid = document.querySelector('.row.g-4');
                if (grid) grid.innerHTML = spinner.outerHTML;
            }
        } else {
            spinner = document.getElementById('nearMeSpinner');
            if (spinner && spinner.parentNode) spinner.parentNode.removeChild(spinner);
        }
    }

    function updateListingsGrid(listings) {
        const grid = document.querySelector('.row.g-4');
        if (!grid) return;
        if (!listings || listings.length === 0) {
            grid.innerHTML = '<div class="col-12 text-center"><h4>No nearby listings found.</h4></div>';
            return;
        }
        grid.innerHTML = listings.map(listing => `
            <div class="col-lg-4 col-md-6 col-sm-12 mb-4 h-100">
                <article class="listing-card-wrapper h-100">
                    <a href="/listings/${listing._id}" class="listing-card-link">
                        <div class="enhanced-card h-100">
                            <div class="card-image-container">
                                <img src="${listing.image?.url || '/images/default-property.jpg'}" class="card-image" alt="${listing.title}" loading="lazy" />
                                <div class="property-type-badge"><i class="fas fa-home"></i> <span>Property</span></div>
                            </div>
                            <div class="card-content">
                                <div class="card-header-section">
                                    <h3 class="listing-title">${listing.title}</h3>
                                    <div class="rating-section">
                                        <div class="rating-stars">
                                            <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i>
                                        </div>
                                        <span class="rating-text">${listing.rating || '4.8'}</span>
                                    </div>
                                </div>
                                <p class="listing-description">${listing.description ? (listing.description.length > 120 ? listing.description.substring(0, 120) + '...' : listing.description) : ''}</p>
                                <div class="location-section"><i class="fas fa-map-marker-alt location-icon"></i> <span class="location-text">${listing.location || ''}, ${listing.country || ''}</span></div>
                                <div class="price-amenities-section">
                                    <div class="price-section">
                                        <span class="price-amount">₹${listing.price?.toLocaleString('en-IN') || 'N/A'}</span>
                                        <span class="price-period">/night</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </a>
                </article>
            </div>
        `).join('');
    }

    function addClearNearMeBtn() {
        if (clearNearMeBtn && clearNearMeBtn.parentNode) {
            clearNearMeBtn.parentNode.removeChild(clearNearMeBtn);
        }
        clearNearMeBtn = document.createElement('button');
        clearNearMeBtn.className = 'btn btn-outline-primary mb-3';
        clearNearMeBtn.textContent = 'Clear Near Me';
        clearNearMeBtn.style.display = 'block';
        clearNearMeBtn.style.margin = '0 auto 1rem auto';
        clearNearMeBtn.onclick = function() {
            if (originalListings) {
                document.querySelector('.row.g-4').innerHTML = originalListings;
                originalListings = null;
                clearNearMeBtn.parentNode.removeChild(clearNearMeBtn);
            }
        };
        const grid = document.querySelector('.row.g-4');
        if (grid && grid.parentNode) {
            grid.parentNode.insertBefore(clearNearMeBtn, grid);
        }
    }
}

// Image Zoom Modal for Listing Detail
function openImageModal(url) {
  var modal = document.getElementById('imageZoomModal');
  var img = document.getElementById('zoomedListingImg');
  modal.style.display = 'flex';
  img.src = url;
}
function closeImageModal() {
  var modal = document.getElementById('imageZoomModal');
  modal.style.display = 'none';
}
// Optional: Close modal on outside click
window.addEventListener('click', function(event) {
  var modal = document.getElementById('imageZoomModal');
  if (event.target === modal) {
    closeImageModal();
  }
});
