import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../context/AuthContext.jsx';
import { prService } from '../../services/prService.js';

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  exerciseName: '',
  weight: '',
  reps: '',
  oneRepMax: '',
  estimatedOneRepMax: '',
  date: today(),
  notes: '',
};

const milestoneRules = [
  { exercise: 'bench', weight: 135, label: 'First 135 lb bench' },
  { exercise: 'bench', weight: 225, label: 'First 225 lb bench' },
  { exercise: 'squat', weight: 225, label: 'First 225 lb squat' },
  { exercise: 'squat', weight: 315, label: 'First 315 lb squat' },
  { exercise: 'deadlift', weight: 315, label: 'First 315 lb deadlift' },
  { exercise: 'deadlift', weight: 405, label: 'First 405 lb deadlift' },
  { exercise: 'overhead press', weight: 135, label: 'First 135 lb overhead press' },
];

const estimateOneRepMax = (weight, reps) => {
  const numericWeight = Number(weight || 0);
  const numericReps = Number(reps || 0);

  if (!numericWeight || !numericReps) {
    return 0;
  }

  if (numericReps === 1) {
    return Math.round(numericWeight);
  }

  return Math.round(numericWeight * (1 + numericReps / 30));
};

const numberOrZero = (value) => (value === '' ? 0 : Number(value));

const formatDate = (date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));

const shortDate = (date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));

const getPRValue = (pr) => Number(pr.estimatedOneRepMax || pr.oneRepMax || pr.weight || 0);
const normalizeExercise = (name) => name?.trim().toLowerCase() || 'unknown';

const toForm = (pr) => ({
  exerciseName: pr.exerciseName || '',
  weight: pr.weight ?? '',
  reps: pr.reps ?? '',
  oneRepMax: pr.oneRepMax ?? '',
  estimatedOneRepMax: pr.estimatedOneRepMax ?? '',
  date: pr.date ? pr.date.slice(0, 10) : today(),
  notes: pr.notes || '',
});

function Metric({ label, value, detail }) {
  return (
    <div className="border-t border-stone-800 pt-4">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-stone-50">{value}</p>
      {detail && <p className="mt-1 text-sm text-stone-400">{detail}</p>}
    </div>
  );
}

