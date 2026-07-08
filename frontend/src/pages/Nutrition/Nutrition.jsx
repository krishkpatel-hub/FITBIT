import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { nutritionService } from '../../services/nutritionService.js';

const today = () => new Date().toISOString().slice(0, 10);

const emptyMeal = {
  name: '',
  mealType: 'breakfast',
  calories: '',
  protein: '',
  carbs: '',
  fats: '',
  notes: '',
};

const emptyNutritionForm = {
  date: today(),
  meals: [],
};

const numberOrZero = (value) => (value === '' ? 0 : Number(value));

const calculateTotals = (meals) =>
  meals.reduce(
    (totals, meal) => ({
      totalCalories: totals.totalCalories + numberOrZero(meal.calories),
      totalProtein: totals.totalProtein + numberOrZero(meal.protein),
      totalCarbs: totals.totalCarbs + numberOrZero(meal.carbs),
      totalFats: totals.totalFats + numberOrZero(meal.fats),
    }),
    {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFats: 0,
    },
  );

const normalizeNutritionPayload = (formData) => ({
  ...formData,
  meals: formData.meals.map((meal) => ({
    ...meal,
    calories: numberOrZero(meal.calories),
    protein: numberOrZero(meal.protein),
    carbs: numberOrZero(meal.carbs),
    fats: numberOrZero(meal.fats),
  })),
});

const toNutritionForm = (log) => ({
  date: log.date ? log.date.slice(0, 10) : today(),
  meals:
    log.meals?.map((meal) => ({
      name: meal.name || '',
      mealType: meal.mealType || 'breakfast',
      calories: meal.calories ?? '',
      protein: meal.protein ?? '',
      carbs: meal.carbs ?? '',
      fats: meal.fats ?? '',
      notes: meal.notes || '',
    })) || [],
});

const formatDate = (date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));

