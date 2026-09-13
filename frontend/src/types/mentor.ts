export interface MentorCalculation {
  formula: string;
  variables?: Record<string, string>;
  result: string;
  explanation?: string | null;
}

export interface MentorExample {
  scenario: string;
  walkthrough: string[];
}

export interface MentorResponse {
  response_type:
    | "socratic"
    | "explanation"
    | "correction"
    | "architecture_review"
    | "calculation"
    | "interview_question";
  intent?:
    | "concept_explanation"
    | "architecture_analysis"
    | "architecture_change"
    | "tradeoff"
    | "calculation"
    | "debugging"
    | "failure_analysis"
    | "interview_question"
    | "challenge"
    | "follow_up";
  title: string;
  summary: string;
  explanation: string;
  architecture_observations: string[];
  assumptions: string[];
  recommendations: string[];
  tradeoffs: string[];
  example?: MentorExample | null;
  calculation?: MentorCalculation | null;
  next_question?: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
}
