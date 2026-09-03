import { GoogleGenAI, Type, Schema } from '@google/genai';

export async function scanDocumentWithGemini(base64Image: string) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("No se ha configurado VITE_GEMINI_API_KEY en el archivo .env");
  }

  const ai = new GoogleGenAI({ apiKey });
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      documentType: { type: Type.STRING, enum: ['DNI', 'PASSPORT'] },
      dniPassport: { type: Type.STRING, description: 'Número de DNI, NIE o Pasaporte' },
      firstName: { type: Type.STRING, description: 'Nombre del titular' },
      lastName: { type: Type.STRING, description: 'Apellidos del titular' },
      nationality: { type: Type.STRING, description: 'Nacionalidad (ej: ESPAÑOLA)' },
      birthDate: { type: Type.STRING, description: 'Fecha de nacimiento en formato YYYY-MM-DD' },
      expiryDate: { type: Type.STRING, description: 'Fecha de caducidad en formato YYYY-MM-DD' },
    },
    required: ['documentType', 'dniPassport', 'firstName', 'lastName']
  };

  // Nombres de modelos con guiones estándar ASCII (-)
  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError: any = null;

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Tiempo de espera agotado (15s). Revisa la imagen o intenta de nuevo.")), 15000)
  );

  for (const modelName of modelsToTry) {
    try {
      const apiCall = ai.models.generateContent({
        model: modelName,
        contents: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: 'Analiza la imagen adjunta de este documento de identidad (DNI español, NIE o Pasaporte). Extrae con máxima precisión los datos personales del titular en formato JSON exacto.'
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema
        }
      });

      const response = (await Promise.race([apiCall, timeoutPromise])) as any;

      if (response && response.text) {
        return JSON.parse(response.text);
      }
    } catch (err: any) {
      console.warn(`Intento fallido con ${modelName}:`, err);
      lastError = err;
      if (err.message?.includes('Tiempo de espera agotado')) break;
    }
  }

  throw new Error(lastError?.message || "Error al analizar el documento.");
}