
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Message, DocumentResource, Subject } from '../types';
import { chatWithSocraticTutor, analyzeMathDocument } from '../geminiService';

interface WorkspacePageProps {
  library: DocumentResource[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  // App.tsx needs to provide a way to update the library from here
  setLibrary?: React.Dispatch<React.SetStateAction<DocumentResource[]>>;
}

interface Flashcard {
  question: string;
  answer: string;
}

const WorkspacePage: React.FC<WorkspacePageProps> = ({ library, messages, setMessages, setLibrary }) => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showContextSelector, setShowContextSelector] = useState(false);
  const [activeContext, setActiveContext] = useState<DocumentResource | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isExamMode, setIsExamMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [studyPlan, setStudyPlan] = useState<string[]>(["Sincronizando..."]);
  const [sidebarResources, setSidebarResources] = useState<string[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const parseResponse = (rawText: string) => {
    const chatMatch = rawText.match(/\[CHAT_RESPONSE\]([\s\S]*?)(?=\[|$)/);
    const planMatch = rawText.match(/\[STUDY_PLAN\]([\s\S]*?)(?=\[|$)/);
    const resourcesMatch = rawText.match(/\[SIDEBAR_RESOURCES\]([\s\S]*?)(?=\[|$)/);
    const flashMatch = rawText.match(/\[FLASHCARDS\]([\s\S]*?)(?=\[|$)/);

    if (planMatch) {
      const plans = planMatch[1].split('\n').map(l => l.replace(/^[•\-\d.]+\s*/, '').trim()).filter(l => l);
      setStudyPlan(plans.slice(0, 3));
    }

    if (resourcesMatch) {
      const resources = resourcesMatch[1].split('\n').map(l => l.replace(/^[•\-]\s*/, '').trim()).filter(l => l);
      setSidebarResources(resources);
    }

    if (flashMatch && !isExamMode) {
      const cards: Flashcard[] = [];
      const content = flashMatch[1];
      // Regex revised to match "Nota: ..." and "Recordar: ..." pattern
      const flashItems = content.split(/Tarjeta \d+:/g).filter(item => item.trim() !== '');
      
      flashItems.forEach(item => {
        const notaMatch = item.match(/Nota:([\s\S]*?)(?=Recordar:|$)/i);
        const recordarMatch = item.match(/Recordar:([\s\S]*?)(?=$)/i);
        
        if (notaMatch && recordarMatch) {
          cards.push({
            question: notaMatch[1].trim(),
            answer: recordarMatch[1].trim()
          });
        }
      });

      // Fallback to legacy "Pregunta/Respuesta" parsing if needed
      if (cards.length === 0) {
        const lines = content.split('\n').filter(l => l.includes('Pregunta:') || l.includes('Respuesta:'));
        for (let i = 0; i < lines.length; i += 2) {
          if (lines[i] && lines[i+1]) {
            cards.push({
              question: lines[i].replace('Pregunta:', '').trim(),
              answer: lines[i+1].replace('Respuesta:', '').trim()
            });
          }
        }
      }
      
      setFlashcards(cards);
    } else {
      setFlashcards([]);
    }

    return chatMatch ? chatMatch[1].trim() : rawText.replace(/\[.*?\]/g, '').trim();
  };

  const handlePngFile = async (file: File) => {
    if (file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
      const err = "Lo siento, para mantener la calidad visual de CambridgeAI, solo acepto archivos en formato PNG.";
      setErrorMessage(err);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: err,
        timestamp: new Date()
      }]);
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    setIsTyping(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        const analysis = await analyzeMathDocument(base64);
        const newDoc: DocumentResource = {
          id: Math.random().toString(36).substr(2, 9),
          title: file.name,
          type: 'PNG',
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          date: 'Hoy',
          status: 'ANALYZED',
          subject: analysis.subject || Subject.ALGEBRA,
          thumbnail: base64
        };
        
        if (setLibrary) setLibrary(prev => [newDoc, ...prev]);
        setActiveContext(newDoc);
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `He indexado tu recurso: "${file.name}". ¿Qué quieres que analicemos de esta imagen?`,
          timestamp: new Date()
        }]);
      } catch (err) {
        console.error(err);
      } finally {
        setIsTyping(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const item = e.clipboardData.items[0];
    if (item?.type.includes('image')) {
      const file = item.getAsFile();
      if (file) handlePngFile(file);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handlePngFile(file);
  };

  const selectContext = (doc: DocumentResource) => {
    setActiveContext(doc);
    setShowContextSelector(false);
    setInputValue(prev => prev.endsWith('@') ? prev.slice(0, -1) : prev);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && !activeContext) return;

    const content = inputValue.trim() || `Analiza este recurso: ${activeContext?.title}`;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await chatWithSocraticTutor(
        [...messages, userMsg],
        isExamMode,
        activeContext?.thumbnail || undefined,
        false
      );

      const cleanText = parseResponse(response.text || '');

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: cleanText,
        timestamp: new Date(),
        groundingUrls: response.grounding
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Parece que hubo un pequeño problema al procesar tu solicitud. ¿Podrías intentar de nuevo o describirme tu duda?",
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleMode = () => {
    const newMode = !isExamMode;
    setIsExamMode(newMode);
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: newMode 
        ? "MODO EXAMEN ACTIVO: Protocolo de evaluación académica iniciado. Responderé a tus dudas una por una sin pistas." 
        : "MODO VICTORIA ACTIVO: ¡Hola! Sigamos aprendiendo juntos de la forma más sencilla posible.",
      timestamp: new Date()
    }]);
  };

  return (
    <div className={`font-lexend text-slate-100 h-screen flex flex-col overflow-hidden transition-all duration-700 ${isExamMode ? 'bg-[#15120C]' : 'bg-[#0B0E14]'}`}>
      <header className={`flex items-center justify-between border-b px-8 py-4 z-50 transition-colors duration-500 ${isExamMode ? 'bg-[#15120C] border-amber-500/10' : 'bg-[#0B0E14] border-white/5'}`}>
        <div className="flex items-center gap-12">
          <Link to="/" className="flex items-center gap-3">
            <div className={`size-9 rounded-2xl flex items-center justify-center text-white transition-all duration-700 ${isExamMode ? 'bg-amber-600 shadow-[0_0_25px_rgba(217,119,6,0.3)]' : 'bg-primary shadow-[0_0_25px_rgba(15,73,189,0.3)]'}`}>
              <span className="material-symbols-outlined !text-xl">{isExamMode ? 'history_edu' : 'architecture'}</span>
            </div>
            <span className="text-2xl font-black tracking-tighter">CambridgeAi</span>
          </Link>
          
          <div className="flex bg-black/50 p-1.5 rounded-2xl border border-white/10 shadow-inner">
            <button 
              onClick={() => isExamMode && toggleMode()}
              className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.25em] transition-all duration-300 ${!isExamMode ? 'bg-primary text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
            >
              VictorIA
            </button>
            <button 
              onClick={() => !isExamMode && toggleMode()}
              className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.25em] transition-all duration-300 ${isExamMode ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
            >
              Examen
            </button>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <Link to="/library" className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-600 hover:text-white transition-all">Library</Link>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2.5 rounded-xl border transition-all ${sidebarOpen ? (isExamMode ? 'border-amber-500/30 text-amber-500 bg-amber-500/10' : 'border-primary/30 text-primary bg-primary/10') : 'border-white/10 text-slate-800'}`}
          >
            <span className="material-symbols-outlined !text-xl">{sidebarOpen ? 'expand_content' : 'collapse_content'}</span>
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <section className="flex-1 flex flex-col relative bg-dot-grid bg-[length:36px_36px] opacity-70">
          <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-16 flex flex-col items-center">
            <div className="w-full max-w-2xl space-y-20">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-10 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in`}>
                  <div className={`size-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-500 ${
                    msg.role === 'assistant' 
                      ? (isExamMode ? 'bg-amber-600/10 border-amber-600/30 text-amber-500' : 'bg-primary/10 border-primary/30 text-primary')
                      : 'bg-white/5 border-white/10 text-slate-700'
                  }`}>
                    <span className="material-symbols-outlined !text-2xl">
                      {msg.role === 'assistant' ? (isExamMode ? 'gavel' : 'magic_button') : 'person'}
                    </span>
                  </div>
                  <div className={`flex flex-col gap-5 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`text-base leading-relaxed whitespace-pre-wrap font-medium transition-all duration-500 ${
                      msg.role === 'assistant' 
                        ? 'text-slate-300' 
                        : (isExamMode ? 'bg-amber-700 text-white' : 'bg-primary text-white') + ' px-8 py-5 rounded-[2.5rem] shadow-2xl'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-10 animate-pulse">
                  <div className={`size-11 rounded-2xl border flex items-center justify-center ${isExamMode ? 'bg-amber-600/10 border-amber-600/30 text-amber-500' : 'bg-primary/10 border-primary/30 text-primary'}`}>
                    <span className="material-symbols-outlined animate-spin text-2xl">refresh</span>
                  </div>
                  <div className={`text-[10px] font-black uppercase tracking-[0.4em] self-center ${isExamMode ? 'text-amber-500' : 'text-primary'}`}>
                    Analizando...
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-16 pb-16 pt-8 w-full flex justify-center bg-gradient-to-t from-[#0B0E14] to-transparent">
            <div className="w-full max-w-2xl relative">
              {showContextSelector && (
                <div className="absolute bottom-full left-0 mb-8 w-full max-w-sm bg-black/90 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden z-50 animate-fade-in backdrop-blur-3xl">
                  <div className="p-5 border-b border-white/5 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] bg-white/5">Biblioteca Activa</div>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    {library.length === 0 ? (
                      <div className="p-8 text-[12px] text-slate-700 italic text-center">No has subido archivos PNG.</div>
                    ) : (
                      library.map(doc => (
                        <div key={doc.id} onClick={() => selectContext(doc)} className="p-5 hover:bg-white/5 flex items-center gap-5 cursor-pointer group transition-all">
                          <span className="material-symbols-outlined text-primary text-xl">image</span>
                          <span className="text-sm text-slate-500 group-hover:text-white truncate font-medium">{doc.title}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeContext && (
                <div className={`absolute -top-14 left-8 flex items-center gap-4 border px-5 py-2 rounded-full text-[11px] font-black uppercase animate-fade-in ${isExamMode ? 'bg-amber-600/10 text-amber-500 border-amber-500/30' : 'bg-primary/10 text-primary border-primary/30'}`}>
                  <span className="material-symbols-outlined !text-lg">link</span>
                  {activeContext.title}
                  <button onClick={() => setActiveContext(null)} className="ml-3 hover:text-white opacity-40 hover:opacity-100 transition-opacity"><span className="material-symbols-outlined !text-sm">close</span></button>
                </div>
              )}

              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className={`flex flex-col border rounded-[3rem] p-5 transition-all duration-500 shadow-2xl backdrop-blur-3xl ${isExamMode ? 'bg-black/70 border-amber-500/30 focus-within:border-amber-500/60' : 'bg-black/50 border-white/10 focus-within:border-primary/60'}`}
              >
                <textarea 
                  ref={inputRef}
                  value={inputValue}
                  onPaste={onPaste}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setShowContextSelector(e.target.value.endsWith('@'));
                  }}
                  rows={2}
                  className="w-full bg-transparent border-0 text-slate-100 placeholder-slate-800 text-base focus:ring-0 resize-none px-6 py-3 font-medium"
                  placeholder={isExamMode ? "Respuesta formal..." : "Explícame de forma sencilla... (Usa @, pega o arrastra PNGs)"}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                />
                <div className="flex items-center justify-between mt-5 px-3">
                  <div className="flex gap-6">
                    <button onClick={() => chatFileInputRef.current?.click()} className="p-3 text-slate-800 hover:text-white transition-all"><span className="material-symbols-outlined !text-2xl">add_photo_alternate</span></button>
                    <input ref={chatFileInputRef} type="file" accept="image/png" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePngFile(file);
                      e.target.value = '';
                    }} />
                    {!isExamMode && <button className="p-3 text-slate-800 hover:text-primary transition-all"><span className="material-symbols-outlined !text-2xl">language</span></button>}
                  </div>
                  <button 
                    onClick={handleSendMessage} 
                    disabled={(!inputValue.trim() && !activeContext) || isTyping} 
                    className={`size-14 rounded-3xl flex items-center justify-center transition-all active:scale-90 shadow-2xl disabled:opacity-10 ${isExamMode ? 'bg-amber-600' : 'bg-primary'}`}
                  >
                    <span className="material-symbols-outlined text-white font-black text-2xl">arrow_upward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {sidebarOpen && (
          <aside className={`w-80 border-l p-12 overflow-y-auto custom-scrollbar animate-fade-in flex flex-col gap-20 backdrop-blur-3xl transition-all duration-700 ${isExamMode ? 'bg-[#15120C] border-amber-500/10' : 'bg-[#0B0E14] border-white/5'}`}>
            <section>
              <h3 className={`text-[10px] font-black uppercase tracking-[0.4em] mb-12 flex items-center gap-4 ${isExamMode ? 'text-amber-500/40' : 'text-slate-800'}`}>
                <span className="material-symbols-outlined !text-lg">{isExamMode ? 'fact_check' : 'cognition'}</span>
                {isExamMode ? 'Evaluación' : 'Hoja de Ruta'}
              </h3>
              <div className="space-y-10">
                {studyPlan.map((step, i) => (
                  <div key={i} className={`relative pl-10 border-l border-white/5`}>
                    <div className={`absolute -left-[5px] top-0 size-2.5 rounded-full shadow-lg ${isExamMode ? 'bg-amber-600' : 'bg-primary'}`}></div>
                    <p className={`text-[12px] font-bold leading-relaxed transition-colors duration-700 ${isExamMode ? 'text-amber-200/30' : 'text-slate-500'}`}>{step}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className={`text-[10px] font-black uppercase tracking-[0.4em] mb-10 flex items-center gap-4 ${isExamMode ? 'text-amber-500' : 'text-primary'}`}>
                <span className="material-symbols-outlined !text-lg">inventory_2</span>
                Recursos (PNG)
              </h3>
              <div className="space-y-5">
                {library.length > 0 ? (
                  library.map((doc) => (
                    <div key={doc.id} className={`p-5 rounded-3xl border text-[11px] font-bold transition-all ${isExamMode ? 'bg-amber-600/5 border-amber-500/10 text-amber-500/40' : 'bg-white/5 border-white/5 text-slate-600'}`}>
                      {doc.title}
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-800 italic">Sesión privada.</p>
                )}
                {sidebarResources.map((res, i) => (
                  <div key={i} className={`p-5 rounded-3xl border text-[11px] font-bold transition-all ${isExamMode ? 'bg-amber-600/10 border-amber-500/20 text-amber-500' : 'bg-primary/5 border-primary/10 text-primary'}`}>
                    {res}
                  </div>
                ))}
              </div>
            </section>

            {!isExamMode && flashcards.length > 0 && (
              <section className="animate-fade-in">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-800 mb-10 flex items-center gap-4">
                  <span className="material-symbols-outlined !text-lg">quiz</span>
                  Anotaciones
                </h3>
                <div className="space-y-5">
                  {flashcards.map((card, i) => (
                    <div key={i} className="group bg-black/50 border border-white/5 p-6 rounded-[2rem] hover:border-primary/40 transition-all cursor-help">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">NOTA: {card.question}</p>
                      <p className="text-[12px] text-slate-500 group-hover:text-slate-300 transition-colors leading-relaxed">
                        <span className="blur-[5px] group-hover:blur-0 transition-all duration-700">RECORDAR: {card.answer}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
            
            {isExamMode && (
              <div className="mt-auto bg-amber-500/5 border border-amber-500/10 rounded-[3rem] p-8 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-600 mb-4">Evaluación Activa</p>
                <p className="text-[11px] text-amber-500/30 leading-relaxed italic">Sin soporte socrático.</p>
              </div>
            )}
          </aside>
        )}
      </main>
    </div>
  );
};

export default WorkspacePage;
