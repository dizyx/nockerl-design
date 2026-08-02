/**
 * FileUploadDemo: the live, interactive Nockerl file-upload / dropzone island.
 *
 * Composed from the established Nockerl vocabulary. The real apps ship only an
 * image-only attach affordance + dismissable thumbnail chips on Android (no
 * dropzone, size, per-file progress, drag-drop), and nothing on Voice, so the
 * dropzone + list + progress are designed ORIGINALLY from the laws + existing
 * components, and the drift is flagged on the page. The laws, verbatim:
 *
 *   • the DROPZONE is the signature surface: a recessed WELL (the NockerlTextField
 *     look: darker inset + INNER shadow, never lifted/glowing) wearing a DASHED
 *     border. It SINKS. Drag-over pulls the border + a faint wash to cyan ACCENT.
 *   • BROWSE + UPLOAD reuse the NockerlButton vocabulary (12px radius, static fill,
 *     feedback = brightness/transform/shadow). Upload = filled cyan primary; its
 *     label is var(--color-on-accent).
 *   • the per-file PROGRESS bar composes the NockerlProgressTrack primitive: a recessed
 *     well + a flat accent/tone fill whose WIDTH animates (the fill never tweens).
 *   • rows are FLAT (depth lives in the dropzone): type icon left, name + meta
 *     center, size/remove right; the progress bar spans full-width under the row.
 *   • status is NEVER color alone: success = check + "Done", error = ⚠ + text +
 *     Retry (danger token), rejected = ⚠ + reason.
 *   • focus is an OUTLINE (focus-visible cyan ring); the dropzone is focusable
 *     and Enter/Space opens browse; remove + retry are real buttons; upload
 *     status is announced via aria-live.
 *
 * TOKEN-REACTIVE: every color / font / radius / spacing / type size is a
 * var(--token) (see docs/demo-token-contract.md); literals are pure geometry
 * only. Nothing is actually uploaded; progress is simulated with timers/state.
 */
import { useEffect, useId, useRef, useState } from 'react';

import { NockerlButton, NockerlIcon, NockerlIconButton, NockerlProgressTrack, type ComposeContract } from '@dizyx/nockerl-react';

type FileStatus = 'queued' | 'uploading' | 'done' | 'error' | 'rejected';
type FileKind = 'typescript' | 'json' | 'image' | 'yaml' | 'default';

interface UploadFile {
  id: string;
  name: string;
  /** Size in bytes. */
  size: number;
  kind: FileKind;
  status: FileStatus;
  /** 0 to 100, the simulated upload progress. */
  progress: number;
  /** Reason text for error / rejected states (color is never the only signal). */
  reason?: string;
}

// File-type → its categorical color token (data ramp, NOT the brand cyan).
const KIND_COLOR: Record<FileKind, string> = {
  typescript: 'var(--color-file-type-typescript)',
  json: 'var(--color-file-type-json)',
  image: 'var(--color-file-type-image)',
  yaml: 'var(--color-file-type-yaml)',
  default: 'var(--color-file-type-default)',
};

