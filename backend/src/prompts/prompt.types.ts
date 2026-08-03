export const MAIN_CHAT_INTAKE_PROMPT_KEY = 'main_chat_intake';

export interface AppPromptEntity {
  key: string;
  content: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
