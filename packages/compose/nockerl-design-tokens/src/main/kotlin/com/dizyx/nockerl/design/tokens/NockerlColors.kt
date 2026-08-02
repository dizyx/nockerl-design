package com.dizyx.nockerl.design.tokens

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color

/**
 * Semantic color token system for the Nockerl far-future redesign.
 *
 * This is the single source of truth for every color in the app. Components read
 * tokens through [LocalNockerlColors] rather than hardcoding `Color(0x...)`
 * literals, so swapping the active palette (Light / Dark) re-skins the entire UI
 * from one place.
 *
 * The token names come from the redesign's plane/elevation taxonomy. Two
 * concrete palettes are built from this shape in `NockerlPalettes.kt`: the app's
 * classic monochrome + cyan scheme as a deep [Light][LightColors] and
 * [Dark][DarkColors] pair, each carrying a tonal ladder so cards lift off the
 * canvas and the subtle shadows read.
 *
 * ## Token groups
 * - **Canvas / planes**: [canvas], [canvasAlt], [canvasEdge], [onCanvas],
 *   [onCanvasMuted]. The page background and its inset wells.
 * - **Chrome card tiers**: [cardSurface1] / [cardSurface2] / [cardSurface3]
 *   (rising elevation), with [onCard] / [onCardMuted] text and [cardHairline].
 *   These ride the active palette's canvas family so chrome (the workspace pill,
 *   tabs, input bar, FABs, tool/agent cards) stays cohesive with the page
 *   background: lifted dark-gray tiers on the dark canvas, white/near-white tiers
 *   on the light canvas.
 * - **Chrome surface**: [chromeSurface] / [chromeActive] with [onChrome] /
 *   [onChromeMuted] and [chromeHairline]. The canvas-cohesive shell for chrome
 *   that follows the page (workspace pill, input bar, tab/chip track). Rides the
 *   same card family as the canvas in both palettes.
 * - **Alternate content plane**: [cardAlt] / [cardAlt2] with [onCardAlt] /
 *   [onCardAltMuted] and [altHairline]. The alternating plane used for assistant
 *   bubbles and bottom sheets (a touch above the canvas in each palette).
 * - **User message**: [userCard] / [userCard2] gradient with [onUserCard].
 * - **Role accents**: [accentPrimary] / [accentSecondary] / [accentTertiary] /
 *   [accentQuaternary] (the multi-hue set) plus matching `*Soft` tints for
 *   chips and rails.
 * - **Status**: [statusSuccess] / [statusWarning] / [statusError] /
 *   [statusInfo].
 * - **Dot states**: [dotStreaming] / [dotAttention] / [dotUnread] / [dotIdle] /
 *   [dotActive]. The session/chip indicator dots.
 * - **Structure**: [divider], [outlineSubtle], [shadowTint], [surfaceHighlight],
 *   [scrim], [bezel].
 * - **Categorical sets**: [family] (tool families), [modelType] (cluster grid),
 *   [fileType] (file tree), [taskStatus] / [taskPriority], [notifSource] /
 *   [notifPriority], [modelBadge]. Consolidated one-off palettes.
 *
 * @see LocalNockerlColors
 * @see NockerlTheme
 */
