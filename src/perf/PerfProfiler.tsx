/**
 * Dev-only React Profiler wrapper to measure render/commit costs.
 *
 * Important:
 * - Profiler is a no-op in production here (we render children directly).
 * - We *record* commit stats and let screens emit a single summary log
 *   after interactions to avoid log spam.
 */

import React, { Profiler } from 'react';

import { perfProbe } from './probe';

export function PerfProfiler(props: {
  id: string;
  children: React.ReactNode;
}): React.ReactElement {
  if (!perfProbe.enabled) return <>{props.children}</>;

  return (
    <Profiler
      id={props.id}
      onRender={(_id, phase, actualDuration, baseDuration) => {
        // Metadata-only numeric stats.
        perfProbe.recordRenderCommit(String(props.id), phase as any, actualDuration, baseDuration);
      }}
    >
      {props.children as any}
    </Profiler>
  );
}

