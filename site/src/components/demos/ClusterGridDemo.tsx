/**
 * ClusterGridDemo: the live island for the shipped NockerlClusterGrid +
 * NockerlNodeCell (composite). The fleet wall: the 4-node compute cluster as
 * an auto-fill mosaic of node tiles, with health on the shared StatusDot ladder, mono
 * tabular metrics, sparkline trends, and memory-pressure bars toned by the ratified
 * gauge band ladder (cyan < .60 → amber < .85 → red).
 *
 * The load presets cycle a node through the whole band ladder LIVE. Watch node-3's
 * pressure bar step cyan → amber → red as the same component re-tones by threshold
 * (feedback animates the fill width; the tone is a threshold fact, not a tween).
 *
 * TOKEN-REACTIVE; demo chrome is only the preset control + counter. No backticks in
 * STYLES.
 */
import { useState } from 'react';

import { NockerlBadge, NockerlClusterGrid, NockerlNodeCell, NockerlSegmentedControl } from '@dizyx/nockerl-react';

const STYLES = `
.nk-cgd { font-family: var(--font-family-sans); }
.nk-cgd__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-canvas-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-2); }
.nk-cgd__ctl { display: flex; gap: var(--space-2); flex-wrap: wrap; align-items: center; margin-bottom: var(--space-4); }
.nk-cgd__count { font-size: var(--font-size-12); color: var(--color-on-canvas-muted); margin-top: var(--space-4); }
.nk-cgd__count b { color: var(--color-accent-primary); }
`;

// Deterministic load presets: node-3 walks the whole gauge band ladder.
type Load = 'idle' | 'busy' | 'critical';
const NODE3_MEM: Record<Load, { ratio: number; value: string }> = {
  idle: { ratio: 0.41, value: '49 / 119 GB' },
  busy: { ratio: 0.72, value: '86 / 119 GB' },
  critical: { ratio: 0.93, value: '111 / 119 GB' },
};
const GPU_TREND = [22, 31, 28, 44, 39, 58, 61, 52, 70, 66, 81, 77];
const GPU_QUIET = [8, 12, 9, 15, 11, 18, 14, 21, 17, 13, 19, 16];

/**
 * The interactive showcase mounted on the Cluster status grid page: the 4-node
 * mosaic. Cycle the load preset to walk node-3's memory bar through the gauge band
 * ladder (cyan → amber → red) live; node-4 shows the down state (health in the dot,
 * card stays neutral).
 */
export default function ClusterGridDemo() {
  const [load, setLoad] = useState<Load>('busy');
  const mem3 = NODE3_MEM[load];

  return (
    <div className="nk-cgd">
      <style>{STYLES}</style>

      <p className="nk-cgd__lbl">Load preset: node-3 walks the gauge band ladder</p>
      <div className="nk-cgd__ctl">
        <NockerlSegmentedControl
          label="Load"
          size="sm"
          segments={[
            { value: 'idle', label: 'Idle' },
            { value: 'busy', label: 'Busy' },
            { value: 'critical', label: 'Critical' },
          ]}
          value={load}
          onChange={(n) => setLoad(n as Load)}
        />
      </div>

      <NockerlClusterGrid ariaLabel="compute cluster">
        <NockerlNodeCell
          name="node-1 · GB10"
          status="success"
          statusLabel="online"
          badge="LLM · prod"
          metrics={[
            { label: 'Mem', value: '87 / 119 GB', ratio: 0.73 },
            { label: 'GPU', value: '77%', series: GPU_TREND },
          ]}
          footer={
            <>
              <NockerlBadge label="3 models" tone="neutral" variant="soft" />
              <NockerlBadge label="tensor ×2" tone="neutral" variant="soft" />
            </>
          }
        />
        <NockerlNodeCell
          name="node-2 · GB10"
          status="success"
          statusLabel="online"
          badge="LLM · sandbox"
          metrics={[
            { label: 'Mem', value: '62 / 119 GB', ratio: 0.52 },
            { label: 'GPU', value: '16%', series: GPU_QUIET },
          ]}
          footer={<NockerlBadge label="embeddings" tone="neutral" variant="soft" />}
        />
        <NockerlNodeCell
          name="node-3 · GB10"
          status={load === 'critical' ? 'warning' : 'success'}
          statusLabel={load === 'critical' ? 'degraded' : 'online'}
          badge="creative"
          metrics={[
            { label: 'Mem', value: mem3.value, ratio: mem3.ratio },
            { label: 'Jobs', value: load === 'idle' ? '0 queued' : load === 'busy' ? '2 queued' : '7 queued' },
          ]}
          footer={<NockerlBadge label="8 models" tone="neutral" variant="soft" />}
        />
        <NockerlNodeCell
          name="node-4 · GB10"
          status="error"
          statusLabel="down"
          badge="creative"
          metrics={[{ label: 'Last seen', value: '41m ago' }]}
          footer={<NockerlBadge label="unreachable" tone="danger" variant="soft" />}
        />
      </NockerlClusterGrid>

      <p className="nk-cgd__count">
        Node-3 memory <b>{mem3.value}</b>. The pressure bar re-tones by the shared thresholds (&lt;.60 cyan · &lt;.85 amber ·
        ≥.85 red). The island is live.
      </p>
    </div>
  );
}
