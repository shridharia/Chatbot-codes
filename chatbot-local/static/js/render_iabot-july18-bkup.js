
var SITE_KEY = "6LeG1VYrAAAAAKHi-bXkp7U1qUVxePNR4HlObA4-";
var API_URL = window.location.hostname === "localhost" ? "http://localhost:8000" : "https://impact-agents.ai";
var type_mode = false

async function loadChatbotContent() {
    try {
        const response = await fetch(API_URL + '/ia_chatbot_embed', {
            method: 'GET',
            headers: {
                'Content-Type': 'text/html',
            },
        });
        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }
            throw new Error('Failed to fetch chatbot content');
        }
        const htmlContent = await response.text();
        const container = document.getElementById('chatbot-container');
        if (container) {
            container.innerHTML = htmlContent;

            // Re-execute scripts in the fetched HTML
            const scripts = container.getElementsByTagName('script');
            for (let script of scripts) {
                const newScript = document.createElement('script');
                if (script.src) {
                    newScript.src = script.src;
                } else {
                    newScript.textContent = script.textContent;
                }
                document.body.appendChild(newScript);
                // Remove the original script to prevent duplicate execution
                script.remove();
            }


            const chatbotTooltip = document.getElementById('iaChatbotTooltip');
            const chatbotTooltipIcon = document.getElementById('iaChatbotTooltipIcon');
            const closeTooltipBtn = chatbotTooltip.querySelector('.ia-tooltip-close-btn');
            const floatBtn = document.getElementById('iaFloatBtn');

            // Function to show tooltip
            function showTooltip() {
                chatbotTooltip.style.display = 'block';
                chatbotTooltipIcon.style.display = 'flex';
                setTimeout(() => {
                    chatbotTooltip.classList.add('show');
                    chatbotTooltipIcon.classList.add('show');
                }, 100);
            }

            // Function to hide tooltip
            function hideTooltip() {
                chatbotTooltip.classList.remove('show');
                chatbotTooltipIcon.classList.remove('show');
                setTimeout(() => {
                    chatbotTooltip.style.display = 'none';
                    chatbotTooltipIcon.style.display = 'none';
                }, 300);
                // Mark tooltip as closed in session storage
                sessionStorage.setItem('chatbotTooltipClosed', 'true');
            }

            // Show tooltip only if it hasn't been closed in this session
            if (sessionStorage.getItem('chatbotTooltipClosed') !== 'true') {
                setTimeout(() => {
                    chatbotTooltip.style.opacity = 0;
                    chatbotTooltipIcon.style.opacity = 0;
                    chatbotTooltip.style.display = 'block';
                    chatbotTooltipIcon.style.display = 'flex';
                    setTimeout(() => {
                        chatbotTooltip.classList.add('show');
                        chatbotTooltipIcon.classList.add('show');
                        chatbotTooltip.style.transition = 'opacity 0.6s';
                        chatbotTooltipIcon.style.transition = 'opacity 0.6s';
                        chatbotTooltip.style.opacity = 1;
                        chatbotTooltipIcon.style.opacity = 1;
                    }, 50);
                }, 2000);
            }

            // Handle close button click
            closeTooltipBtn.addEventListener('click', hideTooltip);

            // Handle direct chat icon click
            floatBtn.addEventListener('click', function() {
                hideTooltip();
            });

            // Initialize ImpactAnalyticsChatbot after HTML is injected
            window.iaChatbot = new ImpactAnalyticsChatbot();

            // Run reCAPTCHA logic after chatbot initialization
            if (typeof grecaptcha !== 'undefined') {
                grecaptcha.ready(function() {
                    grecaptcha.execute(SITE_KEY, { action: 'submit' }).then(function(token) {
                        $.ajax({
                            url: API_URL + '/api/generate_captcha_token',
                            type: 'POST',
                            contentType: 'application/json',
                            data: JSON.stringify({ token: token }),
                            headers: {
                                'Accept': 'application/json'
                            },
                            success: function(response) {
                                console.log('reCAPTCHA verification successful:', response.message);
                                localStorage.setItem('token', response.token);
                                $("#iaRecaptchaError").hide();
                                $("#iaFloatBtn").show();
                                document.getElementById("iaFloatBtn").style.setProperty("display", "flex", "important");
                            },
                            error: function(xhr, status, error) {
                                console.error('reCAPTCHA verification failed:', error);
                                $("#iaRecaptchaError").show();
                                $("#iaFloatBtn").hide();
                            }
                        });
                    });
                });
            } else {
                console.error('reCAPTCHA library not loaded');
            }

            // Make tooltip and tooltip icon clickable to open chat
            chatbotTooltip.addEventListener('click', function(e) {
                if (e.target.closest('.ia-tooltip-close-btn')) return; // Ignore close btn
                chatbotTooltip.style.display = 'none';
                chatbotTooltipIcon.style.display = 'none';
                const widget = document.getElementById('iaChatbotWidget');
                if (widget) widget.classList.remove('minimized');
            });
            chatbotTooltipIcon.addEventListener('click', function() {
                chatbotTooltip.style.display = 'none';
                chatbotTooltipIcon.style.display = 'none';
                const widget = document.getElementById('iaChatbotWidget');
                if (widget) widget.classList.remove('minimized');
            });
        } else {
            console.error('Container with ID "chatbot-container" not found');
        }
    } catch (error) {
        console.error('Error loading chatbot content:', error);
    }
}