// Recessed dropzone (the NockerlTextField well) + a ContextGauge progress track. Feedback
// animates brightness/transform/width only; the fill never swaps. All values are
// tokens; literals are pure geometry (icon sizes, dash pattern, transition curve).
const STYLES = `
.nk-up-demo { font-family: var(--font-family-sans); max-width: 460px; }
.nk-up-demo__group + .nk-up-demo__group { margin-top: var(--space-8); }
.nk-up-demo__lbl { font-size: var(--font-size-10); letter-spacing: var(--font-tracking-eyebrow); text-transform: uppercase;
  color: var(--color-on-card-muted); font-weight: var(--font-weight-semibold); margin: 0 0 var(--space-3); }

/* ── The DROPZONE is the signature recessed WELL with a DASHED border. It SINKS
   (inner shadow), never lifts; the faint top line is the catch-light, NOT a glow. */
.nk-up-zone {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: var(--space-3); text-align: center; cursor: pointer; color: var(--color-on-card);
  background: var(--color-canvas-alt); border: var(--space-0-5) dashed var(--color-outline-subtle);
  border-radius: var(--radius-control); padding: var(--space-8) var(--space-5);
  transition: border-color .14s, background-color .14s, transform .14s cubic-bezier(.2,0,0,1), box-shadow .14s;
  box-shadow: inset 0 var(--space-0-5) var(--space-1) color-mix(in srgb, var(--color-shadow-tint) 45%, transparent), inset 0 var(--space-px) 0 var(--color-surface-highlight);
}
.nk-up-zone:hover { border-color: color-mix(in srgb, var(--color-outline-subtle) 70%, var(--color-on-card)); }
/* focus = a cyan OUTLINE ring, still inset underneath, so it never lifts. */
.nk-up-zone:focus-visible { outline: var(--space-0-5) solid var(--color-accent-primary); outline-offset: var(--space-0-5); }
/* DRAG-OVER: border + a faint wash pull to the brand ACCENT; the surface presses in (transform), never glows. */
.nk-up-zone.is-drag {
  border-color: var(--color-accent-primary); transform: scale(.992);
  background: color-mix(in srgb, var(--color-accent-primary) 10%, var(--color-canvas-alt));
  box-shadow: inset 0 var(--space-0-5) var(--space-2) color-mix(in srgb, var(--color-shadow-tint) 50%, transparent), inset 0 0 0 var(--space-px) color-mix(in srgb, var(--color-accent-primary) 35%, transparent);
}
.nk-up-zone__icon { color: var(--color-on-card-muted); display: inline-flex; transition: color .14s, transform .14s cubic-bezier(.2,0,0,1); }
.nk-up-zone.is-drag .nk-up-zone__icon { color: var(--color-accent-primary); transform: translateY(-2px); }
.nk-up-zone__icon svg { display: block; width: 30px; height: 30px; }
.nk-up-zone__title { font-size: var(--font-size-14); font-weight: var(--font-weight-medium); line-height: var(--font-line-height-20); }
.nk-up-zone__hint { font-size: var(--font-size-12); color: var(--color-on-card-muted); line-height: var(--font-line-height-16); }
.nk-up-zone__hint b { color: var(--color-accent-primary); font-weight: var(--font-weight-semibold); }

/* ── Actions row layout only; the NockerlButton/NockerlIconButton primitives own their own recipes. */
.nk-up-actions { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-top: var(--space-4); }
.nk-up-actions__right { display: inline-flex; gap: var(--space-2); }
.nk-up-summary { font-size: var(--font-size-12); color: var(--color-on-card-muted); }
.nk-up-summary b { color: var(--color-accent-primary); }

/* ── The file LIST: flat rows (depth lives in the dropzone). icon left · text
   center · size/remove right · full-width progress under the row. ─────────────── */
.nk-up-list { list-style: none; margin: var(--space-4) 0 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.nk-up-row {
  display: grid; grid-template-columns: auto 1fr auto; align-items: center;
  column-gap: var(--space-3); row-gap: var(--space-2); padding: var(--space-3);
  background: var(--color-card-surface1); border: var(--space-px) solid var(--color-card-hairline); border-radius: var(--radius-control);
}
.nk-up-row.is-rejected { border-color: color-mix(in srgb, var(--color-status-error) 45%, var(--color-card-hairline)); }
/* type icon: a tinted chip, color from the file-type data ramp (never brand cyan) */
.nk-up-row__icon {
  flex: 0 0 auto; width: var(--space-8); height: var(--space-8); border-radius: var(--radius-control);
  display: inline-flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, currentColor 16%, transparent); border: var(--space-px) solid color-mix(in srgb, currentColor 30%, transparent);
}
.nk-up-row__icon svg { display: block; width: 16px; height: 16px; }
.nk-up-row__text { min-width: 0; display: flex; flex-direction: column; gap: var(--space-0-5); }
.nk-up-row__name { font-size: var(--font-size-12); font-weight: var(--font-weight-medium); color: var(--color-on-card);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: var(--font-line-height-16); }
.nk-up-row__meta { display: inline-flex; align-items: center; gap: var(--space-1); font-size: var(--font-size-10);
  line-height: var(--font-line-height-14); color: var(--color-on-card-muted); }
.nk-up-row__meta svg { display: block; width: 12px; height: 12px; }
.nk-up-row__meta.is-done { color: var(--color-status-success); }
.nk-up-row__meta.is-error { color: var(--color-status-error); }
.nk-up-row__right { display: inline-flex; align-items: center; gap: var(--space-2); justify-self: end; }
.nk-up-row__size { font-size: var(--font-size-10); color: var(--color-on-card-muted); font-family: var(--font-family-mono); white-space: nowrap; }
/* remove / retry are the NockerlIconButton primitive (variant="plain"); it owns its own recipe. */
/* the progress row spans all three columns, full-width under the row. The bar itself
   composes the NockerlProgressTrack primitive (it owns the recessed well + flat accent/tone fill
   whose WIDTH animates + the progressbar a11y); this wrapper only spans the grid. */
.nk-up-row__bar { grid-column: 1 / -1; }

/* ── Empty state: a flatter line inside the (separate) empty group. ──────────── */
.nk-up-empty { margin-top: var(--space-4); padding: var(--space-4); text-align: center;
  font-size: var(--font-size-12); color: var(--color-on-card-muted);
  border: var(--space-px) dashed var(--color-card-hairline); border-radius: var(--radius-control); }

.nk-up-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

@media (prefers-reduced-motion: reduce) {
  .nk-up-zone, .nk-up-zone__icon { transition: none; }
}
`;

