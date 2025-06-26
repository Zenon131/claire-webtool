export type ContentType = 'academic' | 'blog' | 'documentation' | 'news';
export type ComplexityLevel = 'beginner' | 'intermediate' | 'advanced';

export interface WebAnalysis {
  summary: string;
  mainPoints: string[];
  learningObjectives?: string[];
  keyTerms?: string[];
  equations?: string[];
  intuition?: string;
  context: {
    type: ContentType;
    audience: string;
    complexity: ComplexityLevel;
  };
}