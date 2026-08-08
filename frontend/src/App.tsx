import { FormEvent, useEffect, useRef, useState } from 'react';
import type { Key } from 'react';
import {
  Alert,
  Button,
  Descriptions,
  Input,
  InputNumber,
  message,
  Modal,
  Space,
  Spin,
  Table,
  Tabs,
  Tag
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

type ChatRole = 'user' | 'assistant';
type DialogStep =
  | 'first_contact'
  | 'profile_ready'
  | 'technical_brief_ready'
  | 'specification_ready'
  | 'estimate_ready'
  | 'manager_review'
  | 'completed';
type DialogStatus = 'active' | 'needs_manager' | 'completed';

interface ChatMessage {
  role: ChatRole;
  content: string;
  createdAt: string;
}

interface SpecificationRow {
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

interface EstimateLine {
  rowId: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  total: number | null;
  status: 'priced' | 'needs_price';
}

interface DialogContext {
  messages: ChatMessage[];
  profile: {
    json: Record<string, unknown> | null;
    summary: string | null;
    raw: string | null;
    generatedAt: string | null;
  } | null;
  technicalBrief: {
    json: Record<string, unknown> | null;
    raw: string | null;
    generatedAt: string | null;
  } | null;
  specification: {
    rows: SpecificationRow[];
    raw: string | null;
    generatedAt: string | null;
    updatedAt: string | null;
  } | null;
  estimate: {
    currency: 'RUB';
    subtotal: number;
    total: number;
    isComplete: boolean;
    lines: EstimateLine[];
    missingPrices: string[];
    calculatedAt: string | null;
    notes: string[];
  } | null;
  workflow: {
    errors: string[];
    timestamps: Record<string, string>;
    confidence: number | null;
    missingData: string[];
  };
}

interface PublicAccessInfo {
  url: string | null;
  createdAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

interface PublicFeedbackInfo {
  text: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

interface DialogEntity {
  id: string;
  status: DialogStatus;
  currentStep: DialogStep;
  context: DialogContext;
  publicAccess: PublicAccessInfo | null;
  publicFeedback: PublicFeedbackInfo;
  createdAt: string;
  updatedAt: string;
}

interface PublicDialogEntity {
  status: DialogStatus;
  currentStep: DialogStep;
  messages: ChatMessage[];
  feedback: string | null;
  expiresAt: string;
  updatedAt: string;
}

interface PublicDialogLinkResult {
  dialog: DialogEntity;
  publicUrl: string;
  expiresAt: string;
}

interface AdminDialogListItem {
  id: string;
  status: DialogStatus;
  currentStep: DialogStep;
  clientName: string | null;
  contact: string | null;
  requestSummary: string | null;
  estimateTotal: number | null;
  estimateComplete: boolean;
  publicAccess: PublicAccessInfo | null;
  publicFeedback: PublicFeedbackInfo;
  createdAt: string;
  updatedAt: string;
}

interface PromptDebugReview {
  dialogCount: number;
  promptKeys: string[];
  result: Record<string, unknown> | null;
  raw: string;
  generatedAt: string;
}

interface AppPromptEntity {
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

interface AuthResponse {
  user: {
    id: string;
    username: string;
    roles: string[];
  };
  csrfToken: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const DIALOG_STORAGE_KEY = 'furniture_bot_dialog_id';
const DEFAULT_AUTHENTICATED_PATH = '/admin';

function readCookie(name: string): string {
  const item = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : '';
}

async function refreshAuthSession(): Promise<boolean> {
  const csrfToken = readCookie('csrf_token');
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
    }
  });

  return response.ok;
}

function redirectToLogin(): void {
  if (window.location.pathname === '/login') {
    return;
  }
  const returnTo = `${window.location.pathname}${window.location.search}`;
  window.location.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  retryOnUnauthorized = true
): Promise<T> {
  const csrfToken = readCookie('csrf_token');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const canRefresh = response.status === 401
      && retryOnUnauthorized
      && path !== '/auth/login'
      && path !== '/auth/refresh';
    if (canRefresh && await refreshAuthSession()) {
      return requestJson<T>(path, options, false);
    }

    if (response.status === 401 || response.status === 403) {
      redirectToLogin();
    }

    const message =
      typeof payload?.message === 'string'
        ? payload.message
        : Array.isArray(payload?.message)
          ? payload.message.join(', ')
          : 'API request failed';
    throw new Error(message);
  }

  return payload as T;
}

function postJson<T>(path: string, body?: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

function putJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
}

function deleteJson<T>(path: string): Promise<T> {
  return requestJson<T>(path, { method: 'DELETE' });
}

function formatMoney(value: number | null | undefined): string {
  if (typeof value !== 'number') {
    return '—';
  }
  return `${value.toLocaleString('ru-RU')} ₽`;
}

function stepLabel(step: DialogStep): string {
  const labels: Record<DialogStep, string> = {
    first_contact: 'Первичный контакт',
    profile_ready: 'Профайл',
    technical_brief_ready: 'ТЗ',
    specification_ready: 'Спецификация',
    estimate_ready: 'Расчёт',
    manager_review: 'Проверка',
    completed: 'Завершён'
  };
  return labels[step];
}

function statusColor(status: DialogStatus): string {
  if (status === 'needs_manager') {
    return 'orange';
  }
  if (status === 'completed') {
    return 'green';
  }
  return 'blue';
}

function normalizePublicUrl(url: string): string {
  if (/^https?:\/\//.test(url)) {
    return url;
  }
  return `${window.location.origin}${url}`;
}

function normalizeLoginReturnTo(value: string | null): string {
  if (!value || value === '/' || value.startsWith('/login') || !value.startsWith('/') || value.startsWith('//')) {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  return value;
}

export default function App(): JSX.Element {
  if (window.location.pathname.startsWith('/public/')) {
    return <PublicDialogPage />;
  }

  if (window.location.pathname === '/login') {
    return <LoginPage />;
  }

  return <ProtectedApp />;
}

function ProtectedApp(): JSX.Element {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        await requestJson<AuthResponse>('/auth/me');
        setLoading(false);
      } catch {
        redirectToLogin();
      }
    }

    void checkAuth();
  }, []);

  if (loading) {
    return (
      <main className="app-shell">
        <div className="center-state"><Spin /></div>
      </main>
    );
  }

  if (window.location.pathname === '/') {
    window.location.replace(DEFAULT_AUTHENTICATED_PATH);
    return (
      <main className="app-shell">
        <div className="center-state"><Spin /></div>
      </main>
    );
  }

  if (window.location.pathname === '/admin/_prompt-vault') {
    return <PromptVaultPage />;
  }

  if (window.location.pathname.startsWith('/admin')) {
    return <AdminPage />;
  }

  return <ChatPage />;
}

