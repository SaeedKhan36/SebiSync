import { Link, createFileRoute } from '@tanstack/react-router'
import { SignedIn, SignedOut } from '@clerk/clerk-react'
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  FileSearch,
  FileText,
  Fingerprint,
  Gavel,
  GitBranch,
  ListChecks,
  Quote,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

export const Route = createFileRoute('/')({ component: Landing })

const serif = { fontFamily: "'Newsreader', Georgia, 'Times New Roman', serif" }

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function Landing() {
  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#1c1917] antialiased">
      <Nav />
      <Hero />
      <ProblemSection />
      <PipelineSection />
      <FeatureSection />
      <AuditSection />
      <ClosingCta />
      <Footer />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Nav                                                                */
/* ------------------------------------------------------------------ */

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e7e2da] bg-[#faf8f5]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#3730a3] text-white">
            <ScanLine className="h-4.5 w-4.5" strokeWidth={2.2} />
          </span>
          <span className="text-[17px] font-semibold tracking-tight">
            RegLens<span className="text-[#3730a3]">·AI</span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 text-sm text-[#57534e] md:flex">
          <a href="#problem" className="transition-colors hover:text-[#1c1917]">
            The problem
          </a>
          <a href="#pipeline" className="transition-colors hover:text-[#1c1917]">
            How it works
          </a>
          <a href="#features" className="transition-colors hover:text-[#1c1917]">
            Platform
          </a>
          <a href="#audit" className="transition-colors hover:text-[#1c1917]">
            Auditability
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <SignedOut>
            <Link
              to="/auth/login"
              className="hidden rounded-md px-3.5 py-2 text-sm font-medium text-[#44403c] transition-colors hover:bg-[#efeae2] sm:block"
            >
              Sign in
            </Link>
            <Link
              to="/auth/register"
              className="rounded-md bg-[#1c1917] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#3730a3]"
            >
              Get started
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              to="/dashboard"
              className="rounded-md bg-[#1c1917] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#3730a3]"
            >
              Open dashboard
            </Link>
          </SignedIn>
        </div>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* faint ruled-paper texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to bottom, transparent 31px, #efe9df 32px)',
          backgroundSize: '100% 32px',
          maskImage: 'linear-gradient(to bottom, black, transparent 85%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 85%)',
          opacity: 0.5,
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 lg:pt-28">
        <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Copy */}
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d6cfc3] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#57534e] shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3730a3]" />
              Built for the SEBI Securities Market TechSprint
            </p>

            <h1
              className="text-[44px] leading-[1.08] font-medium tracking-[-0.02em] text-[#1c1917] sm:text-[56px]"
              style={serif}
            >
              Regulatory text,
              <br />
              translated into{' '}
              <em className="text-[#3730a3] not-italic underline decoration-[#c7d2fe] decoration-[6px] underline-offset-[7px]">
                operational action
              </em>
              .
            </h1>

            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-[#57534e]">
              RegLens ingests SEBI circulars and master circulars, extracts every
              obligation with a verified citation back to the source paragraph,
              and propagates each one into live compliance checklists for the
              intermediaries it applies to — before gaps become findings.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <SignedOut>
                <Link
                  to="/auth/register"
                  className="group inline-flex items-center gap-2 rounded-md bg-[#3730a3] px-5 py-3 text-[15px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.12),0_4px_12px_rgba(55,48,163,0.25)] transition-all hover:bg-[#312e81] hover:shadow-[0_1px_2px_rgba(0,0,0,0.12),0_6px_16px_rgba(55,48,163,0.35)]"
                >
                  Start free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/auth/login"
                  className="inline-flex items-center gap-2 rounded-md border border-[#d6cfc3] bg-white px-5 py-3 text-[15px] font-medium text-[#44403c] shadow-sm transition-colors hover:border-[#a8a29e]"
                >
                  Sign in
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  to="/dashboard"
                  className="group inline-flex items-center gap-2 rounded-md bg-[#3730a3] px-5 py-3 text-[15px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.12),0_4px_12px_rgba(55,48,163,0.25)] transition-all hover:bg-[#312e81]"
                >
                  Go to your dashboard
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </SignedIn>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-2 text-[13px] text-[#78716c]">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#15803d]" />
                Citation-validated extraction
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#15803d]" />
                Human review before publishing
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#15803d]" />
                Immutable audit trail
              </span>
            </div>
          </div>

          {/* Product vignette */}
          <HeroVignette />
        </div>
      </div>
    </section>
  )
}

