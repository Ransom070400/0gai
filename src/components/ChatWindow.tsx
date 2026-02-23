import { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { ChatMessage } from '../types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import WelcomeScreen from './WelcomeScreen';

interface ChatWindowProps {
  messages: ChatMessage[];
  isProcessing: boolean;
  isConnected: boolean;
  onConnect: () => void;
  onSuggestion: (q: string) => void;
  onClear: () => void;
}

export default function ChatWindow({
  messages,
  isProcessing,
  isConnected,
  onConnect,
  onSuggestion,
  onClear,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Chat header (only if messages exist) */}
      {hasMessages && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-void-800/50">
          <span className="text-xs text-void-500 font-medium">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 text-xs text-void-600 hover:text-red-400 transition-colors"
          >
            <Trash2 size={12} />
            Clear Chat
          </button>
        </div>
      )}

      {/* Scrollable message area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6"
      >
        {!hasMessages ? (
          <WelcomeScreen
            isConnected={isConnected}
            onConnect={onConnect}
            onSuggestion={onSuggestion}
          />
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {isProcessing && <TypingIndicator />}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
