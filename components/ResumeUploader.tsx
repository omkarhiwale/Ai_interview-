
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

  const getErrorMessage = (code: string) => {
    switch(code) {
      case 'RATE_LIMIT': return "Server busy. Please wait a minute and try again.";
      case 'AUTH_FAILED': return "Invalid System Key. Contact admin.";
      case 'EMPTY_RESPONSE': return "The file appears empty or unreadable.";
      default: return "Neural link failed. Try a cleaner PDF or Text file.";
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    if (!['application/pdf', 'text/plain'].includes(file.type) && !file.name.endsWith('.pdf')) {
      setError('Unsupported format. Please use PDF or TXT.');
      return;
    }

    setIsProcessing(true);
    try {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const base64 = await blobToBase64(file);
        const text = await extractTextFromPDF(base64);
        onUpload({ text, fileName: file.name });
      } else {
        const text = await file.text();
        onUpload({ text, fileName: file.name });
      }
    } catch (err: any) {
      setError(getErrorMessage(err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      {isProcessing ? (
        <div className="glass-effect p-16 rounded-[3rem] text-center relative overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="absolute inset-x-0 scanner-line"></div>
          <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <i className="fa-solid fa-microchip text-4xl text-blue-500 animate-pulse"></i>
          </div>
          <h2 className="text-2xl font-black mb-2">Analyzing Profile</h2>
          <p className="text-slate-400 font-medium">Extracting professional experience nodes...</p>
        </div>
      ) : (
        <div 
          className={`glass-effect p-2 rounded-[3.5rem] transition-all duration-500 ${isDragging ? 'scale-95' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
        >
          <div className="border-2 border-dashed border-white/10 rounded-[3.2rem] p-16 flex flex-col items-center justify-center group hover:border-blue-500/30 transition-colors">
            <div className="relative mb-8">
              <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-transform">
                <i className="fa-solid fa-cloud-arrow-up text-3xl text-blue-500"></i>
              </div>
              <div className="absolute -inset-2 bg-blue-500/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            
            <h3 className="text-xl font-bold mb-2">Ingest Resume</h3>
            <p className="text-slate-500 text-center text-sm font-medium mb-10 max-w-xs leading-relaxed">
              Drag your document here or click to browse. Supported: PDF, TXT.
            </p>

            <label className="btn-primary px-10 py-4 rounded-full text-sm font-black uppercase tracking-widest cursor-pointer active:scale-95">
              Select File
              <input type="file" className="hidden" accept=".pdf,.txt" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 glass-effect border-red-500/20 bg-red-500/5 p-4 rounded-2xl flex items-center gap-4 text-red-400 animate-in slide-in-from-top-2">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <p className="text-sm font-bold uppercase tracking-tight">{error}</p>
        </div>
      )}
    </div>
  );
};
