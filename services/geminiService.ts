
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, InterviewTurn } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Uses Gemini Flash to extract text content from a PDF file.
 */
export const extractTextFromPDF = async (base64Data: string): Promise<string> => {
  // Create a fresh instance for the call
  const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Data,
            },
          },
          { text: "Extract all professional text content from this resume PDF. Focus on experience, skills, education, and projects. Return only the extracted text content clearly." },
        ],
      },
    ],
  });

  return response.text || "";
};

export const analyzeInterview = async (
  resumeText: string,
  transcript: InterviewTurn[]
): Promise<AnalysisResult> => {
  const transcriptText = transcript
    .map((t) => `${t.role.toUpperCase()}: ${t.text}`)
    .join("\n");

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following technical interview between a candidate (USER) and an AI (MODEL). 
    Candidate Resume Context: ${resumeText}
    Interview Transcript:
    ${transcriptText}`,
    config: {
      systemInstruction: "You are a senior recruiter at a top tech company. Provide a fair, data-driven score and feedback.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: "A score from 0-100" },
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
};