// ─── Inline glyphs (stroke icons on currentColor, so each slot tints correctly) ──
const IconUpload = <NockerlIcon><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 9l5-5 5 5" /><path d="M12 4v12" /></NockerlIcon>;
const IconClose = <NockerlIcon path="M18 6 6 18M6 6l12 12" />;
const IconRetry = <NockerlIcon><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></NockerlIcon>;
const IconCheck = <NockerlIcon path="M20 6 9 17l-5-5" />;
const IconWarn = <NockerlIcon><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></NockerlIcon>;
const IconFile = <NockerlIcon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></NockerlIcon>;
const IconImage = <NockerlIcon><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="1.6" /><path d="m21 15-5-5L5 21" /></NockerlIcon>;
const IconBraces = <NockerlIcon><path d="M8 3a2 2 0 0 0-2 2v3a2 2 0 0 1-2 2 2 2 0 0 1 2 2v3a2 2 0 0 0 2 2" /><path d="M16 3a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2 2 2 0 0 0-2 2v3a2 2 0 0 1-2 2" /></NockerlIcon>;
const KIND_ICON: Record<FileKind, React.ReactNode> = {
  typescript: IconFile,
  json: IconBraces,
  image: IconImage,
  yaml: IconFile,
  default: IconFile,
};

/** Human-readable byte size (KB / MB), the meta the row shows on the right. */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// The simulated files a "browse" / "drop" produces: the happy path uploads,
// plus one over-size rejection so the rejected treatment is always visible.
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB cap; over this is rejected
let seq = 0;
function makeFiles(): UploadFile[] {
  const base: Array<Omit<UploadFile, 'id' | 'status' | 'progress'>> = [
    { name: 'session-state.ts', size: 18_204, kind: 'typescript' },
    { name: 'tokens.json', size: 6_540, kind: 'json' },
    { name: 'facet-bg.png', size: 1_488_000, kind: 'image' },
  ];
  return base.map((f) => ({
    ...f,
    id: `f${++seq}`,
    status: 'queued' as FileStatus,
    progress: 0,
  }));
}
function makeRejected(): UploadFile {
  return {
    id: `f${++seq}`,
    name: 'cluster-dump.bin',
    size: 42_300_000,
    kind: 'default',
    status: 'rejected',
    progress: 0,
    reason: `Too large: ${formatSize(42_300_000)} (max ${formatSize(MAX_BYTES)})`,
  };
}

