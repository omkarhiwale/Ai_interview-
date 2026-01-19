
import React from 'react';
import { AnalysisResult } from '../types';

interface Props {
  analysis: AnalysisResult;
  onReset: () => void;
}

export const AnalysisDashboard: React.FC<Props> = ({ analysis, onReset }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'stroke-emerald-500 text-emerald-500';
    if (score >= 60) return 'stroke-amber-500 text-amber-500';
    return 'stroke-rose-500 text-rose-500';
  };

  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (analysis.score / 100) * circumference;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-white mb-2">Performance Analytics</h1>
          <p className="text-slate-400 font-medium">Session identifier: {Math.random().toString(36).substring(7).toUpperCase()}</p>
        </div>
        <button onClick={onReset} className="glass-effect px-8 py-3 rounded-2xl text-sm font-bold border border-white/5 hover:bg-white hover:text-slate-950 transition-all flex items-center gap-3">
          <i className="fa-solid fa-plus"></i> New Interview Session
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Score Ring */}
        <div className="lg:col-span-4 glass-effect p-12 rounded-[3rem] flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full"></div>
          <div className="relative w-48 h-48 mb-8">
            <svg className="w-full h-full -rotate-90">
              <circle cx="96" cy="96" r="85" fill="none" className="stroke-slate-800" strokeWidth="12" />
              <circle cx="96" cy="96" r="85" fill="none" className={`transition-all duration-[2000ms] ${getScoreColor(analysis.score).split(' ')[0]}`} strokeWidth="12" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-6xl font-black ${getScoreColor(analysis.score).split(' ')[1]}`}>{analysis.score}</span>
              <span className="text-xs font-black uppercase tracking-[0.3em] opacity-40">Rating</span>
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-4">Quality Feedback</h3>
          <p className="text-slate-400 text-center leading-relaxed font-medium italic">"{analysis.overallFeedback}"</p>
        </div>

        {/* Feedback Cards */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-effect p-8 rounded-[2.5rem] border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400"><i className="fa-solid fa-award"></i></div>
                <h3 className="text-xl font-black uppercase tracking-widest text-emerald-400 text-sm">Elite Traits</h3>
              </div>
              <ul className="space-y-4">
                {analysis.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-4 text-slate-300 font-medium text-sm leading-snug">
                    <i className="fa-solid fa-check-circle text-emerald-500 mt-1"></i> {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-effect p-8 rounded-[2.5rem] border-l-4 border-l-rose-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center text-rose-400"><i className="fa-solid fa-flask-vial"></i></div>
                <h3 className="text-xl font-black uppercase tracking-widest text-rose-400 text-sm">Growth Areas</h3>
              </div>
              <ul className="space-y-4">
                {analysis.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-4 text-slate-300 font-medium text-sm leading-snug">
                    <i className="fa-solid fa-circle-nodes text-rose-500 mt-1"></i> {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="glass-effect p-10 rounded-[3rem]">
            <h3 className="text-2xl font-black mb-8 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white"><i className="fa-solid fa-compass"></i></div>
              Personalized Growth Roadmap
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {analysis.recommendations.map((r, i) => (
                <div key={i} className="bg-slate-900/40 p-6 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all group">
                  <div className="text-blue-500 font-black mb-3 group-hover:translate-x-1 transition-transform">PHASE 0{i + 1}</div>
                  <p className="text-slate-400 text-xs font-bold leading-relaxed">{r}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
