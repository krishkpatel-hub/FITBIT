function ProgressChart() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-900">Progress Chart</h3>
      <div className="mt-4 flex h-40 items-end gap-2">
        {[35, 55, 42, 75, 68].map((height, index) => (
          <div
            key={height + index}
            className="flex-1 rounded-t bg-emerald-500"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default ProgressChart;