function LoginPage(): JSX.Element {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await postJson<AuthResponse>('/auth/login', { username, password });
      const params = new URLSearchParams(window.location.search);
      window.location.replace(normalizeLoginReturnTo(params.get('returnTo')));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <form className="login-panel" onSubmit={submit}>
        <div>
          <h1>Вход в CRM</h1>
          <p>Доступ только для администратора салона</p>
        </div>
        {error ? <Alert type="error" message={error} showIcon /> : null}
        <Input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Логин"
          autoComplete="username"
        />
        <Input.Password
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Пароль"
          autoComplete="current-password"
        />
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          disabled={!username.trim() || !password}
        >
          Войти
        </Button>
      </form>
    </main>
  );
}

async function logout() {
  await postJson<void>('/auth/logout').catch(() => undefined);
  window.location.replace('/login');
}

function ChatPage(): JSX.Element {
  const [dialog, setDialog] = useState<DialogEntity | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [replyLoading, setReplyLoading] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    void bootstrapDialog();
  }, []);

  async function bootstrapDialog() {
    setLoading(true);
    setError('');
    const params = new URLSearchParams(window.location.search);
    const queryDialogId = params.get('dialogId');
    const storedDialogId = window.localStorage.getItem(DIALOG_STORAGE_KEY);
    const existingId = queryDialogId || storedDialogId;

    if (existingId) {
      try {
        const existingDialog = await requestJson<DialogEntity>(`/dialogs/${existingId}`);
        setDialog(existingDialog);
        persistDialogId(existingDialog.id);
        setLoading(false);
        return;
      } catch {
        window.localStorage.removeItem(DIALOG_STORAGE_KEY);
      }
    }

    const newDialog = await postJson<DialogEntity>('/dialogs');
    setDialog(newDialog);
    persistDialogId(newDialog.id);
    setLoading(false);
  }

  function persistDialogId(id: string) {
    window.localStorage.setItem(DIALOG_STORAGE_KEY, id);
    const nextUrl = `${window.location.pathname}?dialogId=${id}`;
    window.history.replaceState(null, '', nextUrl);
  }

  async function createNewDialog() {
    setLoading(true);
    setError('');
    setDraft('');
    const newDialog = await postJson<DialogEntity>('/dialogs');
    setDialog(newDialog);
    persistDialogId(newDialog.id);
    setLoading(false);
  }

  async function submitMessage(event?: FormEvent) {
    event?.preventDefault();
    const content = draft.trim();
    if (!dialog || !content || replyLoading) {
      return;
    }

    setDraft('');
    setError('');
    setReplyLoading(true);

    try {
      const result = await postJson<{ dialog: DialogEntity; assistantReply: string }>(
        `/dialogs/${dialog.id}/messages`,
        { content }
      );
      setDialog(result.dialog);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось получить ответ');
    } finally {
      setReplyLoading(false);
      textareaRef.current?.focus();
    }
  }

  if (loading || !dialog) {
    return (
      <main className="app-shell">
        <div className="center-state"><Spin /></div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <Header
          title="Салон корпусной мебели"
          subtitle="CRM + бот первого контакта"
          actions={(
            <>
              <Button href="/admin">Админка</Button>
              <Button onClick={createNewDialog}>Новый диалог</Button>
              <Button onClick={() => void logout()}>Выйти</Button>
            </>
          )}
        />

        {error ? <Alert className="error-alert" type="error" message={error} showIcon /> : null}

        <div className="content-grid">
          <section className="chat-panel" aria-label="Диалог с ассистентом">
            <DialogStatusBar dialog={dialog} />
            <MessageList messages={dialog.context.messages} replyLoading={replyLoading} />
            <form className="composer" onSubmit={submitMessage}>
              <Input.TextArea
                ref={textareaRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void submitMessage();
                  }
                }}
                placeholder="Введите сообщение клиента"
                autoSize={{ minRows: 2, maxRows: 5 }}
              />
              <Button
                type="primary"
                htmlType="submit"
                disabled={!draft.trim() || replyLoading}
                loading={replyLoading}
              >
                Отправить
              </Button>
            </form>
          </section>

          <aside className="profile-panel" aria-label="CRM-контекст">
            <ContextTabs dialog={dialog} editable={false} onDialogChange={setDialog} />
          </aside>
        </div>
      </section>
    </main>
  );
}

