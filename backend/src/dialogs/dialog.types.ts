export type ChatRole = 'user' | 'assistant';

export type DialogStep =
  | 'first_contact'
  | 'profile_ready'
  | 'technical_brief_ready'
  | 'specification_ready'
  | 'estimate_ready'
  | 'manager_review'
  | 'completed';

export type DialogStatus = 'active' | 'needs_manager' | 'completed';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface ProfileContext {
  json: Record<string, unknown> | null;
  summary: string | null;
  raw: string | null;
  generatedAt: string | null;
}

export interface TechnicalBriefContext {
  json: Record<string, unknown> | null;
  raw: string | null;
  generatedAt: string | null;
}

export interface SpecificationRow {
  id: string;
  section: string | null;
  itemType: string | null;
  name: string;
  material: string | null;
  lengthMm: number | null;
  widthMm: number | null;
  thicknessMm: number | null;
  quantity: number;
  edgeBanding: string | null;
  unit: string;
  notes: string | null;
  source: string | null;
  confidence: number | null;
}

export interface SpecificationContext {
  rows: SpecificationRow[];
  raw: string | null;
  generatedAt: string | null;
  updatedAt: string | null;
}

export interface EstimateLine {
  rowId: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  total: number | null;
  status: 'priced' | 'needs_price';
}

export interface EstimateContext {
  currency: 'RUB';
  subtotal: number;
  total: number;
  isComplete: boolean;
  lines: EstimateLine[];
  missingPrices: string[];
  calculatedAt: string | null;
  notes: string[];
}

export interface WorkflowContext {
  errors: string[];
  timestamps: Record<string, string>;
  confidence: number | null;
  missingData: string[];
}

export interface DialogContext {
  messages: ChatMessage[];
  profile: ProfileContext | null;
  technicalBrief: TechnicalBriefContext | null;
  specification: SpecificationContext | null;
  estimate: EstimateContext | null;
  workflow: WorkflowContext;
}

export interface DialogEntity {
  id: string;
  status: DialogStatus;
  currentStep: DialogStep;
  context: DialogContext;
  publicAccess: {
    url: string | null;
    createdAt: string | null;
    expiresAt: string | null;
    isActive: boolean;
  } | null;
  publicFeedback: {
    text: string | null;
    updatedAt: string | null;
    updatedBy: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PublicDialogEntity {
  status: DialogStatus;
  currentStep: DialogStep;
  messages: ChatMessage[];
  feedback: string | null;
  expiresAt: string;
  updatedAt: string;
}

export interface PublicDialogLinkResult {
  dialog: DialogEntity;
  publicUrl: string;
  expiresAt: string;
}
