import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../utils/translations';
import { messagesAPI } from '../api/client';
import { toast } from 'react-toastify';
import { Send, X, MessageCircle } from 'lucide-react';

const ChatBox = ({ task, onClose }) => {
  const { user, language } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const t = (key) => translations[language]?.[key] || key;

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [task.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const response = await messagesAPI.getByTask(task.id);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await messagesAPI.send({
        task_id: task.id,
        content: newMessage.trim(),
      });
      setNewMessage('');
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(language === 'en' ? 'Failed to send message' : 'Échec de l\'envoi du message');
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(language === 'en' ? 'en-US' : 'fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 md:inset-auto md:bottom-4 md:right-4 md:w-96 md:h-[600px] bg-white dark:bg-gray-800/70 md:rounded-lg shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="bg-emerald-600 text-white p-4 md:rounded-t-lg flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5" />
          <div>
            <h3 className="font-semibold" data-testid="chat-header">
              {language === 'en' ? 'Chat' : 'Discussion'}
            </h3>
            <p className="text-xs opacity-90">{task.title}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="hover:bg-emerald-700 rounded-full p-1 transition"
          data-testid="close-chat-button"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-950" data-testid="chat-messages">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-gray-500">{t('loading')}</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full text-gray-500">
            <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
            <p>{language === 'en' ? 'No messages yet' : 'Aucun message encore'}</p>
            <p className="text-sm">{language === 'en' ? 'Start the conversation!' : 'Commencez la conversation!'}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMyMessage = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                data-testid={`message-${msg.id}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-2 ${
                    isMyMessage
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-gray-900 dark:text-white border border-gray-200'
                  }`}
                >
                  <p className="break-words">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isMyMessage ? 'text-emerald-100' : 'text-gray-500'
                    }`}
                  >
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t bg-white dark:bg-gray-800/70 md:rounded-b-lg">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={language === 'en' ? 'Type a message...' : 'Tapez un message...'}
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            data-testid="message-input"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-emerald-600 text-white rounded-full p-2 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            data-testid="send-message-button"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBox;
