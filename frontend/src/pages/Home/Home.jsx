import { Link } from 'react-router-dom';

const proofItems = ['Adaptive programming', 'Workout logging', 'Progress analytics', 'Built-in coach'];

const features = [
  {
    title: 'Adaptive Strength Program',
    description: 'Generate structured training and update future targets using your completed workouts and performance.',
  },
  {
    title: 'Fast Workout Logging',
    description: 'Record exercises, sets, reps, and weight without turning your session into data entry.',
  },
  {
    title: 'Progress and PR Tracking',
    description: 'Review training history, personal records, and performance trends in one focused dashboard.',
  },
  {
    title: 'Coach and Templates',
    description: 'Get guidance when you need it and build reusable workouts for training outside the adaptive program.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Set up your training',
    description: 'Create your account, enter your profile information, and provide the strength data needed to build your program.',
  },
  {
    number: '02',
    title: 'Complete and log workouts',
    description: 'Follow your programmed sessions or use a custom template, then record what you actually performed.',
  },
  {
    number: '03',
    title: 'Adjust using real performance',
    description: 'Use workout history, progression data, and coaching feedback to guide what comes next.',
  },
];

const productRows = [
  {
    title: 'Know what to train next',
    description: 'Use the Strength Program to view structured sessions, prescribed work, and progression across the program.',
    screenshotLabel: 'Strength Program screenshot',
    placeholderDetail: 'Replace with a safe current screenshot of the Strength Program page.',
  },
  {
    title: 'Track what actually happened',
    description: 'Log completed work and review your training history, records, and trends from the dashboard and analytics views.',
    screenshotLabel: 'Dashboard or Analytics screenshot',
    placeholderDetail: 'Replace with a safe current screenshot of Dashboard, Progress, or Analytics.',
  },
  {
    title: 'Train your way when needed',
    description:
      'Build reusable workout templates with your own exercises and manually decide how many sets, reps, and how much weight to use.',
    screenshotLabel: 'Templates screenshot',
    placeholderDetail: 'Replace with a safe current screenshot of the Templates page.',
  },
];