/** One file row: type icon · name + meta · size + remove/retry · progress bar. */
function FileRow({
  file,
  onRemove,
  onRetry,
}: {
  file: UploadFile;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const uploading = file.status === 'uploading';
  const done = file.status === 'done';
  const errored = file.status === 'error' || file.status === 'rejected';
  const showBar = uploading || done || file.status === 'error';

  return (
    <li className={`nk-up-row${file.status === 'rejected' ? ' is-rejected' : ''}`}>
      <span className="nk-up-row__icon" style={{ color: KIND_COLOR[file.kind] }} aria-hidden="true">
        {KIND_ICON[file.kind]}
      </span>

      <span className="nk-up-row__text">
        <span className="nk-up-row__name" title={file.name}>
          {file.name}
        </span>
        {uploading && <span className="nk-up-row__meta">Uploading… {file.progress}%</span>}
        {done && (
          <span className="nk-up-row__meta is-done">
            {IconCheck} Done
          </span>
        )}
        {errored && (
          <span className="nk-up-row__meta is-error">
            {IconWarn} {file.reason ?? 'Upload failed'}
          </span>
        )}
        {file.status === 'queued' && <span className="nk-up-row__meta">Ready to upload</span>}
      </span>

      <span className="nk-up-row__right">
        <span className="nk-up-row__size">{formatSize(file.size)}</span>
        {file.status === 'error' && (
          <NockerlIconButton icon={IconRetry} label={`Retry uploading ${file.name}`} variant="plain" size={28} onClick={() => onRetry(file.id)} />
        )}
        <NockerlIconButton icon={IconClose} label={`Remove ${file.name}`} variant="plain" size={28} onClick={() => onRemove(file.id)} />
      </span>

      {showBar && (
        <span className="nk-up-row__bar">
          <NockerlProgressTrack
            value={file.progress}
            size="thick"
            tone={done ? 'success' : file.status === 'error' ? 'error' : 'accent'}
            role="progressbar"
            aria-label={`Upload progress for ${file.name}`}
            aria-valuenow={file.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </span>
      )}
    </li>
  );
}

// Data composite: the file list is state-driven (rendered internally), not slots. Browse/Upload/remove/retry are NockerlButton/NockerlIconButton primitives, and the per-file progress bar composes the NockerlProgressTrack primitive (it owns the role="progressbar" track, the same primitive ProgressBarDemo composes for its bar), so no owns. (The dropzone [role=button] is a legit drag-drop affordance.)
export const compose = { tier: 'leaf' } satisfies ComposeContract;

/**
 * The interactive showcase mounted on the File upload page: a focusable recessed
 * dropzone (Enter/Space or the Browse button adds simulated files; a toggle
 * forces the cyan drag-over highlight), a per-file list with type icon + name +
 * formatted size + remove, a Simulate upload button that advances each file's
 * progress to complete (with one file failing so the error + Retry treatment
 * shows), an over-size rejected file, and a separate empty-state group. Nothing
 * is actually uploaded; the progress is timer-driven state.
 */
export default function FileUploadDemo() {
  const [files, setFiles] = useState<UploadFile[]>(() => [...makeFiles(), makeRejected()]);
  const [dragForced, setDragForced] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState('');
  const timers = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const liveId = useId();

  // Clear any running interval timers when the island unmounts.
  useEffect(() => {
    const running = timers.current;
    return () => {
      Object.values(running).forEach(clearInterval);
    };
  }, []);

  function addFiles() {
    const next = makeFiles();
    setFiles((prev) => [...prev.filter((f) => f.status !== 'rejected'), ...next, makeRejected()]);
    setStatus(`${next.length} files added, ready to upload.`);
  }

  function removeFile(id: string) {
    const t = timers.current[id];
    if (t) {
      clearInterval(t);
      delete timers.current[id];
    }
    setFiles((prev) => {
      const gone = prev.find((f) => f.id === id);
      if (gone) setStatus(`Removed ${gone.name}.`);
      return prev.filter((f) => f.id !== id);
    });
  }

  // Simulated upload: advance progress on an interval. One file (the .png) is
  // forced to FAIL near the end so the error + Retry path is always demonstrated.
  function runUpload(id: string) {
    const existing = timers.current[id];
    if (existing) clearInterval(existing);
    // Drop any prior error reason when (re)starting, then mark uploading.
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const { reason: _drop, ...rest } = f;
        return { ...rest, status: 'uploading', progress: 0 };
      }),
    );
    timers.current[id] = setInterval(() => {
      setFiles((prev) =>
        prev.map((f) => {
          if (f.id !== id || f.status !== 'uploading') return f;
          const willFail = f.kind === 'image';
          const step = 8 + Math.round(Math.random() * 12);
          const nextPct = Math.min(100, f.progress + step);
          if (willFail && nextPct >= 80) {
            clearInterval(timers.current[id]);
            delete timers.current[id];
            setStatus(`${f.name} failed to upload.`);
            return { ...f, status: 'error', progress: 80, reason: 'Upload failed: network error' };
          }
          if (nextPct >= 100) {
            clearInterval(timers.current[id]);
            delete timers.current[id];
            setStatus(`${f.name} uploaded.`);
            return { ...f, status: 'done', progress: 100 };
          }
          return { ...f, progress: nextPct };
        }),
      );
    }, 320);
  }

  function simulateAll() {
    const targets = files.filter((f) => f.status === 'queued' || f.status === 'error');
    if (targets.length === 0) {
      setStatus('Nothing to upload. Add files first.');
      return;
    }
    setStatus(`Uploading ${targets.length} files…`);
    targets.forEach((f) => runUpload(f.id));
  }

  function clearAll() {
    Object.values(timers.current).forEach(clearInterval);
    timers.current = {};
    setFiles([]);
    setStatus('Cleared all files.');
  }

  function onZoneKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      addFiles();
    }
  }

  const isDrag = dragForced || dragOver;
  const pending = files.filter((f) => f.status === 'queued' || f.status === 'error').length;
  const uploaded = files.filter((f) => f.status === 'done').length;
  const uploading = files.some((f) => f.status === 'uploading');

  return (
    <div className="nk-up-demo">
      <style>{STYLES}</style>

      <div className="nk-up-demo__group">
        <p className="nk-up-demo__lbl">Dropzone: tab to it (Enter / Space), click Browse, or toggle drag-over</p>

        {/* The dropzone is a focusable button: keyboard opens browse; real drag
            events flip the cyan highlight (no real upload happens). */}
        <div
          className={`nk-up-zone${isDrag ? ' is-drag' : ''}`}
          role="button"
          tabIndex={0}
          aria-label="Upload files. Press Enter or Space to browse, or drop files here."
          onClick={addFiles}
          onKeyDown={onZoneKey}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(); }}
        >
          <span className="nk-up-zone__icon">{IconUpload}</span>
          <span className="nk-up-zone__title">
            {isDrag ? 'Release to add files' : 'Drag files here'}
          </span>
          <span className="nk-up-zone__hint">
            or <b>browse</b> · TS, JSON, YAML, images · up to {formatSize(MAX_BYTES)} each
          </span>
          {/* The Browse NockerlButton is independently focusable; the wrapper stops the
              click bubbling so the zone's own onClick doesn't double-fire. */}
          <span onClick={(e) => e.stopPropagation()}>
            <NockerlButton text="Browse files" variant="tertiary" size="sm" onClick={addFiles} />
          </span>
        </div>

        {files.length > 0 ? (
          <>
            <ul className="nk-up-list">
              {files.map((f) => (
                <FileRow key={f.id} file={f} onRemove={removeFile} onRetry={runUpload} />
              ))}
            </ul>

            <div className="nk-up-actions">
              <span className="nk-up-summary">
                <b>{uploaded}</b> uploaded · {pending} pending
              </span>
              <span className="nk-up-actions__right">
                <NockerlButton text="Clear all" variant="destructive" size="sm" onClick={clearAll} />
                <NockerlButton
                  text={pending > 0 ? `Upload ${pending}` : 'Upload'}
                  variant="primary"
                  size="sm"
                  leadingIcon={IconUpload}
                  onClick={simulateAll}
                  disabled={pending === 0}
                  loading={uploading}
                  loadingText="Uploading…"
                />
              </span>
            </div>
          </>
        ) : (
          <p className="nk-up-empty">No files selected yet. Drop files above or click Browse.</p>
        )}
      </div>

      <div className="nk-up-demo__group">
        <p className="nk-up-demo__lbl">Drag-over highlight: force the active state</p>
        <NockerlButton
          text={dragForced ? 'Drag-over: ON' : 'Drag-over: OFF'}
          variant={dragForced ? 'primary' : 'tertiary'}
          size="sm"
          ariaLabel={`Toggle forced drag-over highlight (currently ${dragForced ? 'on' : 'off'})`}
          onClick={() => setDragForced((v) => !v)}
        />
      </div>

      {/* aria-live so screen readers hear add / upload / error / remove. */}
      <p id={liveId} className="nk-up-sr" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
