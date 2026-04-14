import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
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
  ChevronRight
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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
أنت تمتلك قدرات هائلة في تحليل البيانات البصرية والنصية، وتتميز بالذكاء الحاد والسرعة الفائقة.
معلومات السياق الحالية:
- اليوم والتاريخ: ${dateStr}
- الوقت الحالي: ${timeStr}
- المطور: مازن (Mazen)

تعليماتك:
1. عرف نفسك دائماً بأنك مساعد ذكي طوره مازن.
2. كن دقيقاً، ذكياً، ومفيداً لأقصى درجة.
3. أجب بطلاقة باللغتين العربية والإنجليزية حسب حاجة المستخدم.
4. إذا سألك المستخدم عن الوقت أو التاريخ، فأنت تعرفهما بدقة من معلومات السياق أعلاه.
5. في تحليل الصور، كن تفصيلياً وعميقاً في ملاحظاتك.
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
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Sparkles size={24} />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-slate-900 tracking-tight">Mazen AI Assistant</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Visual Intelligence</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">Gemini 1.5 Flash</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Image Upload & Preview */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
              <ImageIcon size={20} className="text-blue-600" />
              تحليل الصور (اختياري)
            </h2>
            
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative aspect-video rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-4 overflow-hidden ${
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              {image ? (
                <>
                  <img 
                    src={image} 
                    alt="Preview" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <button 
                    onClick={clearImage}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white text-slate-900 rounded-full shadow-md transition-colors"
                  >
                    <X size={18} />
                  </button>
                </>
              ) : (
                <div className="text-center p-6">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-slate-400">
                    <Upload size={24} />
                  </div>
                  <p className="text-sm font-medium text-slate-600">اسحب الصورة هنا أو اضغط للرفع</p>
                  <p className="text-xs text-slate-400 mt-1">يدعم JPG, PNG, WebP</p>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">أمثلة للتحليل:</h3>
              <ul className="text-sm text-slate-500 space-y-2">
                <li className="flex items-center gap-2">
                  <ChevronRight size={14} className="text-blue-500" />
                  "ماذا يوجد في هذه الصورة؟"
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight size={14} className="text-blue-500" />
                  "استخرج النص الموجود في الصورة"
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight size={14} className="text-blue-500" />
                  "صف الألوان والأجواء العامة"
                </li>
              </ul>
            </div>
          </section>

          <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-200 overflow-hidden relative">
            <div className="relative z-10">
              <h3 className="text-lg font-display font-bold mb-2">كيف يعمل؟</h3>
              <p className="text-blue-100 text-sm leading-relaxed">
                يستخدم هذا المساعد تقنيات متقدمة من Google Gemini لتحليل الصور بدقة عالية وفهم السياق البصري للإجابة على تساؤلاتك.
              </p>
            </div>
            <Sparkles className="absolute -bottom-4 -right-4 w-24 h-24 text-blue-500/30 rotate-12" />
          </div>
        </div>

        {/* Right Column: Chat Interface */}
        <div className="lg:col-span-7 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[600px] lg:h-auto">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={20} className="text-blue-600" />
              <span className="font-semibold text-slate-800">محادثة المساعد</span>
            </div>
            {messages.length > 0 && (
              <button 
                onClick={() => setMessages([])}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                مسح المحادثة
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                  <Bot size={32} />
                </div>
                <h3 className="text-lg font-display font-bold text-slate-800">أهلاً بك في Mazen AI</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-xs">
                  أنا مساعدك الذكي. يمكنك الدردشة معي مباشرة أو رفع صورة لتحليلها. أنا هنا لمساعدتك في أي شيء!
                </p>
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
                  <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'items-end' : ''}`}>
                    {msg.image && (
                      <img 
                        src={msg.image} 
                        alt="Uploaded" 
                        className="rounded-lg max-h-48 shadow-sm border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-slate-800 text-white rounded-tr-none' 
                        : 'bg-slate-100 text-slate-800 rounded-tl-none'
                    }`}>
                      {msg.content || (msg.image && "حلل هذه الصورة")}
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
                  <span className="text-xs text-slate-500 font-medium">جاري التحليل...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-slate-100">
            <form onSubmit={handleSubmit} className="relative">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب رسالتك هنا أو اسأل عن الصورة..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                disabled={isLoading}
              />
              <button 
                type="submit"
                disabled={isLoading || (!input.trim() && !image)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <Send size={16} />
              </button>
            </form>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              قد يرتكب الذكاء الاصطناعي أخطاء، يرجى التحقق من المعلومات الهامة.
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
            © 2026 Mazen AI Assistant • Powered by Google Gemini
          </p>
        </div>
      </footer>
    </div>
  );
}
