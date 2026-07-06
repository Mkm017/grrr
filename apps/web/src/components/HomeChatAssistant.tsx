import React, { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import { useLocation } from '../providers/LocationProvider';

interface Message {
    role: 'user' | 'model';
    text: string;
}

export default function HomeChatAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: 'Hi there! 👋 I am your Grrr food assistant. Need a recommendation or have questions about a restaurant?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { activeAddress } = useLocation();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', text: input.trim() };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const body: any = { messages: newMessages };
            if (activeAddress) {
                body.lat = activeAddress.latitude;
                body.lng = activeAddress.longitude;
            }

            const res = await api.post<{ reply: string }>('/ai/chat', body);
            setMessages(prev => [...prev, { role: 'model', text: res.reply }]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'model', text: 'Oops! I am having trouble connecting right now. Please try again later.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chat-widget-container">
            {isOpen && (
                <div className="chat-window animate-fade-in">
                    <div className="chat-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.2rem' }}>🤖</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Grrr Assistant</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Always here to help</div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                    </div>
                    
                    <div className="chat-messages">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`chat-message ${msg.role}`}>
                                <div className="chat-bubble">
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="chat-message model">
                                <div className="chat-bubble typing-indicator">
                                    <span>.</span><span>.</span><span>.</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="chat-input-area" onSubmit={handleSend}>
                        <input 
                            type="text" 
                            placeholder="Ask me anything..." 
                            value={input} 
                            onChange={(e) => setInput(e.target.value)} 
                            className="chat-input"
                            disabled={isLoading}
                        />
                        <button type="submit" className="chat-send-btn" disabled={!input.trim() || isLoading}>
                            ➤
                        </button>
                    </form>
                </div>
            )}

            {!isOpen && (
                <button className="chat-fab animate-bounce-in" onClick={() => setIsOpen(true)}>
                    <span style={{ fontSize: '1.5rem' }}>💬</span>
                </button>
            )}
        </div>
    );
}
