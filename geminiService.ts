import { GoogleGenAI, Type } from "@google/genai";
import { TextileRecord } from "../types";

export const analyzeRecords = async (records: TextileRecord[]) => {
  if (records.length === 0) return "No records to analyze.";
  
  // Re-initialize client to ensure latest API key from environment
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `Analyze these textile stock records and provide a brief summary of production flow.
  Records: ${JSON.stringify(records.map(r => ({ 
    dori: r.doriDetail, 
    warpin: r.warpinDetail, 
    bheem: r.bheemDetail, 
    delivery: r.deliveryDetail 
  })))}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });
    // response.text is a getter, not a method
    return response.text || "Summary generated successfully.";
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return "Insights are currently unavailable.";
  }
};

export const suggestRecordMetadata = async (description: string) => {
  // Re-initialize client to ensure latest API key from environment
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `From the following textile note, extract: Dori Detail, Warpin Detail, Bheem Detail, and Delivery Detail.
  Note: "${description}"`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            doriDetail: { type: Type.STRING },
            warpinDetail: { type: Type.STRING },
            bheemDetail: { type: Type.STRING },
            deliveryDetail: { type: Type.STRING }
          },
          required: ["doriDetail", "warpinDetail", "bheemDetail", "deliveryDetail"]
        }
      }
    });
    
    // Safely parse JSON from response.text property
    const text = response.text;
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error("AI Extraction failed:", error);
    return null;
  }
};