const scrollToSection = (event, selector) => {
  event.preventDefault();
  const target = document.querySelector(selector);

  if (!target) {
    return;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
};

function SectionIntro({ eyebrow, title, copy }) {
  return (
    <div className="max-w-3xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[#f4f4f0] sm:text-4xl">{title}</h2>
      {copy && <p className="mt-4 text-base leading-7 text-[#a5aaa6]">{copy}</p>}
    </div>
  );
}

function SmallIcon() {
  return (
    <svg className="h-5 w-5 text-[#d6b94c]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 13.5L9.2 17.5L19 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProductPlaceholder({ label, detail, isHero = false }) {
  return (
    <figure
      className={`overflow-hidden rounded-2xl border border-[#292d2a] bg-[#101312] shadow-[0_28px_80px_rgba(0,0,0,0.3)] ${
        isHero ? 'min-h-[360px]' : 'min-h-[300px]'
      }`}
      aria-label={`${label} placeholder`}
    >
      <div className="flex items-center justify-between border-b border-[#292d2a] px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#737a75]">Product Preview</span>
        <span className="h-2 w-16 rounded-full bg-[#d6b94c]/70" aria-hidden="true" />
      </div>
      <div className="grid min-h-[inherit] place-items-center px-6 py-10 text-center">
        <div className="max-w-sm">
          <p className="text-lg font-semibold text-[#f4f4f0]">{label}</p>
          <p className="mt-3 text-sm leading-6 text-[#a5aaa6]">{detail}</p>
          <p className="mt-5 rounded-lg border border-dashed border-[#3a403b] px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-[#737a75]">
            Real screenshot needed
          </p>
        </div>
      </div>
    </figure>
  );
}

function HeroSection() {
  return (
    <section className="grid min-h-[calc(100vh-160px)] items-center gap-12 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
      <div className="max-w-2xl">
        <p className="eyebrow">ADAPTIVE STRENGTH PROGRAMMING</p>
        <h1 className="mt-5 text-5xl font-semibold tracking-[-0.055em] text-[#f4f4f0] sm:text-6xl lg:text-7xl">
          Stop guessing what to lift next.
        </h1>
        <p className="mt-6 text-base leading-7 text-[#a5aaa6] sm:text-lg">
          GetJackedCoach builds your strength program, tracks every workout, and adjusts your training based on your actual performance.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/register" className="btn-primary px-5 py-3">
            Start Your Program
          </Link>
          <a href="#product" onClick={(event) => scrollToSection(event, '#product')} className="btn-secondary px-5 py-3">
            View the Product
          </a>
        </div>
        <p className="mt-5 text-sm leading-6 text-[#737a75]">Built for lifters who want progression, not just another workout log.</p>
      </div>

      {/* TODO: Replace this placeholder with a real, non-sensitive Dashboard or Strength Program screenshot. */}
      <ProductPlaceholder
        isHero
        label="Dashboard or Strength Program screenshot"
        detail="Use a current product screenshot here once safe demo data is available."
      />
    </section>
  );
}

function ProductProofStrip() {
  return (
    <section className="border-y border-[#292d2a] py-5" aria-label="Product capabilities">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {proofItems.map((item) => (
          <div key={item} className="flex items-center gap-3 rounded-xl bg-[#0f1110] px-4 py-3">
            <SmallIcon />
            <span className="text-sm font-medium text-[#f4f4f0]">{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-28 py-20">
      <SectionIntro
        eyebrow="BUILT FOR REAL TRAINING"
        title="Everything your strength training needs in one place."
        copy="Plan, perform, review, and adjust your training without switching between disconnected tools."
      />
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {features.map((feature) => (
          <article key={feature.title} className="rounded-2xl border border-[#292d2a] bg-[#0f1110] p-6 transition hover:border-[#d6b94c]/45">
            <SmallIcon />
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-[#f4f4f0]">{feature.title}</h3>
            <p className="mt-3 text-sm leading-6 text-[#a5aaa6]">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-28 border-t border-[#292d2a] py-20">
      <SectionIntro eyebrow="HOW IT WORKS" title="A clear path from your first lift to your next progression." />
      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {steps.map((step, index) => (
          <article key={step.number} className="relative rounded-2xl border border-[#292d2a] bg-[#0f1110] p-6">
            {index < steps.length - 1 && <span className="absolute left-[calc(100%+1rem)] top-10 hidden h-px w-8 bg-[#292d2a] lg:block" aria-hidden="true" />}
            <p className="text-sm font-semibold text-[#d6b94c]">{step.number}</p>
            <h3 className="mt-6 text-xl font-semibold tracking-tight text-[#f4f4f0]">{step.title}</h3>
            <p className="mt-3 text-sm leading-6 text-[#a5aaa6]">{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProductPreviewSection() {
  return (
    <section id="product" className="scroll-mt-28 border-t border-[#292d2a] py-20">
      <SectionIntro
        eyebrow="THE PRODUCT"
        title="See your training, not a decorative mock-up."
        copy="GetJackedCoach brings programming, logging, progress, and coaching into one connected workflow."
      />
      <div className="mt-12 space-y-12">
        {productRows.map((row, index) => (
          <article key={row.title} className={`grid gap-8 lg:grid-cols-2 lg:items-center ${index % 2 === 1 ? 'lg:[&>figure]:order-2' : ''}`}>
            {/* TODO: Replace placeholder with a real screenshot using safe demo data. */}
            <ProductPlaceholder label={row.screenshotLabel} detail={row.placeholderDetail} />
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#737a75]">0{index + 1}</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[#f4f4f0] sm:text-3xl">{row.title}</h3>
              <p className="mt-4 text-base leading-7 text-[#a5aaa6]">{row.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="border-t border-[#292d2a] py-20">
      <div className="rounded-2xl border border-[#292d2a] bg-[#0f1110] px-6 py-10 sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#f4f4f0] sm:text-4xl">Ready to stop guessing?</h2>
          <p className="mt-4 text-base leading-7 text-[#a5aaa6]">
            Create your account, build your program, and make every workout part of a clear progression.
          </p>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0">
          <Link to="/register" className="btn-primary px-5 py-3">
            Start Your Program
          </Link>
          <Link to="/login" className="btn-secondary px-5 py-3">
            Login
          </Link>
        </div>
      </div>
    </section>
  );
}

function Home() {
  return (
    <div className="mx-auto max-w-[1240px]">
      <HeroSection />
      <ProductProofStrip />
      <FeaturesSection />
      <HowItWorksSection />
      <ProductPreviewSection />
      <FinalCTASection />
    </div>
  );
}

export default Home;
