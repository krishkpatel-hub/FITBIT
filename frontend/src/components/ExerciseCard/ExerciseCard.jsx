function ExerciseCard({ exercise, name = 'Exercise', sets = '3', reps = '10', weight = '' }) {
  if (!exercise) {
    return (
      <article className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
        <h3 className="font-semibold text-slate-100">{name}</h3>
        <p className="mt-2 text-sm text-slate-400">
          {sets} sets x {reps} reps{weight ? ` @ ${weight}` : ''}
        </p>
      </article>
    );
  }

  const completedSets = exercise.sets?.filter((set) => set.completed) || [];
  const setCount = exercise.sets?.length || 0;
  const plusSet = exercise.sets?.find((set) => set.isPlusSet);

  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-100">{exercise.exerciseName || exercise.name}</h3>
          {exercise.muscleGroup && <p className="mt-1 text-sm text-slate-500">{exercise.muscleGroup}</p>}
        </div>
        {plusSet && (
          <span className="rounded-full bg-emerald-950/40 px-2 py-1 text-xs font-medium text-emerald-300">
            Plus set
          </span>
        )}
      </div>

      <p className="mt-3 text-sm text-slate-400">
        {setCount} sets · {completedSets.length} completed
      </p>

      {exercise.sets?.length > 0 && (
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          {exercise.sets.map((set) => (
            <li key={set.setNumber} className="flex justify-between gap-3 rounded-md bg-slate-800/60 px-3 py-2">
              <span>Set {set.setNumber}</span>
              <span>
                {set.reps || 0} reps / {set.targetReps || 0} target @ {set.weight || 0}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default ExerciseCard;
