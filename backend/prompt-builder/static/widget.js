/** Kapso Conversation Bar v3 — Persistent bottom bar with expanding chat panel. Zero deps. */
(function () {
  "use strict";

  // Prevent double-init
  if (window.__kapsoWidgetLoaded) return;
  window.__kapsoWidgetLoaded = true;

  // Config from script tag
  var scriptTag =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && scripts[i].src.indexOf("widget.js") !== -1)
          return scripts[i];
      }
      return null;
    })();

  var gc = window.__kapsoConfig || {};

  function attr(name, fallback) {
    return scriptTag && scriptTag.getAttribute(name)
      ? scriptTag.getAttribute(name)
      : fallback;
  }

  var CFG = {
    clientId: gc.clientId || attr("data-client-id", ""),
    color: gc.color || attr("data-color", "#10b981"),
    greeting: gc.greeting || attr("data-greeting", ""),
    personaName: gc.personaName || attr("data-persona-name", ""),
    personaAvatar: gc.personaAvatar || attr("data-persona-avatar", ""),
    lang: gc.lang || attr("data-lang", "en"),
    theme: gc.theme || attr("data-theme", "dark"),
    sound:
      gc.sound !== undefined
        ? gc.sound
        : attr("data-sound", "true") === "true",
    apiBase:
      gc.apiBase ||
      attr(
        "data-api-base",
        scriptTag && scriptTag.src
          ? scriptTag.src.replace(/\/static\/widget\.js.*$/, "")
          : ""
      ),
  };

  // Session persistence
  var STORAGE_KEY = "kapso_bar_" + CFG.clientId;
  var session = loadSession();

  function loadSession() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && data.sessionId) return data;
      }
    } catch (e) {}
    return {
      sessionId: "w_" + randomId(),
      greeted: false,
      messages: [],
    };
  }

  function saveSession() {
    try {
      var toSave = {
        sessionId: session.sessionId,
        greeted: session.greeted,
        messages: session.messages.slice(-100),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {}
  }

  function randomId() {
    return (
      Math.random().toString(36).substring(2, 10) +
      Date.now().toString(36)
    );
  }

  // State
  var state = {
    expanded: false,
    unread: 0,
    loading: false,
    configLoaded: false,
    hasInteracted: false,
  };

  // RTL detection
  var isRTL = CFG.lang === "ar" || CFG.lang === "he" || CFG.lang === "fa";

  // Notification sound
  function playNotif() {
    if (!CFG.sound) return;
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      var ctx = new AudioCtx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 680;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  }

  // CSS injection
  function injectStyles() {
    var css = /* css */ `
/* Reset */
#kapso-bar,
#kapso-bar *,
#kapso-bar *::before,
#kapso-bar *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#kapso-bar {
  --k-emerald: #10b981;
  --k-emerald-rgb: 16, 185, 129;
  --k-surface: rgba(9, 9, 11, 0.8);
  --k-border: rgba(255, 255, 255, 0.06);
  --k-text: rgba(255, 255, 255, 0.85);
  --k-text-secondary: rgba(255, 255, 255, 0.45);
  --k-text-muted: rgba(255, 255, 255, 0.20);
  --k-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --k-font: -apple-system, 'SF Pro Display', 'SF Pro', 'Inter', 'Segoe UI', system-ui, sans-serif;

  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2147483647;
  font-family: var(--k-font);
  direction: ${isRTL ? "rtl" : "ltr"};
  line-height: 1.5;
  width: 100%;
  max-width: 680px;
  padding: 0 8px;
  pointer-events: none;
}

/* The unified container: bar + panel as one element */
.kapso-container {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  border-radius: 24px;
  background: var(--k-surface);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--k-border);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  position: relative;
}

/* Conversation panel — above the bar */
.kapso-panel {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.5s var(--k-ease);
  display: flex;
  flex-direction: column;
}
.kapso-panel.k-expanded {
  max-height: 70vh;
}

/* Messages area */
.kapso-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 20px 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  scroll-behavior: smooth;
  overscroll-behavior: contain;
}
.kapso-messages::-webkit-scrollbar {
  width: 4px;
}
.kapso-messages::-webkit-scrollbar-track {
  background: transparent;
}
.kapso-messages::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 2px;
}
.kapso-messages:hover::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
}
.kapso-messages {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.kapso-messages:hover {
  scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
}

/* Message rows */
.kapso-msg {
  max-width: 85%;
  font-size: 14px;
  line-height: 1.7;
  word-wrap: break-word;
  overflow-wrap: break-word;
  animation: kapsoMsgIn 0.35s var(--k-ease) both;
}
@keyframes kapsoMsgIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* AI messages — clean text, avatar approach */
.kapso-msg-ai {
  align-self: flex-start;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.kapso-msg-ai-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--k-emerald);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px;
  flex-shrink: 0;
  margin-top: 2px;
}
.kapso-msg-ai-body {
  flex: 1;
  min-width: 0;
}
.kapso-msg-ai-name {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.60);
  margin-bottom: 2px;
  display: none;
}
.kapso-msg-ai.k-show-name .kapso-msg-ai-name {
  display: block;
}
.kapso-msg-ai-text {
  color: var(--k-text);
  font-size: 14px;
  line-height: 1.7;
}
.kapso-msg-ai-text a {
  color: var(--k-emerald);
  text-decoration: underline;
  text-decoration-color: rgba(var(--k-emerald-rgb), 0.3);
  text-underline-offset: 2px;
}
.kapso-msg-ai-text a:hover {
  text-decoration-color: var(--k-emerald);
}

/* User messages — subtle bg pill */
.kapso-msg-user {
  align-self: flex-end;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  color: rgba(255, 255, 255, 0.90);
}

/* Typing indicator — opacity pulse dots */
.kapso-typing {
  align-self: flex-start;
  display: none;
  gap: 10px;
  align-items: flex-start;
  animation: kapsoMsgIn 0.35s var(--k-ease) both;
}
.kapso-typing.k-visible {
  display: flex;
}
.kapso-typing-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--k-emerald);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px;
  flex-shrink: 0;
  margin-top: 2px;
}
.kapso-typing-dots {
  display: flex;
  gap: 4px;
  align-items: center;
  padding-top: 8px;
}
.kapso-typing-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.40);
  animation: kapsoPulseDot 1.4s ease-in-out infinite;
}
.kapso-typing-dot:nth-child(2) { animation-delay: 0.2s; }
.kapso-typing-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes kapsoPulseDot {
  0%, 100% { opacity: 0.25; }
  50% { opacity: 0.9; }
}

/* The input bar — always visible */
.kapso-input-bar {
  height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 6px 0 16px;
  flex-shrink: 0;
  cursor: text;
  position: relative;
}

/* Separator line above input bar when expanded */
.kapso-separator {
  height: 1px;
  background: var(--k-border);
  margin: 0;
  opacity: 0;
  transition: opacity 0.3s ease;
}
.kapso-panel.k-expanded ~ .kapso-separator {
  opacity: 1;
}

/* Emerald pulse dot */
.kapso-bar-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--k-emerald);
  flex-shrink: 0;
  box-shadow: 0 0 6px rgba(var(--k-emerald-rgb), 0.5);
  animation: kapsoPulse 3s ease-in-out infinite;
}
@keyframes kapsoPulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(var(--k-emerald-rgb), 0.5); }
  50% { opacity: 0.6; box-shadow: 0 0 2px rgba(var(--k-emerald-rgb), 0.2); }
}

/* Unread badge */
.kapso-bar-badge {
  position: absolute;
  top: 8px;
  left: 10px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--k-emerald);
  box-shadow: 0 0 8px rgba(var(--k-emerald-rgb), 0.6);
  opacity: 0;
  transform: scale(0);
  transition: all 0.3s var(--k-ease);
  pointer-events: none;
}
.kapso-bar-badge.k-visible {
  opacity: 1;
  transform: scale(1);
}

/* Input field */
.kapso-bar-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  font-family: var(--k-font);
  line-height: 1.45;
  resize: none;
  height: 22px;
  max-height: 22px;
  padding: 0;
}
.kapso-bar-input::placeholder {
  color: var(--k-text-muted);
  font-size: 14px;
}

/* Send button */
.kapso-bar-send {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 12px;
  flex-shrink: 0;
  transition: color 0.2s, background 0.2s;
  color: rgba(255, 255, 255, 0.20);
  outline: none;
}
.kapso-bar-send:hover:not(:disabled) {
  color: var(--k-emerald);
  background: rgba(var(--k-emerald-rgb), 0.08);
}
.kapso-bar-send:disabled {
  opacity: 0.3;
  cursor: default;
}
.kapso-bar-send svg {
  width: 18px;
  height: 18px;
  ${isRTL ? "transform: scaleX(-1);" : ""}
}

/* Quick replies */
.kapso-quick-replies {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 0;
  align-self: flex-start;
  max-width: 90%;
  animation: kapsoMsgIn 0.35s var(--k-ease) both;
}
.kapso-qr-btn {
  background: transparent;
  color: rgba(255, 255, 255, 0.60);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 100px;
  padding: 6px 14px;
  font-size: 13px;
  font-family: var(--k-font);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s var(--k-ease);
  white-space: nowrap;
  outline: none;
}
.kapso-qr-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.16);
  color: rgba(255, 255, 255, 0.85);
}
.kapso-qr-btn:active {
  transform: scale(0.96);
}

/* Mobile — full-width bar, full-screen expand */
@media (max-width: 480px) {
  #kapso-bar {
    bottom: 8px;
    padding: 0 8px;
  }

  .kapso-panel.k-expanded {
    max-height: calc(100vh - 80px);
  }

  .kapso-container.k-mobile-expanded {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    max-width: 100%;
    border-radius: 0;
    z-index: 2147483647;
  }
  .kapso-container.k-mobile-expanded .kapso-panel {
    max-height: calc(100vh - 56px);
  }

  /* Drag handle on mobile */
  .kapso-container.k-mobile-expanded::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.12);
    z-index: 10;
  }
  .kapso-container.k-mobile-expanded .kapso-messages {
    padding-top: 24px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  #kapso-bar,
  #kapso-bar * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
`;

    var style = document.createElement("style");
    style.id = "kapso-bar-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // Escape HTML
  function esc(str) {
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  // Build DOM
  function buildWidget() {
    var root = document.createElement("div");
    root.id = "kapso-bar";

    var sendArrowSVG =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

    var container = document.createElement("div");
    container.className = "kapso-container";

    // Conversation panel (expands upward from bar)
    var panel = document.createElement("div");
    panel.className = "kapso-panel";
    panel.innerHTML =
      '<div class="kapso-messages" id="kapso-messages">' +
        '<div class="kapso-typing" id="kapso-typing">' +
          '<div class="kapso-typing-avatar">' + (CFG.personaName || "A").charAt(0).toUpperCase() + '</div>' +
          '<div class="kapso-typing-dots">' +
            '<span class="kapso-typing-dot"></span>' +
            '<span class="kapso-typing-dot"></span>' +
            '<span class="kapso-typing-dot"></span>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Separator
    var separator = document.createElement("div");
    separator.className = "kapso-separator";

    // Input bar (always visible)
    var inputBar = document.createElement("div");
    inputBar.className = "kapso-input-bar";
    inputBar.innerHTML =
      '<span class="kapso-bar-badge" id="kapso-badge"></span>' +
      '<span class="kapso-bar-dot"></span>' +
      '<input type="text" class="kapso-bar-input" id="kapso-input" ' +
        'placeholder="' + esc(isRTL
          ? "\u062A\u062D\u062F\u062B \u0645\u0639 " + (CFG.personaName || "Assistant") + "..."
          : "Talk to " + (CFG.personaName || "Assistant") + " \u2014 ask about menus, bookings, anything...") + '" ' +
        'autocomplete="off" />' +
      '<button class="kapso-bar-send" id="kapso-send" aria-label="Send" disabled>' +
        sendArrowSVG +
      '</button>';

    container.appendChild(panel);
    container.appendChild(separator);
    container.appendChild(inputBar);
    root.appendChild(container);
    document.body.appendChild(root);

    return { root: root, container: container, panel: panel, inputBar: inputBar };
  }

  // Render a message
  var lastSender = null;

  function renderMessage(msg, container, skipAnim) {
    var isUser = msg.role === "user";

    var div = document.createElement("div");
    div.className = "kapso-msg " + (isUser ? "kapso-msg-user" : "kapso-msg-ai");

    if (skipAnim) div.style.animation = "none";

    // Markdown-lite: bold, italic, links, line breaks
    var content = esc(msg.content);
    content = content.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    content = content.replace(/\*(.+?)\*/g, "<em>$1</em>");
    content = content.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );
    content = content.replace(/\n/g, "<br>");

    if (isUser) {
      div.innerHTML = content;
    } else {
      // Show name on first AI message or when switching from user
      var showName = lastSender !== "assistant";
      div.innerHTML =
        '<div class="kapso-msg-ai-avatar">' + (CFG.personaName || "A").charAt(0).toUpperCase() + '</div>' +
        '<div class="kapso-msg-ai-body">' +
          '<div class="kapso-msg-ai-name">' + esc(CFG.personaName || "Assistant") + '</div>' +
          '<div class="kapso-msg-ai-text">' + content + '</div>' +
        '</div>';
      if (showName) div.classList.add("k-show-name");
    }

    lastSender = isUser ? "user" : "assistant";

    // Insert before typing indicator
    var typing = container.querySelector("#kapso-typing");
    if (typing) {
      container.insertBefore(div, typing);
    } else {
      container.appendChild(div);
    }

    return div;
  }

  // Render quick replies
  function renderQuickReplies(options, container, onSelect) {
    var wrap = document.createElement("div");
    wrap.className = "kapso-quick-replies";

    options.forEach(function (opt) {
      var btn = document.createElement("button");
      btn.className = "kapso-qr-btn";
      btn.textContent = opt;
      btn.addEventListener("click", function () {
        wrap.remove();
        onSelect(opt);
      });
      wrap.appendChild(btn);
    });

    var typing = container.querySelector("#kapso-typing");
    if (typing) {
      container.insertBefore(wrap, typing);
    } else {
      container.appendChild(wrap);
    }
  }

  // Scroll to bottom
  function scrollToBottom(el) {
    requestAnimationFrame(function () {
      el.scrollTop = el.scrollHeight;
    });
  }

  // API calls
  function apiPost(path, body, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", CFG.apiBase + path, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.timeout = 30000;
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          callback(null, JSON.parse(xhr.responseText));
        } catch (e) {
          callback(e, null);
        }
      } else {
        callback(new Error("HTTP " + xhr.status), null);
      }
    };
    xhr.onerror = function () {
      callback(new Error("Network error"), null);
    };
    xhr.ontimeout = function () {
      callback(new Error("Timeout"), null);
    };
    xhr.send(JSON.stringify(body));
  }

  function apiGet(path, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", CFG.apiBase + path, true);
    xhr.timeout = 15000;
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          callback(null, JSON.parse(xhr.responseText));
        } catch (e) {
          callback(e, null);
        }
      } else {
        callback(new Error("HTTP " + xhr.status), null);
      }
    };
    xhr.onerror = function () {
      callback(new Error("Network error"), null);
    };
    xhr.send();
  }

  // Load remote config
  function loadConfig(callback) {
    if (!CFG.clientId) {
      callback();
      return;
    }
    apiGet("/chat/config/" + CFG.clientId, function (err, data) {
      if (!err && data) {
        if (data.persona_name && !attr("data-persona-name", ""))
          CFG.personaName = data.persona_name;
        if (data.greeting && !attr("data-greeting", ""))
          CFG.greeting = data.greeting;
        if (data.color && !attr("data-color", ""))
          CFG.color = data.color;
        if (data.avatar_url) CFG.personaAvatar = data.avatar_url;
        if (data.lang && !attr("data-lang", ""))
          CFG.lang = data.lang;
        if (data.theme && !attr("data-theme", ""))
          CFG.theme = data.theme;
        state.configLoaded = true;
      }
      callback();
    });
  }

  // Expand / collapse panel
  function expandPanel() {
    if (state.expanded) return;
    state.expanded = true;
    var panel = document.querySelector(".kapso-panel");
    var container = document.querySelector(".kapso-container");
    panel.classList.add("k-expanded");

    // On mobile, go full-screen
    if (window.innerWidth <= 480) {
      container.classList.add("k-mobile-expanded");
    }

    state.unread = 0;
    updateBadge();
    var messagesEl = document.getElementById("kapso-messages");
    if (messagesEl) scrollToBottom(messagesEl);
  }

  function collapsePanel() {
    if (!state.expanded) return;
    state.expanded = false;
    var panel = document.querySelector(".kapso-panel");
    var container = document.querySelector(".kapso-container");
    panel.classList.remove("k-expanded");
    container.classList.remove("k-mobile-expanded");
  }

  // Send message
  function sendMessage(text) {
    if (!text.trim() || state.loading) return;

    var messagesEl = document.getElementById("kapso-messages");
    var inputEl = document.getElementById("kapso-input");
    var sendBtn = document.getElementById("kapso-send");

    // Expand panel if not already
    if (!state.expanded) expandPanel();

    // Add user message
    var userMsg = {
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };
    session.messages.push(userMsg);
    renderMessage(userMsg, messagesEl);
    scrollToBottom(messagesEl);

    // Clear input
    inputEl.value = "";
    sendBtn.disabled = true;

    // Show typing
    state.loading = true;
    var typingEl = document.getElementById("kapso-typing");
    typingEl.classList.add("k-visible");
    scrollToBottom(messagesEl);

    // Call API
    apiPost(
      "/chat/message",
      {
        client_id: CFG.clientId,
        session_id: session.sessionId,
        message: text.trim(),
        metadata: {
          url: window.location.href,
          title: document.title,
          lang: CFG.lang,
        },
      },
      function (err, data) {
        state.loading = false;
        typingEl.classList.remove("k-visible");

        if (err || !data) {
          var errMsg = {
            role: "assistant",
            content: isRTL
              ? "\u0639\u0630\u0631\u0627\u060C \u062D\u062F\u062B \u062E\u0637\u0623. \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649."
              : "Sorry, something went wrong. Please try again.",
            timestamp: new Date().toISOString(),
          };
          session.messages.push(errMsg);
          renderMessage(errMsg, messagesEl);
          scrollToBottom(messagesEl);
          saveSession();
          return;
        }

        // Update session ID if server assigned one
        if (data.session_id) session.sessionId = data.session_id;

        // Add AI reply
        var aiMsg = {
          role: "assistant",
          content: data.reply || data.message || "",
          timestamp: data.timestamp || new Date().toISOString(),
        };
        session.messages.push(aiMsg);
        renderMessage(aiMsg, messagesEl);

        // Handle rich elements (buttons, quick replies)
        var elements = data.rich_elements || [];
        for (var i = 0; i < elements.length; i++) {
          var el = elements[i];
          if (el.type === "buttons" || el.type === "quick_replies") {
            renderQuickReplies(el.options, messagesEl, function (picked) {
              sendMessage(picked);
            });
          }
        }

        scrollToBottom(messagesEl);
        saveSession();

        // Sound if collapsed
        if (!state.expanded) {
          state.unread++;
          updateBadge();
          playNotif();
        }
      }
    );

    saveSession();
  }

  // Badge
  function updateBadge() {
    var badge = document.getElementById("kapso-badge");
    if (!badge) return;
    if (state.unread > 0) {
      badge.classList.add("k-visible");
    } else {
      badge.classList.remove("k-visible");
    }
  }

  // Update placeholder with proactive greeting
  function showGreetingInBar() {
    var inputEl = document.getElementById("kapso-input");
    if (inputEl && CFG.personaName && CFG.greeting) {
      // Truncate greeting for placeholder
      var short = CFG.greeting;
      if (short.length > 60) short = short.substring(0, 57) + "...";
      inputEl.placeholder = CFG.personaName + ": " + short;
    }
  }

  // Restore history
  function restoreHistory() {
    var messagesEl = document.getElementById("kapso-messages");
    if (!messagesEl) return;
    lastSender = null;
    for (var i = 0; i < session.messages.length; i++) {
      renderMessage(session.messages[i], messagesEl, true);
    }
    scrollToBottom(messagesEl);
  }

  // Proactive greeting
  function maybeGreet() {
    if (session.greeted || !CFG.greeting) return;
    session.greeted = true;
    saveSession();

    var greetMsg = {
      role: "assistant",
      content: CFG.greeting,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(greetMsg);

    var messagesEl = document.getElementById("kapso-messages");
    if (messagesEl) {
      renderMessage(greetMsg, messagesEl);
      scrollToBottom(messagesEl);
    }

    if (!state.expanded) {
      state.unread++;
      updateBadge();
      showGreetingInBar();
    }

    saveSession();
  }

  // Initialize
  function init() {
    injectStyles();
    var dom = buildWidget();

    // Event: clicking on the input bar expands
    var inputEl = document.getElementById("kapso-input");
    inputEl.addEventListener("focus", function () {
      if (!state.expanded) expandPanel();
    });
    inputEl.addEventListener("click", function () {
      if (!state.expanded) expandPanel();
    });

    // Event: send button
    var sendBtn = document.getElementById("kapso-send");
    sendBtn.addEventListener("click", function () {
      var input = document.getElementById("kapso-input");
      sendMessage(input.value);
    });

    // Event: input changes
    inputEl.addEventListener("input", function () {
      sendBtn.disabled = !this.value.trim();
    });

    // Event: Enter to send
    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (this.value.trim()) sendMessage(this.value);
      }
    });

    // Event: close on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && state.expanded) {
        collapsePanel();
      }
    });

    // Event: click outside to collapse
    document.addEventListener("mousedown", function (e) {
      if (!state.expanded) return;
      var bar = document.getElementById("kapso-bar");
      if (bar && !bar.contains(e.target)) {
        collapsePanel();
      }
    });

    // Mobile drag handle: touch on container top area collapses
    dom.container.addEventListener("touchstart", function (e) {
      if (!state.expanded) return;
      var rect = dom.container.getBoundingClientRect();
      var touchY = e.touches[0].clientY - rect.top;
      if (touchY < 20) {
        collapsePanel();
      }
    });

    // Restore history
    restoreHistory();

    // Load remote config
    loadConfig(function () {
      // Update typing avatar + input placeholder
      var typingAvatar = dom.panel.querySelector(".kapso-typing-avatar");
      if (typingAvatar && CFG.personaName) {
        typingAvatar.textContent = CFG.personaName.charAt(0).toUpperCase();
      }
      if (!session.greeted && CFG.greeting) {
        setTimeout(maybeGreet, 4000);
      }
    });

    // Edge case: greeted flag set but messages cleared
    if (session.greeted && session.messages.length === 0 && CFG.greeting) {
      session.greeted = false;
    }

    // Fallback greeting timer
    if (!session.greeted && CFG.greeting) {
      setTimeout(function () {
        if (!session.greeted) maybeGreet();
      }, 5000);
    }

    // Expose programmatic API
    window.KapsoWidget = {
      open: expandPanel,
      close: collapsePanel,
      toggle: function () {
        if (state.expanded) collapsePanel();
        else expandPanel();
      },
      send: sendMessage,
      setGreeting: function (msg) {
        CFG.greeting = msg;
      },
    };
  }

  // Boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
