const getValue = (item, dataKey) => {
  if (typeof dataKey === 'function') {
    return dataKey(item);
  }

  return item?.[dataKey] ?? 0;
};

function ProgressChart({
  title = 'Progress Chart',
  data = [],
  dataKey = 'value',
  labelKey = 'label',
  colorClass = 'bg-amber-300',
  emptyMessage = 'No chart data yet.',
}) {
  const values = data.map((item) => Number(getValue(item, dataKey)) || 0);
  const maxValue = Math.max(...values, 0);

  return (
    <div className="quiet-card">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-stone-100">{title}</h3>
        {data.length > 0 && <span className="badge">{data.length} points</span>}
      </div>
      {data.length === 0 || maxValue === 0 ? (
        <p className="empty-state mt-4">{emptyMessage}</p>
      ) : (
        <div className="mt-4">
          <div className="flex h-40 items-end gap-2 border-b border-white/[0.08]">
            {data.map((item, index) => {
              const value = values[index];
              const height = Math.max((value / maxValue) * 100, 6);

              return (
                <div key={`${getValue(item, labelKey)}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex h-32 w-full items-end">
                    <div
                      className={`w-full rounded-t-md opacity-90 shadow-[0_-1px_0_rgba(255,255,255,0.18)_inset] ${colorClass}`}
                      style={{ height: `${height}%` }}
                      title={`${value}`}
                    />
                  </div>
                  <span className="w-full truncate text-center text-xs text-stone-500">{getValue(item, labelKey)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgressChart;
