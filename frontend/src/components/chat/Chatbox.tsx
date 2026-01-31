import { useState } from 'react'
import './Chatbox.css'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export function Chatbox() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    }

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: 'This is a placeholder response. AI integration coming soon!',
    }

    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setInput('')
  }

  return (
    <div className="chatbox">
      <div className="chatbox-header">
        <span className="chatbox-title">AI Assistant</span>
      </div>
      <div className="chatbox-messages">
        {messages.length === 0 ? (
          <div className="chatbox-empty">
            Ask questions about your code changes...
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`chatbox-message chatbox-message-${msg.role}`}>
              <div className="chatbox-message-content">{msg.content}</div>
            </div>
          ))
        )}
      </div>
      <form className="chatbox-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chatbox-input"
          placeholder="Ask about your changes..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="chatbox-send">
          Send
        </button>
      </form>
    </div>
  )
}
