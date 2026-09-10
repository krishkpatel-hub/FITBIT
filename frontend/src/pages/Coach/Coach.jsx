import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { coachService } from '../../services/coachService';

const priorityOrder = {
  high: 3,
  medium: 2,
  low: 1,
};

const strengthTypes = new Set(['strength_progress', 'plateau_warning', 'volume_change', 'pr_milestone']);
const consistencyTypes = new Set(['consistency', 'recovery_warning']);

const formatType = (type = '') =>
  type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const sortByPriority = (insights) =>
  [...insights].sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));

const suggestedQuestions = [
  'What should I train next?',
  'How has my bench changed recently?',
  'Summarize my recent training.',
  'What is a plus set?',
];

const getSafeCoachErrorMessage = (err, fallback = "I couldn't generate that coaching response right now. Please try again.") => {
  const rawMessage = err?.response?.data?.message || err?.message || '';

  if (!rawMessage || /internal server error|stack trace|cast to|mongoose|mongodb|openai api key/i.test(rawMessage)) {
    return fallback;
  }

  return rawMessage;
};

function InsightRow({ insight }) {
  return (
    <article className="border-t border-stone-800 py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-100">{insight.title}</p>
          <p className="mt-1 text-sm leading-6 text-stone-400">{insight.message}</p>
        </div>
        <span className="rounded-md border border-stone-700 px-2 py-1 text-xs font-medium uppercase tracking-[0.16em] text-stone-400">
          {insight.priority || 'low'}
        </span>
      </div>
      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-stone-600">
        {formatType(insight.type)} · {insight.dataSource?.replace(/_/g, ' ') || 'user data'}
      </p>
    </article>
  );
}

function InsightSection({ title, description, insights, emptyMessage }) {
  return (
    <section className="quiet-card">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="section-title">{title}</h2>
          {description && <p className="section-copy">{description}</p>}
        </div>
        <span className="text-sm text-stone-500">{insights.length} insight{insights.length === 1 ? '' : 's'}</span>
      </div>

      <div className="mt-5">
        {insights.length > 0 ? (
          insights.map((insight) => <InsightRow key={`${insight.type}-${insight.title}-${insight.message}`} insight={insight} />)
        ) : (
          <p className="empty-state">{emptyMessage}</p>
        )}
      </div>
    </section>
  );
}