// Load content when the host website's DOM is loaded
document.addEventListener('DOMContentLoaded', loadChatbotContent);

// ImpactAnalyticsChatbot class
       class ImpactAnalyticsChatbot {
           constructor() {
               this.widget = document.getElementById('iaChatbotWidget');
               this.floatBtn = document.getElementById('iaFloatBtn');
               this.chatArea = document.getElementById('iaChatArea');
               this.messageInput = document.getElementById('iaMessageInput');
               this.sendBtn = document.getElementById('iaSendBtn');
               this.minimizeBtn = document.getElementById('iaMinimizeBtn');
               this.header = document.getElementById('iaChatbotHeader');
               this.isMinimized = false;
               this.isTyping = false;
               this.apiBaseUrl = this.getApiBaseUrl();
               this.latestExecutionId = null; // Store latest execution_id
               this.sessionReset = false; // Track if session reset
               this.botMessageCount = 0; // Track number of bot messages rendered
               this.init();
           }
           resetChat() {
               this.resetSessionMemory();
               if (this.chatArea) {
                   this.chatArea.innerHTML = '';
                   // Optionally, add a welcome message again:
                   const welcomeMessages = `
                        <div class="ia-message bot">
                            <div class="ia-message-avatar">
                                <img src="https://www.impactanalytics.co/wp-content/uploads/2025/06/IA-Chat-logo.webp" alt="IA Bot" style="width:26px;height:26px;" />
                            </div>
                            <div class="ia-message-content">
                                Hi there! I'm your IA Digital Agent – here to help you know more about us.
                            </div>
                        </div>
                        <div class="ia-message bot">
                            <div class="ia-message-content" style="margin-left: 40px;">
                                How can I assist you today?
                            </div>
                        </div>
                    `;
                    this.chatArea.innerHTML = welcomeMessages;
               }
           }
	async resetSessionMemory() {
        try {
            const response = await fetch(API_URL + '/reset-session', {
                method: 'GET'
            });
    
            if (!response.ok) {
                throw new Error('Failed to reset session');
            }
    
            const data = await response.json();
            if (data.new_session_id) {
                localStorage.setItem('session_id', data.new_session_id);
                console.log('New session ID stored:', data.new_session_id);
            }
            this.sessionReset = true;
        } catch (e) {
            console.error('Session reset failed', e);
        }
    }
           async handleFeedback(btn, type) {
               // Find the parent .ia-feedback div
               const feedbackDiv = btn.closest('.ia-feedback');
               if (!feedbackDiv) return;
               // Get both buttons
               const likeBtn = feedbackDiv.querySelector('.ia-like-btn');
               const dislikeBtn = feedbackDiv.querySelector('.ia-dislike-btn');
               // Set active state
               if (type === 'like') {

                    likeBtn.classList.add('active');

                    dislikeBtn.classList.remove('active');

                } else {

                    dislikeBtn.classList.add('active');

                    likeBtn.classList.remove('active');

                }

                // Both buttons remain enabled for changing feedback

                likeBtn.disabled = false;

                dislikeBtn.disabled = false;
               // Send feedback to backend if execution_id exists
               if (this.latestExecutionId) {
                   try {
                       await fetch(API_URL + '/api/session/execution-feedback', {
                           method: 'POST',
                           headers: {
                               'Content-Type': 'application/json',
                               'authorization': 'Bearer ' + localStorage.getItem('token')
                           },
                           body: JSON.stringify({
                               execution_id: this.latestExecutionId,
                               feedback: type === 'like' ? 'good' : 'bad',
			       session_id: localStorage.getItem('session_id')
                           })
                       });
                   } catch (e) {
                       console.error('Feedback API error', e);
                   }
               }
           }
           getApiBaseUrl() {
               // Get the current protocol (http: or https:)
               const protocol = window.location.protocol;
               // Get the hostname (e.g., localhost, example.com)
               const hostname = window.location.hostname;
               // Get the port if it exists
               const port = window.location.port ? `:${window.location.port}` : '';
               
               return `${protocol}//${hostname}${port}`;
           }
           init() {
               // Event listeners
               this.sendBtn.addEventListener('click', () => this.sendMessage());
               this.messageInput.addEventListener('keypress', (e) => {
                   if (e.key === 'Enter' && !e.shiftKey) {
                       e.preventDefault();
                       this.sendMessage();
                   }
               });
              
               this.minimizeBtn.addEventListener('click', (e) => {
                   e.stopPropagation();
                   this.toggleMinimize();
               });
              
               this.header.addEventListener('click', () => {
                   if (this.isMinimized) this.toggleMinimize();
               });
              
               this.floatBtn.addEventListener('click', () => this.toggleMinimize());

               // Start with chat collapsed (minimized), float button visible
               this.isMinimized = true;
               this.widget.classList.add('minimized');
               this.floatBtn.classList.add('show');
               
           }
           toggleMinimize() {
               this.isMinimized = !this.isMinimized;
               
              
               if (this.isMinimized) {
                   this.widget.classList.add('minimized');
                   this.floatBtn.classList.add('show');
                   this.minimizeBtn.innerHTML = '+';
               } else {
                   this.widget.classList.remove('minimized');
                   this.floatBtn.classList.remove('show');
                   this.minimizeBtn.innerHTML = '−';
                   this.messageInput.focus();
                   this.autoGrowTextarea();
                   if (!type_mode) {
                        type_mode = true;
                        this.typeInputs();
                    }
               }
           }
           async sendMessage() {
               const message = this.messageInput.value.trim();
               if (!message || this.isTyping) return;
               // On first user message, reset session memory
               if (!this.sessionReset) {
                   await this.resetSessionMemory();
               }
               // Add user message
               this.addMessage(message, 'user');
               this.messageInput.value = '';

               // Reset textarea height to original
               this.messageInput.style.height = 'auto';

               // Show typing indicator
               this.showTypingIndicator();
               try {
                   // Replace this with your actual API call
                   const response = await this.callChatbotAPI(message);
                   this.hideTypingIndicator();
                   // Store execution_id for feedback
                   if (response && response.execution_id) {
                       this.latestExecutionId = response.execution_id;
                   }
                   // Use the correct text for the bot message
                   let botText = '';
                   if (response.type === 'text' && response.content && response.content.text) {
                       botText = response.content.text;
                   } else if (typeof response === 'string') {
                       botText = response;
                   } else {
                       botText = 'Sorry, I encountered an error. Please try again.';
                   }
                   this.addMessage(botText, 'bot');
               } catch (error) {
                   this.hideTypingIndicator();
                   this.addMessage('Sorry, I encountered an error. Please try again.', 'bot');
               }
           }
           addMessage(content, type) {
               const messageDiv = document.createElement('div');
               messageDiv.className = `ia-message ${type}`;

               // Always add avatar for bot messages
               if (type === 'bot') {
                   const avatarDiv = document.createElement('div');
                   avatarDiv.className = 'ia-message-avatar';
                   avatarDiv.innerHTML = '<img src="https://www.impactanalytics.co/wp-content/uploads/2025/05/chatbpt-icon.png" alt="IA Bot" style="width:26px;height:26px;" />';
                   messageDiv.appendChild(avatarDiv);
               }

               // Track number of bot messages rendered
               if (!this.botMessageCount) this.botMessageCount = 0;

               if (type === 'bot') {
                   const contentRow = document.createElement('div');
                   contentRow.className = 'ia-message-content-row';

                   const messageContent = document.createElement('div');
                   messageContent.className = 'ia-message-content';

                   // Check if the message contains sources
                   if (content.includes('Sources:')) {
                       const parts = this.extractSourcesFromContent(content);
                       messageContent.innerHTML = this.formatLinks(parts.mainContent);
                       if (parts.sources.length > 0) {
                           const sourcesContainer = document.createElement('div');
                           sourcesContainer.className = 'source-links-container';
                           const sourcesTitle = document.createElement('div');
                           sourcesTitle.className = 'source-links-title';
                           sourcesTitle.innerHTML = '<i class="fas fa-link"></i> Sources <i class="fas fa-angle-right source-toggle-icon"></i>';
                           sourcesContainer.appendChild(sourcesTitle);
                           const sourcesList = document.createElement('div');
                           sourcesList.className = 'source-links-list';
                           parts.sources.forEach(source => {
                               const sourceLink = document.createElement('a');
                               sourceLink.className = 'source-link-item';
                               sourceLink.href = source;
                               sourceLink.target = '_blank';
                               sourceLink.rel = 'noopener noreferrer';
                               let linkText = source.replace(/https?:\/\//, '');
                               if (linkText.length > 35) {
                                   linkText = linkText.substring(0, 35) + '...';
                               }
                               sourceLink.innerHTML = `<i class="fas fa-external-link-alt"></i> ${linkText}`;
                               sourcesList.appendChild(sourceLink);
                           });

                           // Append the sourcesList to the container!
                           sourcesContainer.appendChild(sourcesList);

                           // Toggle visibility on title click
                           sourcesTitle.style.cursor = 'pointer';
                           sourcesTitle.addEventListener('click', () => {
                               sourcesList.classList.toggle('open');
                               // Toggle icon direction
                               const icon = sourcesTitle.querySelector('.source-toggle-icon');
                               if (sourcesList.classList.contains('open')) {
                                   icon.classList.remove('fa-angle-right');
                                   icon.classList.add('fa-angle-down');
                               } else {
                                   icon.classList.remove('fa-angle-down');
                                   icon.classList.add('fa-angle-right');
                               }
                               // Scroll to bottom after expanding/collapsing sources
                               setTimeout(() => {
                                   this.chatArea.scrollTo({
                                       top: this.chatArea.scrollHeight,
                                       behavior: 'smooth'
                                   });
                               }, 400); // Match the CSS transition duration
                           });

                           messageContent.appendChild(sourcesContainer);
                       }
                   } else {
                       messageContent.innerHTML = this.formatLinks(content);
                   }

                   contentRow.appendChild(messageContent);

                   // Only add actions row if this is not a welcome message
                   const isWelcome = content.trim() === "Hi there! I'm your IA Digital Agent – here to help you know more about us." || content.trim() === "How can I assist you today?";
                   if (!isWelcome) {
                       const actionsRow = document.createElement('div');
                       actionsRow.className = 'ia-message-actions-row';

                       const feedbackDiv = document.createElement('div');
                       feedbackDiv.className = 'ia-feedback';
                       feedbackDiv.innerHTML = `
                           <button class="ia-like-btn" title="Like" onclick="window.iaChatbot && window.iaChatbot.handleFeedback(this, 'like')"><i class="fas fa-thumbs-up"></i></button>
                           <button class="ia-dislike-btn" title="Dislike" onclick="window.iaChatbot && window.iaChatbot.handleFeedback(this, 'dislike')"><i class="fas fa-thumbs-down"></i></button>
                       `;
                       actionsRow.appendChild(feedbackDiv);

                       const timestampDiv = document.createElement('div');
                       timestampDiv.className = 'ia-message-timestamp';
                       const now = new Date();
                       let hours = now.getHours();
                       let minutes = now.getMinutes();
                       if (minutes < 10) minutes = '0' + minutes;
                       timestampDiv.innerText = `${hours}:${minutes}`;
                       actionsRow.appendChild(timestampDiv);

                       contentRow.appendChild(actionsRow);
                   }
                   messageDiv.appendChild(contentRow);
                   this.chatArea.appendChild(messageDiv);
                   messageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
                   this.botMessageCount++;
                   return;
               }

               // For user messages, render as before
               const messageContent = document.createElement('div');
               messageContent.className = 'ia-message-content';
               messageContent.innerHTML = content;
               messageDiv.appendChild(messageContent);
               this.chatArea.appendChild(messageDiv);
               const metaRow = document.createElement('div');
               metaRow.className = 'ia-meta-row';
               metaRow.style.justifyContent = 'flex-end'; // Right align for user
               const timestampDiv = document.createElement('div');
               timestampDiv.className = 'ia-message-timestamp';
               const now = new Date();
               let hours = now.getHours();
               let minutes = now.getMinutes();
               if (minutes < 10) minutes = '0' + minutes;
               timestampDiv.innerText = `${hours}:${minutes}`;
               metaRow.appendChild(timestampDiv);
               this.chatArea.appendChild(metaRow);
               this.scrollToBottom();
               return;
           }
            
           extractSourcesFromContent(content) {
               // Check if the content contains sources
               if (content.includes('Sources:')) {
                   // Split the content at 'Sources:'
                   const parts = content.split('Sources:');
                   const mainContent = parts[0].trim();
                   
                   // Extract URLs from the sources part
                   const sourcesText = parts[1].trim();
                   const urlRegex = /(https?:\/\/[^\s,]+)/g;
                   const sources = [];
                   
                   let match;
                   while ((match = urlRegex.exec(sourcesText)) !== null) {
                       sources.push(match[1]);
                   }
                   
                   return { mainContent, sources };
               }
               
               // If no sources, return the original content
               return { mainContent: content, sources: [] };
           }
           showTypingIndicator() {
               if (this.isTyping) return;
              
               this.isTyping = true;
               const typingDiv = document.createElement('div');
               typingDiv.className = 'ia-message bot';
               typingDiv.id = 'typingIndicator';
              
               typingDiv.innerHTML = `
                   <img src="https://www.impactanalytics.co/wp-content/uploads/2025/05/chatbpt-icon.png" alt="IA Bot" style="width:26px;height:26px;" />
                   <div class="ia-message-content">
                       <div class="ia-typing-indicator">
                           <div class="ia-typing-dot"></div>
                           <div class="ia-typing-dot"></div>
                           <div class="ia-typing-dot"></div>
                       </div>
                   </div>
               `;
              
               this.chatArea.appendChild(typingDiv);
               this.scrollToBottom();
           }
           hideTypingIndicator() {
               const typingIndicator = document.getElementById('typingIndicator');
               if (typingIndicator) {
                   typingIndicator.remove();
               }
               this.isTyping = false;
           }
           scrollToBottom() {
               this.chatArea.scrollTop = this.chatArea.scrollHeight;
           }
           // Replace this method with your actual API integration
           async callChatbotAPI(message, retryCount = 0) {
            try {
                const response = await fetch(`${API_URL}/api/ia_chatbot`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'authorization': 'Bearer ' + localStorage.getItem('token')
                    },
                    body: JSON.stringify({ userInput: message, session_id: localStorage.getItem('session_id') })
                });
                if (response.status === 401) {
                    console.warn('401 Unauthorized. Re-executing reCAPTCHA...');
                    return await this.regenerateCaptchaAndRetry(message);
                }
                if (!response.ok) {
                    throw new Error('API request failed');
                }
                const data = await response.json();
                if (data.type === 'error' && retryCount < 1) {
                    console.warn('Error response received. Retrying API call...');
                    return await this.callChatbotAPI(message, retryCount + 1);
                }
                if (data.type === 'text' && data.content && data.content.text) {
                    if (data.content.text.toLowerCase().startsWith('thought') && retryCount < 1) {
                        console.warn('Response starts with "thought". Retrying API call...');
                        return await this.callChatbotAPI(message, retryCount + 1);
                    }
                    this.latestExecutionId = data.execution_id || null;
                    localStorage.setItem('session_id', data.session_id);
                    return data.content.text;
                } else {
                    throw new Error('Invalid response format');
                }
            } catch (error) {
                console.error('Error calling chatbot API:', error);
                throw error;
            }
        }
        // Auto-grow textarea for message input

        autoGrowTextarea() {

            var textarea = document.getElementById('iaMessageInput');

            if (textarea) {
                textarea.addEventListener('input', function() {

                    this.style.height = '36px';

                    this.style.height = (this.scrollHeight) + 'px';

                });
            }

        }
        typeInputs(){
            let textarea = document.getElementById('iaMessageInput');
            const sentences = [
                "How Pricesmart works?",
                "Ask me about Impact Analytics",
                "How Agentic AI helps businesses?",
                "What is Assortsmart?",
                "How can I book a SizeSmart demo?",
                "Type your question here.."
            ];

            let state = {
                currentSentenceIndex: 0,
                currentCharIndex: 0,
                isDeleting: false,
                isAnimating: true
            };

            const timing = {
                typingSpeed: () => 80 + Math.random() * 40, // Randomize for natural feel
                deletingSpeed: 40,
                pauseDuration: 1200,
                postDeletePause: 300 // Brief pause after deletion
            };

            function updatePlaceholder() {
                const currentSentence = sentences[state.currentSentenceIndex];
                textarea.placeholder = currentSentence.slice(0, state.currentCharIndex) + '|';
            }

            function typeAnimation() {
                if (!state.isAnimating) return;

                const currentSentence = sentences[state.currentSentenceIndex];

                if (!state.isDeleting) {
                    // Typing phase
                    if (state.currentCharIndex <= currentSentence.length) {
                        updatePlaceholder();
                        state.currentCharIndex++;
                        setTimeout(() => requestAnimationFrame(typeAnimation), timing.typingSpeed());
                    } else {
                        // Pause before deleting
                        setTimeout(() => {
                            state.isDeleting = true;
                            requestAnimationFrame(typeAnimation);
                        }, timing.pauseDuration);
                    }
                } else {
                    // Deleting phase
                    if (state.currentCharIndex >= 0) {
                        updatePlaceholder();
                        state.currentCharIndex--;
                        setTimeout(() => requestAnimationFrame(typeAnimation), timing.deletingSpeed);
                    } else {
                        // Move to next sentence after a brief pause
                        state.isDeleting = false;
                        state.currentSentenceIndex = (state.currentSentenceIndex + 1) % sentences.length;
                        setTimeout(() => requestAnimationFrame(typeAnimation), timing.postDeletePause);
                    }
                }
            }

            // Start animation
            function startAnimation() {
                state.isAnimating = true;
                requestAnimationFrame(typeAnimation);
            }

            // Stop animation
            function stopAnimation() {
                state.isAnimating = false;
                state.currentCharIndex = 0;
                state.isDeleting = false;
            }

            // Initialize event listeners
            document.addEventListener('DOMContentLoaded', startAnimation);

            textarea.addEventListener('focus', () => {
                stopAnimation();
                textarea.placeholder = 'Type your message here...';
            });

            textarea.addEventListener('blur', () => {
                if (!textarea.value.trim()) {
                    stopAnimation();
                    state.currentSentenceIndex = 0;
                    startAnimation();
                }
            });
        }
    async regenerateCaptchaAndRetry(message) {
        return new Promise((resolve, reject) => {
            if (typeof grecaptcha === 'undefined') {
                console.error('reCAPTCHA is not loaded');
                reject('reCAPTCHA unavailable');
                return;
            }
            grecaptcha.ready(() => {
                grecaptcha.execute(SITE_KEY, { action: 'submit' })
                    .then(token => {
                        $.ajax({
                            url: API_URL + '/api/generate_captcha_token',
                            type: 'POST',
                            contentType: 'application/json',
                            data: JSON.stringify({ token: token }),
                            headers: { 'Accept': 'application/json' },
                            success: async (response) => {
                                localStorage.setItem('token', response.token);
                                $("#iaRecaptchaError").hide();
                                $("#iaFloatBtn").show();
                                try {
                                    const retryResponse = await this.callChatbotAPI(message);
                                    resolve(retryResponse);
                                } catch (retryError) {
                                    reject(retryError);
                                }
                            },
                            error: (xhr, status, error) => {
                                console.error('reCAPTCHA verification failed:', error);
                                $("#iaRecaptchaError").show();
                                $("#iaFloatBtn").hide();
                                reject(error);
                            }
                        });
                    });
            });
        });
    }
    addBotMessage(message) {
        this.addMessage(message, 'bot');
    }
    handleSuggestion(suggestion) {
        this.messageInput.value = suggestion;
        this.sendMessage();
    }
    formatLinks(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, url => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
    }
}
function handleSuggestion(text) {
    if (window.iaChatbot) {
        window.iaChatbot.handleSuggestion(text);
    }
}