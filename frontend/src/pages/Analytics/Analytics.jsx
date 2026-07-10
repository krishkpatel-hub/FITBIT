import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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
import { analyticsService } from '../../services/analyticsService.js';

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
  squat: '#d6c08a',
  bench: '#a8a29e',
  deadlift: '#f5f5f4',
  overhead_press: '#78716c',
  bar: '#d6c08a',
  muted: '#57534e',
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

  if (consistency.completionPercentage < 50 && consistency.completedCount + consistency.plannedCount > 0) {
    insights.push('Completion rate is low. Reduce planned workload before increasing training maxes.');
  }

  if (liftProgress.some((lift) => lift.recentIncrease === 0 && lift.entries >= 2)) {
    insights.push('At least one lift has no recent training max increase. Consider a deload or repeat week if performance feels flat.');
  }

  if (prSummary.newestPR) {
    insights.push(`Newest PR logged: ${prSummary.newestPR.exerciseName} at ${getPRValue(prSummary.newestPR)} lb estimated 1RM.`);
  }

  return insights.length > 0
    ? insights
    : ['Log workouts, training max updates, and PRs to unlock coaching insights.'];
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
    <section className="quiet-card">
      <h2 className="section-title">{title}</h2>
      {empty ? <p className="empty-state mt-4">Not enough data yet.</p> : <div className="mt-6 h-72">{children}</div>}
    </section>
  );
}

function Analytics() {
  const { logout } = useAuth();
  const [analyticsData, setAnalyticsData] = useState({
    workouts: [],
    progressLogs: [],
    trainingMaxes: [],
    prs: [],
  });
  const [filter, setFilter] = useState('90');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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

        setError(err.response?.data?.message || 'Unable to load analytics.');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [logout]);

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
    <motion.section
      className="page-stack"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
    >
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-stone-800 pb-8">
        <div>
          <p className="eyebrow">Coaching Analytics</p>
          <h1 className="page-title">Advanced Analytics</h1>
          <p className="page-copy">
            Strength, volume, consistency, and PR signals generated from your logged training data.
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

      {error && <p className="status-error">{error}</p>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4" aria-label="Loading analytics">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-lg border border-stone-800 bg-stone-900/40" />
          ))}
        </div>
      ) : (
        <>
          <section className="grid gap-6 md:grid-cols-4">
            <Metric
              label="Completed Workouts"
              value={analytics.volumeData.completed.length}
              detail={selectedFilterLabel}
            />
            <Metric label="Weekly Volume" value={analytics.volumeData.weeklyVolume.at(-1)?.volume || 0} detail="Latest week" />
            <Metric label="Average Duration" value={`${analytics.volumeData.averageDuration}m`} detail="Completed sessions" />
            <Metric label="Completion" value={`${analytics.consistency.completionPercentage}%`} detail="Planned vs completed" />
          </section>

          <ChartShell title="Strength Progress" empty={analytics.strengthChartData.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.strengthChartData}>
                <CartesianGrid stroke="#292524" vertical={false} />
                <XAxis dataKey="label" stroke="#78716c" tickLine={false} axisLine={false} />
                <YAxis stroke="#78716c" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#1c1917', border: '1px solid #44403c', color: '#fafaf9' }} />
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

          <section className="grid gap-6 lg:grid-cols-2">
            <ChartShell title="Weekly Workout Volume" empty={analytics.volumeData.weeklyVolume.length === 0}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.volumeData.weeklyVolume}>
                  <CartesianGrid stroke="#292524" vertical={false} />
                  <XAxis dataKey="label" stroke="#78716c" tickLine={false} axisLine={false} />
                  <YAxis stroke="#78716c" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#1c1917', border: '1px solid #44403c', color: '#fafaf9' }} />
                  <Bar dataKey="volume" name="Volume" fill={chartColors.bar} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartShell>

            <ChartShell title="Monthly Workout Volume" empty={analytics.volumeData.monthlyVolume.length === 0}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.volumeData.monthlyVolume}>
                  <CartesianGrid stroke="#292524" vertical={false} />
                  <XAxis dataKey="label" stroke="#78716c" tickLine={false} axisLine={false} />
                  <YAxis stroke="#78716c" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#1c1917', border: '1px solid #44403c', color: '#fafaf9' }} />
                  <Bar dataKey="volume" name="Volume" fill={chartColors.muted} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartShell>
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="quiet-card">
              <h2 className="section-title">Consistency</h2>
              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                <Metric label="Current Streak" value={analytics.consistency.currentStreak} detail="Consecutive workout days" />
                <Metric label="Longest Streak" value={analytics.consistency.longestStreak} detail="Best run in range" />
                <Metric label="Completed" value={analytics.consistency.completedCount} detail="Completed workouts" />
                <Metric label="Planned" value={analytics.consistency.plannedCount} detail="Still pending" />
              </dl>
            </section>

            <ChartShell title="Planned vs Completed" empty={analytics.consistency.plannedVsCompleted.every((item) => item.workouts === 0)}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.consistency.plannedVsCompleted}>
                  <CartesianGrid stroke="#292524" vertical={false} />
                  <XAxis dataKey="label" stroke="#78716c" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke="#78716c" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#1c1917', border: '1px solid #44403c', color: '#fafaf9' }} />
                  <Bar dataKey="workouts" fill={chartColors.bar} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartShell>
          </section>

          <section className="quiet-card">
            <h2 className="section-title">Personal Records</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-4">
              <Metric
                label="Newest PR"
                value={analytics.prSummary.newestPR?.exerciseName || 'None'}
                detail={analytics.prSummary.newestPR ? `${getPRValue(analytics.prSummary.newestPR)} lb est. 1RM` : 'Log a PR to begin'}
              />
              <Metric
                label="Highest PR"
                value={analytics.prSummary.highestPR ? `${getPRValue(analytics.prSummary.highestPR)} lb` : 'None'}
                detail={analytics.prSummary.highestPR?.exerciseName || 'No PR data'}
              />
              <Metric
                label="Most Improved Lift"
                value={analytics.prSummary.mostImprovedLift?.label || 'None'}
                detail={
                  analytics.prSummary.mostImprovedLift
                    ? `${analytics.prSummary.mostImprovedLift.change} lb TM change`
                    : 'No progression data'
                }
              />
              <Metric
                label="Fastest Progress"
                value={analytics.prSummary.fastestProgress?.label || 'None'}
                detail={
                  analytics.prSummary.fastestProgress
                    ? `${analytics.prSummary.fastestProgress.percent.toFixed(1)}% change`
                    : 'No progression data'
                }
              />
            </div>
          </section>

          <section className="quiet-card">
            <h2 className="section-title">Adaptive Engine Insights</h2>
            <div className="mt-5 divide-y divide-stone-800">
              {analytics.insights.map((insight) => (
                <p key={insight} className="py-4 text-sm leading-6 text-stone-300">
                  {insight}
                </p>
              ))}
            </div>
          </section>
        </>
      )}
    </motion.section>
  );
}

export default Analytics;
