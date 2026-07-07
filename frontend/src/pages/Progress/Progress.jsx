import Calendar from '../../components/Calendar/Calendar.jsx';
import ProgressChart from '../../components/ProgressChart/ProgressChart.jsx';

function Progress() {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-950">Progress</h1>
      <ProgressChart />
      <Calendar />
    </section>
  );
}

export default Progress;

