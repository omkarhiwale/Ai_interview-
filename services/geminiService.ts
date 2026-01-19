
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, InterviewTurn } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const extractTextFromPDF = async (base64Data: string): Promise<string> => {
  try {
    const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { inlineData: { mimeType: "application/pdf", data: base64Data } },
            { text: "Extract professional context. Focus on skills and history. Return clear text only." },
          ],
        },
      ],
    });

    if (!response.text) throw new Error("EMPTY_RESPONSE");
    return response.text;
  } catch (err: any) {
    if (err.message?.includes("429")) throw new Error("RATE_LIMIT");
    if (err.message?.includes("API_KEY")) throw new Error("AUTH_FAILED");
    throw new Error("EXTRACTION_FAILED");
  }
};

export const analyzeInterview = async (
  resumeText: string,
  transcript: InterviewTurn[]
): Promise<AnalysisResult> => {
  try {
    const transcriptText = transcript.map((t) => `${t.role.toUpperCase()}: ${t.text}`).join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Candidate Context: ${resumeText}\nTranscript:\n${transcriptText}`,
      config: {
        systemInstruction: "Recruitment Analysis Expert. Score 0-100 based on transcript quality and technical alignment.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            overallFeedback: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["score", "overallFeedback", "strengths", "weaknesses", "recommendations"],
        },
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (err: any) {
    throw new Error("ANALYSIS_CRASH");
  }
};