@Immutable
data class NockerlColors(
    // ── Canvas / planes ──────────────────────────────────────────────────────
    /** Page background: the canvas cards lift off of. */
    val canvas: Color,
    /** Slightly deeper canvas for inset wells (tab tracks, progress rails). */
    val canvasAlt: Color,
    /**
     * Base tone for the **chat-feed faceted background**: the low-poly
     * triangular field drawn behind the message list (see the chat feed
     * background). Deliberately a step OFF the
     * [canvas] (lighter on Dark, darker on Light) so the field reads as a distinct
     * ground the message cards lift off of, while staying low-contrast enough to
     * stay calm. The facets shift a few percent of luminance either side of this
     * tone; a slow diagonal tone-wave modulates them so the field is gently alive.
     */
    val chatBg: Color,
    /** Hairline between canvas zones / outline on canvas-colored chips. */
    val canvasEdge: Color,
    /** Primary text on [canvas]. */
    val onCanvas: Color,
    /** Muted/secondary text on [canvas]. */
    val onCanvasMuted: Color,
    // ── Dark card tiers (the lifted plane) ───────────────────────────────────
    /** Base card surface, tier 1 (lowest elevation). */
    val cardSurface1: Color,
    /** Raised card surface, tier 2 (nested panels inside a card). */
    val cardSurface2: Color,
    /** Highest card surface, tier 3 (most-elevated nested element). */
    val cardSurface3: Color,
    /** Primary text on the card tiers. */
    val onCard: Color,
    /** Muted/secondary text on the card tiers. */
    val onCardMuted: Color,
    /** Hairline border drawn on the card tiers. */
    val cardHairline: Color,
    // ── Chrome surface (canvas-cohesive shell) ───────────────────────────────
    /**
     * Resting surface for **chrome that follows the page canvas**: the
     * workspace/project selector pill, the input bar, the unselected tab/chip
     * track. Kept as a distinct token from the [cardSurface1] *content* plane so
     * chrome can diverge from the content cards if a palette needs it; in the
     * current Light/Dark pair it equals the resting card tier in each palette
     * (white on Light, lifted dark-gray on Dark) so chrome stays cohesive with
     * the page.
     */
    val chromeSurface: Color,
    /**
     * The sidebar / nav-rail's ONE ratified TRANSLUCENT surface (, LAW-5
     * carve-out): [chromeSurface] at a FIXED ~0.88 translucency (never a slider)
     * so the [NockerlFacetedBackground] whispers through. The SOLE sanctioned
     * translucency surface. One-translucent-layer-max still holds (the facet is
     * the opaque ground; this is the single translucent layer above it).
     */
    val surfaceTranslucencySidebar: Color,
    /**
     * Active/selected chrome surface: the lifted tone behind a selected tab,
     * the active session chip, and any "pressed-in" chrome affordance. A touch
     * different from [chromeSurface] so selection reads, reinforced by an accent
     * border/underline + accent text.
     */
    val chromeActive: Color,
    /** Primary text on the chrome surfaces (light on Dark, dark on Light). */
    val onChrome: Color,
    /** Muted/secondary text + idle icons on the chrome surfaces. */
    val onChromeMuted: Color,
    /** Hairline border drawn on the chrome surfaces. */
    val chromeHairline: Color,
    // ── Session chip (pill: breaks chrome convention) ───────────────────────
    /**
     * Filled cyan background for the **active** session chip in the chips bar.
     * A deliberate break from the neutral [chromeActive] convention so session
     * chips read as a distinct interactive surface ("you click these to switch
     * sessions") rather than blending with the other chrome.
     *
     * Inactive chips render this same color at a low alpha (see
     * `INACTIVE_SESSION_CHIP_ALPHA` in `SessionChipsBar`) so the whole row
     * still reads as a chip strip while the active one dominates.
     *
     * - Dark: brand cyan ([BrandCyan]), bright enough that near-black text
     *   on top reads.
     * - Light: deep cyan ([BrandCyanOnLight]), dark enough that white text
     *   on top reads.
     */
    val sessionChipActive: Color,
    /**
     * Inverted text + icon color rendered on top of the **solid**
     * [sessionChipActive] pill. White on Light, near-black on Dark. Inactive
     * chips reuse this color (slightly muted via alpha at the call site) so
     * the whole row carries the same foreground treatment.
     */
    val onSessionChip: Color,
    /**
     * Solid fill for **inactive** session chips. A step lighter than
     * [sessionChipActive] on Light, a step darker on Dark. The gap is the
     * visual "this is selected vs not" signal once the matching cyan border
     * lands on top. Kept SOLID (no transparency) so chips always read as
     * floating opaque pills above the canvas, not translucent ghosts.
     */
    val sessionChipInactive: Color,
    /**
     * Solid neutral fill for the trailing "+ New" action chip. Deliberately
     * NOT cyan: the "+ New" affordance is an action, not a session, so it
     * gets its own neutral pill treatment so the eye doesn't confuse it with
     * the cyan session chips.
     */
    val sessionChipNew: Color,
    // ── Light / alternate plane ──────────────────────────────────────────────
    /** Alternate-plane card (deliberate dark-on-light / light-on-dark flip). */
    val cardAlt: Color,
    /** Raised tier within the alternate plane. */
    val cardAlt2: Color,
    /** Primary text on the alternate plane. */
    val onCardAlt: Color,
    /** Muted/secondary text on the alternate plane. */
    val onCardAltMuted: Color,
    /** Hairline border on the alternate plane. */
    val altHairline: Color,
    // ── User message ─────────────────────────────────────────────────────────
    /** User bubble base color (jewel accent). */
    val userCard: Color,
    /** User bubble gradient end (lighter than [userCard]). */
    val userCard2: Color,
    /** Text on the user bubble. */
    val onUserCard: Color,
    // ── Role accents (multi-hue) ─────────────────────────────────────────────
    /** Primary accent: the headline role color (was the lone "cyan"). */
    val accentPrimary: Color,
    /** Brighter top stop for the static accent gradient (lit-from-above fills). */
    val accentPrimaryHi: Color,
    /** Ink guaranteed readable ON a solid [accentPrimary] fill. */
    val onAccent: Color,
    /** Secondary accent. */
    val accentSecondary: Color,
    /** Tertiary accent. */
    val accentTertiary: Color,
    /** Quaternary accent. */
    val accentQuaternary: Color,
    /** Low-alpha [accentPrimary] tint for chip/rail backgrounds. */
    val accentPrimarySoft: Color,
    /** Low-alpha [accentSecondary] tint. */
    val accentSecondarySoft: Color,
    /** Low-alpha [accentTertiary] tint. */
    val accentTertiarySoft: Color,
    /** Low-alpha [accentQuaternary] tint. */
    val accentQuaternarySoft: Color,
    /** The ONE sanctioned warm accent: orange (ADR-0009); decorative, rare, never status. */
    val accentWarm: Color,
    /** Low-alpha [accentWarm] tint (the notice wash). */
    val accentWarmSoft: Color,
    // ── Engine / harness identity ────────────────────────────────────────────
    /**
     * Harness-identity accent for **Cloud Agent ("cloud")** sessions. Drives the
     * chrome that follows the active session (send/mic, context bar) and the
     * session-pill edge for a cloud session. Set to the brand cyan
     * [accentPrimary] so cloud sessions use the single brand accent like the
     * rest of the app; [engineNockerl] stays a distinct teal so the two
     * harnesses are still legible at a glance.
     */
    val engineCloud: Color,
    /**
     * Harness-identity accent for **Local Engine** sessions (the local/OpenRouter
     * harness). A teal/green hue, distinct from the cyan [engineCloud] so
     * cloud-vs-local is legible at a glance.
     */
    val engineNockerl: Color,
    /** Cloud Agent engine wash (16%): engine-tinted chips/tiles. */
    val engineCloudSoft: Color,
    /** Local Engine engine wash (16%): engine-tinted chips/tiles. */
    val engineNockerlSoft: Color,
    // ── Status ───────────────────────────────────────────────────────────────
    /** Success / healthy / done. */
    val statusSuccess: Color,
    /** Warning / pending / needs-attention-soon. */
    val statusWarning: Color,
    /** Error / failure / destructive. */
    val statusError: Color,
    /** Informational / neutral highlight. */
    val statusInfo: Color,
    // ── Dot states (session & chip indicators) ───────────────────────────────
    /** Actively streaming (pulsing). */
    val dotStreaming: Color,
    /** Needs attention (pending approval / question). */
    val dotAttention: Color,
    /** Finished, unread by the user. */
    val dotUnread: Color,
    /** Idle / disconnected. */
    val dotIdle: Color,
    /** Active / currently-viewed. */
    val dotActive: Color,
    // ── Structure ────────────────────────────────────────────────────────────
    /** Standard divider line. */
    val divider: Color,
    /** Subtle outline for inputs / chips. */
    val outlineSubtle: Color,
    /**
     * Opaque RGB used to tint drop shadows (the alpha is applied per-shadow by
     * [nockerlShadow], the single canonical depth helper). A faintly
     * palette-warm/cool tint, never neutral black. This is what makes the depth
     * read as "expertly lit" rather than heavy.
     */
    val shadowTint: Color,
    /**
     * The **"lit from above" top-edge highlight**, the companion to
     * [shadowTint]. A faint, slightly-translucent light drawn as a ~1px line on a
     * surface's TOP edge: shadow below ([nockerlShadow]) + this highlight above =
     * a surface that reads as lit by a single overhead light, the un-flat,
     * un-generic version of depth (no glow, no glass). Applied by the canonical
     * [Modifier.nockerlLitSurface] helper and folded into [NockerlSurface] /
     * [NockerlCard] so the whole app catches the same light. The alpha is baked
     * into the token (unlike [shadowTint]) because the highlight is always drawn
     * at full strength as a single hairline. A near-white on Dark; a softer white
     * on Light (kept subtle so it never blows out the near-white card tiers).
     *
     * Ratified as a direction in Design Review #1 ("one light source, from
     * above … make it a token beside `nockerlShadow`"). The exact alpha is
     * derived. See the palette definitions for the FLAGGED rationale.
     */
    val surfaceHighlight: Color,
    /** Modal scrim behind bottom sheets / dialogs. */
    val scrim: Color,
    /** Deepest frame color (device bezel / darkest inset). */
    val bezel: Color,
    // ── Categorical sets ─────────────────────────────────────────────────────
    /** Tool-family accents (shell-fs / agent / scheduling / planning / external). */
    val family: FamilyColors,
    /** Cluster grid model-type accents. */
    val modelType: ModelTypeColors,
    /** File-tree file-type accents. */
    val fileType: FileTypeColors,
    /** Task status + priority accents. */
    val task: TaskColors,
    /** Notification source + priority accents. */
    val notif: NotifColors,
    /** Model-badge tier accents (Large / Medium / Small / local / other). */
    val modelBadge: ModelBadgeColors,
)

