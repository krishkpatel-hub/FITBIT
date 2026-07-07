function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-6" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
    </div>
  );
}

export default LoadingSpinner;

