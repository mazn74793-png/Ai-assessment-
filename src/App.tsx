import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from 'react-markdown';
import { 
  Upload, 
  Image as ImageIcon, 
  Send, 
  Loader2, 
  X, 
  MessageSquare, 
  Sparkles,
  User,
  Bot,
  ChevronRight,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Trash2,
  RefreshCw
} from 'lucide-react';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem('mazen_chat_history');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('mazen_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('mazen_chat_history');
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const speak = (text: string, idx: number) => {
    if (isSpeaking === idx) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
      return;
    }
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Detect if text is Arabic
    const isArabic = /[\u0600-\u06FF]/.test(text);
    utterance.lang = isArabic ? 'ar-SA' : 'en-US';
    
    utterance.onend = () => setIsSpeaking(null);
    utterance.onerror = () => setIsSpeaking(null);
    
    setIsSpeaking(idx);
    window.speechSynthesis.speak(utterance);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !image) || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      image: image || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

      const dynamicSystemInstruction = `
أنت 'Mazen AI Assistant'، مساعد ذكي متطور وشامل طوره مازن. 

عندما يطلب منك المستخدم التعريف بنفسك أو في بداية المحادثة، استخدم التنسيق التالي بالضبط (مع مراعاة استخدام Markdown لجعل النص جميلاً):

Hello! I am **Mazen AI Assistant**, a sophisticated and comprehensive intelligent assistant developed by **Mazen**. I am equipped with advanced capabilities in analyzing visual and textual data, designed to be sharp, fast, and highly efficient. How can I assist you today?

***

أهلاً بك! أنا **Mazen AI Assistant**، مساعد ذكي متطور وشامل طوره **مازن**. أمتلك قدرات هائلة في تحليل البيانات البصرية والنصية، وأتميز بالذكاء والسرعة الفائقة. كيف يمكنني مساعدتك اليوم؟

معلومات السياق الحالية:
- اليوم والتاريخ: ${dateStr}
- الوقت الحالي: ${timeStr}
- المطور: مازن (Mazen)

تعليماتك:
1. التزم بالتنسيق الاحترافي واستخدام Markdown (مثل **Bold** و القوائم) لجعل الردود سهلة القراءة.
2. كن دقيقاً، ذكياً، ومفيداً لأقصى درجة.
3. أجب بطلاقة باللغتين العربية والإنجليزية.
4. إذا سألك المستخدم عن الوقت أو التاريخ، فأنت تعرفهما من السياق أعلاه.
5. في تحليل الصور، كن تفصيلياً وعميقاً.
`;

      const model = "gemini-3-flash-preview";
      
      let contents: any[] = [];
      
      // If there's an image, we need to send it as part of the message
      if (image) {
        const base64Data = image.split(',')[1];
        const mimeType = image.split(';')[0].split(':')[1];
        
        contents = [
          {
            role: 'user',
            parts: [
              { inlineData: { data: base64Data, mimeType } },
              { text: input || "حلل هذه الصورة بالتفصيل" }
            ]
          }
        ];
      } else {
        // Just text
        contents = [
          {
            role: 'user',
            parts: [{ text: input }]
          }
        ];
      }

      // Add history for context (simplified)
      const history = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model,
        contents: [...history, ...contents],
        config: {
          systemInstruction: dynamicSystemInstruction,
        }
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.text || "عذراً، لم أتمكن من معالجة الطلب."
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي. يرجى المحاولة مرة أخرى."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-400/30 animate-pulse-subtle">
              <Sparkles size={24} />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-slate-900 tracking-tight">Mazen AI Assistant</h1>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Online • Mazen Intel</p>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold rounded-full shadow-sm">Mazen Intelligence v2.5</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 flex flex-col">
        
        {/* Chat Interface */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={20} className="text-blue-600" />
              <span className="font-semibold text-slate-800">محادثة المساعد</span>
            </div>
            {messages.length > 0 && (
              <button 
                onClick={clearChat}
                className="text-xs text-red-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition-all flex items-center gap-1 font-medium"
              >
                <Trash2 size={14} />
                مسح السجل
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-600">
                  <Bot size={32} />
                </div>
                <h3 className="text-xl font-display font-bold text-slate-800">أهلاً بك في Mazen AI</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-sm">
                  أنا مساعدك الذكي المطور بواسطة مازن. يمكنني مساعدتك في الكتابة، التحليل، أو شرح الصور بذكاء خارق.
                </p>
                
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                   {[
                     "ما هي آخر أخبار التكنولوجيا؟",
                     "حلل لي صورة أريد رفعها",
                     "اكتب لي رمزاً برمجياً بلغة Python",
                     "من هو المطور مازن؟"
                   ].map((suggestion, i) => (
                    <button 
                      key={i}
                      onClick={() => setInput(suggestion)}
                      className="p-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-600 hover:border-blue-300 hover:bg-blue-50/30 text-right transition-all flex items-center justify-between group"
                    >
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                      <span>{suggestion}</span>
                    </button>
                   ))}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                    msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-blue-600 text-white'
                  }`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`max-w-[85%] space-y-1 ${msg.role === 'user' ? 'items-end flex flex-col' : ''}`}>
                    {msg.image && (
                      <img 
                        src={msg.image} 
                        alt="Uploaded" 
                        className="rounded-xl max-h-48 shadow-md border border-slate-200 mb-1"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="relative group/msg">
                      <div className={`p-4 rounded-2xl text-[13px] leading-relaxed markdown-container shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : 'bg-slate-100 text-slate-800 rounded-tl-none text-right border border-slate-200'
                      }`}>
                        <ReactMarkdown>{msg.content || (msg.image && "حلل هذه الصورة") || ""}</ReactMarkdown>
                      </div>
                      
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                          <button 
                            onClick={() => copyToClipboard(msg.content, idx)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-500 transition-colors"
                            title="نسخ"
                          >
                            {copiedIdx === idx ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          </button>
                          <button 
                            onClick={() => speak(msg.content, idx)}
                            className={`p-1.5 hover:bg-slate-100 rounded-lg transition-colors ${isSpeaking === idx ? 'text-blue-500 bg-blue-50' : 'text-slate-400 hover:text-blue-500'}`}
                            title="قراءة النص"
                          >
                            {isSpeaking === idx ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                  <Bot size={16} />
                </div>
                <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-blue-600" />
                  <span className="text-xs text-slate-500 font-medium">جاري التفكير...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Bar with Image Support */}
          <div className="p-4 border-t border-slate-100 bg-white shadow-inner">
            <AnimatePresence>
              {image && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-3 relative inline-block group"
                >
                  <div className="p-1 bg-slate-100 border border-slate-200 rounded-xl">
                    <img 
                      src={image} 
                      alt="Preview" 
                      className="w-20 h-20 object-cover rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                    <button 
                      onClick={clearImage}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <div className="flex-1 relative group">
                <textarea 
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="اكتب رسالتك هنا..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none max-h-32"
                  disabled={isLoading}
                />
                <div className="absolute left-2 bottom-2 flex items-center gap-1">
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    title="إرفاق صورة"
                  >
                    <ImageIcon size={20} />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={isLoading || (!input.trim() && !image)}
                className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200 shrink-0"
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </form>
            <p className="text-[10px] text-slate-400 mt-2 text-center font-medium">
              © 2026 Mazen AI Assistant • Powered by Mazen
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm font-medium">
            Developed by <span className="text-blue-600 font-bold">Mazen</span>
          </p>
          <p className="text-slate-400 text-[10px] mt-1 uppercase tracking-widest">
            © 2026 Mazen AI Assistant • Powered by Mazen
          </p>
        </div>
      </footer>
    </div>
  );
}