function PRCenter() {
  const { logout } = useAuth();
  const [prs, setPrs] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleApiError = async (err, fallbackMessage) => {
    if (err.response?.status === 401) {
      await logout();
      return 'Your session expired. Please log in again.';
    }

    return err.response?.data?.message || fallbackMessage;
  };

  const loadPRs = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await prService.getPRs();
      setPrs(response.data || []);
    } catch (err) {
      setError(await handleApiError(err, 'Unable to load personal records.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPRs();
  }, []);

  const derived = useMemo(() => {
    const sortedNewest = [...prs].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    const highest = [...prs].sort((a, b) => getPRValue(b) - getPRValue(a))[0];
    const byExercise = prs.reduce((groups, pr) => {
      const key = normalizeExercise(pr.exerciseName);
      groups[key] = [...(groups[key] || []), pr];
      return groups;
    }, {});

    const summaryByLift = Object.entries(byExercise)
      .map(([exercise, records]) => {
        const sorted = [...records].sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));
        const first = getPRValue(sorted[0]);
        const best = [...records].sort((a, b) => getPRValue(b) - getPRValue(a))[0];
        const latest = sorted[sorted.length - 1];

        return {
          exercise,
          label: best.exerciseName,
          count: records.length,
          best,
          latest,
          improvement: getPRValue(best) - first,
        };
      })
      .sort((a, b) => getPRValue(b.best) - getPRValue(a.best));

    const chartData = sortedNewest
      .slice()
      .reverse()
      .map((pr) => ({
        date: pr.date || pr.createdAt,
        label: shortDate(pr.date || pr.createdAt),
        exerciseName: pr.exerciseName,
        estimatedOneRepMax: getPRValue(pr),
      }));

    const milestones = milestoneRules.filter((rule) =>
      prs.some((pr) => normalizeExercise(pr.exerciseName).includes(rule.exercise) && getPRValue(pr) >= rule.weight),
    );

    const recentImprovements = summaryByLift
      .filter((item) => item.improvement > 0)
      .sort((a, b) => b.improvement - a.improvement)
      .slice(0, 4);

    return {
      newest: sortedNewest[0],
      highest,
      summaryByLift,
      chartData,
      milestones,
      recentImprovements,
    };
  }, [prs]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => {
      const next = {
        ...current,
        [name]: value,
      };

      if (name === 'weight' || name === 'reps') {
        const estimated = estimateOneRepMax(name === 'weight' ? value : next.weight, name === 'reps' ? value : next.reps);
        next.estimatedOneRepMax = estimated || '';
      }

      return next;
    });
  };

  const resetForm = () => {
    setFormData({ ...emptyForm, date: today() });
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.exerciseName.trim()) {
      setError('Exercise name is required.');
      return;
    }

    setSaving(true);

    const payload = {
      exerciseName: formData.exerciseName.trim(),
      weight: numberOrZero(formData.weight),
      reps: numberOrZero(formData.reps),
      oneRepMax: numberOrZero(formData.oneRepMax),
      estimatedOneRepMax: numberOrZero(formData.estimatedOneRepMax) || estimateOneRepMax(formData.weight, formData.reps),
      date: formData.date,
      notes: formData.notes,
    };

    try {
      if (editingId) {
        await prService.updatePR(editingId, payload);
        setSuccess('Personal record updated.');
      } else {
        await prService.createPR(payload);
        setSuccess('Personal record logged.');
      }

      resetForm();
      await loadPRs();
    } catch (err) {
      setError(await handleApiError(err, 'Unable to save personal record.'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (pr) => {
    setEditingId(pr._id);
    setFormData(toForm(pr));
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id) => {
    setError('');
    setSuccess('');

    try {
      await prService.deletePR(id);
      setSuccess('Personal record deleted.');
      if (editingId === id) {
        resetForm();
      }
      await loadPRs();
    } catch (err) {
      setError(await handleApiError(err, 'Unable to delete personal record.'));
    }
  };

  return (
    <motion.section
      className="page-stack"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
    >
      <header className="border-b border-stone-800 pb-8">
        <p className="eyebrow">Strength Milestones</p>
        <h1 className="page-title">Personal Records Center</h1>
        <p className="page-copy">Track maxes, estimated 1RMs, milestones, and strength progress from your own PR history.</p>
      </header>

      {error && <p className="status-error">{error}</p>}
      {success && <p className="status-success">{success}</p>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4" aria-label="Loading personal records">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-lg border border-stone-800 bg-stone-900/40" />
          ))}
        </div>
      ) : (
        <>
          <section className="grid gap-6 md:grid-cols-4">
            <Metric
              label="Newest PR"
              value={derived.newest?.exerciseName || 'None'}
              detail={derived.newest ? `${getPRValue(derived.newest)} lb · ${formatDate(derived.newest.date || derived.newest.createdAt)}` : 'Log your first record'}
            />
            <Metric
              label="Highest PR"
              value={derived.highest ? `${getPRValue(derived.highest)} lb` : 'None'}
              detail={derived.highest?.exerciseName || 'No records yet'}
            />
            <Metric label="Exercises Tracked" value={derived.summaryByLift.length} detail="Unique PR movements" />
            <Metric label="Total PRs" value={prs.length} detail="All records" />
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <form onSubmit={handleSubmit} className="quiet-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="section-title">{editingId ? 'Edit PR' : 'Log Personal Record'}</h2>
                  <p className="section-copy">Estimated 1RM updates automatically when weight and reps are entered.</p>
                </div>
                {editingId && (
                  <button type="button" onClick={resetForm} className="btn-secondary px-3">
                    Cancel
                  </button>
                )}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-stone-300">Exercise name</span>
                  <input name="exerciseName" value={formData.exerciseName} onChange={handleChange} required className="form-field" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-300">Weight</span>
                  <input type="number" min="0" name="weight" value={formData.weight} onChange={handleChange} className="form-field" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-300">Reps</span>
                  <input type="number" min="0" name="reps" value={formData.reps} onChange={handleChange} className="form-field" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-300">1RM</span>
                  <input type="number" min="0" name="oneRepMax" value={formData.oneRepMax} onChange={handleChange} className="form-field" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-300">Estimated 1RM</span>
                  <input
                    type="number"
                    min="0"
                    name="estimatedOneRepMax"
                    value={formData.estimatedOneRepMax}
                    onChange={handleChange}
                    className="form-field"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-300">Date</span>
                  <input type="date" name="date" value={formData.date} onChange={handleChange} className="form-field" />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium text-stone-300">Notes</span>
                  <textarea name="notes" rows="3" value={formData.notes} onChange={handleChange} className="form-field" />
                </label>
              </div>

              <button type="submit" disabled={saving} className="btn-primary mt-6">
                {saving ? 'Saving...' : editingId ? 'Update PR' : 'Log PR'}
              </button>
            </form>

            <section className="quiet-card">
              <h2 className="section-title">PR History Over Time</h2>
              {derived.chartData.length === 0 ? (
                <p className="empty-state mt-6">Log your first personal record to start tracking strength milestones.</p>
              ) : (
                <div className="mt-6 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={derived.chartData}>
                      <CartesianGrid stroke="#292524" vertical={false} />
                      <XAxis dataKey="label" stroke="#78716c" tickLine={false} axisLine={false} />
                      <YAxis stroke="#78716c" tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: '#1c1917', border: '1px solid #44403c', color: '#fafaf9' }} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="estimatedOneRepMax"
                        name="Estimated 1RM"
                        stroke="#d6c08a"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </section>

          {prs.length === 0 ? (
            <p className="empty-state">Log your first personal record to start tracking strength milestones.</p>
          ) : (
            <>
              <section className="quiet-card">
                <h2 className="section-title">PR Summary by Lift</h2>
                <div className="mt-6 grid gap-5 md:grid-cols-3">
                  {derived.summaryByLift.map((item) => (
                    <div key={item.exercise} className="border-t border-stone-800 pt-4">
                      <h3 className="font-semibold text-stone-50">{item.label}</h3>
                      <dl className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between gap-4">
                          <dt className="text-stone-500">Best</dt>
                          <dd className="text-stone-100">{getPRValue(item.best)} lb</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-stone-500">Latest</dt>
                          <dd className="text-stone-100">{getPRValue(item.latest)} lb</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-stone-500">Improvement</dt>
                          <dd className="text-stone-100">+{item.improvement} lb</dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-2">
                <section className="quiet-card">
                  <h2 className="section-title">Recent Improvements</h2>
                  {derived.recentImprovements.length === 0 ? (
                    <p className="empty-state mt-6">Add multiple PRs for the same lift to see improvements.</p>
                  ) : (
                    <div className="mt-4 divide-y divide-stone-800">
                      {derived.recentImprovements.map((item) => (
                        <p key={item.exercise} className="py-4 text-sm text-stone-300">
                          {item.label} improved by {item.improvement} lb from first logged record to best record.
                        </p>
                      ))}
                    </div>
                  )}
                </section>

                <section className="quiet-card">
                  <h2 className="section-title">Milestones</h2>
                  {derived.milestones.length === 0 ? (
                    <p className="empty-state mt-6">Milestones appear when your estimated 1RM crosses classic strength markers.</p>
                  ) : (
                    <div className="mt-4 divide-y divide-stone-800">
                      {derived.milestones.map((milestone) => (
                        <p key={milestone.label} className="py-4 text-sm text-stone-300">
                          {milestone.label}
                        </p>
                      ))}
                    </div>
                  )}
                </section>
              </section>

              <section className="space-y-4">
                <h2 className="section-title">PR History Timeline</h2>
                <div className="divide-y divide-stone-800 border-y border-stone-800">
                  {[...prs]
                    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
                    .map((pr) => (
                      <article key={pr._id} className="grid gap-4 py-5 md:grid-cols-[160px_1fr_auto] md:items-center">
                        <div>
                          <p className="font-medium text-stone-100">{formatDate(pr.date || pr.createdAt)}</p>
                          <p className="mt-1 text-sm text-stone-500">{pr.reps || 0} reps</p>
                        </div>
                        <div>
                          <h3 className="font-semibold text-stone-50">{pr.exerciseName}</h3>
                          <p className="mt-1 text-sm text-stone-400">
                            {pr.weight || 0} lb · Estimated 1RM {getPRValue(pr)} lb
                          </p>
                          {pr.notes && <p className="mt-1 text-sm text-stone-500">{pr.notes}</p>}
                        </div>
                        <div className="flex gap-2 md:justify-end">
                          <button type="button" onClick={() => handleEdit(pr)} className="btn-secondary px-3">
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(pr._id)}
                            className="rounded-md border border-red-900/70 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-950/30"
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                </div>
              </section>
            </>
          )}
        </>
      )}
    </motion.section>
  );
}

export default PRCenter;
