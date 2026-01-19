
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

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current = null;
    }
    setIsLive(false);
  }, []);

  const startInterview = async () => {
    try {
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
                session.sendRealtimeInput({ media: pcmBlob });
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
              sourcesRef.current.forEach(s => s.stop());
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
          systemInstruction: `You are an expert technical interviewer. 
          The candidate's resume is: ${resume.text}.
          Conduct a professional interview for 15 minutes. 
          Ask one question at a time. Focus on the candidate's experience and resume details.
          When the user mentions they are ready, start by introducing yourself and asking the first question.
          Stay in character as a professional recruiter.`
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
    } else if (timeLeft === 0) {
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
    <div className="max-w-4xl mx-auto mt-8 px-4 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex justify-between items-center mb-6 glass-effect p-4 rounded-xl">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`}></div>
          <span className="font-semibold text-lg">{isLive ? 'Interview in Progress' : 'Ready to Start?'}</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-xl font-mono text-blue-400">
            <i className="fa-regular fa-clock mr-2"></i> {formatTime(timeLeft)}
          </div>
          <button 
            onClick={() => { stopSession(); onFinish(transcription); }}
            className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            End Early
          </button>
        </div>
      </div>

      {!isLive ? (
        <div className="flex-1 flex flex-col items-center justify-center glass-effect rounded-2xl p-12 text-center">
          <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mb-6 text-4xl shadow-xl shadow-blue-500/20">
            <i className="fa-solid fa-microphone"></i>
          </div>
          <h2 className="text-3xl font-bold mb-4">Start Your Interview Session</h2>
          <p className="text-slate-400 max-w-md mb-8">
            The interview will last for 15 minutes. Ensure you are in a quiet environment and your microphone is working.
          </p>
          <button 
            onClick={startInterview}
            className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-full text-xl font-bold transition-all transform hover:scale-105"
          >
            Begin Interview
          </button>
          {error && <p className="mt-4 text-red-400">{error}</p>}
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
            {transcription.length === 0 && !isThinking && (
              <div className="flex justify-center items-center h-full text-slate-500 italic">
                Wait for the interviewer to speak or say "I'm ready to start"...
              </div>
            )}
            {transcription.map((turn, i) => (
              <div key={i} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl ${
                  turn.role === 'user' 
                    ? 'bg-blue-600 rounded-tr-none text-white' 
                    : 'bg-slate-800 rounded-tl-none text-slate-100'
                }`}>
                  <p className="text-sm font-bold opacity-60 mb-1">
                    {turn.role === 'user' ? 'You' : 'AuraHire AI'}
                  </p>
                  <p>{turn.text}</p>
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none flex gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
              </div>
            )}
          </div>

          <div className="h-24 glass-effect rounded-2xl flex items-center justify-center p-6 gap-8">
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300" 
                style={{ width: `${(timeLeft / (15 * 60)) * 100}%` }}
              ></div>
            </div>
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-full ${isThinking ? 'bg-slate-800' : 'bg-blue-500 animate-pulse'} text-white`}>
                <i className="fa-solid fa-waveform"></i>
              </div>
              <p className="text-sm text-slate-400 font-medium">Interviewer is listening...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
