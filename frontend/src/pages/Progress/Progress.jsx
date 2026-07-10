import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { progressService } from '../../services/progressService.js';

const today = () => new Date().toISOString().slice(0, 10);

const emptyProgressForm = {
  date: today(),
  bodyWeight: '',
  bodyFatPercentage: '',
  chest: '',
  waist: '',
  hips: '',
  arms: '',
  thighs: '',
  notes: '',
};

const numberOrZero = (value) => (value === '' ? 0 : Number(value));

const normalizeProgressPayload = (formData) => ({
  date: formData.date,
  bodyWeight: numberOrZero(formData.bodyWeight),
  bodyFatPercentage: numberOrZero(formData.bodyFatPercentage),
  measurements: {
    chest: numberOrZero(formData.chest),
    waist: numberOrZero(formData.waist),
    hips: numberOrZero(formData.hips),
    arms: numberOrZero(formData.arms),
    thighs: numberOrZero(formData.thighs),
  },
  notes: formData.notes,
});

const toProgressForm = (log) => ({
  date: log.date ? log.date.slice(0, 10) : today(),
  bodyWeight: log.bodyWeight ?? '',
  bodyFatPercentage: log.bodyFatPercentage ?? '',
  chest: log.measurements?.chest ?? '',
  waist: log.measurements?.waist ?? '',
  hips: log.measurements?.hips ?? '',
  arms: log.measurements?.arms ?? '',
  thighs: log.measurements?.thighs ?? '',
  notes: log.notes || '',
});

const formatDate = (date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));

function Progress() {
  const { logout } = useAuth();
  const [logs, setLogs] = useState([]);
  const [formData, setFormData] = useState(emptyProgressForm);
  const [editingLogId, setEditingLogId] = useState(null);
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

  const loadProgressLogs = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await progressService.getProgressLogs();
      setLogs(response.data || []);
    } catch (err) {
      setError(await handleApiError(err, 'Unable to load progress logs.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgressLogs();
  }, []);

  const resetForm = () => {
    setFormData({ ...emptyProgressForm, date: today() });
    setEditingLogId(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const payload = normalizeProgressPayload(formData);
      const response = editingLogId
        ? await progressService.updateProgressLog(editingLogId, payload)
        : await progressService.createProgressLog(payload);

      if (editingLogId) {
        setLogs((current) => current.map((log) => (log._id === editingLogId ? response.data : log)));
        setSuccess('Progress log updated successfully.');
      } else {
        setLogs((current) => [response.data, ...current]);
        setSuccess('Progress log created successfully.');
      }

      resetForm();
    } catch (err) {
      setError(await handleApiError(err, 'Unable to save progress log.'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (log) => {
    setEditingLogId(log._id);
    setFormData(toProgressForm(log));
    setError('');
    setSuccess('');
  };

  const handleDelete = async (logId) => {
    if (!window.confirm('Delete this progress log?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await progressService.deleteProgressLog(logId);
      setLogs((current) => current.filter((log) => log._id !== logId));
      if (editingLogId === logId) {
        resetForm();
      }
      setSuccess('Progress log deleted successfully.');
    } catch (err) {
      setError(await handleApiError(err, 'Unable to delete progress log.'));
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-50">Progress</h1>
        <p className="mt-2 text-stone-400">Log body metrics and review your history.</p>
      </div>

      {error && <p className="status-error">{error}</p>}
      {success && <p className="status-success">{success}</p>}

      <form onSubmit={handleSubmit} className="quiet-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-stone-50">
            {editingLogId ? 'Edit Progress Log' : 'Create Progress Log'}
          </h2>
          {editingLogId && (
            <button
              type="button"
              onClick={resetForm}
              className="btn-secondary px-3"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-stone-300">Date</span>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-stone-700 px-3 py-2 outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-300/40"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-300">Body weight</span>
            <input
              type="number"
              name="bodyWeight"
              min="0"
              step="0.1"
              value={formData.bodyWeight}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-stone-700 px-3 py-2 outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-300/40"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-300">Body fat %</span>
            <input
              type="number"
              name="bodyFatPercentage"
              min="0"
              max="100"
              step="0.1"
              value={formData.bodyFatPercentage}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-stone-700 px-3 py-2 outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-300/40"
            />
          </label>

          {['chest', 'waist', 'hips', 'arms', 'thighs'].map((field) => (
            <label key={field} className="block">
              <span className="text-sm font-medium capitalize text-stone-300">{field}</span>
              <input
                type="number"
                name={field}
                min="0"
                step="0.1"
                value={formData[field]}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-stone-700 px-3 py-2 outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-300/40"
              />
            </label>
          ))}

          <label className="block md:col-span-3">
            <span className="text-sm font-medium text-stone-300">Notes</span>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className="mt-1 w-full rounded-md border border-stone-700 px-3 py-2 outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-300/40"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary mt-6"
        >
          {saving ? 'Saving...' : editingLogId ? 'Update Log' : 'Create Log'}
        </button>
      </form>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-50">Progress History</h2>
        {loading ? (
          <p className="quiet-card text-sm text-stone-400">Loading progress logs...</p>
        ) : logs.length === 0 ? (
          <p className="quiet-card text-sm text-stone-400">
            No progress logs yet. Create your first log above.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {logs.map((log) => (
              <article key={log._id} className="quiet-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-stone-100">{formatDate(log.date)}</h3>
                    <p className="mt-1 text-sm text-stone-500">
                      {log.bodyWeight || 0} weight · {log.bodyFatPercentage || 0}% body fat
                    </p>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-stone-500">Chest</dt>
                    <dd className="font-medium text-stone-100">{log.measurements?.chest || 0}</dd>
                  </div>
                  <div>
                    <dt className="text-stone-500">Waist</dt>
                    <dd className="font-medium text-stone-100">{log.measurements?.waist || 0}</dd>
                  </div>
                  <div>
                    <dt className="text-stone-500">Hips</dt>
                    <dd className="font-medium text-stone-100">{log.measurements?.hips || 0}</dd>
                  </div>
                  <div>
                    <dt className="text-stone-500">Arms</dt>
                    <dd className="font-medium text-stone-100">{log.measurements?.arms || 0}</dd>
                  </div>
                  <div>
                    <dt className="text-stone-500">Thighs</dt>
                    <dd className="font-medium text-stone-100">{log.measurements?.thighs || 0}</dd>
                  </div>
                </dl>

                {log.notes && <p className="mt-4 text-sm text-stone-400">{log.notes}</p>}

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(log)}
                    className="btn-secondary px-3"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(log._id)}
                    className="rounded-md border border-red-900/60 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-950/40"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export default Progress;
