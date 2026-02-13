
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: string[];
  groundingUrls?: Array<{title: string, uri: string}>;
}

export interface DocumentResource {
  id: string;
  title: string;
  type: 'PDF' | 'JPG' | 'PNG';
  size: string;
  date: string;
  status: 'ANALYZED' | 'ANALYZING';
  subject: string;
  thumbnail?: string;
}

export enum Subject {
  CALCULUS = 'Calculus',
  ALGEBRA = 'Algebra',
  GEOMETRY = 'Geometry',
  NUMBER_THEORY = 'Number Theory',
  STATISTICS = 'Statistics'
}
