
import React, { useState } from 'react';
import { ResumeData } from '../types';
import { extractTextFromPDF } from '../services/geminiService';
import { blobToBase64 } from '../utils/audioUtils';

interface Props {
  onUpload: (data: ResumeData) => void;
}

export const ResumeUploader: React.FC<Props> = ({ onUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isTXT = file.type === 'text/plain' || file.name.endsWith('.txt');

    if (!isPDF && !isTXT) {
      setError('Please upload a .pdf or .txt file.');
      return;
    }

    setIsProcessing(true);
    try {
      if (isPDF) {
        const base64 = await blobToBase64(file);
        const extractedText = await extractTextFromPDF(base64);
        if (!extractedText) throw new Error("Could not extract text from PDF.");
        onUpload({ text: extractedText, fileName: file.name });
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          onUpload({ text, fileName: file.name });
        };
        reader.readAsText(file);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to process file. Please try a different document or a text file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  if (isProcessing) {
    return (
      <div className="max-w-xl mx-auto p-12 rounded-2xl glass-effect mt-12 flex flex-col items-center justify-center text-center">
        <div className="relative mb-8">
          <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <i className="fa-solid fa-file-pdf text-blue-400 text-xl animate-pulse"></i>
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">Analyzing Document</h2>
        <p className="text-slate-400">Our AI is extracting professional details from your resume...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-8 rounded-2xl glass-effect mt-12">
      <h2 className="text-3xl font-bold mb-4 text-center text-blue-400">Step 1: Upload Resume</h2>
      <p className="text-slate-400 text-center mb-8">
        Upload your resume (.pdf or .txt) to let our AI personalize your interview experience.
      </p>

      <div
        className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-all ${
          isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-blue-400'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        <div className="flex gap-4 mb-4">
          <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <i className="fa-solid fa-file-pdf text-2xl text-red-400"></i>
          </div>
          <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <i className="fa-solid fa-file-lines text-2xl text-blue-400"></i>
          </div>
        </div>
        <p className="text-lg font-medium mb-2">Drag and drop your resume</p>
        <p className="text-sm text-slate-500 mb-6">Supported formats: .pdf, .txt</p>
        
        <label className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors font-semibold">
          Browse Files
          <input type="file" className="hidden" accept=".pdf,.txt" onChange={handleInputChange} />
        </label>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
          <i className="fa-solid fa-circle-exclamation mr-2"></i> {error}
        </div>
      )}

      <div className="mt-8 pt-8 border-t border-slate-800">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Why upload your resume?</h3>
        <ul className="space-y-3 text-sm text-slate-300">
          <li className="flex items-start">
            <i className="fa-solid fa-check text-green-500 mt-1 mr-3"></i>
            <span>Tailored questions based on your specific experience.</span>
          </li>
          <li className="flex items-start">
            <i className="fa-solid fa-check text-green-500 mt-1 mr-3"></i>
            <span>Relevant deep-dives into your project history.</span>
          </li>
          <li className="flex items-start">
            <i className="fa-solid fa-check text-green-500 mt-1 mr-3"></i>
            <span>More accurate performance assessment.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
