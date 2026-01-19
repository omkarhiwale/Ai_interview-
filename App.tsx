
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

  const handleResumeUpload = (data: ResumeData) => {
    setResume(data);
    setStage(AppState.INTERVIEWING);
  };

  const handleInterviewFinish = async (transcript: InterviewTurn[]) => {
    if (!resume) return;
    setStage(AppState.ANALYZING);
    try {
      const result = await analyzeInterview(resume.text, transcript);
      setAnalysis(result);
      setStage(AppState.FINISHED);
    } catch (error) {
      console.error("Analysis failed", error);
      setStage(AppState.FINISHED);
      setAnalysis({
        score: 0,
        overallFeedback: "Analysis failed due to a technical error.",
        strengths: ["Communication skills"],
        weaknesses: ["Technical depth"],
        recommendations: ["Retry the session for better results"]
      });
    }
  };

  const resetApp = () => {
    setStage(AppState.IDLE);
    setResume(null);
    setAnalysis(null);
  };

  return (
    <div className="min-h-screen relative">
      {/* Navbar */}
      <nav className="border-b border-white/5 py-4 px-8 flex justify-between items-center glass-effect sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={resetApp}>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-bolt-lightning text-lg"></i>
          </div>
          <span className="text-xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            omkar_hire_team
          </span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: 'Upload', active: stage === AppState.IDLE, icon: 'fa-cloud-arrow-up' },
            { label: 'Interview', active: stage === AppState.INTERVIEWING, icon: 'fa-microphone-lines' },
            { label: 'Analysis', active: stage === AppState.FINISHED, icon: 'fa-chart-pie' }
          ].map((item) => (
            <div key={item.label} className={`flex items-center gap-2 text-sm font-semibold transition-colors ${item.active ? 'text-blue-400' : 'text-slate-500'}`}>
              <i className={`fa-solid ${item.icon} text-xs`}></i>
              {item.label}
            </div>
          ))}
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12 relative">
        {stage === AppState.IDLE && (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20 animate-in fade-in slide-in-from-top-4 duration-1000">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Next-Gen Recruitment
              </div>
              <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[0.9] tracking-tight text-white">
                Master the Art of <br/>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-600">The Interview</span>
              </h1>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12 font-medium">
                Our AI recruiter analyzes your background in seconds to conduct a personalized, high-stakes audio interview. Experience the future of hiring today.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
                {[
                  { icon: 'fa-brain', title: 'Context Aware', desc: 'Questions deep-linked to your resume experience.' },
                  { icon: 'fa-bolt', title: 'Live Feedback', desc: 'Real-time audio response with minimal latency.' },
                  { icon: 'fa-chart-line', title: 'Skill Score', desc: 'Detailed metrics on your technical and soft skills.' }
                ].map((feature) => (
                  <div key={feature.title} className="glass-effect p-6 rounded-2xl text-left glass-card-hover group">
                    <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
                      <i className={`fa-solid ${feature.icon} text-blue-400 group-hover:text-white`}></i>
                    </div>
                    <h3 className="font-bold text-lg mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-500 leading-snug">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="animate-float">
              <ResumeUploader onUpload={handleResumeUpload} />
            </div>
          </div>
        )}

        {stage === AppState.INTERVIEWING && resume && (
          <InterviewRoom resume={resume} onFinish={handleInterviewFinish} />
        )}

        {stage === AppState.ANALYZING && (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="relative mb-12">
              <div className="w-32 h-32 border-[6px] border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="fa-solid fa-microchip text-blue-500 text-3xl animate-pulse"></i>
              </div>
              <div className="absolute -inset-8 bg-blue-500/20 blur-[60px] rounded-full -z-10 animate-pulse"></div>
            </div>
            <div className="text-center">
              <h2 className="text-4xl font-black mb-3">Compiling Results</h2>
              <p className="text-slate-400 font-medium">Analyzing linguistic patterns and technical accuracy...</p>
            </div>
          </div>
        )}

        {stage === AppState.FINISHED && analysis && (
          <AnalysisDashboard analysis={analysis} onReset={resetApp} />
        )}
      </main>

      <footer className="mt-20 border-t border-white/5 py-12 px-8 glass-effect flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-slate-500 text-sm font-medium">
          &copy; 2024 omkar_hire_team Systems. Built with Gemini 2.5 Flash.
        </div>
        <div className="flex gap-8 text-slate-400 items-center">
          <a href="https://github.com/omkarhiwale/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-all transform hover:scale-110">
            <i className="fa-brands fa-github text-2xl"></i>
          </a>
          <a href="https://www.linkedin.com/in/omkarhiwale/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-all transform hover:scale-110">
            <i className="fa-brands fa-linkedin text-2xl"></i>
          </a>
          <div className="h-4 w-px bg-white/10 hidden md:block"></div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] opacity-40 hidden md:block">Connect With Developer</span>
        </div>
      </footer>
    </div>
  );
}
