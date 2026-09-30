import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { templateService } from '../../services/templateService';
import { appPaths } from '../../utils/navigation';
import { getRecentTemplates, getTemplateMuscleGroups } from '../../utils/templateWorkflow';

const formatDate = (value) => new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', timeZone: 'UTC',
}).format(new Date(value));

function TrainStart({ plannedWorkouts, onStartPlanned, onStartBlank, onStartTemplate }) {
  const { logout } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const nextWorkout = plannedWorkouts[0];

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    templateService.getTemplates()
      .then((response) => { if (active) setTemplates(getRecentTemplates(response.data || [])); })
      .catch(async (err) => {
        if (!active) return;
        if (err.response?.status === 401) await logout();
        else setError('Unable to load recent templates. You can still start a blank or planned workout.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  return (
    <div className="space-y-8">
      {nextWorkout && (
        <section aria-labelledby="planned-workout-heading" className="border-b border-[#D2CFC7] pb-8">
          <p className="text-sm text-[#62675f]">Planned for {formatDate(nextWorkout.date)}</p>
          <h2 id="planned-workout-heading" className="mt-2 break-words text-2xl font-semibold">{nextWorkout.title}</h2>
          <p className="mt-2 text-sm text-[#62675f]">{nextWorkout.exercises?.length || 0} {nextWorkout.exercises?.length === 1 ? 'exercise' : 'exercises'}</p>
          <button type="button" onClick={() => onStartPlanned(nextWorkout)} className="btn-primary mt-5 min-h-11">Continue Planned Workout</button>
          {plannedWorkouts.length > 1 && (
            <details className="mt-5">
              <summary className="w-fit cursor-pointer py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2f4f46]">Other planned workouts ({plannedWorkouts.length - 1})</summary>
              <ul className="mt-2 divide-y divide-[#D2CFC7]">
                {plannedWorkouts.slice(1).map((workout) => (
                  <li key={workout._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1 basis-56"><p className="break-words font-medium">{workout.title}</p><p className="mt-1 text-sm text-[#62675f]">{formatDate(workout.date)}</p></div>
                    <button type="button" className="btn-secondary min-h-11" aria-label={`Continue ${workout.title}`} onClick={() => onStartPlanned(workout)}>Continue</button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      <section aria-label="Start a workout" className="grid gap-6 sm:grid-cols-2 sm:gap-8">
        <div>
          <h2 className="text-xl font-semibold">Use a routine</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#62675f]">Start with your saved exercise list. Add the sets you perform today.</p>
          <Link to={appPaths.templates} className={`${nextWorkout ? 'btn-secondary' : 'btn-primary'} mt-5 min-h-11`}>Start from Template</Link>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Build today's session</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#62675f]">Choose your own exercises and log your workout as you go.</p>
          <button type="button" onClick={onStartBlank} className="btn-secondary mt-5 min-h-11">Start Blank Workout</button>
        </div>
      </section>

      <section aria-labelledby="recent-templates-heading" className="border-t border-[#D2CFC7] pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="recent-templates-heading" className="section-title">Recent Templates</h2>
          <Link to={appPaths.templates} className="py-2 text-sm font-semibold text-[#2f4f46] underline underline-offset-4">View all templates</Link>
        </div>
        {loading ? <p role="status" className="py-5 text-sm text-[#62675f]">Loading templates...</p> : error ? (
          <div className="mt-4"><p role="alert" className="text-sm text-[#8f3332]">{error}</p><button type="button" className="btn-secondary mt-3 min-h-11" onClick={() => setAttempt((value) => value + 1)}>Retry templates</button></div>
        ) : templates.length ? (
          <ul className="mt-3 divide-y divide-[#D2CFC7]">
            {templates.map((template) => (
              <li key={template._id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0 flex-1 basis-56">
                  <h3 className="break-words font-semibold">{template.name}</h3>
                  <p className="mt-1 text-sm text-[#62675f]">{template.exercises?.length || 0} {template.exercises?.length === 1 ? 'exercise' : 'exercises'}</p>
                  <p className="mt-1 break-words text-sm text-[#62675f]">{getTemplateMuscleGroups(template).join(' · ')}</p>
                </div>
                <button type="button" onClick={() => onStartTemplate(template)} className="btn-secondary min-h-11" aria-label={`Start ${template.name}`}>Start Workout</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[#62675f]">No saved templates yet. Choose a starter routine in Templates, customize its exercises, and save it for next time.</p>
        )}
      </section>
    </div>
  );
}

export default TrainStart;
