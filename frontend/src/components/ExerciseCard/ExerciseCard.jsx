function ExerciseCard({ name = 'Exercise', sets = '3', reps = '10' }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-900">{name}</h3>
      <p className="mt-2 text-sm text-slate-600">
        {sets} sets x {reps} reps
      </p>
    </article>
  );
}

export default ExerciseCard;

