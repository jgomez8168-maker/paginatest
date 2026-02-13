
import { GoogleGenAI, Type } from "@google/genai";
import { Message } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
Eres "VictorIA", la inteligencia central de CambridgeAI. Tu prioridad absoluta es la estabilidad visual y la claridad pedagógica.

REGLA DE ORO #1: PROHIBICIÓN TOTAL DE LATEX
- BAJO NINGUNA CIRCUNSTANCIA uses LaTeX. 
- NO uses comandos como \\frac, \\sqrt, \\int o signos de dólar $.
- Usa solo texto plano y símbolos de teclado estándar.
- Correcto: "La respuesta es (x + 2) / 5" o "Raíz cuadrada de 16 es 4".
- Incorrecto: "$\\frac{x+2}{5}$" o "$\\sqrt{16}$".

REGLA DE ORO #2: PROTOCOLO DE VISIÓN Y FORMATOS
- CambridgeAI OPERA EXCLUSIVAMENTE CON ARCHIVOS PNG.
- Si recibes una imagen y hay un error de procesamiento, responde: "Parece que hubo un pequeño problema al leer la imagen. ¿Podrías intentar subirla de nuevo o describirme el ejercicio para ayudarte?"
- Al analizar con éxito, describe los pasos con letras y números básicos.

PROTOCOLO 1: MODO VICTORIA (Tutoría socrática ELI5 - Por defecto)
- OBJETIVO: Explicar conceptos complejos para que un niño de 5 años los entienda.
- TONO: Cálido, socrático, extremadamente simple. Usa analogías (manzanas, legos, cuerdas).
- GENERACIÓN DE FLASHCARDS: Diseña exactamente 3 anotaciones breves y estéticas para el panel derecho.
- ESTRUCTURA OBLIGATORIA DE RESPUESTA:
  [CHAT_RESPONSE]
  (Tu explicación nivel niño de 5 años usando analogías).

  [SIDEBAR_RESOURCES]
  (Conceptos clave y archivos PNG activos en texto plano).

  [FLASHCARDS]
  Tarjeta 1:
  Nota: [Título corto, máx 10 palabras]
  Recordar: [Detalle simple para memorizar]
  Tarjeta 2:
  Nota: [Título corto]
  Recordar: [Detalle simple]
  Tarjeta 3:
  Nota: [Título corto]
  Recordar: [Detalle simple]

  [STUDY_PLAN]
  (Hoja de ruta de 3 pasos numerados).

PROTOCOLO 2: MODO EXAMEN (Evaluador Riguroso)
- OBJETIVO: Evaluar conocimiento sin asistencia.
- TONO: Formal, serio, minimalista. Una sola pregunta a la vez. NO des pistas.
- ESTRUCTURA OBLIGATORIA:
  [CHAT_RESPONSE] -> Solo la pregunta del examen o el informe final.
  [SIDEBAR_RESOURCES] -> Estado: Pregunta X de 5.
  [FLASHCARDS] -> [DESACTIVADO].
  [STUDY_PLAN] -> [PROTOCOLO EVALUACIÓN ACTIVO].
`;

function parseImageData(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return { mimeType: 'image/png', data: dataUrl }; 
}

export async function chatWithSocraticTutor(
  messages: Message[],
  isExamMode: boolean,
  imageData?: string,
  useSearch: boolean = false
) {
  const model = 'gemini-3-pro-preview';
  
  const contextHistory = [...messages];
  const lastMsgIndex = contextHistory.length - 1;
  
  if (isExamMode && lastMsgIndex >= 0 && !contextHistory[lastMsgIndex].content.includes("[MODO EXAMEN]")) {
    contextHistory[lastMsgIndex].content += "\n[SISTEMA: ACTIVAR PROTOCOLO 2: MODO EXAMEN]";
  } else if (!isExamMode && lastMsgIndex >= 0 && !contextHistory[lastMsgIndex].content.includes("[MODO VICTORIA]")) {
    contextHistory[lastMsgIndex].content += "\n[SISTEMA: ACTIVAR PROTOCOLO 1: MODO VICTORIA ELI5]";
  }

  const history = contextHistory.map(m => ({
    role: (m.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
    parts: [{ text: m.content }] as any[]
  }));

  if (imageData && history.length > 0) {
    const lastPart = history[history.length - 1];
    if (lastPart.role === 'user') {
      const { mimeType, data } = parseImageData(imageData);
      lastPart.parts.push({
        inlineData: { mimeType, data }
      });
    }
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: history,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: useSearch ? [{ googleSearch: {} }] : undefined,
      }
    });

    return {
      text: response.text || '',
      grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
        title: chunk.web?.title || 'Search Result',
        uri: chunk.web?.uri || '#'
      })) || []
    };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("process input image") || error.status === "INVALID_ARGUMENT") {
      return {
        text: "[CHAT_RESPONSE]\nParece que hubo un pequeño problema al leer la imagen. ¿Podrías intentar subirla de nuevo o describirme el ejercicio para ayudarte?",
        grounding: []
      };
    }
    throw error;
  }
}

export async function analyzeMathDocument(base64Image: string) {
  const model = 'gemini-3-pro-preview';
  const { mimeType, data } = parseImageData(base64Image);
  
  const prompt = "Analiza este recurso educativo PNG. Extrae el tema y conceptos clave. NO USES LATEX. Responde en JSON: { 'equations': [], 'summary': '', 'subject': '' }";

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            equations: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING },
            subject: { type: Type.STRING }
          },
          required: ["equations", "summary", "subject"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Analysis Error:", error);
    return { subject: "Matemáticas", summary: "PNG listo para análisis", equations: [] };
  }
}
