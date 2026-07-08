const formatWorkoutDate = (date) => {
  if (!date) {
    return 'No date set';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
};

function WorkoutCard({
  workout,
  title = 'Sample Workout',
  description = 'Workout details will be added later.',
  onEdit,
  onDelete,
  showActions = true,
}) {
  if (!workout) {
    return (
      <article className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
        <h3 className="font-semibold text-slate-100">{title}</h3>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
      </article>
    );
  }

  const exerciseCount = workout.exercises?.length || 0;

  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-100">{workout.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{formatWorkoutDate(workout.date)}</p>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium capitalize text-slate-300">
          {workout.status}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">Exercises</dt>
          <dd className="font-medium text-slate-100">{exerciseCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Total volume</dt>
          <dd className="font-medium text-slate-100">{workout.totalVolume || 0}</dd>
        </div>
      </dl>

      {workout.notes && <p className="mt-4 text-sm text-slate-400">{workout.notes}</p>}

      {showActions && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onEdit?.(workout)}
            className="rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/60"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(workout._id)}
            className="rounded-md border border-red-900/60 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-950/40"
          >
            Delete
          </button>
        </div>
      )}
    </article>
  );
}

export default WorkoutCard;