function PublicDialogPage(): JSX.Element {
  const token = decodeURIComponent(window.location.pathname.replace(/^\/public\//, ''));
  const [dialog, setDialog] = useState<PublicDialogEntity | null>(null);
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [replyLoading, setReplyLoading] = useState(false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    async function loadPublicDialog() {
      setLoading(true);
      setError('');
      try {
        const result = await requestJson<PublicDialogEntity>(`/public/dialogs/${encodeURIComponent(token)}`);
        setDialog(result);
        setFeedback(result.feedback ?? '');
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Не удалось открыть тестовую ссылку');
      } finally {
        setLoading(false);
      }
    }

    void loadPublicDialog();
  }, [token]);

  async function submitMessage(event?: FormEvent) {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || replyLoading) {
      return;
    }

    setDraft('');
    setError('');
    setReplyLoading(true);

    try {
      const result = await postJson<{ dialog: PublicDialogEntity; assistantReply: string }>(
        `/public/dialogs/${encodeURIComponent(token)}/messages`,
        { content }
      );
      setDialog(result.dialog);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось получить ответ');
    } finally {
      setReplyLoading(false);
      textareaRef.current?.focus();
    }
  }

  async function saveFeedback() {
    setFeedbackSaving(true);
    setFeedbackSaved(false);
    setError('');

    try {
      const result = await putJson<PublicDialogEntity>(
        `/public/dialogs/${encodeURIComponent(token)}/feedback`,
        { feedback }
      );
      setDialog(result);
      setFeedback(result.feedback ?? '');
      setFeedbackSaved(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось сохранить feedback');
    } finally {
      setFeedbackSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="app-shell public-shell">
        <div className="center-state"><Spin /></div>
      </main>
    );
  }

  if (!dialog) {
    return (
      <main className="app-shell public-shell">
        <section className="workspace public-workspace">
          <Alert
            type="error"
            message="Тестовая ссылка недоступна"
            description={error || 'Ссылка не найдена или срок её действия истёк.'}
            showIcon
          />
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell public-shell">
      <section className="workspace public-workspace">
        <Header
          title="Тестовый диалог с ИИ-консультантом"
          subtitle="Салон корпусной мебели"
          actions={<Tag color="blue">Ссылка действует 4 часа с момента создания</Tag>}
        />

        {error ? <Alert className="error-alert" type="error" message={error} showIcon /> : null}

        <section className="public-chat-layout">
          <div className="chat-panel" aria-label="Тестовый диалог">
            <div className="dialog-status">
              <Tag color={statusColor(dialog.status)}>{dialog.status}</Tag>
              <Tag>{stepLabel(dialog.currentStep)}</Tag>
              <span>Действует до {new Date(dialog.expiresAt).toLocaleString('ru-RU')}</span>
            </div>
            <MessageList messages={dialog.messages} replyLoading={replyLoading} />
            <form className="composer" onSubmit={submitMessage}>
              <Input.TextArea
                ref={textareaRef}
                value={draft}
                maxLength={2000}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void submitMessage();
                  }
                }}
                placeholder="Введите сообщение"
                autoSize={{ minRows: 2, maxRows: 5 }}
              />
              <Button
                type="primary"
                htmlType="submit"
                disabled={!draft.trim() || replyLoading}
                loading={replyLoading}
              >
                Отправить
              </Button>
            </form>
          </div>

          <section className="feedback-panel" aria-label="Feedback">
            <div>
              <p className="eyebrow">Feedback</p>
            </div>
            <Input.TextArea
              value={feedback}
              maxLength={4000}
              showCount
              onChange={(event) => {
                setFeedback(event.target.value);
                setFeedbackSaved(false);
              }}
              placeholder="Опишите свои впечатления от общения с ботом"
              autoSize={{ minRows: 6, maxRows: 12 }}
            />
            <Space>
              <Button type="primary" loading={feedbackSaving} onClick={() => void saveFeedback()}>
                Сохранить
              </Button>
              {feedbackSaved ? <Tag color="green">Сохранено</Tag> : null}
            </Space>
          </section>
        </section>
      </section>
    </main>
  );
}