function Nutrition() {
  const { logout } = useAuth();
  const [logs, setLogs] = useState([]);
  const [formData, setFormData] = useState(emptyNutritionForm);
  const [editingLogId, setEditingLogId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const localTotals = useMemo(() => calculateTotals(formData.meals), [formData.meals]);

  const handleApiError = async (err, fallbackMessage) => {
    if (err.response?.status === 401) {
      await logout();
      return 'Your session expired. Please log in again.';
    }

    return err.response?.data?.message || fallbackMessage;
  };

  const loadNutritionLogs = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await nutritionService.getNutritionLogs();
      setLogs(response.data || []);
    } catch (err) {
      setError(await handleApiError(err, 'Unable to load nutrition logs.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNutritionLogs();
  }, []);

  const resetForm = () => {
    setFormData({ ...emptyNutritionForm, date: today(), meals: [] });
    setEditingLogId(null);
  };

  const handleDateChange = (event) => {
    setFormData((current) => ({
      ...current,
      date: event.target.value,
    }));
  };

  const addMeal = () => {
    setFormData((current) => ({
      ...current,
      meals: [...current.meals, { ...emptyMeal }],
    }));
  };

  const removeMeal = (mealIndex) => {
    setFormData((current) => ({
      ...current,
      meals: current.meals.filter((_, index) => index !== mealIndex),
    }));
  };

  const updateMeal = (mealIndex, field, value) => {
    setFormData((current) => ({
      ...current,
      meals: current.meals.map((meal, index) => (index === mealIndex ? { ...meal, [field]: value } : meal)),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const payload = normalizeNutritionPayload(formData);
      const response = editingLogId
        ? await nutritionService.updateNutritionLog(editingLogId, payload)
        : await nutritionService.createNutritionLog(payload);

      if (editingLogId) {
        setLogs((current) => current.map((log) => (log._id === editingLogId ? response.data : log)));
        setSuccess('Nutrition log updated successfully.');
      } else {
        setLogs((current) => [response.data, ...current]);
        setSuccess('Nutrition log created successfully.');
      }

      resetForm();
    } catch (err) {
      setError(await handleApiError(err, 'Unable to save nutrition log.'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (log) => {
    setEditingLogId(log._id);
    setFormData(toNutritionForm(log));
    setError('');
    setSuccess('');
  };

  const handleDelete = async (logId) => {
    if (!window.confirm('Delete this nutrition log?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await nutritionService.deleteNutritionLog(logId);
      setLogs((current) => current.filter((log) => log._id !== logId));
      if (editingLogId === logId) {
        resetForm();
      }
      setSuccess('Nutrition log deleted successfully.');
    } catch (err) {
      setError(await handleApiError(err, 'Unable to delete nutrition log.'));
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Nutrition</h1>
        <p className="mt-2 text-slate-400">Track meals and daily macro totals.</p>
      </div>

      {error && <p className="rounded-md bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
      {success && <p className="rounded-md bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">{success}</p>}

      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-800 bg-slate-900/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-50">
              {editingLogId ? 'Edit Nutrition Log' : 'Create Nutrition Log'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {localTotals.totalCalories} cal · {localTotals.totalProtein}g protein · {localTotals.totalCarbs}g carbs ·{' '}
              {localTotals.totalFats}g fats
            </p>
          </div>
          {editingLogId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/60"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <label className="mt-6 block max-w-sm">
          <span className="text-sm font-medium text-slate-300">Date</span>
          <input
            type="date"
            value={formData.date}
            onChange={handleDateChange}
            className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
          />
        </label>

        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-50">Meals</h3>
            <button
              type="button"
              onClick={addMeal}
              className="rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/60"
            >
              Add Meal
            </button>
          </div>

          {formData.meals.length === 0 ? (
            <p className="rounded-md bg-slate-800/60 px-3 py-4 text-sm text-slate-400">No meals added yet.</p>
          ) : (
            formData.meals.map((meal, mealIndex) => (
              <div key={`meal-${mealIndex}`} className="rounded-lg border border-slate-800 p-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-300">Meal name</span>
                    <input
                      type="text"
                      value={meal.name}
                      onChange={(event) => updateMeal(mealIndex, 'name', event.target.value)}
                      required
                      className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-300">Meal type</span>
                    <select
                      value={meal.mealType}
                      onChange={(event) => updateMeal(mealIndex, 'mealType', event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snack">Snack</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-300">Calories</span>
                    <input
                      type="number"
                      min="0"
                      value={meal.calories}
                      onChange={(event) => updateMeal(mealIndex, 'calories', event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-300">Protein</span>
                    <input
                      type="number"
                      min="0"
                      value={meal.protein}
                      onChange={(event) => updateMeal(mealIndex, 'protein', event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-300">Carbs</span>
                    <input
                      type="number"
                      min="0"
                      value={meal.carbs}
                      onChange={(event) => updateMeal(mealIndex, 'carbs', event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-300">Fats</span>
                    <input
                      type="number"
                      min="0"
                      value={meal.fats}
                      onChange={(event) => updateMeal(mealIndex, 'fats', event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-slate-300">Notes</span>
                    <input
                      type="text"
                      value={meal.notes}
                      onChange={(event) => updateMeal(mealIndex, 'notes', event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeMeal(mealIndex)}
                      className="rounded-md border border-red-900/60 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-950/40"
                    >
                      Remove Meal
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-6 rounded-md bg-emerald-500 px-4 py-2 font-medium text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-900"
        >
          {saving ? 'Saving...' : editingLogId ? 'Update Log' : 'Create Log'}
        </button>
      </form>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-50">Nutrition Logs</h2>
        {loading ? (
          <p className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">Loading nutrition logs...</p>
        ) : logs.length === 0 ? (
          <p className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">
            No nutrition logs yet. Create your first log above.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {logs.map((log) => (
              <article key={log._id} className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-100">{formatDate(log.date)}</h3>
                    <p className="mt-1 text-sm text-slate-500">{log.meals?.length || 0} meals</p>
                  </div>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                    {log.totalCalories || 0} cal
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-slate-500">Protein</dt>
                    <dd className="font-medium text-slate-100">{log.totalProtein || 0}g</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Carbs</dt>
                    <dd className="font-medium text-slate-100">{log.totalCarbs || 0}g</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Fats</dt>
                    <dd className="font-medium text-slate-100">{log.totalFats || 0}g</dd>
                  </div>
                </dl>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(log)}
                    className="rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/60"
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

export default Nutrition;
