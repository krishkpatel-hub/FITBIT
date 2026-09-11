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
    description: 'Enter your training maxes and preferences.',
    icon: (
      <>
        <path d="M8 4h8l2 2v14H6V6l2-2Z" />
        <path d="M9 10h6M9 14h4" />
      </>
    ),
  },
  {
    number: '02',
    title: 'Get a personalized program',
    description: 'Generate a structured strength program.',
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
  const programRows = [
    ['Bench Press', '4 x 5 @ 205'],
    ['Overhead Press', '4 x 6 @ 135'],
    ['Incline DB Press', '3 x 8 @ 50'],
    ['Lateral Raises', '3 x 12 @ 25'],
  ];

  const insightRows = [
    ['Bench', '+11%', '6 weeks'],
    ['Squat', '+8%', '6 weeks'],
    ['Deadlift', '+5%', '6 weeks'],
    ['Consistency', '87%', '8 weeks'],
  ];

  return (
    <div id="product" className="relative mx-auto w-full max-w-[860px] scroll-mt-28 lg:mx-0" aria-label="GetJackedCoach product preview">
      <div className="absolute -left-10 top-1/3 hidden h-72 w-72 rounded-full bg-[#D4AF37]/18 blur-3xl lg:block" aria-hidden="true" />
      <div className="absolute right-10 -top-8 hidden h-44 w-44 rounded-full bg-[#D4AF37]/20 blur-2xl lg:block" aria-hidden="true" />
      <div className="relative grid min-w-0 overflow-hidden rounded-[1.6rem] border border-[#DED9CE] bg-[#FAF8F1] shadow-[0_30px_90px_rgba(28,25,18,0.16)] sm:grid-cols-[176px_minmax(0,1fr)] xl:grid-cols-[176px_minmax(0,1fr)_220px] xl:rotate-[1deg]">
        <aside className="hidden bg-[#171A18] p-6 text-[#F4F2EC] sm:block">
          <div className="whitespace-nowrap text-sm font-bold tracking-[-0.03em]">
            GETJACKED<span className="text-[#D4AF37]">COACH</span>
          </div>
          <nav className="mt-9 space-y-2 text-[0.78rem] text-[#C7C3B8]">
            {['Dashboard', 'Strength Program', 'Templates', 'Progress', 'Calendar', 'Analytics', 'Coach', 'Profile'].map((item) => (
              <div key={item} className={`rounded-lg px-3 py-2 ${item === 'Coach' ? 'bg-white/10 text-white' : ''}`}>
                {item}
              </div>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 p-5 sm:p-7">
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#151714] sm:text-3xl">
            Coach Insights
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#555850]">
            Ask about your training, progress, or current program.
          </p>

          <div className="mt-6 ml-auto max-w-[310px] rounded-xl bg-[#DCEBFF] px-4 py-3 text-sm text-[#1A334D]">
            How has my bench changed recently?
          </div>

          <div className="mt-4 rounded-xl border border-[#E5DFD2] bg-white/70 p-4">
            <p className="text-sm leading-6 text-[#3C403A]">
              Your bench has increased from 185 lb to 205 lb over the last 6 weeks. Reps at 205 have stabilized around 5-6, indicating solid progress. Your current training max is 205 lb.
            </p>
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#706B60]">Bench Press Progress</p>
              <svg viewBox="0 0 420 150" className="mt-3 h-28 w-full min-w-0" role="img" aria-label="Example bench press progress chart">
                <path d="M20 126H400M20 88H400M20 50H400" stroke="#E1DBD0" strokeWidth="1" />
                <path d="M24 112C74 102 102 98 144 88C194 76 220 70 262 62C306 54 342 44 398 34" fill="none" stroke="#24483F" strokeWidth="4" strokeLinecap="round" />
                {[24, 84, 144, 204, 264, 324, 398].map((x, index) => (
                  <circle key={x} cx={x} cy={[112, 101, 88, 76, 62, 50, 34][index]} r="4" fill="#24483F" />
                ))}
              </svg>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <input
              aria-label="Example coach input"
              className="min-w-0 flex-1 rounded-lg border border-[#DED9CE] bg-white/70 px-4 py-3 text-sm text-[#4F534E]"
              value="Ask about your training..."
              readOnly
            />
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#24483F] text-white" aria-hidden="true">
              <span className="text-xl leading-none">-&gt;</span>
            </div>
          </div>
        </section>

        <aside className="hidden min-w-0 border-l border-[#E5DFD2] bg-[#FFFCF5] p-5 xl:block">
          <div className="min-w-0 rounded-2xl border border-[#E7E1D5] bg-white/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#706B60]">Current program</p>
            <h3 className="mt-3 text-sm font-semibold text-[#151714]">Week 3 - Push</h3>
            <div className="mt-3 space-y-3">
              {programRows.map(([lift, prescription]) => (
                <div key={lift} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 text-xs text-[#4F534E]">
                  <span className="min-w-0 truncate">{lift}</span>
                  <span className="whitespace-nowrap text-right">{prescription}</span>
                </div>
              ))}
            </div>
            <Link to="/register" className="btn-secondary mt-5 h-9 w-full text-xs">
              View Full Program
            </Link>
          </div>

          <div className="mt-4 min-w-0 rounded-2xl border border-[#E7E1D5] bg-white/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#706B60]">Key insights</p>
            <div className="mt-3 space-y-3">
              {insightRows.map(([name, value, range]) => (
                <div key={name} className="grid min-w-0 grid-cols-[minmax(0,1fr)_3rem_3.75rem] items-center gap-2 text-xs text-[#4F534E]">
                  <span className="min-w-0 truncate">{name}</span>
                  <strong className="text-right font-semibold text-[#24483F]">{value}</strong>
                  <span className="whitespace-nowrap text-right">{range}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CapabilityStrip() {
  return (
    <div id="features" className="mt-10 grid scroll-mt-28 gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="GetJackedCoach core capabilities">
        {capabilityItems.map((item) => (
          <div key={item.label} className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F7E4A7] text-[#151714] shadow-[0_14px_32px_rgba(68,56,26,0.12)]">
              <Icon className="h-5 w-5">{item.icon}</Icon>
            </span>
            <span className="text-base font-semibold leading-tight text-[#262821]">{item.label}</span>
          </div>
        ))}
    </div>
  );
}

function HeroSection() {
  return (
    <section className="pt-14 pb-10 sm:pt-20 sm:pb-14" aria-labelledby="home-heading">
      <div className="grid gap-12 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={revealTransition}>
          <p className="eyebrow text-[#6F716B]">Adaptive Strength Programming</p>
          <h1
            id="home-heading"
            className="mt-5 max-w-[760px] text-[clamp(3.15rem,4.8vw,6.5rem)] font-semibold leading-[0.92] tracking-[-0.045em] text-[#151714]"
          >
            Stronger training.
            <span className="block text-[#D4AF37]">Real progress.</span>
          </h1>
          <p className="mt-7 max-w-[720px] text-base leading-7 text-[#4F534E] sm:text-lg sm:leading-8">
            GetJackedCoach builds your strength program, tracks every workout, and uses your actual training data to give personalized insights with an AI coach.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/register" className="btn-primary h-12 px-7 text-base">
              Start Your Program
              <span className="ml-2" aria-hidden="true">-&gt;</span>
            </Link>
            <a href="#how-it-works" onClick={(event) => scrollToSection(event, '#how-it-works')} className="btn-secondary h-12 px-7 text-base">
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
    <section id="how-it-works" className="scroll-mt-28 border-t border-[#D8D1C4] py-14 sm:py-16" aria-labelledby="how-it-works-heading">
      <div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
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
          <svg className="absolute left-8 right-8 top-9 hidden h-20 w-[calc(100%-4rem)] text-[#C9C2B4] lg:block" viewBox="0 0 900 120" fill="none" aria-hidden="true">
            <path d="M8 66C98 7 165 13 257 69C344 122 397 113 463 63C548 -1 618 7 696 67C775 127 835 105 892 43" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step) => (
              <article key={step.number} className="relative pl-14 sm:pl-0">
                <div className="absolute left-5 top-0 h-full w-px bg-[#D8D1C4] sm:hidden" aria-hidden="true" />
                <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[#F6DEA0] text-[#151714] shadow-[0_16px_36px_rgba(68,56,26,0.12)]">
                  <Icon className="h-6 w-6">{step.icon}</Icon>
                </span>
                <p className="mt-5 text-sm font-semibold text-[#4F534E]">{step.number}</p>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#151714]">{step.title}</h3>
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
