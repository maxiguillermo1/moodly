import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
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
export function PerfProfiler(props) {
    if (!perfProbe.enabled)
        return _jsx(_Fragment, { children: props.children });
    return (_jsx(Profiler, { id: props.id, onRender: (_id, phase, actualDuration, baseDuration) => {
            // Metadata-only numeric stats.
            perfProbe.recordRenderCommit(String(props.id), phase, actualDuration, baseDuration);
        }, children: props.children }));
}
