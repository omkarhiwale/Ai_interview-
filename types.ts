
export enum AppState {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  INTERVIEWING = 'INTERVIEWING',
  ANALYZING = 'ANALYZING',
  FINISHED = 'FINISHED'
}

export interface InterviewTurn {
  role: 'user' | 'model';
  text: string;
}

export interface AnalysisResult {
  score: number;
  overallFeedback: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface ResumeData {
  text: string;
  fileName: string;
}
