export const MAIN_CHAT_INTAKE_PROMPT_KEY = 'main_chat_intake';
export const CLIENT_PROFILE_PROMPT_KEY = 'client_profile';
export const TECHNICAL_BRIEF_PROMPT_KEY = 'technical_brief';
export const SPECIFICATION_PROMPT_KEY = 'specification';
export const PROMPT_REVIEW_PROMPT_KEY = 'prompt_review';

export type AppPromptKey =
  | typeof MAIN_CHAT_INTAKE_PROMPT_KEY
  | typeof CLIENT_PROFILE_PROMPT_KEY
  | typeof TECHNICAL_BRIEF_PROMPT_KEY
  | typeof SPECIFICATION_PROMPT_KEY
  | typeof PROMPT_REVIEW_PROMPT_KEY;

export interface AppPromptStepInfo {
  key: AppPromptKey;
  title: string;
  pipelineStep: string;
  usage: string;
  order: number;
}

export interface AppPromptEntity {
  key: string;
  title?: string;
  pipelineStep?: string;
  usage?: string;
  order?: number;
  content: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
