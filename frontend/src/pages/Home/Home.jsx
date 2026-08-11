import { motion } from 'framer-motion';
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
    image: '/screenshots/strength-program.jpg',
    alt: 'GetJackedCoach Strength Program showing training maxes, week navigation, and a programmed workout table.',
    width: 1040,
    height: 720,
  },
  {
    title: 'Track your progress',
    description: 'Review strength charts, workout statistics, consistency metrics, and progress trends from the Analytics view.',
    image: '/screenshots/analytics.jpg',
    alt: 'GetJackedCoach Analytics page with strength progress charts, workout statistics, and consistency metrics.',
    width: 1040,
    height: 720,
  },
  {
    title: 'Train your way',
    description: 'Build reusable workout templates with your own exercises, then choose the sets, reps, and weight yourself.',
    image: '/screenshots/templates.jpg',
    alt: 'GetJackedCoach Workout Templates page showing starter templates, the template builder, and exercise organization.',
    width: 1040,
    height: 880,
  },
  {
    title: 'Get coaching that evolves with your training',
    description:
      'Receive intelligent coaching insights, plateau detection, recovery recommendations, and training observations generated from your workout history.',
    image: '/screenshots/coach.jpg',
    alt: 'GetJackedCoach Coach Insights page with plateau warnings, priority insights, and strength recommendations.',
    width: 1040,
    height: 715,
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

function ProductScreenshot({ src, alt, width = 1040, height = 720, isHero = false }) {
  return (
    <motion.figure
      className="screenshot-frame relative"
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      transition={revealTransition}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/45 to-transparent" aria-hidden="true" />
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={isHero ? 'eager' : 'lazy'}
        decoding={isHero ? 'sync' : 'async'}
        className="h-auto w-full"
      />
    </motion.figure>
  );
}

function HeroSection() {
  return (
    <section className="grid min-h-[calc(100vh-160px)] items-center gap-12 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
      <motion.div className="max-w-2xl" variants={fadeUp} initial="hidden" animate="visible" transition={revealTransition}>
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
      </motion.div>

      <ProductScreenshot
        isHero
        src="/screenshots/strength-program.jpg"
        alt="GetJackedCoach Strength Program showing current training maxes, week navigation, and a programmed Bench Press workout."
        width={1040}
        height={720}
      />
    </section>
  );
}

function ProductProofStrip() {
  return (
    <section className="border-y border-[#292d2a] py-5" aria-label="Product capabilities">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {proofItems.map((item) => (
          <div key={item} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#0f1110] px-4 py-3">
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
          <motion.article
            key={feature.title}
            className="interactive-card"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            transition={revealTransition}
          >
            <SmallIcon />
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-[#f4f4f0]">{feature.title}</h3>
            <p className="mt-3 text-sm leading-6 text-[#a5aaa6]">{feature.description}</p>
          </motion.article>
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
          <article key={step.number} className="interactive-card relative">
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
            <ProductScreenshot src={row.image} alt={row.alt} width={row.width} height={row.height} />
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
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0f1110] px-6 py-10 shadow-[0_24px_70px_rgba(0,0,0,0.26)] sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/45 to-transparent" aria-hidden="true" />
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
