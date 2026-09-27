import { useId } from 'react';
import { Badge, PageHead } from './ui';

export function PlaceholderPage({ title, subtitle, icon: Icon, heading, description }) {
  const headingId = useId();

  return (
    <div className="flex flex-col gap-7">
      <PageHead title={title} subtitle={subtitle} />
      <section
        aria-labelledby={headingId}
        className="card placeholder-surface flex min-h-[380px] flex-col items-center justify-center px-6 py-14 text-center sm:min-h-[440px] sm:px-12"
      >
        <div aria-hidden="true" className="mb-8 rounded-[28px] border border-accent/10 bg-accent/5 p-3">
          <div className="grid h-16 w-16 place-items-center rounded-2xl border border-accent/15 bg-ink-850 text-accent shadow-panel">
            <Icon size={28} strokeWidth={1.5} />
          </div>
        </div>
        <Badge>Placeholder</Badge>
        <h2 id={headingId} className="mt-4 text-2xl font-semibold tracking-tight text-mist">{heading}</h2>
        <p className="mt-3 max-w-md text-sm leading-7 text-mist-muted">{description}</p>
      </section>
    </div>
  );
}
