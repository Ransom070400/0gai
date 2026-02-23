import { Bot, User, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';
import { formatTime, copyText } from '../utils/helpers';

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    const ok = await copyText(message.content);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`flex gap-3 animate-fade-up ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-og-600 to-og-800
                        flex items-center justify-center flex-shrink-0 mt-1
                        shadow-md shadow-og-600/10">
          <Bot size={15} className="text-og-200" />
        </div>
      )}

      {/* Bubble */}
      <div className={`max-w-[80%] group relative ${isUser ? 'msg-user' : 'msg-ai'}`}>
        <div className={`px-4 py-3 ${isUser ? '' : 'ai-prose'}`}>
          {isUser ? (
            <p className="text-sm text-void-100 leading-relaxed">{message.content}</p>
          ) : (
            <div className="text-sm text-void-200 leading-relaxed">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer: time + copy */}
        <div className="flex items-center justify-between px-4 pb-2 pt-0">
          <span className="text-[10px] text-void-600">{formatTime(message.timestamp)}</span>

          {!isUser && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity
                         flex items-center gap-1 text-[10px] text-void-500 hover:text-og-400"
            >
              {copied ? <Check size={10} /> : <Copy size={10} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-void-700 border border-void-600/50
                        flex items-center justify-center flex-shrink-0 mt-1">
          <User size={15} className="text-void-300" />
        </div>
      )}
    </div>
  );
}
