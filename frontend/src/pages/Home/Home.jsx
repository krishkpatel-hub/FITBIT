import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { smoothScrollTo } from '../../lib/lenis.js';

const capabilityItems = [
  {
    label: 'Adaptive programming',
    icon: <path d="M5 19V5m0 14h14M8 15l3-3 3 2 5-7" />,
  },
  {
    label: 'Workout logging',
    icon: (
      <>
        <path d="M6 12h12M8 9v6M16 9v6M3 10v4M21 10v4" />
        <path d="M10 7h4" />
      </>
    ),
  },
  {
    label: 'Progress analytics',
    icon: (
      <>
        <path d="M5 20V10" />
        <path d="M12 20V4" />
        <path d="M19 20v-7" />
      </>
    ),
  },
  {
    label: 'Built-in AI coach',
    icon: (
      <>
        <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
        <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
      </>
    ),
  },
];

const steps = [
  {
    number: '01',
    title: 'Set your foundation',
    description: 'Enter your one-rep maxes and preferences.',
    icon: (
      <>
        <path d="M8 4h8l2 2v14H6V6l2-2Z" />
        <path d="M9 10h6M9 14h4" />
      </>
    ),
  },
  {
    number: '02',
    title: 'Get your program',
    description: 'Generate your four-day strength week.',
    icon: <path d="M6 12h12M8 9v6M16 9v6M3 10v4M21 10v4" />,
  },
  {
    number: '03',
    title: 'Log your training',
    description: 'Track workouts, PRs, and training history.',
    icon: (
      <>
        <path d="M5 20V10" />
        <path d="M12 20V4" />
        <path d="M19 20v-7" />
      </>
    ),
  },
  {
    number: '04',
    title: 'Analyze and improve',
    description: 'See progress, volume trends, and key insights.',
    icon: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />,
  },
  {
    number: '05',
    title: 'Ask Coach',
    description: 'Get personalized answers using your actual training data.',
    icon: (
      <>
        <path d="M6 8h12v8H9l-3 3V8Z" />
        <path d="M9 11h6M9 14h4" />
      </>
    ),
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

const revealTransition = { duration: 0.34, ease: 'easeOut' };

const scrollToSection = (event, selector) => {
  event.preventDefault();
  smoothScrollTo(selector);
};

function Icon({ children, className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

function ProductPreview() {
  const programDays = ['Bench Press', 'Deadlift', 'Squat', 'Overhead Press'];

  return (
    <div id="product" className="relative mx-auto w-full min-w-0 max-w-[760px] scroll-mt-28 lg:mx-0" aria-label="Illustrative GetJackedCoach product preview">
      <div className="min-w-0 overflow-hidden rounded-2xl border border-[#DDD8CC] bg-[#FAF9F6] shadow-[0_24px_64px_rgba(28,25,18,0.12)] lg:rotate-[1.25deg]">
        <div className="flex items-center justify-between gap-3 border-b border-[#E5E0D5] px-4 py-3 sm:hidden">
          <span className="text-xs font-bold tracking-tight text-[#151714]">GETJACKED<span className="text-[#A98118]">COACH</span></span>
          <span className="text-[11px] text-[#706B60]">Product preview</span>
        </div>
        <div className="grid min-w-0 sm:grid-cols-[112px_minmax(0,1fr)] xl:grid-cols-[132px_minmax(0,1fr)]">
          <aside className="hidden min-w-0 bg-[#171A18] px-3 py-5 text-[#F4F2EC] sm:block">
            <div className="text-[11px] font-bold leading-4">GETJACKED<span className="block text-[#D4AF37]">COACH</span></div>
            <p className="mt-1 text-[10px] text-[#AFAEA7]">Sample workspace</p>
            <div className="mt-7 space-y-1 text-xs text-[#C7C3B8]">
              {['Home', 'Program', 'Train', 'Progress', 'Coach'].map((item) => (
                <div key={item} className={`rounded-md px-2 py-2 ${item === 'Coach' ? 'bg-white/10 text-white' : ''}`}>{item}</div>
              ))}
            </div>
          </aside>

          <div className="grid min-w-0 gap-3 p-3 sm:p-4 xl:grid-cols-[minmax(0,1fr)_168px]">
            <section className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#77756E]">AI Coach</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#151714]">Coach Insights</h2>
              <p className="mt-1 text-xs leading-5 text-[#555850]">Ask about your training, progress, or current program.</p>
              <div className="mt-4 rounded-lg bg-[#E7EEE9] px-3 py-2 text-xs leading-5 text-[#24483F]">How has my bench changed?</div>
              <div className="mt-2 rounded-lg border border-[#E5DFD2] bg-white p-3 text-xs leading-5 text-[#3C403A]">
                Your logged sessions show a steady bench trend. Keep following your plan and use the next plus set to guide progression.
              </div>
              <div className="mt-3 rounded-lg border border-[#E5DFD2] bg-white p-3">
                <p className="text-[11px] font-semibold text-[#3C403A]">Strength progress</p>
                <svg viewBox="0 0 360 100" className="mt-2 h-20 w-full" role="img" aria-label="Illustrative upward strength trend">
                  <path d="M6 77H354M6 44H354" stroke="#E8E4DC" strokeWidth="1" />
                  <path d="M10 78C66 72 90 68 128 61S212 53 250 42S318 34 350 24" fill="none" stroke="#24483F" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
            </section>

            <aside className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <section className="min-w-0 rounded-lg border border-[#E5DFD2] bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#77756E]">Current program</p>
                <h3 className="mt-1 text-sm font-semibold text-[#151714]">Four-day strength week</h3>
                <div className="mt-2 divide-y divide-[#EEEAE2] text-xs text-[#4F534E]">
                  {programDays.map((day, index) => (
                    <div key={day} className="flex min-w-0 gap-2 py-1.5">
                      <span className="shrink-0 text-[#8A857B]">0{index + 1}</span>
                      <span className="min-w-0 break-words">{day}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="min-w-0 rounded-lg border border-[#E5DFD2] bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#77756E]">Key insights</p>
                <p className="mt-2 text-xs leading-5 text-[#4F534E]">Review strength trends and training consistency as you log workouts.</p>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function CapabilityStrip() {
  return (
    <div id="features" className="mt-9 grid scroll-mt-28 grid-cols-2 gap-x-3 gap-y-5 xl:grid-cols-4" aria-label="GetJackedCoach core capabilities">
        {capabilityItems.map((item) => (
          <div key={item.label} className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F1E9D7] text-[#151714]">
              <Icon className="h-4 w-4">{item.icon}</Icon>
            </span>
            <span className="min-w-0 text-sm font-medium leading-5 text-[#262821]">{item.label}</span>
          </div>
        ))}
    </div>
  );
}

function HeroSection() {
  return (
    <section className="pb-12 pt-12 sm:pb-16 sm:pt-16" aria-labelledby="home-heading">
      <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center lg:gap-10 xl:gap-14">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={revealTransition}>
          <p className="eyebrow text-[#6F716B]">Adaptive Strength Programming</p>
          <h1
            id="home-heading"
            className="mt-5 max-w-[760px] break-words text-[clamp(2.65rem,4.6vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-[#151714]"
          >
            Stronger training.
            <span className="block text-[#A98118]">Real progress.</span>
          </h1>
          <p className="mt-7 max-w-[720px] text-base leading-7 text-[#4F534E] sm:text-lg sm:leading-8">
            GetJackedCoach builds your strength program, tracks workouts, reveals progress through analytics, and gives you a training-aware AI Coach.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link to="/register" className="btn-primary h-12 whitespace-nowrap px-7 text-base">
              Start Your Program
              <span className="ml-2" aria-hidden="true">-&gt;</span>
            </Link>
            <a href="#how-it-works" onClick={(event) => scrollToSection(event, '#how-it-works')} className="btn-secondary h-12 whitespace-nowrap px-7 text-base">
              See How It Works
            </a>
          </div>
          <CapabilityStrip />
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ ...revealTransition, delay: 0.08 }}
        >
          <ProductPreview />
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-28 border-t border-[#D8D1C4] py-12 sm:py-14" aria-labelledby="how-it-works-heading">
      <div className="space-y-10">
        <div className="max-w-[760px]">
          <p className="eyebrow">How It Works</p>
          <h2 id="how-it-works-heading" className="mt-3 text-[clamp(2rem,3.2vw,3rem)] font-semibold leading-[1.03] tracking-[-0.055em] text-[#151714]">
            From numbers to real progress.
          </h2>
          <p className="mt-4 max-w-[680px] text-base leading-7 text-[#4F534E]">
            A simple, structured system to help you get stronger, stay consistent, and make better decisions - all in one place.
          </p>
        </div>

        <div className="relative">
          <svg className="absolute left-5 right-5 top-7 hidden h-16 w-[calc(100%-2.5rem)] text-[#C9C2B4] lg:block" viewBox="0 0 900 80" fill="none" aria-hidden="true">
            <path d="M8 40C92 5 154 8 225 40S366 72 450 40S604 8 675 40S814 72 892 40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div className="grid gap-x-7 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step) => (
              <article key={step.number} className="relative min-w-0 border-t border-[#D8D1C4] pt-4 lg:border-0 lg:pt-0">
                <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-[#E9DAB4] bg-[#F6E9C9] text-[#151714]">
                  <Icon className="h-5 w-5">{step.icon}</Icon>
                </span>
                <p className="mt-4 text-xs font-semibold text-[#4F534E]">{step.number}</p>
                <h3 className="mt-2 text-base font-semibold text-[#151714]">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5A5E57]">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Home() {
  return (
    <div className="landing-editorial">
      <div className="mx-auto w-[calc(100%-32px)] max-w-[1600px] sm:w-[calc(100%-48px)] lg:w-[calc(100%-64px)]">
        <HeroSection />
        <HowItWorksSection />
      </div>
    </div>
  );
}

export default Home;
