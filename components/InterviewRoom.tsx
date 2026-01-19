
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
  const sessionRef = useRef<any>(null);
  const transcriptBufferRef = useRef<{ user: string; model: string }>({ user: '', model: '' });
  const scrollRef = useRef<HTMLDivElement>(null);

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    setIsLive(false);
  }, []);

  const startInterview = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(err => {
        throw new Error("MIC_BLOCKED");
      });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
          onerror: (e) => setError("Audio Stream Jitter: Check Connection."),
          onclose: () => setIsLive(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are the omkar_hire_team AI. Professional. Probing. Based on resume: ${resume.text}. Ask one challenging question at a time.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      setError(err.message === "MIC_BLOCKED" ? "Microphone access denied." : "Connection timeout.");
    }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcription, isThinking]);

  useEffect(() => {
    let timer: any;
    if (isLive && timeLeft > 0) timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    else if (timeLeft === 0 && isLive) { stopSession(); onFinish(transcription); }
    return () => clearInterval(timer);
  }, [isLive, timeLeft, onFinish, transcription, stopSession]);

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col gap-6 animate-in fade-in duration-700">
      <div className="glass-effect p-4 px-8 rounded-[2rem] flex justify-between items-center border-white/5">
        <div className="flex items-center gap-4">
          <div className="relative w-3 h-3">
             {isLive && <div className="pulse-ring"></div>}
             <div className={`w-full h-full rounded-full ${isLive ? 'bg-blue-500' : 'bg-slate-700'}`}></div>
          </div>
          <span className="text-sm font-black uppercase tracking-[0.2em]">{isLive ? 'Live Interface' : 'Standby'}</span>
        </div>
        <div className="flex items-center gap-8">
           <span className="font-mono text-xl font-black text-blue-400">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</span>
           <button onClick={() => { stopSession(); onFinish(transcription); }} className="text-rose-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest">End Session</button>
        </div>
      </div>

      {!isLive ? (
        <div className="flex-1 glass-effect rounded-[3rem] p-12 flex flex-col items-center justify-center text-center border-white/5">
          <div className="w-32 h-32 bg-slate-900 rounded-full flex items-center justify-center mb-8 relative">
            <i className="fa-solid fa-headset text-4xl text-blue-500"></i>
            <div className="absolute -inset-4 border border-blue-500/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
          </div>
          <h2 className="text-3xl font-black mb-4">Neural Audio Sync</h2>
          <p className="text-slate-400 max-w-xs mb-10 text-sm font-medium leading-relaxed">Ensure you're in a quiet room. The AI will listen for your cue after you click below.</p>
          <button onClick={startInterview} className="btn-primary px-16 py-5 rounded-full text-white font-black text-lg uppercase tracking-wider">Initialize Link</button>
          {error && <div className="mt-8 text-rose-500 font-bold text-xs uppercase flex items-center gap-2"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
           <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 px-4 pb-10">
              {transcription.map((turn, i) => (
                <div key={i} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                   <div className={`max-w-[80%] p-6 rounded-[2rem] ${turn.role === 'user' ? 'bg-blue-600 rounded-tr-none text-white' : 'glass-effect rounded-tl-none border-white/10'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">{turn.role === 'user' ? 'Candidate' : 'AI Recruiter'}</p>
                      <p className="text-sm md:text-base leading-relaxed">{turn.text}</p>
                   </div>
                </div>
              ))}
           </div>
           
           <div className="glass-effect p-8 rounded-[2.5rem] flex items-center gap-8 relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center shrink-0 border border-white/10 relative z-10">
                <i className={`fa-solid ${isThinking ? 'fa-atom animate-spin-slow' : 'fa-wave-square animate-pulse'} text-blue-500`}></i>
              </div>
              <div className="flex-1 relative z-10">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">{isThinking ? 'Processing Engine' : 'Audio Feed'}</p>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                   <div className={`h-full bg-blue-500 transition-all duration-300 ${isThinking ? 'w-2/3 animate-pulse' : 'w-1/4'}`}></div>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
