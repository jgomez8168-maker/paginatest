
import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DocumentResource, Subject } from '../types';
import { analyzeMathDocument } from '../geminiService';

interface LibraryPageProps {
  resources: DocumentResource[];
  setResources: React.Dispatch<React.SetStateAction<DocumentResource[]>>;
}

const LibraryPage: React.FC<LibraryPageProps> = ({ resources, setResources }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Strict PNG restriction
    if (file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
      setErrorMessage("Lo siento, para mantener la calidad visual de CambridgeAI, solo acepto archivos en formato PNG.");
      setTimeout(() => setErrorMessage(null), 5000);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
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
        setResources(prev => [newDoc, ...prev]);
      } catch (err) {
        const newDoc: DocumentResource = {
          id: Math.random().toString(36).substr(2, 9),
          title: file.name,
          type: 'PNG',
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          date: 'Hoy',
          status: 'ANALYZED',
          subject: Subject.ALGEBRA,
          thumbnail: base64
        };
        setResources(prev => [newDoc, ...prev]);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-background-dark min-h-screen text-slate-100 font-sans selection:bg-primary/40 antialiased">
      <header className="w-full border-b border-white/5 bg-background-dark/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="bg-primary size-8 rounded-lg flex items-center justify-center text-white shadow-[0_0_15px_rgba(15,73,189,0.3)] group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined !text-xl">architecture</span>
              </div>
              <span className="text-xl font-lexend font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                CambridgeAi
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/library" className="text-sm font-bold text-primary border-b-2 border-primary py-5">Library</Link>
              <Link to="/workspace" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Socratic Workspace</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-lexend font-black mb-3">Biblioteca Personal</h1>
          <p className="text-slate-500 max-w-md mx-auto">Gestiona tus recursos matemáticos PNG para el análisis profundo.</p>
        </div>

        <section className="mb-20">
          <div 
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`relative group cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-500 ${isUploading ? 'border-primary bg-primary/5' : 'border-white/10 hover:border-primary/50 bg-workspace-dark/30 hover:bg-workspace-dark/50'} p-12 flex flex-col items-center justify-center`}
          >
            {errorMessage && (
              <div className="absolute top-4 px-6 py-2 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-full animate-fade-in z-10">
                {errorMessage}
              </div>
            )}
            <div className={`mb-6 size-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${isUploading ? 'bg-primary animate-spin' : 'bg-white/5 group-hover:bg-primary/20 group-hover:text-primary text-slate-400'}`}>
              <span className="material-symbols-outlined !text-4xl">{isUploading ? 'sync' : 'add_photo_alternate'}</span>
            </div>
            <h3 className="text-xl font-bold mb-2">{isUploading ? 'Analizando...' : 'Subir Recurso PNG'}</h3>
            <button className="bg-primary text-white font-bold px-8 py-3 rounded-xl shadow-xl shadow-primary/20 transition-all" disabled={isUploading}>Seleccionar PNG</button>
            <input ref={fileInputRef} className="hidden" type="file" accept="image/png" onChange={handleFileUpload} />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-lexend font-bold mb-8 border-b border-white/5 pb-4">Archivos Guardados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((doc) => (
              <div 
                key={doc.id}
                onClick={() => navigate('/workspace')}
                className="group bg-workspace-dark/40 border border-white/5 rounded-2xl p-4 hover:border-primary/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-primary/10">
                    <span className="material-symbols-outlined text-primary !text-3xl">image</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-200 truncate group-hover:text-white">{doc.title}</h4>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">{doc.type} • {doc.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default LibraryPage;
