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
    description: 'Enter maxes for bench, deadlift, squat, and overhead press.',
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
    description: 'Generate a locked four-day week built from your numbers.',
    icon: <path d="M6 12h12M8 9v6M16 9v6M3 10v4M21 10v4" />,
  },
  {
    number: '03',
    title: 'Log your training',
    description: 'Complete workouts, plus sets, PRs, and training history.',
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
    description: 'Review trends, consistency, volume, and strength changes.',
    icon: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />,
  },
  {
    number: '05',
    title: 'Ask Coach',
    description: 'Get grounded answers from your actual training data.',
    icon: (
      <>
        <path d="M6 8h12v8H9l-3 3V8Z" />
        <path d="M9 11h6M9 14h4" />
      </>
    ),
  },
];

const productSections = [
  {
    id: 'strength-program',
    eyebrow: 'Adaptive programming',
    title: 'Know what to train next.',
    description:
      'The Strength Program turns your current maxes into a focused weekly plan, keeps future weeks locked, and makes the next workout obvious.',
    image: '/screenshots/strength-program.jpg',
    alt: 'GetJackedCoach Strength Program showing training maxes, week navigation, and a workout table.',
  },
  {
    id: 'progress',
    eyebrow: 'Progress analytics',
    title: 'Turn training history into direction.',
    description:
      'Analytics surfaces strength progression, volume, consistency, and PR signals so you can see what is moving and what needs attention.',
    image: '/screenshots/analytics.jpg',
    alt: 'GetJackedCoach Analytics page showing strength progress and workout volume charts.',
  },
  {
    id: 'templates',
    eyebrow: 'Templates',
    title: 'Train your way when you want control.',
    description:
      'Build reusable routines for bodybuilding or custom sessions. Templates preload exercises only, so sets and loading stay in your hands.',
    image: '/screenshots/templates.jpg',
    alt: 'GetJackedCoach Templates page showing starter templates and a custom workout template builder.',
  },
  {
    id: 'ai-coach',
    eyebrow: 'Smart Coach',
    title: 'Ask coaching questions against your own data.',
    description:
      'Coach can review your program, maxes, PRs, progress, and recent workouts through allowlisted backend tools, then answer in plain language.',
    image: '/screenshots/coach.jpg',
    alt: 'GetJackedCoach Coach page showing data-driven coaching insights.',
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
    ['Bench Press', '4 x 5', '205'],
    ['Overhead Press', '4 x 6', '135'],
    ['Incline DB Press', '3 x 8', '50'],
    ['Lateral Raises', '3 x 12', '25'],
  ];

  const insightRows = [
    ['Bench', '+11%', '6 weeks'],
    ['Squat', '+8%', '6 weeks'],
    ['Deadlift', '+5%', '6 weeks'],
    ['Consistency', '87%', '8 weeks'],
  ];

  return (
    <div className="relative mx-auto w-full max-w-[760px] lg:mx-0">
      <div className="absolute -left-8 top-14 hidden h-56 w-56 rounded-full bg-[#D4AF37]/20 blur-3xl lg:block" aria-hidden="true" />
      <div className="absolute -right-5 -top-8 hidden h-40 w-40 rounded-full bg-[#D4AF37]/25 blur-2xl lg:block" aria-hidden="true" />
      <div className="relative grid overflow-hidden rounded-[1.75rem] border border-[#DED9CE] bg-[#FAF8F1] shadow-[0_30px_90px_rgba(28,25,18,0.16)] sm:grid-cols-[170px_minmax(0,1fr)] lg:grid-cols-[170px_minmax(0,1fr)_190px]">
        <aside className="hidden bg-[#171A18] p-6 text-[#F4F2EC] sm:block">
          <div className="text-sm font-bold tracking-[-0.03em]">
            GETJACKED<span className="text-[#D4AF37]">COACH</span>
          </div>
          <nav className="mt-10 space-y-2 text-[0.78rem] text-[#C7C3B8]">
            {['Dashboard', 'Strength Program', 'Templates', 'Progress', 'Calendar', 'Analytics', 'Coach', 'Profile'].map((item) => (
              <div key={item} className={`rounded-lg px-3 py-2 ${item === 'Coach' ? 'bg-white/10 text-white' : ''}`}>
                {item}
              </div>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A766C]">Product preview</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#151714] sm:text-3xl">
            Coach Insights
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#555850]">
            Ask about your training, progress, or current program.
          </p>

          <div className="mt-6 rounded-xl bg-[#DCEBFF] px-4 py-3 text-sm text-[#1A334D]">
            How has my bench changed recently?
          </div>

          <div className="mt-4 rounded-xl border border-[#E5DFD2] bg-white/70 p-4">
            <p className="text-sm leading-6 text-[#3C403A]">
              Your bench has increased from 185 lb to 205 lb over the last six weeks. Your current training max is 205 lb.
            </p>
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#706B60]">Bench Press Progress</p>
              <svg viewBox="0 0 420 150" className="mt-3 h-28 w-full" role="img" aria-label="Example bench press progress chart">
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

        <aside className="hidden border-l border-[#E5DFD2] bg-[#FFFCF5] p-5 lg:block">
          <div className="rounded-2xl border border-[#E7E1D5] bg-white/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#706B60]">Current program</p>
            <h3 className="mt-3 text-sm font-semibold text-[#151714]">Week 3 - Push</h3>
            <div className="mt-3 space-y-3">
              {programRows.map(([lift, sets, weight]) => (
                <div key={lift} className="grid grid-cols-[1fr_auto_auto] gap-3 text-xs text-[#4F534E]">
                  <span>{lift}</span>
                  <span>{sets}</span>
                  <span>{weight}</span>
                </div>
              ))}
            </div>
            <Link to="/register" className="btn-secondary mt-5 h-9 w-full text-xs">
              View Full Program
            </Link>
          </div>

          <div className="mt-4 rounded-2xl border border-[#E7E1D5] bg-white/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#706B60]">Key insights</p>
            <div className="mt-3 space-y-3">
              {insightRows.map(([name, value, range]) => (
                <div key={name} className="grid grid-cols-[1fr_auto_auto] gap-3 text-xs text-[#4F534E]">
                  <span>{name}</span>
                  <strong className="font-semibold text-[#24483F]">{value}</strong>
                  <span>{range}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionIntro({ eyebrow, title, copy, titleId }) {
  return (
    <div className="max-w-[760px]">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={titleId} className="mt-3 text-[clamp(2rem,3.2vw,3rem)] font-semibold leading-[1.03] tracking-[-0.055em] text-[#151714]">
        {title}
      </h2>
      {copy && <p className="mt-4 max-w-[680px] text-base leading-7 text-[#4F534E]">{copy}</p>}
    </div>
  );
}

function CapabilityStrip() {
  return (
    <section id="features" className="scroll-mt-28 py-6" aria-label="GetJackedCoach core capabilities">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {capabilityItems.map((item) => (
          <div key={item.label} className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F7E4A7] text-[#151714] shadow-[0_14px_32px_rgba(68,56,26,0.12)]">
              <Icon className="h-5 w-5">{item.icon}</Icon>
            </span>
            <span className="text-base font-semibold leading-tight text-[#262821]">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function HeroSection() {
  return (
    <section className="pt-14 pb-10 sm:pt-20 sm:pb-14" aria-labelledby="home-heading">
      <div className="grid gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={revealTransition}>
          <p className="eyebrow text-[#6F716B]">Adaptive Strength Programming</p>
          <h1
            id="home-heading"
            className="mt-5 max-w-[720px] text-[clamp(3.25rem,7.4vw,6.9rem)] font-semibold leading-[0.92] tracking-[-0.075em] text-[#151714]"
          >
            Stronger training.
            <span className="block text-[#D4AF37]">Real progress.</span>
          </h1>
          <p className="mt-7 max-w-[720px] text-base leading-7 text-[#4F534E] sm:text-lg sm:leading-8">
            GetJackedCoach builds your strength program, tracks every workout, and uses your actual data to give personalized insights with an AI coach.
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
    <section id="how-it-works" className="scroll-mt-28 rounded-[2rem] bg-[#F8F5EC]/76 py-14 sm:py-16" aria-labelledby="how-it-works-heading">
      <div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <SectionIntro
          eyebrow="How It Works"
          titleId="how-it-works-heading"
          title="From numbers to real progress."
          copy="A simple, structured system to help you get stronger, stay consistent, and make better decisions - all in one place."
        />

        <div className="relative">
          <svg className="absolute left-8 right-8 top-9 hidden h-20 w-[calc(100%-4rem)] text-[#C9C2B4] lg:block" viewBox="0 0 900 120" fill="none" aria-hidden="true">
            <path d="M8 66C98 7 165 13 257 69C344 122 397 113 463 63C548 -1 618 7 696 67C775 127 835 105 892 43" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
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

function AppFrame({ src, alt, eager = false }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-[#D2CFC7] bg-[#FAF9F6] shadow-[0_24px_80px_rgba(21,23,20,0.10)]">
      <img
        src={src}
        alt={alt}
        width="1040"
        height="720"
        loading={eager ? 'eager' : 'lazy'}
        decoding={eager ? 'sync' : 'async'}
        className="aspect-[13/9] w-full object-cover object-top"
      />
    </figure>
  );
}

function ProductSection({ section, index }) {
  const reverse = index % 2 === 1;

  return (
    <article
      id={section.id}
      className={`grid scroll-mt-28 gap-8 border-t border-[#D2CFC7] py-14 lg:grid-cols-2 lg:items-center ${
        reverse ? 'lg:[&>figure]:order-first' : ''
      }`}
    >
      <div className="max-w-xl">
        <p className="eyebrow">{section.eyebrow}</p>
        <h3 className="mt-3 text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-[1.06] tracking-[-0.04em] text-[#151714]">
          {section.title}
        </h3>
        <p className="mt-4 text-base leading-7 text-[#4F534E]">{section.description}</p>
      </div>
      <AppFrame src={section.image} alt={section.alt} />
    </article>
  );
}

function ProductSections() {
  return (
    <section id="product" className="mt-16 scroll-mt-28 pt-2 sm:mt-20" aria-labelledby="product-heading">
      <SectionIntro
        eyebrow="Product"
        titleId="product-heading"
        title="A focused workspace for serious strength training."
        copy="Everything here supports the same loop: plan the work, log what happened, and use real training history to decide what comes next."
      />
      <div className="mt-8">
        {productSections.map((section, index) => (
          <ProductSection key={section.id} section={section} index={index} />
        ))}
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="border-t border-[#D2CFC7] py-14 sm:py-16" aria-labelledby="trust-heading">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="eyebrow">Technology and Privacy</p>
          <h2 id="trust-heading" className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#151714] sm:text-4xl">
            Built as a private training workspace.
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <article>
            <h3 className="text-base font-semibold text-[#151714]">Secure accounts</h3>
            <p className="mt-2 text-sm leading-6 text-[#4F534E]">JWT-protected app routes keep training data tied to the authenticated user.</p>
          </article>
          <article>
            <h3 className="text-base font-semibold text-[#151714]">Cloud persistence</h3>
            <p className="mt-2 text-sm leading-6 text-[#4F534E]">Workout, program, PR, and progress data persists through the backend API.</p>
          </article>
          <article>
            <h3 className="text-base font-semibold text-[#151714]">Controlled Coach tools</h3>
            <p className="mt-2 text-sm leading-6 text-[#4F534E]">Coach answers use allowlisted backend tools instead of unrestricted database access.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="border-t border-[#D2CFC7] py-16 sm:py-20" aria-labelledby="final-cta-heading">
      <div className="lg:flex lg:items-center lg:justify-between lg:gap-8">
        <div className="max-w-2xl">
          <h2 id="final-cta-heading" className="text-3xl font-semibold tracking-[-0.04em] text-[#151714] sm:text-4xl">
            Build your next training block.
          </h2>
          <p className="mt-4 text-base leading-7 text-[#4F534E]">
            Add your maxes, generate your first week, and keep every training decision connected to measurable progress.
          </p>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0">
          <Link to="/register" className="btn-primary">
            Start Free
          </Link>
          <Link to="/login" className="btn-secondary">
            Login
          </Link>
        </div>
      </div>
    </section>
  );
}

function Home() {
  return (
    <div className="landing-editorial">
      <div className="mx-auto w-[calc(100%-32px)] max-w-[1360px] sm:w-[calc(100%-48px)] lg:w-[calc(100%-64px)]">
        <HeroSection />
        <CapabilityStrip />
        <HowItWorksSection />
        <ProductSections />
        <TrustSection />
        <FinalCTASection />
      </div>
    </div>
  );
}

export default Home;
