"use client";

import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api-url";

interface Conversation {
  id: string;
  contact_name: string;
  phone_number: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  status: string;
}

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  timestamp: string;
  status: string;
}

interface Props {
  companyName: string;
}

export function WhatsAppInbox({ companyName }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [kapsoConfigured, setKapsoConfigured] = useState(false);
  const [kapsoApiKey, setKapsoApiKey] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [setupStep, setSetupStep] = useState<"key" | "done">("key");

  useEffect(() => {
    checkKapsoConfig();
  }, []);

  async function checkKapsoConfig() {
    // Check if KAPSO_API_KEY is stored
    const res = await fetch(apiUrl("/api/kapso/status"));
    if (res.ok) {
      const data = await res.json();
      if (data.configured) {
        setKapsoConfigured(true);
        loadConversations();
      }
    }
    setLoading(false);
  }

  async function loadConversations() {
    const res = await fetch(apiUrl("/api/kapso/conversations"));
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations || []);
    }
  }

  async function loadMessages(convoId: string) {
    setSelectedConvo(convoId);
    const res = await fetch(apiUrl(`/api/kapso/messages?conversation_id=${convoId}`));
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConvo) return;

    setSending(true);
    const convo = conversations.find((c) => c.id === selectedConvo);
    if (!convo) return;

    await fetch(apiUrl("/api/kapso/send"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: convo.phone_number,
        text: newMessage.trim(),
      }),
    });

    setNewMessage("");
    setSending(false);
    loadMessages(selectedConvo);
  }

  async function saveKapsoConfig(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(apiUrl("/api/kapso/setup"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: kapsoApiKey, phoneNumberId }),
    });

    if (res.ok) {
      setKapsoConfigured(true);
      setSetupStep("done");
      loadConversations();
    }
  }

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-400">Loading...</div>
    );
  }

  // Setup flow if Kapso not configured
  if (!kapsoConfigured) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Connect WhatsApp via Kapso</h2>
            <p className="text-sm text-gray-500 mt-1">
              Get your WhatsApp agent running in 2 minutes
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-sm font-medium text-gray-800">Create a Kapso account</p>
                <p className="text-xs text-gray-500">
                  Go to{" "}
                  <a href="https://kapso.ai" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                    kapso.ai
                  </a>
                  {" "}and sign up (free — 2,000 messages/month)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
              <div>
                <p className="text-sm font-medium text-gray-800">Get your API key</p>
                <p className="text-xs text-gray-500">
                  In Kapso dashboard: Project Settings &gt; API Keys &gt; Copy
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
              <div>
                <p className="text-sm font-medium text-gray-800">Paste it below</p>
                <p className="text-xs text-gray-500">
                  We handle the rest — webhook setup, number connection, AI agent config
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={saveKapsoConfig} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kapso API Key
              </label>
              <input
                type="password"
                required
                value={kapsoApiKey}
                onChange={(e) => setKapsoApiKey(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="kap_..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number ID (optional — uses sandbox if empty)
              </label>
              <input
                type="text"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Leave empty for sandbox number"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Connect WhatsApp
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Inbox view
  const selectedConversation = conversations.find((c) => c.id === selectedConvo);

  return (
    <div className="grid grid-cols-3 gap-0 rounded-lg border border-gray-200 bg-white overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
      {/* Conversation list */}
      <div className="border-r border-gray-200 overflow-y-auto">
        <div className="p-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Conversations</h3>
        </div>
        {conversations.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">
            No conversations yet. Messages will appear here when customers contact your WhatsApp number.
          </div>
        ) : (
          conversations.map((convo) => (
            <button
              key={convo.id}
              onClick={() => loadMessages(convo.id)}
              className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                selectedConvo === convo.id ? "bg-brand-50" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {convo.contact_name || convo.phone_number}
                </p>
                {convo.unread_count > 0 && (
                  <span className="ml-2 w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">
                    {convo.unread_count}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">{convo.last_message}</p>
              <p className="text-xs text-gray-300 mt-0.5">
                {new Date(convo.last_message_at).toLocaleString()}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Message thread */}
      <div className="col-span-2 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <p className="text-sm font-semibold text-gray-900">
                {selectedConversation.contact_name || selectedConversation.phone_number}
              </p>
              <p className="text-xs text-gray-500">{selectedConversation.phone_number}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                      msg.direction === "outbound"
                        ? "bg-green-100 text-green-900"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p>{msg.body}</p>
                    <p className={`text-xs mt-1 ${
                      msg.direction === "outbound" ? "text-green-500" : "text-gray-400"
                    }`}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={sendMessage} className="p-3 border-t border-gray-100 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {sending ? "..." : "Send"}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select a conversation to view messages
          </div>
        )}
      </div>
    </div>
  );
}
