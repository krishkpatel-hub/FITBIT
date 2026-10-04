import Logo from '../Logo.jsx';

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-6 text-sm text-[#4F534E]" role="status" aria-label="Loading">
      <Logo showWordmark={false} markClassName="h-10 w-10" />
      <div className="h-7 w-7 rounded-full border-2 border-[#D2CFC7] border-t-[#2f4f46] motion-safe:animate-spin" />
      <span className="sr-only">Loading your workspace</span>
    </div>
  );
}

export default LoadingSpinner;
