import Sidebar from '../../components/Sidebar/Sidebar.jsx';
import WorkoutCard from '../../components/WorkoutCard/WorkoutCard.jsx';
import ProgressChart from '../../components/ProgressChart/ProgressChart.jsx';

function Dashboard() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-950">Dashboard</h1>
        <WorkoutCard title="Next Workout" description="Your upcoming workout preview will appear here." />
        <ProgressChart />
      </div>
      <Sidebar />
    </section>
  );
}

export default Dashboard;

