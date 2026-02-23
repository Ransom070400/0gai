import { Bot } from 'lucide-react';

export default function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start animate-fade-up">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-og-600 to-og-800
                      flex items-center justify-center flex-shrink-0 mt-1
                      shadow-md shadow-og-600/10 animate-pulse-glow">
        <Bot size={15} className="text-og-200" />
      </div>

      <div className="msg-ai px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="typing-dot" />
            <div className="typing-dot" />
            <div className="typing-dot" />
          </div>
          <span className="text-xs text-void-500">Analyzing via 0G Compute...</span>
        </div>
      </div>
    </div>
  );
}
