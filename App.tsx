
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './screens/LandingPage';
import LibraryPage from './screens/LibraryPage';
import WorkspacePage from './screens/WorkspacePage';
import { DocumentResource, Message } from './types';

const App: React.FC = () => {
  // Protocolo CambridgeAI: Iniciar con biblioteca vacía para privacidad total del usuario
  const [library, setLibrary] = useState<DocumentResource[]>([]);
  
  // Memoria Continua: Persistencia de chat entre rutas
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'assistant',
      content: "Hola. Soy VictorIA. Tu unidad de procesamiento cognitivo.\n¿Qué concepto matemático desafiaremos hoy?",
      timestamp: new Date()
    }
  ]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/library" 
          element={<LibraryPage resources={library} setResources={setLibrary} />} 
        />
        <Route 
          path="/workspace" 
          element={<WorkspacePage library={library} setLibrary={setLibrary} messages={messages} setMessages={setMessages} />} 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
