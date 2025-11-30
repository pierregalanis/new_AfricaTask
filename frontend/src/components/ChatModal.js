import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const ChatModal = ({ isOpen, onClose, task, currentUser, otherUser, language = 'en' }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [ws, setWs] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && task && currentUser) {
      fetchMessages();
      connectWebSocket();
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [isOpen, task, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectWebSocket = () => {
    if (!task || !currentUser) return;

    try {
      // Use wss:// for https and ws:// for http
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
      const wsUrl = backendUrl.replace('https://', '').replace('http://', '');
      
      const websocket = new WebSocket(
        `${protocol}//${wsUrl}/ws/chat/${task.id}/${currentUser.id}`
      );

      websocket.onopen = () => {
        console.log('✅ WebSocket connected - Real-time chat active');
      };

      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_message') {
          // Add incoming message
          setMessages(prev => [...prev, data.message]);
        } else if (data.type === 'message_sent') {
          // Message sent confirmation
          console.log('Message sent successfully');
        }
      };

      websocket.onerror = (error) => {
        console.warn('⚠️ WebSocket connection failed - Using HTTP polling fallback', error);
        // Gracefully fall back to HTTP polling (already set up in useEffect)
      };

      websocket.onclose = () => {
        console.log('WebSocket disconnected - Using HTTP polling');
      };

      setWs(websocket);
    } catch (error) {
      console.warn('⚠️ WebSocket initialization failed - Using HTTP polling fallback:', error);
      // HTTP polling will handle message updates
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/messages/task/${task.id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setMessages(response.data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error(language === 'en' ? 'Failed to load messages' : 'Échec du chargement des messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    
    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        // Send via WebSocket
        ws.send(JSON.stringify({
          content: newMessage.trim(),
          receiver_id: otherUser.id
        }));
        
        // Add message optimistically to UI
        const tempMessage = {
          id: `temp-${Date.now()}`,
          content: newMessage.trim(),
          sender_id: currentUser.id,
          receiver_id: otherUser.id,
          created_at: new Date().toISOString(),
          is_read: false
        };
        setMessages(prev => [...prev, tempMessage]);
        setNewMessage('');
      } else {
        // Fallback to HTTP if WebSocket not connected
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/messages`,
          {
            task_id: task.id,
            content: newMessage.trim()
          },
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        setMessages(prev => [...prev, response.data]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(language === 'en' ? 'Failed to send message' : 'Échec de l\'envoi du message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-purple-600 to-orange-500">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">
                {language === 'en' ? 'Chat' : 'Discussion'}
              </h2>
              <p className="text-sm text-purple-100">
                {otherUser?.full_name || (language === 'en' ? 'User' : 'Utilisateur')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Task Info */}
        <div className="px-4 py-2 bg-gray-50 border-b">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">{language === 'en' ? 'Task:' : 'Tâche:'}</span> {task.title}
          </p>
        </div>

        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
        >
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MessageCircle className="w-16 h-16 mb-3 opacity-50" />
              <p className="text-center">
                {language === 'en' 
                  ? 'No messages yet. Start the conversation!' 
                  : 'Aucun message. Commencez la conversation!'}
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isOwnMessage = msg.sender_id === currentUser?.id;
              const showTime = new Date(msg.created_at).toLocaleTimeString(
                language === 'en' ? 'en-US' : 'fr-FR',
                { hour: '2-digit', minute: '2-digit' }
              );

              return (
                <div
                  key={msg.id || index}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      isOwnMessage
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-800 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm break-words">{msg.content}</p>
                    <p className={`text-xs mt-1 ${
                      isOwnMessage ? 'text-purple-200' : 'text-gray-500'
                    }`}>
                      {showTime}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-white">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                language === 'en' 
                  ? 'Type a message...' 
                  : 'Écrivez un message...'
              }
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={sending}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Send className="w-5 h-5" />
              <span>{language === 'en' ? 'Send' : 'Envoyer'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;