function Coach() {
  const { logout } = useAuth();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatError, setChatError] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [streamStatus, setStreamStatus] = useState('');
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([
    {
      role: 'coach',
      content: 'Ask about your training, progress, or current program. I will use your logged data when it is needed.',
      sources: [],
    },
  ]);
  const streamControllerRef = useRef(null);
  const streamCancelledRef = useRef(false);
  const mountedRef = useRef(true);

  const groupedInsights = useMemo(() => {
    const sortedInsights = sortByPriority(insights);

    return {
      top: sortedInsights.slice(0, 3),
      priority: sortedInsights.filter((insight) => insight.priority === 'high' || insight.priority === 'medium'),
      strength: sortedInsights.filter((insight) => strengthTypes.has(insight.type)),
      consistency: sortedInsights.filter((insight) => consistencyTypes.has(insight.type)),
    };
  }, [insights]);

  useEffect(() => {
    mountedRef.current = true;

    const loadInsights = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await coachService.getCoachInsights();
        setInsights(response.data || []);
      } catch (err) {
        if (err.response?.status === 401) {
          await logout();
          return;
        }

        setError(err.response?.data?.message || 'Unable to load Smart Coach insights.');
      } finally {
        setLoading(false);
      }
    };

    loadInsights();

    return () => {
      mountedRef.current = false;
      streamControllerRef.current?.abort();
    };
  }, [logout]);

  const updateCoachMessage = (index, updates) => {
    if (!mountedRef.current) return;

    setConversation((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              ...updates,
              content:
                typeof updates.content === 'function'
                  ? updates.content(entry.content)
                  : updates.content ?? entry.content,
            }
          : entry,
      ),
    );
  };

  const cancelCoachResponse = () => {
    streamCancelledRef.current = true;
    streamControllerRef.current?.abort();
    setChatLoading(false);
    setStreamStatus('');
  };

  const submitCoachMessage = async (event, suggestedMessage) => {
    event?.preventDefault();

    if (chatLoading) return;

    const outgoingMessage = (suggestedMessage || message).trim();

    if (!outgoingMessage) {
      setChatError('Enter a question for Coach.');
      return;
    }

    setChatError('');
    setChatLoading(true);
    setStreamStatus('Reviewing your training...');
    setMessage('');
    streamCancelledRef.current = false;

    const controller = new AbortController();
    streamControllerRef.current = controller;
    const coachMessageIndex = conversation.length + 1;

    setConversation((current) => [
      ...current,
      { role: 'user', content: outgoingMessage, sources: [] },
      {
        role: 'coach',
        content: '',
        sources: [],
        status: 'Reviewing your training...',
        streaming: true,
      },
    ]);

    try {
      await coachService.streamCoachMessage({
        message: outgoingMessage,
        signal: controller.signal,
        onEvent: (streamEvent) => {
          if (!mountedRef.current) return;

          if (streamEvent.type === 'status') {
            setStreamStatus(streamEvent.message);
            updateCoachMessage(coachMessageIndex, { status: streamEvent.message });
            return;
          }

          if (streamEvent.type === 'text_delta') {
            setStreamStatus('');
            updateCoachMessage(coachMessageIndex, {
              status: '',
              content: (currentContent) => `${currentContent}${streamEvent.delta}`,
            });
            return;
          }

          if (streamEvent.type === 'complete') {
            setStreamStatus('');
            updateCoachMessage(coachMessageIndex, {
              streaming: false,
              status: '',
              sources: streamEvent.sources || [],
            });
            return;
          }

          if (streamEvent.type === 'error') {
            setStreamStatus('');
            updateCoachMessage(coachMessageIndex, {
              streaming: false,
              status: '',
              content: (currentContent) =>
                currentContent || "I couldn't generate that coaching response right now. Please try again.",
            });
            setChatError(getSafeCoachErrorMessage({ message: streamEvent.message }));
          }
        },
      });
    } catch (err) {
      if (streamCancelledRef.current || err.name === 'AbortError') {
        updateCoachMessage(coachMessageIndex, {
          streaming: false,
          status: '',
          content: (currentContent) => currentContent || 'Response cancelled.',
        });
        return;
      }

      if (err.response?.status === 401 || err.status === 401 || err.message === 'Authentication required') {
        await logout();
        return;
      }

      updateCoachMessage(coachMessageIndex, {
        streaming: false,
        status: '',
        content: (currentContent) =>
          currentContent || "I couldn't generate that coaching response right now. Please try again.",
      });

      if (err.response?.status === 429 || err.status === 429 || /too many/i.test(err.message)) {
        setChatError(getSafeCoachErrorMessage(err, 'Coach is receiving too many requests. Please try again shortly.'));
      } else if (err.response?.status === 504 || err.status === 504 || err.code === 'ECONNABORTED' || /too long|timeout|taking longer/i.test(err.message)) {
        setChatError('Coach took too long to respond. Please try again.');
      } else if (err instanceof TypeError) {
        setChatError('Network connection failed. Please check your connection and try again.');
      } else {
        setChatError(getSafeCoachErrorMessage(err, 'Unable to reach Coach right now. Please try again.'));
      }
    } finally {
      if (mountedRef.current) {
        setChatLoading(false);
        setStreamStatus('');
      }
      streamControllerRef.current = null;
    }
  };

  return (
    <section className="page-stack">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Smart Coach</p>
          <h1 className="page-title">Coach Insights</h1>
          <p className="page-copy">
            Explainable coaching notes generated from your workouts, training maxes, PRs, and progress logs.
          </p>
        </div>
        <Link to="/analytics" className="btn-secondary">
          View Analytics
        </Link>
      </div>

      <section className="quiet-card">
        <div className="flex flex-col gap-3 border-b border-stone-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-title">Ask Coach</h2>
            <p className="section-copy">Ask about your training, progress, or current program.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                className="btn-secondary text-xs"
                disabled={chatLoading}
                onClick={(event) => submitCoachMessage(event, question)}
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-4" aria-live="polite">
          {conversation.map((entry, index) => (
            <article
              key={`${entry.role}-${index}`}
              className={entry.role === 'user' ? 'border-l border-amber-300/60 pl-4' : 'border-l border-stone-700 pl-4'}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                {entry.role === 'user' ? 'You' : 'Coach'}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-stone-300">
                {entry.content || entry.status || 'Preparing your answer...'}
              </p>
              {entry.sources?.length > 0 && (
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-stone-600">
                  Sources: {entry.sources.map((source) => source.replace(/_/g, ' ')).join(', ')}
                </p>
              )}
            </article>
          ))}

          {chatLoading && streamStatus && <p className="text-sm text-stone-400">{streamStatus}</p>}
        </div>

        {chatError && (
          <p role="alert" className="status-error mt-5">
            {chatError}
          </p>
        )}

        <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={submitCoachMessage}>
          <label className="sr-only" htmlFor="coach-message">
            Ask about your training
          </label>
          <input
            id="coach-message"
            className="input-field flex-1"
            value={message}
            maxLength={1000}
            placeholder="Ask about your training..."
            disabled={chatLoading}
            onChange={(event) => {
              setMessage(event.target.value);
              if (chatError) setChatError('');
            }}
          />
          <button type="submit" className="btn-primary sm:w-auto" disabled={chatLoading}>
            {chatLoading ? 'Sending...' : 'Send'}
          </button>
          {chatLoading && (
            <button type="button" className="btn-secondary sm:w-auto" onClick={cancelCoachResponse}>
              Cancel
            </button>
          )}
        </form>
      </section>

      {error && (
        <p role="alert" className="status-error">
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="quiet-card animate-pulse">
              <div className="h-4 w-2/3 rounded bg-stone-800" />
              <div className="mt-4 h-3 w-full rounded bg-stone-800" />
              <div className="mt-2 h-3 w-4/5 rounded bg-stone-800" />
            </div>
          ))}
        </div>
      ) : insights.length === 0 ? (
        <div className="empty-state">
          Log workouts, PRs, and progress to unlock Smart Coach insights.
        </div>
      ) : (
        <>
          <section className="grid gap-5 lg:grid-cols-3">
            {groupedInsights.top.map((insight) => (
              <article key={`${insight.type}-${insight.title}`} className="metric-panel">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/80">
                  {formatType(insight.type)}
                </p>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-stone-50">{insight.title}</h2>
                <p className="mt-2 text-sm leading-6 text-stone-400">{insight.message}</p>
              </article>
            ))}
          </section>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-6">
              <InsightSection
                title="Priority Insights"
                description="The items most likely to affect the next training decision."
                insights={groupedInsights.priority}
                emptyMessage="No medium or high priority insights right now."
              />
            </div>

            <div className="space-y-6">
              <InsightSection
                title="Strength"
                description="Training maxes, PRs, volume changes, and plateau signals."
                insights={groupedInsights.strength}
                emptyMessage="Add training max history, workouts, or PRs to receive strength insights."
              />
              <InsightSection
                title="Consistency and Recovery"
                description="Workout completion, training density, and recovery pressure."
                insights={groupedInsights.consistency}
                emptyMessage="Plan and complete workouts to see consistency and recovery feedback."
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default Coach;
