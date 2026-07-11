import Logo from '../Logo.jsx';

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-6" role="status" aria-label="Loading">
      <Logo showWordmark={false} markClassName="h-10 w-10" />
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-stone-800 border-t-amber-300" />
    </div>
  );
}

export default LoadingSpinner;
