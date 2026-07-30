import type { DialogContext } from './dialog.types';

export function createEmptyDialogContext(): DialogContext {
  return {
    messages: [
      {
        role: 'assistant',
        content:
          'Здравствуйте! Я виртуальный консультант салона мебели. Помогу разобраться с вашим заказом и передам детали дизайнеру. Как к вам обращаться?',
        createdAt: new Date().toISOString()
      }
    ],
    profile: null,
    technicalBrief: null,
    specification: null,
    estimate: null,
    workflow: {
      errors: [],
      timestamps: {},
      confidence: null,
      missingData: []
    }
  };
}

export function normalizeDialogContext(context: Partial<DialogContext> | null): DialogContext {
  const empty = createEmptyDialogContext();

  return {
    messages: Array.isArray(context?.messages) ? context.messages : empty.messages,
    profile: context?.profile ?? null,
    technicalBrief: context?.technicalBrief ?? null,
    specification: context?.specification ?? null,
    estimate: context?.estimate ?? null,
    workflow: {
      errors: Array.isArray(context?.workflow?.errors) ? context.workflow.errors : [],
      timestamps: context?.workflow?.timestamps ?? {},
      confidence: context?.workflow?.confidence ?? null,
      missingData: Array.isArray(context?.workflow?.missingData)
        ? context.workflow.missingData
        : []
    }
  };
}

