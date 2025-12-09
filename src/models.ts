
export interface ChangeRecord {
  id: string;
  timestamp: number;
  type: 'code' | 'config' | 'strategy' | 'infrastructure';
  files: string[];
  description: string;
  reason: string;
  author: 'agent' | 'human';
  impactScore: number;
  status: 'active' | 'reverted' | 'superseded';
}

export interface LogEntry {
    timestamp: string;
    level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    message: string;
    context?: Record<string, any>;
}

export interface GeminiAnalysis {
    overallAssessment: string;
    ruleComplianceCheck: { rule: string, compliant: boolean, details: string }[];
    detailedAnalysis: string;
    suggestedCorrection?: string;
    costOptimization?: string;
}
