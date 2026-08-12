import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const proofItems = ['Adaptive programming', 'Workout logging', 'Progress analytics', 'Built-in coach'];

const featureRows = [
  {
    number: '01',
    title: 'Know what to train next',
    description: 'Generate structured weekly strength sessions from your current training maxes.',
  },
  {
    number: '02',
    title: 'Track your progress',
    description: 'Log workouts and review training history, strength trends, and body metrics in one place.',
  },
  {
    number: '03',
    title: 'Train your way',
    description: 'Create reusable workout templates and customize the exercises for each session.',
  },
  {
    number: '04',
    title: 'Get guidance when you need it',
    description: 'Use the built-in Coach to ask questions based on your training information.',
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

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

const revealTransition = { duration: 0.32, ease: 'easeOut' };

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
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[#151714] sm:text-4xl">{title}</h2>
      {copy && <p className="mt-4 text-base leading-7 text-[#4F534E]">{copy}</p>}
    </div>
  );
}

function SmallIcon() {
  return (
    <svg className="h-5 w-5 text-[#2F4F46]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 13.5L9.2 17.5L19 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeroSection() {
  return (
    <section className="flex min-h-[calc(100vh-180px)] items-center py-16 sm:py-20 lg:py-24">
      <motion.div className="max-w-5xl" variants={fadeUp} initial="hidden" animate="visible" transition={revealTransition}>
        <p className="eyebrow">ADAPTIVE STRENGTH PROGRAMMING</p>
        <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[0.96] tracking-[-0.06em] text-[#151714] sm:text-6xl lg:text-7xl">
          Stop guessing<br className="hidden sm:block" /> what to lift next.
        </h1>
        <p className="mt-7 max-w-2xl text-base leading-7 text-[#4F534E] sm:text-lg">
          GetJackedCoach builds your strength program, tracks every workout, and adjusts your training based on your actual performance.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/register" className="btn-primary">
            Start Your Program
          </Link>
          <a href="#product" onClick={(event) => scrollToSection(event, '#product')} className="btn-secondary">
            View the Product
          </a>
        </div>
        <p className="mt-5 text-sm leading-6 text-[#747872]">Built for lifters who want progression, not just another workout log.</p>
      </motion.div>
    </section>
  );
}

function ProductProofStrip() {
  return (
    <section className="border-y border-[#D2CFC7] py-5" aria-label="Product capabilities">
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        {proofItems.map((item) => (
          <div key={item} className="flex items-center gap-3">
            <SmallIcon />
            <span className="text-sm font-medium text-[#151714]">{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-28 py-20 sm:py-24">
      <SectionIntro eyebrow="HOW IT WORKS" title="A clear path from your first lift to your next progression." />
      <div className="mt-12 divide-y divide-[#D2CFC7] border-y border-[#D2CFC7]">
        {steps.map((step) => (
          <article key={step.number} className="grid gap-4 py-6 md:grid-cols-[96px_1fr]">
            <p className="text-sm font-semibold text-[#747872]">{step.number}</p>
            <div>
              <h3 className="text-xl font-semibold tracking-[-0.025em] text-[#151714]">{step.title}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4F534E]">{step.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProductPreviewSection() {
  return (
    <section id="product" className="scroll-mt-28 py-20 sm:py-24">
      <SectionIntro
        eyebrow="THE PRODUCT"
        title="A focused workflow for training decisions."
        copy="GetJackedCoach brings programming, logging, progress, and coaching into one connected workflow."
      />
      <div className="mt-12 divide-y divide-[#D2CFC7] border-y border-[#D2CFC7]">
        {featureRows.map((row) => (
          <article key={row.title} className="grid gap-4 py-7 md:grid-cols-[110px_1fr] md:py-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#747872]">{row.number}</p>
            <div className="max-w-3xl">
              <h3 className="text-2xl font-semibold tracking-[-0.035em] text-[#151714] sm:text-3xl">{row.title}</h3>
              <p className="mt-3 text-base leading-7 text-[#4F534E]">{row.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="border-t border-[#D2CFC7] py-20 sm:py-24">
      <div className="lg:flex lg:items-center lg:justify-between lg:gap-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#151714] sm:text-4xl">Ready to stop guessing?</h2>
          <p className="mt-4 text-base leading-7 text-[#4F534E]">
            Create your account, build your program, and make every workout part of a clear progression.
          </p>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0">
          <Link to="/register" className="btn-primary">
            Start Your Program
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
      <div className="mx-auto max-w-[1180px]">
        <HeroSection />
        <ProductProofStrip />
        <HowItWorksSection />
        <ProductPreviewSection />
        <FinalCTASection />
      </div>
    </div>
  );
}

export default Home;
