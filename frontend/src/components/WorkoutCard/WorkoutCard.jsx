function WorkoutCard({ title = 'Sample Workout', description = 'Workout details will be added later.' }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </article>
  );
}

export default WorkoutCard;