function HeroVignette() {
  return (
    <div className="relative hidden lg:block" aria-hidden>
      {/* Source circular excerpt */}
      <div className="relative z-10 w-[88%] rounded-lg border border-[#e7e2da] bg-white p-5 shadow-[0_1px_3px_rgba(28,25,23,0.06),0_12px_32px_-12px_rgba(28,25,23,0.14)]">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-medium tracking-wide text-[#78716c] uppercase">
          <FileText className="h-3.5 w-3.5" />
          SEBI/HO/MIRSD/MIRSD-PoD-1/P/CIR/2024
        </div>
        <p className="text-[13.5px] leading-relaxed text-[#44403c]" style={serif}>
          <span className="text-[#a8a29e]">4.2 </span>
          Stock brokers shall{' '}
          <mark className="rounded-sm bg-[#e0e7ff] px-1 py-0.5 text-[#312e81]">
            settle the funds and securities of inactive clients within three
            working days
          </mark>{' '}
          of the client account being flagged, and shall maintain records of
          such settlement…
        </p>
      </div>

      {/* connector */}
      <div className="relative z-0 ml-[44%] h-10 w-px bg-gradient-to-b from-[#c7d2fe] to-[#3730a3]" />

      {/* Extracted obligation card */}
      <div className="relative z-10 ml-[12%] w-[88%] rounded-lg border border-[#c7d2fe] bg-white p-5 shadow-[0_1px_3px_rgba(28,25,23,0.06),0_16px_40px_-12px_rgba(55,48,163,0.28)]">
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-[#3730a3] uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            Extracted obligation
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f0fdf4] px-2 py-0.5 text-[11px] font-medium text-[#15803d]">
            <CheckCircle2 className="h-3 w-3" />
            Citation verified
          </span>
        </div>
        <p className="text-[14px] leading-snug font-medium text-[#1c1917]">
          Settle funds &amp; securities of inactive clients within 3 working
          days of flagging
        </p>
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded-md border border-[#e7e2da] bg-[#faf8f5] px-2 py-1 text-[11px] font-medium text-[#57534e]">
            Stockbroker
          </span>
          <span className="rounded-md border border-[#e7e2da] bg-[#faf8f5] px-2 py-1 text-[11px] font-medium text-[#57534e]">
            Recurring · per client
          </span>
          <span className="rounded-md border border-[#fde68a] bg-[#fffbeb] px-2 py-1 text-[11px] font-medium text-[#b45309]">
            Due in 3 working days
          </span>
        </div>
        <div className="mt-4 flex items-center gap-2 border-t border-dashed border-[#e7e2da] pt-3 text-[11.5px] text-[#78716c]">
          <Quote className="h-3 w-3 shrink-0" />
          Para 4.2 — matched verbatim against source, page 7
        </div>
      </div>

      {/* checklist ripple */}
      <div className="relative z-0 mt-[-10px] ml-[24%] w-[76%] rounded-lg border border-[#e7e2da] bg-[#fdfcfa] px-5 pt-6 pb-4 shadow-sm">
        <div className="flex items-center gap-2 text-[12px] text-[#57534e]">
          <ListChecks className="h-3.5 w-3.5 shrink-0 text-[#3730a3]" />
          <span>
            Propagated to{' '}
            <strong className="font-semibold">142 checklist items</strong> across
            your client book
          </span>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Problem                                                            */
/* ------------------------------------------------------------------ */

function ProblemSection() {
  return (
    <section id="problem" className="border-y border-[#e7e2da] bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <SectionHeading
          eyebrow="Why this exists"
          title="One root problem, two daily headaches"
          lede="SEBI's regulatory framework lives as human-readable text. Compliance systems need structured, machine-actionable rules. Everything painful about compliance work sits in that gap."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <ProblemCard
            n="01"
            title="Dynamic regulatory translation"
            body="A new circular lands. Someone reads all forty pages, decides which paragraphs create obligations, for whom, by when — then updates workflows by hand. Interpretations drift between similarly situated intermediaries, and adaptation lags issuance by weeks."
          />
          <ProblemCard
            n="02"
            title="Ongoing compliance management"
            body="Existing obligations must be tracked against evidence of fulfilment, per client, per deadline, with an audit trail a regulator will accept. Done manually, it's operationally heavy and quietly leaky — especially for smaller intermediaries."
          />
        </div>

        <p
          className="mx-auto mt-14 max-w-2xl text-center text-[22px] leading-snug text-[#44403c]"
          style={serif}
        >
          RegLens closes the gap by making the translation step{' '}
          <em className="text-[#3730a3]">automatic, cited, and reviewable</em> —
          and the tracking step continuous.
        </p>
      </div>
    </section>
  )
}

function ProblemCard({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-[#e7e2da] bg-[#faf8f5] p-7">
      <div className="mb-4 text-[13px] font-semibold tracking-widest text-[#a8a29e]">
        {n}
      </div>
      <h3 className="text-[21px] font-medium text-[#1c1917]" style={serif}>
        {title}
      </h3>
      <p className="mt-3 text-[15px] leading-relaxed text-[#57534e]">{body}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Pipeline                                                           */
/* ------------------------------------------------------------------ */

const PIPELINE = [
  {
    icon: FileSearch,
    title: 'Ingest the circular',
    body: 'Upload a SEBI circular or master circular. A dedicated parsing service converts the PDF into structured sections, tables and headings — OCR kicks in automatically for scanned documents.',
  },
  {
    icon: Sparkles,
    title: 'Extract obligations',
    body: 'A multi-step agent reads each section in context and drafts discrete obligations: what must be done, by which intermediary categories, on what trigger or deadline.',
  },
  {
    icon: Fingerprint,
    title: 'Validate every citation',
    body: 'Each draft is checked against the source text. If the quoted basis for an obligation can’t be matched back to the circular verbatim, it doesn’t pass. No citation, no obligation.',
  },
  {
    icon: Gavel,
    title: 'Review and publish',
    body: 'A compliance officer reviews the extracted register — edits, rejects, approves. Nothing reaches an intermediary’s checklist without a human sign-off.',
  },
  {
    icon: GitBranch,
    title: 'Propagate and monitor',
    body: 'Published obligations fan out into per-client checklist items with due dates. A scheduled gap detector flags anything unfulfilled or expiring, ranked by severity.',
  },
]

function PipelineSection() {
  return (
    <section id="pipeline" className="mx-auto max-w-6xl px-6 py-20">
      <SectionHeading
        eyebrow="How it works"
        title="From PDF to checklist item, with receipts"
        lede="Five stages, each one inspectable. The pipeline is agentic where reading is required and deterministic where trust is required."
      />

      <ol className="mt-14 space-y-0">
        {PIPELINE.map((step, i) => (
          <li key={step.title} className="group relative flex gap-6 pb-10 last:pb-0">
            {/* rail */}
            {i < PIPELINE.length - 1 && (
              <span
                aria-hidden
                className="absolute top-11 left-[21px] h-[calc(100%-2.75rem)] w-px bg-[#e0dbd2]"
              />
            )}
            <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d6cfc3] bg-white text-[#3730a3] shadow-sm transition-colors group-hover:border-[#3730a3]">
              <step.icon className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <div className="pt-1.5">
              <div className="flex items-baseline gap-3">
                <span className="text-[12px] font-semibold text-[#a8a29e] tabular-nums">
                  0{i + 1}
                </span>
                <h3 className="text-[19px] font-medium text-[#1c1917]" style={serif}>
                  {step.title}
                </h3>
              </div>
              <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-[#57534e]">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Features                                                           */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    icon: BookOpenCheck,
    title: 'Obligation register',
    body: 'Every extracted obligation in one place — status, applicability, source citation — searchable across circulars.',
  },
  {
    icon: ListChecks,
    title: 'Live checklists',
    body: 'Obligations become per-intermediary, per-client checklist items with due dates and fulfilment status.',
  },
  {
    icon: AlertTriangle,
    title: 'Gap detection',
    body: 'A scheduled detector surfaces unfulfilled and at-risk items by severity, before they surface in an inspection.',
  },
  {
    icon: ShieldCheck,
    title: 'Evidence vault',
    body: 'Attach proof of fulfilment to any checklist item. Uploads are stored with integrity metadata for later review.',
  },
  {
    icon: Fingerprint,
    title: 'Audit trail',
    body: 'Every state change — extraction, edit, approval, resolution — is logged with actor and timestamp, per entity.',
  },
  {
    icon: GitBranch,
    title: 'Multi-entity aware',
    body: 'Organisation-scoped by design: each intermediary sees exactly its own obligations, clients and gaps.',
  },
]

function FeatureSection() {
  return (
    <section id="features" className="border-y border-[#e7e2da] bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <SectionHeading
          eyebrow="The platform"
          title="Everything a compliance team touches, in one system"
          lede="Built around the workflows of stockbrokers and investment advisers working against SEBI's master circulars."
        />

        <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-[#e7e2da] bg-[#e7e2da] sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group bg-white p-7 transition-colors hover:bg-[#faf8f5]"
            >
              <f.icon
                className="h-5.5 w-5.5 text-[#3730a3]"
                strokeWidth={1.8}
              />
              <h3 className="mt-4 text-[16.5px] font-semibold text-[#1c1917]">
                {f.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#57534e]">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Audit / trust                                                      */
/* ------------------------------------------------------------------ */

function AuditSection() {
  return (
    <section id="audit" className="mx-auto max-w-6xl px-6 py-20">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Trust, by construction"
            title="AI drafts. Humans decide. Everything is cited."
          />
          <div className="mt-6 space-y-5">
            {[
              {
                title: 'No citation, no obligation',
                body: 'An obligation that can’t be traced verbatim to a paragraph of the source circular is rejected in the pipeline — it never reaches review.',
              },
              {
                title: 'Human gate before publication',
                body: 'Extracted obligations sit in a review queue. Only what a compliance officer approves is published and propagated.',
              },
              {
                title: 'A regulator-ready record',
                body: 'The audit log answers "who did what, when, and on what basis" for every obligation, checklist item, and resolved gap.',
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#15803d]" />
                <div>
                  <h4 className="text-[15.5px] font-semibold text-[#1c1917]">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-[#57534e]">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* audit log vignette */}
        <div aria-hidden className="rounded-lg border border-[#e7e2da] bg-white p-6 shadow-[0_1px_3px_rgba(28,25,23,0.06),0_12px_32px_-12px_rgba(28,25,23,0.12)]">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-[#78716c] uppercase">
            <Fingerprint className="h-3.5 w-3.5" />
            Audit trail — Obligation OBL-2024-0417
          </div>
          <ul className="space-y-0">
            {[
              ['EXTRACTED', 'Drafted from Para 4.2 by extraction agent', '10:42:07'],
              ['CITATION_VERIFIED', 'Source text matched, page 7', '10:42:09'],
              ['EDITED', 'Deadline clarified by R. Mehta (Compliance)', '11:15:33'],
              ['PUBLISHED', 'Approved & propagated to 142 items', '11:16:02'],
              ['GAP_RESOLVED', 'Evidence accepted for Client #C-208', '4:03:11'],
            ].map(([tag, desc, time], i, arr) => (
              <li key={tag} className="relative flex gap-4 pb-5 last:pb-0">
                {i < arr.length - 1 && (
                  <span className="absolute top-4 left-[5px] h-full w-px bg-[#e7e2da]" />
                )}
                <span
                  className={`relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    i === arr.length - 1 ? 'bg-[#15803d]' : 'bg-[#3730a3]'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[11px] font-semibold tracking-wide text-[#3730a3]">
                      {tag}
                    </span>
                    <span className="font-mono text-[11px] text-[#a8a29e] tabular-nums">
                      {time}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-[#57534e]">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Closing CTA + footer                                               */
/* ------------------------------------------------------------------ */

function ClosingCta() {
  return (
    <section className="border-t border-[#e7e2da] bg-[#1c1917]">
      <div className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2
          className="mx-auto max-w-2xl text-[34px] leading-tight font-medium text-[#faf8f5] sm:text-[40px]"
          style={serif}
        >
          The next circular shouldn't take your team a week to absorb.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-[#a8a29e]">
          Upload one, watch it become a cited obligation register, and see the
          checklists write themselves.
        </p>
        <div className="mt-9 flex justify-center gap-4">
          <SignedOut>
            <Link
              to="/auth/register"
              className="group inline-flex items-center gap-2 rounded-md bg-[#faf8f5] px-6 py-3 text-[15px] font-semibold text-[#1c1917] transition-colors hover:bg-white"
            >
              Get started free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-2 rounded-md bg-[#faf8f5] px-6 py-3 text-[15px] font-semibold text-[#1c1917] transition-colors hover:bg-white"
            >
              Open your dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </SignedIn>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-[#2c2926] bg-[#1c1917]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-[13px] text-[#78716c] sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[#3730a3] text-white">
            <ScanLine className="h-3.5 w-3.5" />
          </span>
          <span className="font-medium text-[#d6d3d1]">RegLens·AI</span>
          <span>— agentic compliance for SEBI intermediaries</span>
        </div>
        <p>SEBI Securities Market TechSprint · Problem Statement 2</p>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared                                                             */
/* ------------------------------------------------------------------ */

function SectionHeading({
  eyebrow,
  title,
  lede,
  align = 'center',
}: {
  eyebrow: string
  title: string
  lede?: string
  align?: 'center' | 'left'
}) {
  const centered = align === 'center'
  return (
    <div className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className="text-[13px] font-semibold tracking-[0.14em] text-[#3730a3] uppercase">
        {eyebrow}
      </p>
      <h2
        className="mt-3 text-[32px] leading-tight font-medium tracking-[-0.01em] text-[#1c1917] sm:text-[38px]"
        style={serif}
      >
        {title}
      </h2>
      {lede && (
        <p className="mt-4 text-[16.5px] leading-relaxed text-[#57534e]">{lede}</p>
      )}
    </div>
  )
}
