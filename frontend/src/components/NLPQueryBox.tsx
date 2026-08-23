import { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import api from '@/lib/api';

export default function NLPQueryBox() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const suggestedPrompts = [
    "How much did I spend on food last month?",
    "Show my biggest expenses",
    "What subscriptions should I cancel?",
    "Can I save ₹5000 this month?"
  ];

  const handleAsk = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setAnswer('');
    try {
      const response = await api.post('/ai/ask', { question: text });
      setAnswer(response.data.answer);
    } catch (e) {
      setAnswer('Failed to get answer from AI. Please make sure your server is active.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="apple-card p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-emerald-500" />
        <h2 className="text-lg font-bold tracking-tight">AI Financial Assistant</h2>
      </div>

      {/* Suggested chips */}
      <div className="flex flex-wrap gap-2">
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => {
              setQuestion(prompt);
              handleAsk(prompt);
            }}
            className="px-3 py-1.5 bg-[#f5f5f7] hover:bg-black hover:text-white rounded-full text-xs font-medium text-apple-gray-300 transition-all"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk(question);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask something... e.g. How much did I spend on Swiggy?"
          className="flex-1 px-4 py-3 rounded-xl border border-[#e8e8ed] text-sm focus:outline-none focus:border-black transition-all bg-[#f5f5f7]/50"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white p-3 rounded-xl hover:bg-black/90 disabled:opacity-50 active:scale-95 transition-all shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Answer Output */}
      {(loading || answer) && (
        <div className="p-4 bg-apple-gray-50 border border-[#e8e8ed] rounded-2xl text-sm leading-relaxed space-y-2">
          <p className="text-xs uppercase font-bold text-apple-gray-300 tracking-wider">Assistant Response</p>
          {loading ? (
            <div className="flex items-center gap-2 text-apple-gray-300 animate-pulse">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
              Analyzing your financial timeline...
            </div>
          ) : (
            <div className="whitespace-pre-line text-apple-gray-400 font-medium">
              {answer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
