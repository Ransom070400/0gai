import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  isProcessing: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSend, disabled, isProcessing, placeholder }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [value]);

  const handleSubmit = () => {
    if (!value.trim() || disabled || isProcessing) return;
    onSend(value);
    setValue('');
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative">
      <div className={`
        flex items-end gap-2 px-4 py-3 rounded-2xl
        bg-void-800/40 border transition-all duration-200
        ${disabled
          ? 'border-void-800/30 opacity-50'
          : 'border-void-700/40 focus-within:border-og-500/30 focus-within:shadow-lg focus-within:shadow-og-500/5'
        }
      `}>
        <Sparkles size={16} className="text-og-500/40 mb-1.5 flex-shrink-0" />

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder || 'Ask about your wallet activity...'}
          rows={1}
          className="input-chat flex-1 min-h-[24px] max-h-[160px]"
        />

        <button
          onClick={handleSubmit}
          disabled={!value.trim() || disabled || isProcessing}
          className={`
            flex items-center justify-center w-9 h-9 rounded-xl mb-0
            transition-all duration-200 flex-shrink-0
            ${value.trim() && !disabled && !isProcessing
              ? 'bg-og-600 text-white hover:bg-og-500 shadow-md shadow-og-600/20'
              : 'text-void-600 bg-void-800/30'
            }
          `}
        >
          <Send size={15} />
        </button>
      </div>

      {disabled && (
        <p className="text-[10px] text-void-600 text-center mt-2">
          Connect your wallet to start chatting
        </p>
      )}
    </div>
  );
}
