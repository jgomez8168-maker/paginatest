
import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden font-lexend animate-fade-in bg-[#0B0E14]">
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0E14] via-[#081024] to-[#05080f] opacity-95"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px]"></div>
      </div>

      <header className="relative z-20 flex items-center justify-center w-full py-12">
        <div className="flex items-center gap-4 text-white">
          <div className="size-10 flex items-center justify-center rounded-2xl bg-primary shadow-[0_0_25px_rgba(15,73,189,0.3)]">
            <span className="material-symbols-outlined text-white text-2xl">architecture</span>
          </div>
          <span className="text-3xl font-black tracking-tighter">CambridgeAi</span>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="max-w-3xl flex flex-col items-center gap-10">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/5 bg-white/5 px-6 py-2 backdrop-blur-xl">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Deep Reasoning Engine Active</span>
          </div>
          
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white leading-none">
            Mastery <br/>
            <span className="text-primary italic font-serif font-normal">Simplified.</span>
          </h1>
          
          <p className="max-w-lg text-xl md:text-2xl font-medium leading-relaxed text-slate-500">
            Socratic depth for modern minds. <br/>
            <span className="text-slate-700 text-lg font-normal">Private, focused, distraction-free environment.</span>
          </p>

          <div className="mt-8 group relative">
            <div className="absolute -inset-1 rounded-2xl bg-primary opacity-20 blur-2xl group-hover:opacity-40 transition duration-700"></div>
            <button 
              onClick={() => navigate('/library')} 
              className="relative flex min-w-[280px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-white h-16 px-10 text-[#0B0E14] text-xl font-black tracking-tight shadow-2xl hover:scale-[1.03] active:scale-95 transition-all duration-500"
            >
              Initialize Session
              <span className="material-symbols-outlined ml-3 text-2xl">bolt</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="relative z-20 w-full px-8 py-12 mt-auto">
        <div className="flex items-center justify-center border-t border-white/5 pt-10">
          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-800">CambridgeAi • Privacy Focused • v2.5</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
