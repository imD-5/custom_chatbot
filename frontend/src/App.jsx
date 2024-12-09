import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Settings, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';

const DEFAULT_MODEL = 'gpt-4o';
const API_BASE_URL = 'http://localhost:5001';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState({});
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);

  // Rest of the existing fetch and handle functions remain the same
  const fetchWithTimeout = async (url, options = {}, timeout = 25000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  useEffect(() => {
    const fetchModels = async () => {
      setIsLoadingModels(true);
      setError(null);
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/models`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setModels(data);
      } catch (error) {
        console.error('Error fetching models:', error);
        setError(`Failed to fetch models: ${error.message}`);
        setModels({
          'gpt-3.5-turbo': 'GPT-3.5 Turbo',
          'gpt-4o': 'GPT-4o'
        });
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, model: selectedModel }),
      });

      if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
      const data = await response.json();
      setMessages(prev => [...prev, { type: 'bot', content: data.response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setError(`Failed to send message: ${error.message}`);
      setMessages(prev => [...prev, {
        type: 'bot',
        content: `Error: ${error.message}. Please try again later.`,
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <div className={`h-full bg-slate-800 transition-all duration-300 flex flex-col
        ${isSidebarOpen ? 'w-64' : 'w-0'}`}>
        {isSidebarOpen && (
          <>
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-lg font-medium text-white">Menu</h2>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 p-4 space-y-4">
              {/* Settings Section */}
              <div>
                <div className="flex items-center space-x-2 text-slate-200 mb-2">
                  <Settings size={20} />
                  <h3 className="font-medium">Settings</h3>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-sm text-slate-400">Model</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      disabled={isLoadingModels}
                      className="w-full p-1.5 text-sm bg-slate-700 border border-slate-600 rounded-md text-white"
                    >
                      {isLoadingModels ? (
                        <option value="">Loading...</option>
                      ) : (
                        Object.entries(models).map(([id, name]) => (
                          <option key={id} value={id}>{name}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Chat History Section */}
              <div>
                <div className="flex items-center space-x-2 text-slate-200 mb-2">
                  <MessageSquare size={20} />
                  <h3 className="font-medium">Chat History</h3>
                </div>
                <div className="text-slate-400 text-sm">
                  No chat history yet
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-slate-700 p-2 rounded-r-md text-white hover:bg-slate-600 transition-colors"
      >
        {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 bg-slate-800 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white">Custom Chatbot</h1>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-900/50 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.isError
                    ? 'bg-red-900/50 text-red-200'
                    : 'bg-slate-700 text-slate-100'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-700 rounded-lg p-3 text-slate-100 flex items-center space-x-2">
                <Loader2 className="animate-spin h-4 w-4" />
                <span>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-700">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 p-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !inputValue.trim()}
            >
              {isLoading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
