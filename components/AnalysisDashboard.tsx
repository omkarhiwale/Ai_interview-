
import React from 'react';
import { AnalysisResult } from '../types';

interface Props {
  analysis: AnalysisResult;
  onReset: () => void;
}

export const AnalysisDashboard: React.FC<Props> = ({ analysis, onReset }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-white">Interview Performance Analysis</h1>
        <button 
          onClick={onReset}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <i className="fa-solid fa-rotate-left mr-2"></i> New Session
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Score Card */}
        <div className="lg:col-span-1 glass-effect p-8 rounded-3xl flex flex-col items-center justify-center text-center">
          <h2 className="text-xl font-semibold mb-6 text-slate-400">Overall Score</h2>
          <div className={`text-8xl font-bold mb-6 ${getScoreColor(analysis.score)}`}>
            {analysis.score}<span className="text-2xl opacity-50">/100</span>
          </div>
          <p className="text-slate-300 leading-relaxed italic">
            "{analysis.overallFeedback}"
          </p>
        </div>

        {/* Detailed Feedback */}
        <div className="lg:col-span-2 space-y-6">
          {/* Strengths */}
          <div className="glass-effect p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center">
              <i className="fa-solid fa-circle-check mr-2"></i> Key Strengths
            </h3>
            <ul className="space-y-3">
              {analysis.strengths.map((s, i) => (
                <li key={i} className="flex items-start text-slate-300">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses / Improvements */}
          <div className="glass-effect p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center">
              <i className="fa-solid fa-triangle-exclamation mr-2"></i> Areas for Improvement
            </h3>
            <ul className="space-y-3">
              {analysis.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start text-slate-300">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="mt-8 glass-effect p-8 rounded-3xl">
        <h3 className="text-2xl font-bold text-blue-400 mb-6 flex items-center">
          <i className="fa-solid fa-lightbulb mr-3"></i> Recommended Next Steps
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analysis.recommendations.map((r, i) => (
            <div key={i} className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 hover:border-blue-500/50 transition-colors">
              <div className="text-blue-400 font-bold mb-2">Step {i + 1}</div>
              <p className="text-slate-300 text-sm leading-relaxed">{r}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
