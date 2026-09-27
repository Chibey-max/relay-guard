// components/IntegrationStatus.tsx
/**
 * A quiet, single-line integration credit. No prize amounts or track
 * labels. Those belong in the README and the submission form, not the
 * live product UI (a real winning submission's UI has zero
 * hackathon-facing chrome). Demo/live state already has its own indicator
 * in the nav, so this doesn't repeat it. Contract/tx proof links live
 * alongside this in the footer, not duplicated here.
 */

export default function IntegrationStatus() {
  return (
    <span className="font-mono text-[10px] uppercase tracking-wider text-mist">
      Guarded by SERV Reasoning · Particle · Magic · ZeroDev, settled on Arbitrum
    </span>
  );
}
