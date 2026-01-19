
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
  const [timeLeft, setTimeLeft] = useState(15 * 60);
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [transcription, isThinking]);

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    setIsLive(false);
  }, []);

  const startInterview = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsLive(true);
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              sessionPromise.then(s => s.sendRealtimeInput({ media: createAudioBlob(inputData) }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (msg) => {
            if (msg.serverContent?.outputTranscription) {
              transcriptBufferRef.current.model += msg.serverContent.outputTranscription.text;
              setIsThinking(false);
            } else if (msg.serverContent?.inputTranscription) {
              transcriptBufferRef.current.user += msg.serverContent.inputTranscription.text;
              setIsThinking(true);
            }
            if (msg.serverContent?.turnComplete) {
              const { user, model } = transcriptBufferRef.current;
              if (user || model) setTranscription(p => [...p, ...(user ? [{ role: 'user', text: user } as any] : []), ...(model ? [{ role: 'model', text: model } as any] : [])]);
              transcriptBufferRef.current = { user: '', model: '' };
              setIsThinking(false);
            }
            const base64 = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64 && outputAudioContextRef.current) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
              const buffer = await decodeAudioData(decode(base64), outputAudioContextRef.current, 24000, 1);
              const src = outputAudioContextRef.current.createBufferSource();
              src.buffer = buffer;
              src.connect(outputAudioContextRef.current.destination);
              src.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
            }
          },
          onerror: (e) => setError("Link failed. Please re-establish."),
          onclose: () => setIsLive(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are the Lead AI Interviewer for omkar_hire_team.
          Resume Context: ${resume.text}.
          Be professional, probing, and insightful. Start with a warm greeting and a challenging question based on their resume projects.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      setError("Audio sync failed. Check mic permissions.");
    }
  };

  useEffect(() => {
    let timer: any;
    if (isLive && timeLeft > 0) timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    else if (timeLeft === 0 && isLive) { stopSession(); onFinish(transcription); }
    return () => clearInterval(timer);
  }, [isLive, timeLeft, onFinish, transcription, stopSession]);

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-180px)] flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-700">
      <div className="flex justify-between items-center glass-effect p-6 rounded-[2rem] border border-white/10 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-blue-500 animate-ping' : 'bg-slate-700'}`}></div>
          <span className="font-black text-xl tracking-tight">{isLive ? 'Link Active' : 'Offline'}</span>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-2xl font-black font-mono text-blue-400 flex items-center gap-3">
            <i className="fa-solid fa-hourglass-start text-sm"></i> {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}
          </div>
          <button onClick={() => { stopSession(); onFinish(transcription); }} className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white px-6 py-2 rounded-xl text-xs font-bold transition-all border border-red-500/20 uppercase tracking-widest">Terminate</button>
        </div>
      </div>

      {!isLive ? (
        <div className="flex-1 flex flex-col items-center justify-center glass-effect rounded-[3rem] p-16 text-center border border-white/5">
          <div className="relative mb-12">
            <div className="w-40 h-40 bg-blue-600 rounded-full flex items-center justify-center text-5xl shadow-[0_0_80px_rgba(37,99,235,0.4)] relative z-10">
              <i className="fa-solid fa-microphone-lines"></i>
            </div>
            <div className="absolute inset-0 bg-blue-400 rounded-full blur-[100px] opacity-20 -z-0"></div>
            <div className="absolute -inset-8 border-2 border-dashed border-blue-500/20 rounded-full animate-orb-rotate"></div>
          </div>
          <h2 className="text-5xl font-black mb-6 tracking-tight">Initiate Interview</h2>
          <p className="text-slate-400 max-w-md mb-12 text-lg font-medium leading-relaxed">Prepare for a high-fidelity 15-minute diagnostic session. omkar_hire_team AI is calibrated to your resume.</p>
          <button onClick={startInterview} className="bg-white text-slate-950 px-16 py-5 rounded-full text-xl font-black transition-all transform hover:scale-105 active:scale-95 shadow-2xl">Start Audio Link</button>
          {error && <p className="mt-8 text-red-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation"></i> {error}</p>}
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden relative">
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 px-4 custom-scrollbar pb-10">
            {transcription.map((turn, i) => (
              <div key={i} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                <div className={`max-w-[75%] p-6 rounded-[2rem] shadow-xl ${turn.role === 'user' ? 'bg-blue-600 rounded-tr-none text-white font-medium' : 'glass-effect border-white/10 rounded-tl-none text-slate-100'}`}>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-2">{turn.role === 'user' ? 'Candidate' : 'omkar_hire_team AI'}</p>
                   <p className="leading-relaxed">{turn.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-effect rounded-[2.5rem] border border-white/10 p-8 flex flex-col md:flex-row items-center justify-between gap-10 shadow-inner">
             <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                <div className={`absolute inset-0 rounded-full border-2 border-blue-500/30 ${!isThinking && 'animate-orb-rotate'}`}></div>
                <div className={`absolute inset-2 rounded-full border border-indigo-400/20 ${!isThinking && 'animate-orb-rotate'} [animation-direction:reverse]`}></div>
                <div className={`w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)] ${isThinking ? 'animate-pulse' : 'animate-bounce'}`}>
                   <i className={`fa-solid ${isThinking ? 'fa-brain' : 'fa-wave-square'} text-white text-lg`}></i>
                </div>
             </div>
             
             <div className="flex-1 w-full text-center md:text-left">
                <h4 className="text-xl font-black mb-1">{isThinking ? 'AI Reasoning' : 'Listening Context'}</h4>
                <p className="text-slate-400 text-sm font-medium">{isThinking ? 'Processing semantic structures...' : 'Ready for your input. Talk naturally.'}</p>
             </div>

             <div className="flex gap-1 h-12 items-end px-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`w-1.5 rounded-full bg-blue-500/80 ${!isThinking ? 'animate-pulse' : 'opacity-20'}`} style={{ height: `${20 + Math.random()*80}%`, animationDelay: `${i*0.1}s` }}></div>
                ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