/**
 * Tool-family accent colors. Every the agent SDK tool belongs to one of five
 * families; the family drives the accent on inline tool pills, expanded tool
 * card headers, and the sub-agent (Job) surface. Mirrors the web frontend's
 * `tool-families.ts`.
 *
 * @property shellFs Read / Edit / Write / Bash / Glob / Grep / ls.
 * @property agent Task/Job / Skill / Worktree / Team*.
 * @property scheduling ScheduleWakeup / Cron* / Monitor / TaskOutput.
 * @property planning EnterPlanMode / ExitPlanMode / TodoWrite.
 * @property external WebFetch / WebSearch / AskUserQuestion / ...
 */
@Immutable
data class FamilyColors(
    val shellFs: Color,
    val agent: Color,
    val scheduling: Color,
    val planning: Color,
    val external: Color,
)

/**
 * Cluster-panel model-type accents. A dense node+model grid reads as a cohesive
 * mosaic instead of a wall of identical chips. Mirrors the web frontend's
 * `ClusterStatusPanel.tsx`.
 *
 * @property gpu GPU / hardware rows.
 * @property llm Large language models.
 * @property embedding Embedding models.
 * @property vision Vision / image models.
 * @property audio Audio / speech models.
 * @property creative Creative / generative models.
 * @property utility Utility / misc model types.
 * @property temperature Board-temperature / sensor rows.
 */
