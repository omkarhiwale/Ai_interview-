
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
        if (!extractedText) throw new Error("Extraction failed");
        onUpload({ text: extractedText, fileName: file.name });
      } else {
        const reader = new FileReader();
        reader.onload = (e) => onUpload({ text: e.target?.result as string, fileName: file.name });
        reader.readAsText(file);
      }
    } catch (err) {
      setError('Neural processing failed. Please try a cleaner PDF or a Text file.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="max-w-xl mx-auto p-16 rounded-[2rem] glass-effect text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/20">
          <div className="h-full bg-blue-500 animate-[shimmer_2s_infinite] w-1/3"></div>
        </div>
        <div className="relative mb-10 inline-block">
          <div className="w-24 h-24 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <i className="fa-solid fa-file-pdf text-blue-400 text-2xl animate-pulse"></i>
          </div>
        </div>
        <h2 className="text-3xl font-black mb-3">Reading Profile</h2>
        <p className="text-slate-400 font-medium">Extracting nodes from your professional history...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-12 rounded-[2.5rem] glass-effect border-2 border-white/5 relative group">
      <div className="absolute -top-12 -left-12 w-24 h-24 bg-blue-500/10 blur-3xl rounded-full"></div>
      
      <div
        className={`relative z-10 border-2 border-dashed rounded-[2rem] p-16 flex flex-col items-center justify-center transition-all duration-500 ${
          isDragging ? 'border-blue-500 bg-blue-500/5 scale-[0.98]' : 'border-slate-800 hover:border-blue-400/50'
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
        <div className="flex gap-4 mb-8">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/5 shadow-xl shadow-black/50 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-file-pdf text-3xl text-red-400"></i>
          </div>
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/5 shadow-xl shadow-black/50 group-hover:scale-110 transition-transform delay-75">
            <i className="fa-solid fa-file-lines text-3xl text-blue-400"></i>
          </div>
        </div>

        <h3 className="text-2xl font-black mb-2">Initialize Session</h3>
        <p className="text-slate-400 text-center mb-10 max-w-xs font-medium">
          Drag your professional summary here to begin your AI interview.
        </p>
        
        <label className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-full cursor-pointer transition-all font-bold text-lg shadow-xl shadow-blue-600/20 active:scale-95">
          Choose Document
          <input type="file" className="hidden" accept=".pdf,.txt" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </label>
      </div>

      {error && (
        <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-semibold flex items-center gap-3 animate-in slide-in-from-bottom-2">
          <i className="fa-solid fa-circle-exclamation text-lg"></i> {error}
        </div>
      )}
    </div>
  );
};
