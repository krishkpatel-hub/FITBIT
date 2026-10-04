import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';
import { analyticsService } from '../../services/analyticsService';
import { getUserFacingError } from '../../utils/apiError';
import { appPaths } from '../../utils/navigation';

const liftLabels = {
  squat: 'Squat',
  bench: 'Bench',
  deadlift: 'Deadlift',
  overhead_press: 'Overhead Press',
};

const filterOptions = [
  { value: '30', label: 'Last 30 days', days: 30 },
  { value: '90', label: 'Last 3 months', days: 90 },
  { value: '365', label: 'Last year', days: 365 },
  { value: 'all', label: 'All time', days: null },
];

const chartColors = {
  squat: '#2f4f46',
  bench: '#73857a',
  deadlift: '#151714',
  overhead_press: '#a1aaa1',
  bar: '#2f4f46',
};

const formatDate = (date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));

const formatMonth = (date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: '2-digit',
  }).format(new Date(date));

const getWeekStart = (date) => {
  const parsedDate = new Date(date);
  const day = parsedDate.getDay();
  const diff = parsedDate.getDate() - day;
  const weekStart = new Date(parsedDate);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

const getRangeStart = (filterValue) => {
  const option = filterOptions.find((item) => item.value === filterValue);

  if (!option?.days) {
    return null;
  }

  const start = new Date();
  start.setDate(start.getDate() - option.days);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getWorkoutDate = (workout) => new Date(workout.date || workout.createdAt);
const getPRValue = (pr) => Number(pr.estimatedOneRepMax || pr.oneRepMax || pr.weight || 0);
const getWorkoutVolume = (workout) => Number(workout.totalVolume || 0);
const isCompletedWorkout = (workout) => workout.status === 'completed';

const percentChange = (first, last) => {
  if (!first || first <= 0) {
    return 0;
  }

  return ((last - first) / first) * 100;
};

const groupByKey = (items, getKey, getInitialValue, addValue) => {
  const grouped = new Map();

  items.forEach((item) => {
    const key = getKey(item);
    const current = grouped.get(key) || getInitialValue(item, key);
    grouped.set(key, addValue(current, item));
  });

  return Array.from(grouped.values());
};

const buildStrengthChartData = (trainingMaxes, rangeStart) => {
  const rowsByDate = new Map();

  trainingMaxes.forEach((trainingMax) => {
    const history = trainingMax.history?.length
      ? trainingMax.history
      : [
          {
            date: trainingMax.lastUpdated || trainingMax.updatedAt || trainingMax.createdAt || new Date(),
            trainingMax: trainingMax.trainingMax,
          },
        ];

    history.forEach((entry) => {
      const date = new Date(entry.date || trainingMax.lastUpdated || trainingMax.updatedAt || trainingMax.createdAt);

      if (rangeStart && date < rangeStart) {
        return;
      }

      const key = date.toISOString().slice(0, 10);
      const row = rowsByDate.get(key) || { date: key, label: formatDate(date) };
      row[trainingMax.liftName] = Number(entry.trainingMax || trainingMax.trainingMax || 0);
      rowsByDate.set(key, row);
    });
  });

  return Array.from(rowsByDate.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
};

const buildLiftProgress = (trainingMaxes, rangeStart) =>
  trainingMaxes.map((trainingMax) => {
    const history = (trainingMax.history || [])
      .filter((entry) => !rangeStart || new Date(entry.date || 0) >= rangeStart)
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    const first = history[0]?.trainingMax || trainingMax.trainingMax || 0;
    const last = history[history.length - 1]?.trainingMax || trainingMax.trainingMax || 0;
    const change = last - first;

    return {
      liftName: trainingMax.liftName,
      label: liftLabels[trainingMax.liftName] || trainingMax.liftName,
      first,
      last,
      change,
      percent: percentChange(first, last),
      entries: history.length,
      recentIncrease: history[history.length - 1]?.increaseAmount || 0,
    };
  });

const buildVolumeData = (workouts, rangeStart) => {
  const completed = workouts.filter((workout) => isCompletedWorkout(workout) && (!rangeStart || getWorkoutDate(workout) >= rangeStart));

  const weeklyVolume = groupByKey(
    completed,
    (workout) => getWeekStart(getWorkoutDate(workout)).toISOString().slice(0, 10),
    (_workout, key) => ({ date: key, label: formatDate(key), volume: 0 }),
    (row, workout) => ({ ...row, volume: row.volume + getWorkoutVolume(workout) }),
  ).sort((a, b) => new Date(a.date) - new Date(b.date));

  const monthlyVolume = groupByKey(
    completed,
    (workout) => `${getWorkoutDate(workout).getFullYear()}-${String(getWorkoutDate(workout).getMonth() + 1).padStart(2, '0')}`,
    (workout, key) => ({ date: key, label: formatMonth(getWorkoutDate(workout)), volume: 0 }),
    (row, workout) => ({ ...row, volume: row.volume + getWorkoutVolume(workout) }),
  ).sort((a, b) => a.date.localeCompare(b.date));

  const averageDuration =
    completed.length > 0
      ? Math.round(completed.reduce((total, workout) => total + Number(workout.duration || 0), 0) / completed.length)
      : 0;

  return {
    completed,
    weeklyVolume,
    monthlyVolume,
    averageDuration,
    totalVolume: completed.reduce((total, workout) => total + getWorkoutVolume(workout), 0),
  };
};

const buildConsistency = (workouts, rangeStart) => {
  const rangeWorkouts = workouts.filter((workout) => !rangeStart || getWorkoutDate(workout) >= rangeStart);
  const completed = rangeWorkouts.filter(isCompletedWorkout);
  const planned = rangeWorkouts.filter((workout) => workout.status === 'planned');
  const completionPercentage = rangeWorkouts.length > 0 ? Math.round((completed.length / rangeWorkouts.length) * 100) : 0;

  const completedDates = Array.from(
    new Set(completed.map((workout) => getWorkoutDate(workout).toISOString().slice(0, 10))),
  ).sort();

  let longestStreak = 0;
  let currentRun = 0;
  let previousDate = null;

  completedDates.forEach((dateString) => {
    const date = new Date(dateString);

    if (!previousDate) {
      currentRun = 1;
    } else {
      const dayDiff = Math.round((date - previousDate) / 86400000);
      currentRun = dayDiff === 1 ? currentRun + 1 : 1;
    }

    longestStreak = Math.max(longestStreak, currentRun);
    previousDate = date;
  });

  let currentStreak = 0;
  if (completedDates.length > 0) {
    const dateSet = new Set(completedDates);
    const cursor = new Date(completedDates[completedDates.length - 1]);

    while (dateSet.has(cursor.toISOString().slice(0, 10))) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  return {
    completedCount: completed.length,
    plannedCount: planned.length,
    skippedCount: rangeWorkouts.filter((workout) => workout.status === 'skipped').length,
    completionPercentage,
    currentStreak,
    longestStreak,
    plannedVsCompleted: [
      { label: 'Planned', workouts: planned.length },
      { label: 'Completed', workouts: completed.length },
    ],
  };
};

const buildPRSummary = (prs, liftProgress, rangeStart) => {
  const filteredPRs = prs.filter((pr) => !rangeStart || new Date(pr.date || pr.createdAt) >= rangeStart);
  const newestPR = [...filteredPRs].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))[0];
  const highestPR = [...filteredPRs].sort((a, b) => getPRValue(b) - getPRValue(a))[0];
  const mostImprovedLift = [...liftProgress].sort((a, b) => b.change - a.change)[0];
  const fastestProgress = [...liftProgress].sort((a, b) => b.percent - a.percent)[0];

  return {
    newestPR,
    highestPR,
    mostImprovedLift,
    fastestProgress,
    filteredPRs,
  };
};

const buildInsights = ({ liftProgress, volumeData, consistency, prSummary }) => {
  const insights = [];
  const fastest = prSummary.fastestProgress;
  const slowest = [...liftProgress].filter((lift) => lift.entries > 0).sort((a, b) => a.percent - b.percent)[0];
  const weekly = volumeData.weeklyVolume;

  if (fastest?.percent > 0) {
    insights.push(`${fastest.label} has improved ${fastest.percent.toFixed(1)}% in the selected range.`);
  }

  if (slowest && slowest.percent <= 1 && slowest.entries >= 2) {
    insights.push(`${slowest.label} progression has slowed. Review recovery, volume, and recent plus-set output.`);
  }

  if (weekly.length >= 4) {
    const midpoint = Math.floor(weekly.length / 2);
    const early = weekly.slice(0, midpoint).reduce((total, week) => total + week.volume, 0);
    const recent = weekly.slice(midpoint).reduce((total, week) => total + week.volume, 0);
    const change = percentChange(early, recent);

    if (Math.abs(change) > 1) {
      insights.push(`Training volume is ${change > 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(1)}% versus the earlier part of this range.`);
    }
  }

  if (consistency.completionPercentage >= 80 && volumeData.totalVolume > 0) {
    insights.push('Consistency is strong. Keep progression conservative if fatigue or bar speed starts to slip.');
  }

  if (liftProgress.some((lift) => lift.recentIncrease === 0 && lift.entries >= 2)) {
    insights.push('At least one lift has no recent training max increase. Consider a deload or repeat week if performance feels flat.');
  }

  if (prSummary.newestPR) {
    insights.push(`Newest PR logged: ${prSummary.newestPR.exerciseName} at ${getPRValue(prSummary.newestPR)} lb estimated 1RM.`);
  }

  return insights.length > 0
    ? insights
    : [consistency.completedCount > 0
      ? `You completed ${consistency.completedCount} workout${consistency.completedCount === 1 ? '' : 's'} in this range. Keep logging to reveal a reliable trend.`
      : 'Log workouts and training max updates to reveal a reliable trend.'];
};

function Metric({ label, value, detail }) {
  return (
    <div className="border-t border-stone-800 pt-4">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-stone-50">{value}</p>
      {detail && <p className="mt-1 text-sm text-stone-400">{detail}</p>}
    </div>
  );
}

function ChartShell({ title, empty, children }) {
  return (
    <section className="border-t border-[#D2CFC7] pt-6">
      <h2 className="section-title">{title}</h2>
      {empty ? <p className="mt-3 text-sm text-[#62675f]">Log more training to see this trend.</p> : <div className="mt-6 h-72">{children}</div>}
    </section>
  );
}

function Analytics() {
  const { logout } = useAuth();
  const realtime = useRealtime();
  const [analyticsData, setAnalyticsData] = useState({
    workouts: [],
    progressLogs: [],
    trainingMaxes: [],
    prs: [],
  });
  const [filter, setFilter] = useState('90');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await analyticsService.getAnalyticsData();
      setAnalyticsData(data);
    } catch (err) {
      if (err.response?.status === 401) {
        await logout();
        setError('Your session expired. Please log in again.');
        return;
      }

      setError(getUserFacingError(err, 'Unable to load analytics.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [logout]);

  useEffect(() => {
    if (!realtime) return undefined;

    return realtime.subscribe(['workout.updated', 'workout.completed', 'progress.updated'], () => {
      loadAnalytics();
    });
  }, [realtime]);

  const analytics = useMemo(() => {
    const rangeStart = getRangeStart(filter);
    const strengthChartData = buildStrengthChartData(analyticsData.trainingMaxes, rangeStart);
    const liftProgress = buildLiftProgress(analyticsData.trainingMaxes, rangeStart);
    const volumeData = buildVolumeData(analyticsData.workouts, rangeStart);
    const consistency = buildConsistency(analyticsData.workouts, rangeStart);
    const prSummary = buildPRSummary(analyticsData.prs, liftProgress, rangeStart);
    const insights = buildInsights({ liftProgress, volumeData, consistency, prSummary });

    return {
      rangeStart,
      strengthChartData,
      liftProgress,
      volumeData,
      consistency,
      prSummary,
      insights,
    };
  }, [analyticsData, filter]);

  const selectedFilterLabel = filterOptions.find((option) => option.value === filter)?.label || 'Last 3 months';

  return (
    <section className="page-stack">
      <header className="page-header flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="eyebrow">Progress / Analytics</p>
          <h1 className="page-title">Training Insights</h1>
          <p className="page-copy">
            Strength, consistency, and volume from your logged training.
          </p>
        </div>

        <label className="block min-w-48">
          <span className="text-sm font-medium text-stone-300">Time range</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value)} className="form-field">
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {error && <p role="alert" className="status-error">{error}</p>}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2" role="status" aria-label="Loading analytics">
          {[0, 1].map((item) => (
            <div key={item} className="skeleton-panel h-24" />
          ))}
        </div>
      ) : analyticsData.workouts.length === 0 && analyticsData.progressLogs.length === 0 &&
        analyticsData.trainingMaxes.length === 0 && analyticsData.prs.length === 0 ? (
        <section className="border-y border-[#D2CFC7] py-8">
          <h2 className="section-title">No training insights yet.</h2>
          <p className="section-copy">Set up your program or log a workout to start seeing strength and consistency trends.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to={appPaths.program} className="btn-primary">Set Up Program</Link>
            <Link to={appPaths.train} className="btn-secondary">Start Workout</Link>
          </div>
        </section>
      ) : (
        <>
          <section aria-label="At a glance" className="space-y-4">
            <h2 className="section-title">At a glance</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Metric label="Completed workouts" value={analytics.volumeData.completed.length || 'No sessions yet'} detail={selectedFilterLabel} />
              {analytics.consistency.completedCount + analytics.consistency.plannedCount > 0 && <Metric label="Completion" value={`${analytics.consistency.completionPercentage}%`} detail="Scheduled sessions" />}
              {analytics.prSummary.mostImprovedLift?.change > 0 && <Metric label="Strongest trend" value={analytics.prSummary.mostImprovedLift.label} detail={`+${analytics.prSummary.mostImprovedLift.change} lb training max`} />}
            </div>
          </section>

          <ChartShell title="Strength Progress" empty={analytics.strengthChartData.length < 2}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.strengthChartData}>
                <CartesianGrid stroke="#D2CFC7" vertical={false} />
                <XAxis dataKey="label" stroke="#62675f" tickLine={false} axisLine={false} />
                <YAxis stroke="#62675f" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#FAF9F6', border: '1px solid #D2CFC7', color: '#151714' }} />
                <Legend />
                {Object.entries(liftLabels).map(([key, label]) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={`${label} TM`}
                    stroke={chartColors[key]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartShell>

          <section className="border-t border-[#D2CFC7] pt-6">
            <h2 className="section-title">Consistency</h2>
            {analytics.consistency.completedCount + analytics.consistency.plannedCount > 0 ? (
              <p className="mt-3 text-sm text-[#62675f]">{analytics.consistency.completedCount} completed · {analytics.consistency.plannedCount} planned · {analytics.consistency.completionPercentage}% completion in this range.</p>
            ) : <p className="mt-3 text-sm text-[#62675f]">Plan or log a workout to track consistency.</p>}
            <details className="mt-4"><summary className="cursor-pointer py-2 text-sm font-semibold text-[#2f4f46]">More consistency details</summary><dl className="mt-3 grid gap-4 sm:grid-cols-2"><Metric label="Current streak" value={analytics.consistency.currentStreak} detail="Consecutive training days" /><Metric label="Longest streak" value={analytics.consistency.longestStreak} detail="Best run in range" /></dl></details>
          </section>

          <section>
            <ChartShell title="Training Volume" empty={analytics.volumeData.weeklyVolume.every((week) => week.volume <= 0)}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.volumeData.weeklyVolume}>
                  <CartesianGrid stroke="#D2CFC7" vertical={false} />
                  <XAxis dataKey="label" stroke="#62675f" tickLine={false} axisLine={false} />
                  <YAxis stroke="#62675f" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#FAF9F6', border: '1px solid #D2CFC7', color: '#151714' }} />
                  <Bar dataKey="volume" name="Volume" fill={chartColors.bar} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartShell>
            {analytics.volumeData.completed.length > 0 && <details className="mt-3"><summary className="cursor-pointer py-2 text-sm font-semibold text-[#2f4f46]">More volume details</summary><div className="grid gap-4 sm:grid-cols-2"><Metric label="Total volume" value={`${analytics.volumeData.totalVolume} lb`} detail={selectedFilterLabel} /><Metric label="Average duration" value={`${analytics.volumeData.averageDuration} min`} detail="Completed workouts" /></div></details>}
          </section>

          <section className="border-t border-[#D2CFC7] pt-6">
            <h2 className="section-title">Coach Insight</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#62675f]">{analytics.insights[0]}</p>
          </section>
        </>
      )}
    </section>
  );
}

export default Analytics;