function AdminPage(): JSX.Element {
  const [dialogs, setDialogs] = useState<AdminDialogListItem[]>([]);
  const [selectedDialog, setSelectedDialog] = useState<DialogEntity | null>(null);
  const [selectedDialogIds, setSelectedDialogIds] = useState<Key[]>([]);
  const [promptReview, setPromptReview] = useState<PromptDebugReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [debugLoading, setDebugLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadDialogs();
  }, []);

  async function loadDialogs() {
    setLoading(true);
    setError('');
    try {
      const nextDialogs = await requestJson<AdminDialogListItem[]>('/admin/dialogs');
      setDialogs(nextDialogs);
      setSelectedDialogIds((currentIds) => {
        const existingIds = new Set(nextDialogs.map((dialog) => dialog.id));
        return currentIds.filter((id) => existingIds.has(String(id)));
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось загрузить диалоги');
    } finally {
      setLoading(false);
    }
  }

  async function openDialog(id: string) {
    setDetailLoading(true);
    setError('');
    try {
      setSelectedDialog(await requestJson<DialogEntity>(`/dialogs/${id}`));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось открыть диалог');
    } finally {
      setDetailLoading(false);
    }
  }

  async function deleteDialog(id: string) {
    Modal.confirm({
      title: 'Удалить диалог?',
      content: 'Диалог будет скрыт из админки. Для PoC это soft-delete в БД.',
      okText: 'Удалить',
      okButtonProps: { danger: true },
      cancelText: 'Отмена',
      onOk: async () => {
        await deleteJson<{ ok: true }>(`/admin/dialogs/${id}`);
        if (selectedDialog?.id === id) {
          setSelectedDialog(null);
        }
        await loadDialogs();
      }
    });
  }

  async function analyzeSelectedDialogs() {
    setError('');
    setPromptReview(null);
    setDebugLoading(true);

    try {
      const result = await postJson<PromptDebugReview>('/admin/debug/prompt-review', {
        dialogIds: selectedDialogIds.map(String)
      });
      setPromptReview(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось выполнить анализ prompt’ов');
    } finally {
      setDebugLoading(false);
    }
  }

  async function showPublicLink(url: string, expiresAt: string) {
    const normalizedUrl = normalizePublicUrl(url);
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API is unavailable');
      }
      await navigator.clipboard.writeText(normalizedUrl);
      message.success('Ссылка скопирована в буфер обмена');
      return;
    } catch {
      message.warning('Не удалось скопировать ссылку автоматически');
    }

    Modal.info({
      title: 'Скопируйте тестовую ссылку',
      width: 680,
      content: (
        <div className="modal-link-content">
          <p>
            Ссылка действует 4 часа с момента создания, до {new Date(expiresAt).toLocaleString('ru-RU')}.
            Скопируйте её вручную.
          </p>
          <Input readOnly value={normalizedUrl} onFocus={(event) => event.currentTarget.select()} />
        </div>
      )
    });
  }

  async function createTestDialogLink() {
    setError('');
    try {
      const result = await postJson<PublicDialogLinkResult>('/admin/test-dialog-links');
      setSelectedDialog(result.dialog);
      await showPublicLink(result.publicUrl, result.expiresAt);
      await loadDialogs();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось создать тестовую ссылку');
    }
  }

  async function createDialogTestLink(id: string) {
    setError('');
    try {
      const result = await postJson<PublicDialogLinkResult>(`/admin/dialogs/${id}/test-link`);
      setSelectedDialog(result.dialog);
      await showPublicLink(result.publicUrl, result.expiresAt);
      await loadDialogs();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось создать ссылку для диалога');
    }
  }

  async function saveAdminFeedback(id: string, feedback: string) {
    setError('');
    try {
      const result = await putJson<DialogEntity>(`/admin/dialogs/${id}/feedback`, { feedback });
      setSelectedDialog(result);
      await loadDialogs();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось сохранить feedback');
    }
  }

  const columns: ColumnsType<AdminDialogListItem> = [
    {
      title: 'Обновлён',
      dataIndex: 'updatedAt',
      width: 150,
      render: (value: string) => new Date(value).toLocaleString('ru-RU')
    },
    {
      title: 'Шаг',
      dataIndex: 'currentStep',
      width: 150,
      render: (value: DialogStep) => <Tag>{stepLabel(value)}</Tag>
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      width: 140,
      render: (value: DialogStatus) => <Tag color={statusColor(value)}>{value}</Tag>
    },
    {
      title: 'Клиент',
      dataIndex: 'clientName',
      width: 160,
      render: (value: string | null) => value || '—'
    },
    {
      title: 'Запрос',
      dataIndex: 'requestSummary',
      ellipsis: true,
      render: (value: string | null) => value || '—'
    },
    {
      title: 'Сумма',
      dataIndex: 'estimateTotal',
      width: 130,
      render: (value: number | null) => formatMoney(value)
    },
    {
      title: 'Тест',
      dataIndex: 'publicAccess',
      width: 130,
      render: (value: PublicAccessInfo | null) => {
        if (!value) {
          return <Tag>—</Tag>;
        }
        return <Tag color={value.isActive ? 'green' : 'orange'}>{value.isActive ? 'Активна' : 'Истекла'}</Tag>;
      }
    },
    {
      title: 'Feedback',
      dataIndex: 'publicFeedback',
      width: 120,
      render: (value: PublicFeedbackInfo) => value?.text ? <Tag color="blue">Есть</Tag> : <Tag>—</Tag>
    },
    {
      title: '',
      key: 'actions',
      width: 190,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              void openDialog(record.id);
            }}
          >
            Открыть
          </Button>
          <Button
            size="small"
            danger
            onClick={(event) => {
              event.stopPropagation();
              void deleteDialog(record.id);
            }}
          >
            Удалить
          </Button>
        </Space>
      )
    }
  ];

  return (
    <main className="app-shell admin-shell">
      <section className="workspace">
        <Header
          title="Админка диалогов"
          actions={(
            <>
              <Button type="primary" onClick={() => void createTestDialogLink()}>
                Создать тестовую ссылку
              </Button>
              <Button onClick={() => void loadDialogs()}>Обновить</Button>
              <Button onClick={() => void logout()}>Выйти</Button>
            </>
          )}
        />

        {error ? <Alert className="error-alert" type="error" message={error} showIcon /> : null}

        <section className="debug-panel">
          <div className="debug-panel-header">
            <div>
              <p className="eyebrow">Debug</p>
              <h2>Анализ диалогов и prompt’ов</h2>
            </div>
            <Space>
              <Tag>{selectedDialogIds.length} выбрано</Tag>
              <Button
                type="primary"
                loading={debugLoading}
                disabled={selectedDialogIds.length === 0}
                onClick={() => void analyzeSelectedDialogs()}
              >
                Анализировать выбранные
              </Button>
            </Space>
          </div>
          <p className="debug-description">
            Выберите диалоги чекбоксами в таблице ниже. Backend отправит реальные контексты диалогов,
            структуру pipeline и текущие prompt’ы всех этапов в OpenAI API, а здесь появятся рекомендации
            по доработке prompt’ов.
          </p>
          {promptReview ? (
            <div className="debug-result">
              <Descriptions bordered size="small" column={3}>
                <Descriptions.Item label="Диалогов">{promptReview.dialogCount}</Descriptions.Item>
                <Descriptions.Item label="Prompt’ы">{promptReview.promptKeys.join(', ')}</Descriptions.Item>
                <Descriptions.Item label="Сгенерировано">
                  {new Date(promptReview.generatedAt).toLocaleString('ru-RU')}
                </Descriptions.Item>
              </Descriptions>
              <JsonBlock value={promptReview.result} fallback={promptReview.raw} />
            </div>
          ) : null}
        </section>

        <div className="admin-grid">
          <section className="table-panel">
            <Table
              rowKey="id"
              loading={loading}
              dataSource={dialogs}
              columns={columns}
              rowSelection={{
                selectedRowKeys: selectedDialogIds,
                onChange: setSelectedDialogIds
              }}
              pagination={{ pageSize: 10 }}
              size="middle"
              onRow={(record) => ({
                onClick: (event) => {
                  const target = event.target as HTMLElement;
                  if (target.closest('button,a,input,.ant-checkbox,.ant-checkbox-wrapper')) {
                    return;
                  }
                  void openDialog(record.id);
                }
              })}
            />
          </section>
          <section className="detail-panel">
            {detailLoading ? (
              <div className="center-state"><Spin /></div>
            ) : selectedDialog ? (
              <>
                <DialogStatusBar dialog={selectedDialog} />
                <PublicAccessPanel
                  dialog={selectedDialog}
                  onCreateLink={() => createDialogTestLink(selectedDialog.id)}
                  onSaveFeedback={(feedback) => saveAdminFeedback(selectedDialog.id, feedback)}
                />
                <ContextTabs
                  dialog={selectedDialog}
                  editable
                  onDialogChange={(nextDialog) => {
                    setSelectedDialog(nextDialog);
                    void loadDialogs();
                  }}
                />
              </>
            ) : (
              <div className="profile-empty">Выберите диалог из таблицы.</div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function PromptVaultPage(): JSX.Element {
  const [prompts, setPrompts] = useState<AppPromptEntity[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void loadPrompt();
  }, []);

  async function loadPrompt() {
    setLoading(true);
    setError('');
    setSaved(false);

    try {
      const result = await requestJson<AppPromptEntity[]>('/admin/prompts');
      setPrompts(result);
      setDrafts(Object.fromEntries(result.map((prompt) => [prompt.key, prompt.content])));
      setSelectedKey((currentKey) => (
        currentKey && result.some((prompt) => prompt.key === currentKey)
          ? currentKey
          : result[0]?.key ?? ''
      ));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось загрузить prompt’ы');
    } finally {
      setLoading(false);
    }
  }

  async function savePrompt() {
    const selectedPrompt = prompts.find((item) => item.key === selectedKey);
    if (!selectedPrompt) {
      return;
    }

    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const result = await putJson<AppPromptEntity>(
        `/admin/prompts/${encodeURIComponent(selectedPrompt.key)}`,
        { content: drafts[selectedPrompt.key] ?? '' }
      );
      setPrompts((currentPrompts) => currentPrompts.map((prompt) => (
        prompt.key === result.key ? result : prompt
      )));
      setDrafts((currentDrafts) => ({
        ...currentDrafts,
        [result.key]: result.content
      }));
      setSaved(true);
      message.success('Prompt сохранён');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось сохранить prompt');
    } finally {
      setSaving(false);
    }
  }

  const selectedPrompt = prompts.find((prompt) => prompt.key === selectedKey) ?? null;
  const selectedDraft = selectedPrompt ? drafts[selectedPrompt.key] ?? '' : '';
  const hasChanges = Boolean(selectedPrompt && selectedDraft !== selectedPrompt.content);

  return (
    <main className="app-shell admin-shell">
      <section className="workspace prompt-vault-workspace">
        <Header
          title="Редактор prompt’ов"
          subtitle="Prompt’ы сгруппированы по шагам pipeline"
          actions={(
            <>
              <Button href="/admin">Админка</Button>
              <Button onClick={() => void loadPrompt()}>Обновить</Button>
              <Button onClick={() => void logout()}>Выйти</Button>
            </>
          )}
        />

        {error ? <Alert className="error-alert" type="error" message={error} showIcon /> : null}

        <section className="prompt-editor-panel">
          {loading ? (
            <div className="center-state"><Spin /></div>
          ) : (
            <>
              <Tabs
                activeKey={selectedKey}
                onChange={(key) => {
                  setSelectedKey(key);
                  setSaved(false);
                }}
                items={prompts.map((prompt) => ({
                  key: prompt.key,
                  label: prompt.pipelineStep || prompt.key
                }))}
              />

              {selectedPrompt ? (
                <>
                  <Descriptions bordered size="small" column={2}>
                    <Descriptions.Item label="Шаг pipeline">
                      {selectedPrompt.pipelineStep || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ключ">{selectedPrompt.key}</Descriptions.Item>
                    <Descriptions.Item label="Название">
                      {selectedPrompt.title || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Обновил">
                      {selectedPrompt.updatedBy || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Где используется" span={2}>
                      {selectedPrompt.usage || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Обновлён" span={2}>
                      {new Date(selectedPrompt.updatedAt).toLocaleString('ru-RU')}
                    </Descriptions.Item>
                  </Descriptions>

                  <Input.TextArea
                    value={selectedDraft}
                    showCount
                    maxLength={50000}
                    onChange={(event) => {
                      setDrafts((currentDrafts) => ({
                        ...currentDrafts,
                        [selectedPrompt.key]: event.target.value
                      }));
                      setSaved(false);
                    }}
                    autoSize={{ minRows: 24, maxRows: 36 }}
                  />

                  <div className="prompt-editor-actions">
                    <Space>
                      <Button
                        type="primary"
                        loading={saving}
                        disabled={!selectedDraft.trim() || !hasChanges}
                        onClick={() => void savePrompt()}
                      >
                        Сохранить
                      </Button>
                      <Button
                        disabled={!hasChanges || saving}
                        onClick={() => {
                          setDrafts((currentDrafts) => ({
                            ...currentDrafts,
                            [selectedPrompt.key]: selectedPrompt.content
                          }));
                          setSaved(false);
                        }}
                      >
                        Отменить изменения
                      </Button>
                    </Space>
                    <Space>
                      {hasChanges ? <Tag color="orange">Есть несохранённые изменения</Tag> : null}
                      {saved ? <Tag color="green">Сохранено</Tag> : null}
                    </Space>
                  </div>
                </>
              ) : (
                <div className="profile-empty">Prompt’ы не найдены.</div>
              )}
            </>
          )}
        </section>
      </section>
    </main>
  );
}

function PublicAccessPanel(props: {
  dialog: DialogEntity;
  onCreateLink: () => Promise<void>;
  onSaveFeedback: (feedback: string) => Promise<void>;
}): JSX.Element {
  const [feedback, setFeedback] = useState(props.dialog.publicFeedback.text ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFeedback(props.dialog.publicFeedback.text ?? '');
  }, [props.dialog.id, props.dialog.publicFeedback.text]);

  async function save() {
    setSaving(true);
    try {
      await props.onSaveFeedback(feedback);
    } finally {
      setSaving(false);
    }
  }

  const access = props.dialog.publicAccess;
  const publicUrl = access?.url ? normalizePublicUrl(access.url) : null;

  return (
    <section className="public-access-panel">
      <div className="public-access-header">
        <div>
          <p className="eyebrow">Тестовая ссылка</p>
          <h2>Публичный диалог</h2>
        </div>
        <Space>
          {access ? <Tag color={access.isActive ? 'green' : 'orange'}>{access.isActive ? 'Активна' : 'Истекла'}</Tag> : <Tag>Нет ссылки</Tag>}
          <Button onClick={() => void props.onCreateLink()}>{access ? 'Перегенерировать ссылку' : 'Создать ссылку'}</Button>
        </Space>
      </div>

      <Descriptions bordered size="small" column={1}>
        <Descriptions.Item label="URL">
          {publicUrl ? (
            <Input readOnly value={publicUrl} onFocus={(event) => event.currentTarget.select()} />
          ) : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Создана">
          {access?.createdAt ? new Date(access.createdAt).toLocaleString('ru-RU') : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Истекает">
          {access?.expiresAt ? new Date(access.expiresAt).toLocaleString('ru-RU') : '—'}
        </Descriptions.Item>
      </Descriptions>

      <div className="admin-feedback-editor">
        <Input.TextArea
          value={feedback}
          maxLength={4000}
          showCount
          onChange={(event) => setFeedback(event.target.value)}
          placeholder="Опишите свои впечатления от общения с ботом"
          autoSize={{ minRows: 4, maxRows: 10 }}
        />
        <Space>
          <Button type="primary" loading={saving} onClick={() => void save()}>
            Сохранить
          </Button>
          {props.dialog.publicFeedback.updatedAt ? (
            <span className="muted-text">
              Обновлено {new Date(props.dialog.publicFeedback.updatedAt).toLocaleString('ru-RU')}
              {props.dialog.publicFeedback.updatedBy ? `, ${props.dialog.publicFeedback.updatedBy}` : ''}
            </span>
          ) : null}
        </Space>
      </div>
    </section>
  );
}

function Header(props: {
  title: string;
  subtitle?: string;
  actions: JSX.Element;
}): JSX.Element {
  return (
    <header className="topbar">
      <div>
        {props.subtitle ? <p className="eyebrow">{props.subtitle}</p> : null}
        <h1>{props.title}</h1>
      </div>
      <div className="topbar-actions">{props.actions}</div>
    </header>
  );
}

function DialogStatusBar(props: { dialog: DialogEntity }): JSX.Element {
  return (
    <div className="dialog-status">
      <Tag color={statusColor(props.dialog.status)}>{props.dialog.status}</Tag>
      <Tag>{stepLabel(props.dialog.currentStep)}</Tag>
      <span>ID: {props.dialog.id}</span>
    </div>
  );
}

function MessageList(props: {
  messages: ChatMessage[];
  replyLoading?: boolean;
}): JSX.Element {
  return (
    <div className="message-list">
      {props.messages.map((message, index) => (
        <article
          className={`message ${message.role === 'user' ? 'message-user' : 'message-assistant'}`}
          key={`${message.role}-${message.createdAt}-${index}`}
        >
          <span className="message-author">
            {message.role === 'user' ? 'Клиент' : 'Ассистент'}
          </span>
          <p>{message.content}</p>
        </article>
      ))}
      {props.replyLoading ? (
        <article className="message message-assistant">
          <span className="message-author">Ассистент</span>
          <div className="typing-row">
            <Spin size="small" />
            <span>Пишет ответ</span>
          </div>
        </article>
      ) : null}
    </div>
  );
}

function ContextTabs(props: {
  dialog: DialogEntity;
  editable: boolean;
  onDialogChange: (dialog: DialogEntity) => void;
}): JSX.Element {
  return (
    <Tabs
      className="context-tabs"
      items={[
        {
          key: 'chat',
          label: 'Чат',
          children: <MessageList messages={props.dialog.context.messages} />
        },
        {
          key: 'profile',
          label: 'Профайл',
          children: <ProfileView dialog={props.dialog} editable={props.editable} onDialogChange={props.onDialogChange} />
        },
        {
          key: 'brief',
          label: 'ТЗ',
          children: <TechnicalBriefView dialog={props.dialog} editable={props.editable} onDialogChange={props.onDialogChange} />
        },
        {
          key: 'specification',
          label: 'Спецификация',
          children: <SpecificationEditor dialog={props.dialog} editable={props.editable} onDialogChange={props.onDialogChange} />
        },
        {
          key: 'estimate',
          label: 'Расчёт',
          children: <EstimateView dialog={props.dialog} editable={props.editable} onDialogChange={props.onDialogChange} />
        }
      ]}
    />
  );
}

function ProfileView(props: {
  dialog: DialogEntity;
  editable: boolean;
  onDialogChange: (dialog: DialogEntity) => void;
}): JSX.Element {
  const profile = props.dialog.context.profile;

  async function regenerate() {
    props.onDialogChange(await postJson<DialogEntity>(`/dialogs/${props.dialog.id}/profile/regenerate`));
  }

  return (
    <div className="tab-content">
      {props.editable ? <Button onClick={() => void regenerate()}>Перегенерировать профайл</Button> : null}
      {profile ? (
        <>
          <JsonBlock value={profile.json} fallback={profile.raw} />
          {profile.summary ? <pre className="summary-block">{profile.summary}</pre> : null}
        </>
      ) : (
        <div className="profile-empty">Профайл появится после достаточного первичного контакта.</div>
      )}
    </div>
  );
}

function TechnicalBriefView(props: {
  dialog: DialogEntity;
  editable: boolean;
  onDialogChange: (dialog: DialogEntity) => void;
}): JSX.Element {
  const brief = props.dialog.context.technicalBrief;

  async function regenerate() {
    props.onDialogChange(await postJson<DialogEntity>(`/dialogs/${props.dialog.id}/technical-brief/regenerate`));
  }

  return (
    <div className="tab-content">
      {props.editable ? <Button onClick={() => void regenerate()}>Перегенерировать ТЗ</Button> : null}
      {brief ? (
        <JsonBlock value={brief.json} fallback={brief.raw} />
      ) : (
        <div className="profile-empty">Техническое ТЗ ещё не сформировано.</div>
      )}
    </div>
  );
}

function SpecificationEditor(props: {
  dialog: DialogEntity;
  editable: boolean;
  onDialogChange: (dialog: DialogEntity) => void;
}): JSX.Element {
  const [rows, setRows] = useState<SpecificationRow[]>(props.dialog.context.specification?.rows ?? []);

  useEffect(() => {
    setRows(props.dialog.context.specification?.rows ?? []);
  }, [props.dialog.id, props.dialog.context.specification?.updatedAt, props.dialog.context.specification?.generatedAt]);

  function updateRow(id: string, patch: Partial<SpecificationRow>) {
    setRows((currentRows) => currentRows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  async function regenerate() {
    props.onDialogChange(await postJson<DialogEntity>(`/dialogs/${props.dialog.id}/specification/regenerate`));
  }

  async function save() {
    props.onDialogChange(await putJson<DialogEntity>(`/dialogs/${props.dialog.id}/specification`, { rows }));
  }

  const columns: ColumnsType<SpecificationRow> = [
    {
      title: 'Раздел',
      dataIndex: 'section',
      width: 120,
      render: (value, record) => props.editable
        ? <Input value={value ?? ''} onChange={(event) => updateRow(record.id, { section: event.target.value || null })} />
        : value || '—'
    },
    {
      title: 'Тип',
      dataIndex: 'itemType',
      width: 120,
      render: (value, record) => props.editable
        ? <Input value={value ?? ''} onChange={(event) => updateRow(record.id, { itemType: event.target.value || null })} />
        : value || '—'
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      width: 220,
      render: (value, record) => props.editable
        ? <Input value={value} onChange={(event) => updateRow(record.id, { name: event.target.value })} />
        : value
    },
    {
      title: 'Материал',
      dataIndex: 'material',
      width: 180,
      render: (value, record) => props.editable
        ? <Input value={value ?? ''} onChange={(event) => updateRow(record.id, { material: event.target.value || null })} />
        : value || '—'
    },
    {
      title: 'ДxШxТ',
      key: 'dimensions',
      width: 230,
      render: (_, record) => props.editable ? (
        <Space.Compact>
          <InputNumber value={record.lengthMm} min={0} placeholder="Д" onChange={(value) => updateRow(record.id, { lengthMm: value ?? null })} />
          <InputNumber value={record.widthMm} min={0} placeholder="Ш" onChange={(value) => updateRow(record.id, { widthMm: value ?? null })} />
          <InputNumber value={record.thicknessMm} min={0} placeholder="Т" onChange={(value) => updateRow(record.id, { thicknessMm: value ?? null })} />
        </Space.Compact>
      ) : `${record.lengthMm ?? '—'} x ${record.widthMm ?? '—'} x ${record.thicknessMm ?? '—'}`
    },
    {
      title: 'Кол.',
      dataIndex: 'quantity',
      width: 90,
      render: (value, record) => props.editable
        ? <InputNumber value={value} min={0} onChange={(nextValue) => updateRow(record.id, { quantity: nextValue ?? 0 })} />
        : value
    },
    {
      title: 'Ед.',
      dataIndex: 'unit',
      width: 90,
      render: (value, record) => props.editable
        ? <Input value={value} onChange={(event) => updateRow(record.id, { unit: event.target.value })} />
        : value
    },
    {
      title: 'Примечание',
      dataIndex: 'notes',
      render: (value, record) => props.editable
        ? <Input value={value ?? ''} onChange={(event) => updateRow(record.id, { notes: event.target.value || null })} />
        : value || '—'
    }
  ];

  return (
    <div className="tab-content">
      {props.editable ? (
        <Space className="tab-actions">
          <Button onClick={() => void regenerate()}>Перегенерировать спецификацию</Button>
          <Button type="primary" onClick={() => void save()}>Сохранить правки</Button>
        </Space>
      ) : null}
      <Table
        rowKey="id"
        dataSource={rows}
        columns={columns}
        pagination={false}
        scroll={{ x: 1120 }}
        size="small"
        locale={{ emptyText: 'Спецификация ещё не сформирована.' }}
      />
    </div>
  );
}

function EstimateView(props: {
  dialog: DialogEntity;
  editable: boolean;
  onDialogChange: (dialog: DialogEntity) => void;
}): JSX.Element {
  const estimate = props.dialog.context.estimate;

  async function recalculate() {
    props.onDialogChange(await postJson<DialogEntity>(`/dialogs/${props.dialog.id}/estimate/recalculate`));
  }

  const columns: ColumnsType<EstimateLine> = [
    { title: 'Позиция', dataIndex: 'name' },
    { title: 'Кол.', dataIndex: 'quantity', width: 90 },
    { title: 'Ед.', dataIndex: 'unit', width: 90 },
    { title: 'Цена', dataIndex: 'unitPrice', width: 120, render: (value) => formatMoney(value) },
    { title: 'Сумма', dataIndex: 'total', width: 120, render: (value) => formatMoney(value) },
    {
      title: 'Статус',
      dataIndex: 'status',
      width: 130,
      render: (value) => <Tag color={value === 'priced' ? 'green' : 'orange'}>{value}</Tag>
    }
  ];

  return (
    <div className="tab-content">
      {props.editable ? <Button onClick={() => void recalculate()}>Пересчитать цену</Button> : null}
      {estimate ? (
        <>
          <Descriptions className="estimate-summary" bordered size="small" column={1}>
            <Descriptions.Item label="Итого">{formatMoney(estimate.total)}</Descriptions.Item>
            <Descriptions.Item label="Полный расчёт">{estimate.isComplete ? 'Да' : 'Нет'}</Descriptions.Item>
            <Descriptions.Item label="Заметки">{estimate.notes.join(' ') || '—'}</Descriptions.Item>
          </Descriptions>
          <Table
            rowKey="rowId"
            dataSource={estimate.lines}
            columns={columns}
            pagination={false}
            size="small"
          />
        </>
      ) : (
        <div className="profile-empty">Расчёт ещё не выполнен.</div>
      )}
    </div>
  );
}

function JsonBlock(props: {
  value: Record<string, unknown> | null;
  fallback: string | null;
}): JSX.Element {
  const text = props.value ? JSON.stringify(props.value, null, 2) : props.fallback || '';

  if (!text) {
    return <div className="profile-empty">Нет данных.</div>;
  }

  return <pre className="json-block">{text}</pre>;
}
