import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { coachService } from '../../services/coachService.js';

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
  }, [logout]);

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
