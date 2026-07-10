import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import CalendarGrid from '../../components/Calendar/Calendar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { workoutService } from '../../services/workoutService.js';

const todayKey = () => new Date().toISOString().slice(0, 10);

const toDateKey = (date) => {
  if (!date) {
    return '';
  }

  return new Date(date).toISOString().slice(0, 10);
};

const formatDate = (date) =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));

const getMainLifts = (workout) =>
  workout.exercises
    ?.slice(0, 3)
    .map((exercise) => exercise.exerciseName)
    .filter(Boolean)
    .join(', ') || 'No exercises logged';

const getWorkoutVolume = (workout) => Number(workout.totalVolume || 0);

const initialFilters = {
  startDate: '',
  endDate: '',
  status: 'all',
  exerciseName: '',
  sort: 'newest',
};

function WorkoutDetail({ workout, onDuplicate }) {
  return (
    <article className="border-t border-stone-800 pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-stone-50">{workout.title}</h3>
          <p className="mt-1 text-sm capitalize text-stone-500">
            {workout.status} · {getWorkoutVolume(workout)} total volume
          </p>
        </div>
        <button type="button" onClick={() => onDuplicate(workout)} className="btn-secondary px-3">
          Duplicate
        </button>
      </div>

      {workout.notes && <p className="mt-3 text-sm leading-6 text-stone-400">{workout.notes}</p>}

      <div className="mt-4 space-y-4">
        {workout.exercises?.map((exercise) => (
          <div key={`${workout._id}-${exercise.exerciseName}`} className="border-l border-stone-800 pl-4">
            <p className="font-medium text-stone-100">{exercise.exerciseName}</p>
            {exercise.muscleGroup && <p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">{exercise.muscleGroup}</p>}
            {exercise.sets?.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="border-b border-stone-800 text-xs uppercase tracking-[0.16em] text-stone-500">
                    <tr>
                      <th className="py-2 pr-4">Set</th>
                      <th className="py-2 pr-4">Reps</th>
                      <th className="py-2 pr-4">Weight</th>
                      <th className="py-2 pr-4">Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800 text-stone-300">
                    {exercise.sets.map((set) => (
                      <tr key={`${exercise.exerciseName}-${set.setNumber}`}>
                        <td className="py-2 pr-4">{set.setNumber}</td>
                        <td className="py-2 pr-4">{set.reps || 0}</td>
                        <td className="py-2 pr-4">{set.weight || 0} lb</td>
                        <td className="py-2 pr-4">{set.targetReps || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}

function CalendarPage() {
  const { logout } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [monthDate, setMonthDate] = useState(new Date());
  const [filters, setFilters] = useState(initialFilters);
  const [duplicateTarget, setDuplicateTarget] = useState(null);
  const [duplicateDate, setDuplicateDate] = useState(todayKey());
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

  const loadWorkouts = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await workoutService.getWorkouts();
      setWorkouts(response.data || []);
    } catch (err) {
      setError(await handleApiError(err, 'Unable to load workout calendar.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkouts();
  }, []);

  const filteredWorkouts = useMemo(() => {
    const exerciseQuery = filters.exerciseName.trim().toLowerCase();

    return workouts
      .filter((workout) => {
        const dateKey = toDateKey(workout.date);
        const matchesStart = !filters.startDate || dateKey >= filters.startDate;
        const matchesEnd = !filters.endDate || dateKey <= filters.endDate;
        const matchesStatus = filters.status === 'all' || workout.status === filters.status;
        const matchesExercise =
          !exerciseQuery ||
          workout.exercises?.some((exercise) => exercise.exerciseName?.toLowerCase().includes(exerciseQuery));

        return matchesStart && matchesEnd && matchesStatus && matchesExercise;
      })
      .sort((a, b) => {
        if (filters.sort === 'oldest') {
          return new Date(a.date) - new Date(b.date);
        }

        if (filters.sort === 'highest-volume') {
          return getWorkoutVolume(b) - getWorkoutVolume(a);
        }

        return new Date(b.date) - new Date(a.date);
      });
  }, [filters, workouts]);

  const workoutsByDate = useMemo(
    () =>
      filteredWorkouts.reduce((dates, workout) => {
        const dateKey = toDateKey(workout.date);
        dates[dateKey] = [...(dates[dateKey] || []), workout];
        return dates;
      }, {}),
    [filteredWorkouts],
  );

  const selectedWorkouts = workoutsByDate[selectedDate] || [];

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const openDuplicate = (workout) => {
    setDuplicateTarget(workout);
    setDuplicateDate(todayKey());
    setSuccess('');
    setError('');
  };

  const duplicateWorkout = async (event) => {
    event.preventDefault();

    if (!duplicateTarget) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await workoutService.duplicateWorkout(duplicateTarget._id, duplicateDate);
      setSuccess(`Duplicated "${duplicateTarget.title}" as a planned workout.`);
      setDuplicateTarget(null);
      await loadWorkouts();
    } catch (err) {
      setError(await handleApiError(err, 'Unable to duplicate workout.'));
    } finally {
      setSaving(false);
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
        <p className="eyebrow">Training History</p>
        <h1 className="page-title">Workout Calendar</h1>
        <p className="page-copy">Review past sessions, inspect daily training, and duplicate proven workouts into future plans.</p>
      </header>

      {error && <p className="status-error">{error}</p>}
      {success && <p className="status-success">{success}</p>}

      <section className="quiet-card" aria-labelledby="calendar-filters-heading">
        <h2 id="calendar-filters-heading" className="section-title">
          Filters
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-5">
          <label className="block">
            <span className="text-sm font-medium text-stone-300">Start date</span>
            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="form-field" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-300">End date</span>
            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="form-field" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-300">Status</span>
            <select name="status" value={filters.status} onChange={handleFilterChange} className="form-field">
              <option value="all">All</option>
              <option value="planned">Planned</option>
              <option value="completed">Completed</option>
              <option value="skipped">Skipped</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-300">Lift or exercise</span>
            <input
              type="search"
              name="exerciseName"
              value={filters.exerciseName}
              onChange={handleFilterChange}
              placeholder="Bench"
              className="form-field"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-300">Sort</span>
            <select name="sort" value={filters.sort} onChange={handleFilterChange} className="form-field">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="highest-volume">Highest volume</option>
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]" aria-label="Loading workout calendar">
          <div className="h-96 animate-pulse rounded-lg border border-stone-800 bg-stone-900/40" />
          <div className="h-96 animate-pulse rounded-lg border border-stone-800 bg-stone-900/40" />
        </div>
      ) : workouts.length === 0 ? (
        <p className="empty-state">Log or generate your first workout to see your training calendar.</p>
      ) : (
        <>
          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <CalendarGrid
              monthDate={monthDate}
              selectedDate={selectedDate}
              workoutsByDate={workoutsByDate}
              onDateSelect={setSelectedDate}
              onMonthChange={setMonthDate}
            />

            <aside className="quiet-card">
              <p className="eyebrow">Selected Day</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-50">{formatDate(selectedDate)}</h2>
              {selectedWorkouts.length === 0 ? (
                <p className="empty-state mt-6">No workouts match this date and filter set.</p>
              ) : (
                <div className="mt-6 space-y-6">
                  {selectedWorkouts.map((workout) => (
                    <WorkoutDetail key={workout._id} workout={workout} onDuplicate={openDuplicate} />
                  ))}
                </div>
              )}
            </aside>
          </section>

          <section className="space-y-4" aria-labelledby="timeline-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="timeline-heading" className="section-title">
                  Workout Timeline
                </h2>
                <p className="section-copy">Newest first unless your sort filter changes it.</p>
              </div>
              <p className="text-sm text-stone-500">{filteredWorkouts.length} workouts</p>
            </div>

            {filteredWorkouts.length === 0 ? (
              <p className="empty-state">No workouts match these filters.</p>
            ) : (
              <div className="divide-y divide-stone-800 border-y border-stone-800">
                {filteredWorkouts.map((workout) => (
                  <article key={workout._id} className="grid gap-4 py-5 md:grid-cols-[160px_1fr_auto] md:items-center">
                    <div>
                      <p className="font-medium text-stone-100">{formatDate(workout.date)}</p>
                      <p className="mt-1 text-sm capitalize text-stone-500">{workout.status}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-stone-50">{workout.title}</h3>
                      <p className="mt-1 text-sm text-stone-400">{getMainLifts(workout)}</p>
                    </div>
                    <div className="flex items-center gap-4 md:justify-end">
                      <p className="text-sm text-stone-400">{getWorkoutVolume(workout)} volume</p>
                      <button type="button" onClick={() => openDuplicate(workout)} className="btn-secondary px-3">
                        Duplicate
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {duplicateTarget && (
        <section className="quiet-card" aria-labelledby="duplicate-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="duplicate-heading" className="section-title">
                Duplicate Workout
              </h2>
              <p className="section-copy">Create a planned copy of “{duplicateTarget.title}”.</p>
            </div>
            <button type="button" onClick={() => setDuplicateTarget(null)} className="btn-secondary px-3">
              Cancel
            </button>
          </div>
          <form onSubmit={duplicateWorkout} className="mt-5 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-sm font-medium text-stone-300">New date</span>
              <input type="date" value={duplicateDate} onChange={(event) => setDuplicateDate(event.target.value)} required className="form-field" />
            </label>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Duplicating...' : 'Create Planned Workout'}
            </button>
          </form>
        </section>
      )}
    </motion.section>
  );
}

export default CalendarPage;