@Immutable
data class ModelTypeColors(
    val gpu: Color,
    val llm: Color,
    val embedding: Color,
    val vision: Color,
    val audio: Color,
    val creative: Color,
    val utility: Color,
    val temperature: Color,
)

/**
 * File-tree file-type accents, keyed by extension family. Consolidates the
 * scattered one-off file-icon colors onto the palette accents.
 *
 * @property kotlin `.kt`, `.kts`.
 * @property typescript `.ts`, `.tsx`.
 * @property javascript `.js`, `.jsx`, `.mjs`.
 * @property json `.json`.
 * @property css `.css`, `.scss`.
 * @property html `.html`, `.xml`.
 * @property yaml `.yml`, `.yaml`, `.toml`.
 * @property shell `.sh`, `.bash`, `.zsh`.
 * @property python `.py`.
 * @property rust `.rs`.
 * @property image image assets.
 * @property folder directories.
 * @property default anything unmatched.
 */
@Immutable
data class FileTypeColors(
    val kotlin: Color,
    val typescript: Color,
    val javascript: Color,
    val json: Color,
    val css: Color,
    val html: Color,
    val yaml: Color,
    val shell: Color,
    val python: Color,
    val rust: Color,
    val image: Color,
    val folder: Color,
    val default: Color,
)

/**
 * Task status + priority accents for the Tasks tab.
 *
 * @property statusTodo Not started.
 * @property statusInProgress Active.
 * @property statusBlocked Blocked / waiting.
 * @property statusDone Completed.
 * @property statusCancelled Cancelled / won't do.
 * @property priorityLow Low priority.
 * @property priorityMedium Medium priority.
 * @property priorityHigh High priority.
 * @property priorityUrgent Urgent / critical.
 */
@Immutable
data class TaskColors(
    val statusTodo: Color,
    val statusInProgress: Color,
    val statusBlocked: Color,
    val statusDone: Color,
    val statusCancelled: Color,
    val priorityLow: Color,
    val priorityMedium: Color,
    val priorityHigh: Color,
    val priorityUrgent: Color,
)

/**
 * Notification source + priority accents for the inbox.
 *
 * @property sourceSystem Platform/system notifications.
 * @property sourceAgent Agent / session activity.
 * @property sourceTask Task updates.
 * @property sourceCi CI / deployment.
 * @property sourceMention Direct mentions / approvals.
 * @property priorityLow Low priority.
 * @property priorityNormal Normal priority.
 * @property priorityHigh High priority.
 */
@Immutable
data class NotifColors(
    val sourceSystem: Color,
    val sourceAgent: Color,
    val sourceTask: Color,
    val sourceCi: Color,
    val sourceMention: Color,
    val priorityLow: Color,
    val priorityNormal: Color,
    val priorityHigh: Color,
)

/**
 * Model-badge tier accents (the little `LARGE` / `MEDIUM` / `SMALL` chips).
 *
 * @property large Large-tier models.
 * @property medium Medium-tier models.
 * @property small Small-tier models.
 * @property local Local models.
 * @property other Any other / unknown model.
 */
@Immutable
data class ModelBadgeColors(
    val large: Color,
    val medium: Color,
    val small: Color,
    val local: Color,
    val other: Color,
)
