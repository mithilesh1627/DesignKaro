export interface PrerequisiteNode {
  slug: string;
  title: string;
  status: "completed" | "current" | "locked" | "available";
}

export interface SkillDomain {
  slug: string;
  name: string;
  category: string;
  mastery_score: number; // 0-100
  status: "mastered" | "learning" | "needs_focus" | "not_started";
  topics_count: number;
}

export interface LearningPath {
  id: string;
  title: string;
  category: string;
  description: string;
  difficulty: string;
  concept_count: number;
  estimated_minutes: number;
  completion_percentage: number;
  mastery_score: number;
  prerequisites: string[];
  is_locked: boolean;
  topics: string[];
  first_lesson_slug: string;
}

export interface LearningRecommendation {
  topic_slug: string;
  topic_title: string;
  lesson_slug: string;
  lesson_title: string;
  reason: string;
  priority: "prerequisite_unlock" | "weakest_skill" | "continue_path" | "practice_weakness";
  target_domain: string;
  estimated_minutes: number;
}

export interface CurrentLearningState {
  has_progress: boolean;
  topic_slug?: string | null;
  topic_title?: string | null;
  topic_description?: string | null;
  lesson_slug?: string | null;
  lesson_title?: string | null;
  lesson_index: number;
  total_lessons: number;
  progress_percentage: number;
}

export interface TopicSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  track: string;
  order_index: number;
  icon?: string | null;
  lesson_count: number;
  completed_count: number;
  difficulty: string;
  estimated_minutes: number;
  mastery_percentage: number;
  first_lesson_slug?: string | null;
  prerequisites: PrerequisiteNode[];
}

export interface LearningOverviewResponse {
  overall_mastery: number;
  current_level: string;
  concepts_mastered: number;
  total_concepts: number;
  current_learning?: CurrentLearningState | null;
  strongest_domain?: SkillDomain | null;
  weakest_domain?: SkillDomain | null;
  recommended_domain?: string | null;
  recommendation?: LearningRecommendation | null;
  domains: SkillDomain[];
  learning_paths: LearningPath[];
  topics_prerequisites: Record<string, PrerequisiteNode[]>;
  topics: TopicSummary[];
}
