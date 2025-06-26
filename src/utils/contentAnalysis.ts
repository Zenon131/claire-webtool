import { ContentType, ComplexityLevel, WebAnalysis } from '../types/webAnalysis';

export const detectContentType = (url: string, content: string): ContentType => {
  if (url.includes('arxiv.org') || url.includes('doi.org') || url.includes('.edu')) {
    return 'academic';
  }
  if (url.includes('docs.') || content.toLowerCase().includes('api') || content.toLowerCase().includes('documentation')) {
    return 'documentation';
  }
  if (url.includes('news.') || url.includes('/news/')) {
    return 'news';
  }
  return 'blog';
};

export const detectAudience = (content: string): string => {
  const technicalTerms = ['algorithm', 'implementation', 'framework', 'methodology'];
  const scientificTerms = ['hypothesis', 'experiment', 'analysis', 'study'];
  
  const technicalCount = technicalTerms.filter(term => 
    content.toLowerCase().includes(term.toLowerCase())
  ).length;
  const scientificCount = scientificTerms.filter(term => 
    content.toLowerCase().includes(term.toLowerCase())
  ).length;
  
  if (technicalCount > 2) return 'Technical Professionals';
  if (scientificCount > 2) return 'Researchers/Academics';
  return 'General Audience';
};

export const detectComplexity = (content: string): ComplexityLevel => {
  const complexityIndicators = {
    advanced: ['furthermore', 'consequently', 'methodology', 'theoretical'],
    intermediate: ['however', 'therefore', 'additionally', 'moreover'],
    beginner: ['basic', 'introduction', 'simple', 'easy']
  };
  
  const counts = {
    advanced: 0,
    intermediate: 0,
    beginner: 0
  };
  
  Object.entries(complexityIndicators).forEach(([level, terms]) => {
    counts[level as keyof typeof counts] = terms.filter(term => 
      content.toLowerCase().includes(term.toLowerCase())
    ).length;
  });
  
  if (counts.advanced > 2) return 'advanced';
  if (counts.intermediate > 2) return 'intermediate';
  return 'beginner';
};

export const extractLearningObjectives = (content: string): string[] | undefined => {
  const objectives: string[] = [];
  const lines = content.split('\n');
  
  let inObjectivesSection = false;
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('learning objective') || lowerLine.includes('you will learn')) {
      inObjectivesSection = true;
      continue;
    }
    
    if (inObjectivesSection) {
      if (line.trim().length === 0) {
        break;
      }
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        objectives.push(line.trim().substring(1).trim());
      }
    }
  }
  
  return objectives.length > 0 ? objectives : undefined;
};

export const extractKeyTerms = (content: string): string[] | undefined => {
  const terms: string[] = [];
  const lines = content.split('\n');
  
  let inTermsSection = false;
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('key terms') || lowerLine.includes('key concepts') || lowerLine.includes('terminology')) {
      inTermsSection = true;
      continue;
    }
    
    if (inTermsSection) {
      if (line.trim().length === 0) {
        break;
      }
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        terms.push(line.trim().substring(1).trim());
      }
    }
  }
  
  return terms.length > 0 ? terms : undefined;
};

export const extractEquations = (content: string): string[] | undefined => {
  const equations: string[] = [];
  const mathPattern = /\$([^$]+)\$/g;
  const matches = content.match(mathPattern);
  
  if (matches) {
    equations.push(...matches.map(match => match.slice(1, -1)));
  }
  
  return equations.length > 0 ? equations : undefined;
};

export const generateIntuition = (content: string): string | undefined => {
  const lines = content.split('\n');
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('intuition') || lowerLine.includes('intuitive') || lowerLine.includes('simply put')) {
      return line.trim();
    }
  }
  
  return undefined;
};

export const analyzeContent = (rawData: any): WebAnalysis => {
  const {
    url,
    title,
    metaDescription,
    mainContent,
    headings = []
  } = rawData;

  const content = mainContent || '';

  return {
    summary: `${title}\n${metaDescription || ''}`,
    mainPoints: headings
      .filter((h: any) => h.level === 'h1' || h.level === 'h2')
      .map((h: any) => h.text),
    learningObjectives: extractLearningObjectives(content),
    keyTerms: extractKeyTerms(content),
    equations: extractEquations(content),
    intuition: generateIntuition(content),
    context: {
      type: detectContentType(url, content),
      audience: detectAudience(content),
      complexity: detectComplexity(content)
    }
  };
};