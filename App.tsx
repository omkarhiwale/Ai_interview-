
import React, { useState } from 'react';
import { AppState, ResumeData, InterviewTurn, AnalysisResult } from './types';
import { ResumeUploader } from './components/ResumeUploader';
import { InterviewRoom } from './components/InterviewRoom';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { analyzeInterview } from './services/geminiService';

export default function App() {
  const [stage, setStage] = useState<AppState>(AppState.IDLE);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleResumeUpload = (data: ResumeData) => {
    setResume(data);
    setStage(AppState.INTERVIEWING);
  };

  const handleInterviewFinish = async (transcript: InterviewTurn[]) => {
    if (!resume) return;
    setStage(AppState.ANALYZING);
    setIsAnalyzing(true);
    try {
      const result = await analyzeInterview(resume.text, transcript);
      setAnalysis(result);
      setStage(AppState.FINISHED);
    } catch (error) {
      console.error("Analysis failed", error);
      alert("Something went wrong during analysis. We still have your results.");
      setStage(AppState.FINISHED);
      // Fallback result in case of failure
      setAnalysis({
        score: 0,
        overallFeedback: "Analysis failed due to a technical error.",
        strengths: ["Could not determine"],
        weaknesses: ["Could not determine"],
        recommendations: ["Please try another session"]
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetApp = () => {
    setStage(AppState.IDLE);
    setResume(null);
    setAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Navbar */}
      <nav className="border-b border-slate-800 py-4 px-6 flex justify-between items-center glass-effect sticky top-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={resetApp}>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
            <i className="fa-solid fa-robot"></i>
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
            omkar_hire_team
          </span>
        </div>
        <div className="hidden md:flex gap-6 text-sm font-medium text-slate-400">
          <span className={stage === AppState.IDLE ? 'text-blue-400' : ''}>1. Upload</span>
          <span className={stage === AppState.INTERVIEWING ? 'text-blue-400' : ''}>2. Interview</span>
          <span className={stage === AppState.FINISHED ? 'text-blue-400' : ''}>3. Analysis</span>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {stage === AppState.IDLE && (
          <div className="py-12">
            <div className="text-center mb-16">
              <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
                Ace Your Next <span className="text-blue-500">Interview</span>
              </h1>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Experience a hyper-realistic 15-minute AI voice interview tailored specifically to your resume. Get graded by industry standards.
              </p>
            </div>
            <ResumeUploader onUpload={handleResumeUpload} />
          </div>
        )}

        {stage === AppState.INTERVIEWING && resume && (
          <InterviewRoom resume={resume} onFinish={handleInterviewFinish} />
        )}

        {stage === AppState.ANALYZING && (
          <div className="flex flex-col items-center justify-center py-32 space-y-8">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="fa-solid fa-brain text-blue-500 text-2xl animate-pulse"></i>
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">Analyzing Performance</h2>
              <p className="text-slate-400">The AI is reviewing your responses against industry benchmarks...</p>
            </div>
          </div>
        )}

        {stage === AppState.FINISHED && analysis && (
          <AnalysisDashboard analysis={analysis} onReset={resetApp} />
        )}
      </main>

      <footer className="mt-20 border-t border-slate-900 py-12 text-center text-slate-600 text-sm">
        <p>&copy; 2024 omkar_hire_team AI Systems. Powered by Gemini 2.5 Live API.</p>
      </footer>
    </div>
  );
}
