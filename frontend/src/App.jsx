import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Settings, MessageSquare, ChevronLeft, ChevronRight, Copy, Check, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';


const DEFAULT_MODEL = 'gpt-4o';
const API_BASE_URL = 'http://localhost:5001';

const CodeBlock = ({ code, language }) => {
  const [isCopied, setIsCopied] = useState(false);
  const codeRef = useRef(null);

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [code]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={copyToClipboard}
        className="absolute right-2 top-2 p-1 rounded bg-slate-700 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy code"
      >
        {isCopied ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <pre className="!bg-slate-900 !p-4 rounded-lg">
        <code ref={codeRef} className={language ? `language-${language}` : ''}>
          {code}
        </code>
      </pre>
    </div>
  );
};

const MessageContent = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code: ({node, inline, className, children, ...props}) => {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';

          if (inline) {
            return (
              <code className="bg-slate-800 px-1 rounded text-sm" {...props}>
                {children}
              </code>
            );
          }

          return (
            <CodeBlock
              code={String(children).replace(/\n$/, '')}
              language={language}
            />
          );
        },
        p: ({children}) => <p className="mb-4">{children}</p>,
        ul: ({children}) => <ul className="list-disc list-inside mb-4">{children}</ul>,
        ol: ({children}) => <ol className="list-decimal list-inside mb-4">{children}</ol>,
        li: ({children}) => <li className="ml-4">{children}</li>,
        a: ({children, href}) => (
          <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        blockquote: ({children}) => (
          <blockquote className="border-l-4 border-slate-500 pl-4 my-4 italic">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

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

  // New state variables for chat history
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  // Fetch conversations on component mount
  useEffect(() => {
    const fetchConversations = async () => {
      setIsLoadingConversations(true);
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/conversations`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setConversations(data);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        setError(`Failed to fetch conversations: ${error.message}`);
      } finally {
        setIsLoadingConversations(false);
      }
    };

    fetchConversations();
  }, []);

  // Load conversation messages when switching conversations
  useEffect(() => {
    const loadConversation = async (id) => {
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/conversations/${id}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setMessages(data.messages.map(msg => ({
          type: 'user',
          content: msg.user_message
        }, {
          type: 'bot',
          content: msg.bot_response
        })).flat());
        // Update the page title to show the conversation title
        document.title = data.title;
      } catch (error) {
        console.error('Error loading conversation:', error);
        setError(`Failed to load conversation: ${error.message}`);
      }
    };

    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

  // Create new conversation
  const createNewConversation = async () => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/conversations`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setCurrentConversationId(data.conversation_id);
      setMessages([]);

      // Refresh conversations list
      const conversationsResponse = await fetchWithTimeout(`${API_BASE_URL}/conversations`);
      if (conversationsResponse.ok) {
        const conversationsData = await conversationsResponse.json();
        setConversations(conversationsData);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      setError(`Failed to create conversation: ${error.message}`);
    }
  };

  // Modified handleSubmit to include conversation_id
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
        body: JSON.stringify({
          message: userMessage,
          model: selectedModel,
          conversation_id: currentConversationId
        }),
      });

      if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
      const data = await response.json();

      setMessages(prev => [...prev, { type: 'bot', content: data.response }]);

      // Update current conversation ID if this is a new conversation
      if (data.conversation_id && !currentConversationId) {
        setCurrentConversationId(data.conversation_id);

        // Add the new code block here
        const conversationsResponse = await fetchWithTimeout(`${API_BASE_URL}/conversations`);
        if (conversationsResponse.ok) {
          const conversationsData = await conversationsResponse.json();
          setConversations(conversationsData);
          // Update document title if this is a new conversation
          if (data.conversation_id && !currentConversationId) {
            const newConversation = conversationsData.find(c => c.id === data.conversation_id);
            if (newConversation) {
              document.title = newConversation.title;
            }
          }
        }
      }
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

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <div className={`h-full bg-slate-800 transition-all duration-300 flex flex-col
        ${isSidebarOpen ? 'w-64' : 'w-0'}`}>
        {isSidebarOpen && (
          <>
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-lg font-medium text-white">Menu</h2>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
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

              <div className="flex-1">
                <div className="flex items-center justify-between text-slate-200 mb-2">
                  <div className="flex items-center space-x-2">
                    <MessageSquare size={20} />
                    <h3 className="font-medium">Chat History</h3>
                  </div>
                  <button
                    onClick={createNewConversation}
                    className="p-1 hover:bg-slate-700 rounded-md transition-colors"
                    title="New Chat"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {isLoadingConversations ? (
                  <div className="flex items-center justify-center p-4 text-slate-400">
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Loading...
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-slate-400 text-sm">
                    No chat history yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        onClick={() => setCurrentConversationId(conversation.id)}
                        className={`w-full p-2 rounded-md text-left transition-colors text-sm ${
                          currentConversationId === conversation.id
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        <div className="font-medium truncate">{conversation.title}</div>
                        <div className="text-xs opacity-75">{formatDate(conversation.created_at)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-slate-700 p-2 rounded-r-md text-white hover:bg-slate-600 transition-colors"
      >
        {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      <div className="flex-1 flex flex-col h-full">
      <div className="p-4 bg-slate-800 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">
          {currentConversationId ?
            conversations.find(c => c.id === currentConversationId)?.title || 'Custom Chatbot'
            : 'Custom Chatbot'}
        </h1>
      </div>

        {error && (
          <div className="p-3 bg-red-900/50 text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.isError
                    ? 'bg-red-900/50 text-red-200'
                    : 'bg-slate-700 text-slate-100'
                }`}
              >
                <MessageContent content={message.content} />
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
