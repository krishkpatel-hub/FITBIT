import ExerciseCard from '../../components/ExerciseCard/ExerciseCard.jsx';
import WorkoutCard from '../../components/WorkoutCard/WorkoutCard.jsx';

function Workout() {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-950">Workout</h1>
      <WorkoutCard title="Upper Body Strength" description="Workout builder placeholder." />
      <div className="grid gap-4 md:grid-cols-3">
        <ExerciseCard name="Bench Press" />
        <ExerciseCard name="Rows" />
        <ExerciseCard name="Shoulder Press" />
      </div>
    </section>
  );
}

export default Workout;

