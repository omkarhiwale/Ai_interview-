
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { ResumeData, InterviewTurn } from '../types';
import { decode, decodeAudioData, createAudioBlob } from '../utils/audioUtils';

interface Props {
  resume: ResumeData;
  onFinish: (transcript: InterviewTurn[]) => void;
}

export const InterviewRoom: React.FC<Props> = ({ resume, onFinish }) => {
  const [isLive, setIsLive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const [transcription, setTranscription] = useState<InterviewTurn[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const transcriptBufferRef = useRef<{ user: string; model: string }>({ user: '', model: '' });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever transcription or thinking state changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [transcription, isThinking]);

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.warn("Session already closed or error closing", e);
      }
      sessionRef.current = null;
    }
    setIsLive(false);
  }, []);

  const startInterview = async () => {
    try {
      setError(null);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsLive(true);
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createAudioBlob(inputData);
              sessionPromise.then((session) => {
                if (sessionRef.current) {
                  session.sendRealtimeInput({ media: pcmBlob });
                }
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              transcriptBufferRef.current.model += message.serverContent.outputTranscription.text;
              setIsThinking(false);
            } else if (message.serverContent?.inputTranscription) {
              transcriptBufferRef.current.user += message.serverContent.inputTranscription.text;
              setIsThinking(true);
            }

            if (message.serverContent?.turnComplete) {
              const userT = transcriptBufferRef.current.user;
              const modelT = transcriptBufferRef.current.model;
              if (userT || modelT) {
                setTranscription(prev => [
                  ...prev,
                  ...(userT ? [{ role: 'user', text: userT } as InterviewTurn] : []),
                  ...(modelT ? [{ role: 'model', text: modelT } as InterviewTurn] : [])
                ]);
              }
              transcriptBufferRef.current = { user: '', model: '' };
              setIsThinking(false);
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
              const buffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = buffer;
              source.connect(outputAudioContextRef.current.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error('Gemini Live Error:', e);
            setError("Connection lost. Please try again.");
            stopSession();
          },
          onclose: () => setIsLive(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are an expert technical interviewer for omkar_hire_team. 
          The candidate's resume is: ${resume.text}.
          Conduct a professional interview for 15 minutes. 
          Ask one question at a time. Focus on the candidate's experience and resume details.
          Start by introducing yourself as omkar_hire_team's lead AI recruiter and start with a friendly greeting followed by a deep question about their resume.`
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setError("Could not start interview. Check microphone permissions.");
    }
  };

  useEffect(() => {
    let timer: any;
    if (isLive && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isLive) {
      stopSession();
      onFinish(transcription);
    }
    return () => clearInterval(timer);
  }, [isLive, timeLeft, onFinish, transcription, stopSession]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto mt-4 px-4 h-[calc(100vh-140px)] flex flex-col">
      {/* Header Info */}
      <div className="flex justify-between items-center mb-6 glass-effect p-4 rounded-xl border border-slate-700/50 shadow-lg">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`}></div>
          <span className="font-semibold text-lg text-slate-100">{isLive ? 'Live Session' : 'Ready'}</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-xl font-mono text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">
            <i className="fa-solid fa-hourglass-half mr-2 text-sm"></i> {formatTime(timeLeft)}
          </div>
          {isLive && (
            <button 
              onClick={() => { stopSession(); onFinish(transcription); }}
              className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-all border border-red-500/30"
            >
              Finish Interview
            </button>
          )}
        </div>
      </div>

      {!isLive ? (
        <div className="flex-1 flex flex-col items-center justify-center glass-effect rounded-2xl p-12 text-center border border-slate-800 shadow-2xl">
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-4xl shadow-2xl shadow-blue-500/30 animate-pulse">
              <i className="fa-solid fa-microphone-lines"></i>
            </div>
            <div className="absolute -inset-4 border border-blue-500/20 rounded-full animate-[ping_3s_linear_infinite]"></div>
          </div>
          <h2 className="text-3xl font-bold mb-4 text-white">Start Your Session</h2>
          <p className="text-slate-400 max-w-md mb-8 leading-relaxed">
            Prepare to speak clearly. omkar_hire_team AI will ask questions based on your background. 
            The session will automatically end in 15 minutes.
          </p>
          <button 
            onClick={startInterview}
            className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-4 rounded-full text-xl font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/20"
          >
            Enter Room
          </button>
          {error && <p className="mt-6 text-red-400 font-medium flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation"></i> {error}
          </p>}
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4 overflow-hidden relative">
          {/* Conversation History */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-4 pr-4 custom-scrollbar pb-10"
          >
            {transcription.length === 0 && !isThinking && (
              <div className="flex flex-col justify-center items-center h-full text-slate-500 space-y-4">
                <i className="fa-solid fa-comment-dots text-4xl opacity-20"></i>
                <p className="italic">The interviewer is joining... Say "Hello" to begin.</p>
              </div>
            )}
            {transcription.map((turn, i) => (
              <div key={i} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[85%] p-4 rounded-2xl shadow-md border ${
                  turn.role === 'user' 
                    ? 'bg-blue-600 border-blue-500 rounded-tr-none text-white' 
                    : 'bg-slate-800 border-slate-700 rounded-tl-none text-slate-100'
                }`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">
                    {turn.role === 'user' ? 'Candidate' : 'Interviewer'}
                  </p>
                  <p className="text-sm md:text-base leading-relaxed">{turn.text}</p>
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl rounded-tl-none flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Visualizer Control */}
          <div className="mt-auto glass-effect rounded-2xl border border-slate-700/50 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative z-10">
            <div className="flex-1 w-full md:w-auto h-2 bg-slate-800/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                style={{ width: `${(timeLeft / (15 * 60)) * 100}%` }}
              ></div>
            </div>
            
            <div className="flex items-center gap-6 bg-slate-900/40 px-6 py-3 rounded-full border border-slate-800">
              <div className="flex gap-1 h-6 items-end">
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1.5 rounded-full bg-blue-500 ${!isThinking ? 'animate-[pulse_1.5s_ease-in-out_infinite]' : 'opacity-30'}`}
                    style={{ 
                      height: `${30 + Math.random() * 70}%`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  ></div>
                ))}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</span>
                <span className="text-sm font-semibold text-blue-400">
                  {isThinking ? 'AI Typing...' : 'AI Listening...'}
                </span>
              </div>
              <div className={`p-3 rounded-full ${isThinking ? 'bg-slate-700' : 'bg-blue-600 animate-pulse shadow-lg shadow-blue-600/20'} text-white`}>
                <i className={`fa-solid ${isThinking ? 'fa-ellipsis-h' : 'fa-wave-square'}`}></i>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  );
};
