function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-6" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-emerald-400" />
    </div>
  );
}

export default LoadingSpinner;
