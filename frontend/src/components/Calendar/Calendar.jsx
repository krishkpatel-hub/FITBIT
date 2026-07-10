const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatMonthLabel = (date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthDays = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(year, month, day));
  }

  return days;
};

const statusOrder = ['planned', 'completed', 'skipped'];

function Calendar({ monthDate, selectedDate, workoutsByDate = {}, onDateSelect, onMonthChange }) {
  const days = getMonthDays(monthDate);

  const moveMonth = (amount) => {
    const nextMonth = new Date(monthDate);
    nextMonth.setMonth(nextMonth.getMonth() + amount);
    onMonthChange(nextMonth);
  };

  return (
    <section className="quiet-card" aria-labelledby="calendar-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Training Calendar</p>
          <h2 id="calendar-heading" className="mt-2 text-2xl font-semibold tracking-tight text-stone-50">
            {formatMonthLabel(monthDate)}
          </h2>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => moveMonth(-1)} className="btn-secondary px-3" aria-label="Previous month">
            Prev
          </button>
          <button type="button" onClick={() => moveMonth(1)} className="btn-secondary px-3" aria-label="Next month">
            Next
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-7 border-b border-stone-800 pb-2 text-center text-xs uppercase tracking-[0.16em] text-stone-500">
        {dayLabels.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="min-h-24 border-b border-stone-900 p-2" aria-hidden="true" />;
          }

          const dateKey = toDateKey(day);
          const dayWorkouts = workoutsByDate[dateKey] || [];
          const selected = selectedDate === dateKey;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onDateSelect(dateKey)}
              className={`min-h-24 border-b border-stone-900 p-2 text-left transition-colors hover:bg-stone-900/40 focus:outline-none focus:ring-1 focus:ring-amber-300/40 ${
                selected ? 'bg-stone-900/70' : ''
              }`}
              aria-pressed={selected}
              aria-label={`${dateKey}, ${dayWorkouts.length} workouts`}
            >
              <span className="text-sm font-medium text-stone-100">{day.getDate()}</span>
              {dayWorkouts.length > 0 && (
                <div className="mt-2 space-y-1">
                  {statusOrder.map((status) => {
                    const count = dayWorkouts.filter((workout) => workout.status === status).length;

                    return count > 0 ? (
                      <div key={status} className="flex items-center justify-between gap-2 text-[11px] capitalize text-stone-500">
                        <span>{status}</span>
                        <span className="text-stone-300">{count}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default Calendar;
