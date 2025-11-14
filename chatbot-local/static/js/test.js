<script>
    document.addEventListener('DOMContentLoaded', function() {
           window.iaChatbot = new ImpactAnalyticsChatbot();

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
               setTimeout(showTooltip, 2000);
           }

           // Handle close button click
           closeTooltipBtn.addEventListener('click', hideTooltip);

           // Handle direct chat icon click
           floatBtn.addEventListener('click', function() {
               hideTooltip();
           });

           // Handle tooltip click (except close button)
           chatbotTooltip.addEventListener('click', function(e) {
               if (e.target.closest('.ia-tooltip-close-btn')) return; // Ignore close btn
               hideTooltip();
               // Open chatbot if minimized
               if (window.iaChatbot && window.iaChatbot.isMinimized) {
                   window.iaChatbot.toggleMinimize();
               }
           });

           // Handle tooltip icon click
           chatbotTooltipIcon.addEventListener('click', function() {
               hideTooltip();
               if (window.iaChatbot && window.iaChatbot.isMinimized) {
                   window.iaChatbot.toggleMinimize();
               }
           });
       });

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
               this.init();
           }
           resetChat() {
               this.resetSessionMemory();
               if (this.chatArea) {
                   this.chatArea.innerHTML = '';
                   // Add welcome messages with avatar
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
                           <div class="ia-message-avatar">
                               <img src="https://www.impactanalytics.co/wp-content/uploads/2025/05/chatbpt-icon.png" alt="IA Bot" style="width:26px;height:26px;" />
                           </div>
                           <div class="ia-message-content" style="margin-left: 0;">
                               How can I assist you today?
                           </div>
                       </div>
                   `;
                   this.chatArea.innerHTML = welcomeMessages;
               }
           }
           async resetSessionMemory() {
               try {
                   await fetch('https://impact-agents.ai/reset-session', { method: 'GET' });
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
               // Set active state and allow toggling
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
                       await fetch('https://impact-agents.ai/api/session/execution-feedback', {
                           method: 'POST',
                           headers: {
                               'Content-Type': 'application/json',
                               'authorization': 'Bearer ' + localStorage.getItem('token')
                           },
                           body: JSON.stringify({
                               execution_id: this.latestExecutionId,
                               feedback: type === 'like' ? 'good' : 'bad'
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
                   // Error handling: show friendly error if backend returns error
                   if (response && response.error) {
                       this.addMessage('Sorry, something went wrong. Please try again later.', 'bot');
                       return;
                   }
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

               // Always add avatar for bot
               if (type === 'bot') {
                   const avatarDiv = document.createElement('div');
                   avatarDiv.className = 'ia-message-avatar';
                   avatarDiv.innerHTML = '<img src="https://www.impactanalytics.co/wp-content/uploads/2025/05/chatbpt-icon.png" alt="IA Bot" style="width:26px;height:26px;" />';
                   messageDiv.appendChild(avatarDiv);
               }

               if (type === 'bot') {
                   const contentWrapper = document.createElement('div');
                   const messageContent = document.createElement('div');
                   messageContent.className = 'ia-message-content';
                   messageContent.innerHTML = this.formatLinks(content);
                   contentWrapper.appendChild(messageContent);

                   // Actions row: feedback + timestamp
                   const actionsRow = document.createElement('div');
                   actionsRow.className = 'ia-message-actions-row';

                   // Feedback
                   const isWelcomeMessage = content.includes("Hello! I'm the chatbot for Impact Analytics") || content.includes("How can I assist you today?");
                   if (!isWelcomeMessage) {
                       const feedbackDiv = document.createElement('div');
                       feedbackDiv.className = 'ia-feedback';
                       feedbackDiv.innerHTML = `
                           <button class="ia-like-btn" title="Like" onclick="window.iaChatbot && window.iaChatbot.handleFeedback(this, 'like')"><i class="fas fa-thumbs-up"></i></button>
                           <button class="ia-dislike-btn" title="Dislike" onclick="window.iaChatbot && window.iaChatbot.handleFeedback(this, 'dislike')"><i class="fas fa-thumbs-down"></i></button>
                       `;
                       actionsRow.appendChild(feedbackDiv);
                   } else {
                       actionsRow.appendChild(document.createElement('div'));
                   }

                   // Timestamp
                   const metaRow = document.createElement('div');
                   metaRow.className = 'ia-meta-row';
                   const timestampDiv = document.createElement('div');
                   timestampDiv.className = 'ia-message-timestamp';
                   const now = new Date();
                   let hours = now.getHours();
                   let minutes = now.getMinutes();
                   if (minutes < 10) minutes = '0' + minutes;
                   timestampDiv.innerText = `${hours}:${minutes}`;
                   metaRow.appendChild(timestampDiv);
                   actionsRow.appendChild(metaRow);

                   contentWrapper.appendChild(actionsRow);
                   messageDiv.appendChild(contentWrapper);
                   this.chatArea.appendChild(messageDiv);
               } else {
                   // For user messages, render timestamp outside the bubble
                   const messageContent = document.createElement('div');
                   messageContent.className = 'ia-message-content';
                   messageContent.innerHTML = content;
                   messageDiv.appendChild(messageContent);
                   this.chatArea.appendChild(messageDiv);
                   const metaRow = document.createElement('div');
                   metaRow.className = 'ia-meta-row';
                   metaRow.style.justifyContent = 'flex-end';
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
               }
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
           async callChatbotAPI(message) {
               try {
                   const response = await fetch(`${this.apiBaseUrl}/api/ia_chatbot`, {
                       method: 'POST',
                       headers: {
                           'Content-Type': 'application/json',
                           'authorization': 'Bearer ' + localStorage.getItem('token')
                       },
                       body: JSON.stringify({
                           userInput: message
                       })
                   });
                   if (!response.ok) {
                       throw new Error('API request failed');
                   }
                   const data = await response.json();
                   // Return the full response object for further processing
                   return data;
               } catch (error) {
                   console.error('Error calling chatbot API:', error);
                   throw error;
               }
           }
           // Public method to add custom messages (for API integration)
           addBotMessage(message) {
               this.addMessage(message, 'bot');
           }
           // Public method to handle suggestions
           handleSuggestion(suggestion) {
               this.messageInput.value = suggestion;
               this.sendMessage();
           }
           formatLinks(text) {
               // Regular expression to match URLs
               const urlRegex = /(https?:\/\/[^\s]+)/g;
               // Replace URLs with anchor tags
               return text.replace(urlRegex, url => {
                   return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
               });
           }
       }
       // Global function for suggestion buttons
       function handleSuggestion(text) {
           if (window.iaChatbot) {
               window.iaChatbot.handleSuggestion(text);
           }
       }
       // Auto-grow textarea for message input
       document.addEventListener('DOMContentLoaded', function() {
           var textarea = document.getElementById('iaMessageInput');
           if (textarea) {
               textarea.addEventListener('input', function() {
                   this.style.height = '36px';
                   this.style.height = (this.scrollHeight) + 'px';
               });
           }
       });
   </script>
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
    <script src="https://www.google.com/recaptcha/api.js?render=6Ld_S1QrAAAAAElawJOaouBLYoeULXXPCfN1h1vu"></script>
    <script>
    // Hide float button until reCAPTCHA passes
    $(document).ready(function() {
        $("#iaFloatBtn").hide();
        $("#iaRecaptchaError").hide();
    });
    grecaptcha.ready(function() {
        grecaptcha.execute('6Ld_S1QrAAAAAElawJOaouBLYoeULXXPCfN1h1vu', {action: 'submit'}).then(function(token) {
            $.ajax({
                url: '/api/generate_captcha_token',
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
                },
                error: function(xhr, status, error) {
                    console.error('reCAPTCHA verification failed:', error);
                    $("#iaRecaptchaError").show();
                    $("#iaFloatBtn").hide();
                }
            });
        });
    });
   </script>