package com.dizyx.nockerl.design.tokens

import androidx.compose.runtime.staticCompositionLocalOf

/**
 * The two concrete Nockerl palettes ([DarkColors] / [LightColors]), the
 * [ThemeMode] selector, and the [LocalNockerlColors] CompositionLocal that
 * exposes the active one.
 *
 * This is the app's classic monochrome + cyan scheme (matching the web
 * dashboard) expressed through the redesign's semantic [NockerlColors] token
 * shape. Every color value is single-sourced from the generated token constants
 * ([NockerlDarkColors] / [NockerlLightColors] in `NockerlTokens.kt`). This file
 * only wires those constants into the semantic [NockerlColors] shape and never
 * hardcodes a `Color(0x…)` literal.
 *
 * Both palettes carry **depth**: instead of a single flat surface, the canvas
 * and the card tiers form a tonal ladder so cards sit clearly above the page and
 * the subtle redesign shadows read. On Dark the rule is: the **ground is always
 * the darkest layer** (canvas, then the faceted chat field `chatBg`), and
 * **cards stay mid-dark, one clear luminance step ABOVE the ground**. Lift comes
 * from that gap + the lit-from-above catch-light (`surfaceHighlight`) + the
 * tinted shadow, never from making cards light gray.
 * - **Dark**: a near-black canvas, a dark faceted chat-field ground, and
 *   mid-dark card tiers a clear step above it; light-gray text; **cyan**
 *   (`#0CC0DF`) accent.
 * - **Light**: a soft off-white canvas with white / near-white card tiers;
 *   dark-gray text; a slightly deeper **cyan** (`#0891B2`) accent so it holds
 *   contrast on white.
 *
 * The brand accent is **cyan everywhere**. There is no gold/amber accent,
 * surface, or decorative color. The amber [NockerlColors.statusWarning] survives
 * only as a genuine warning signal. The categorical sets (tool families, cluster
 * model types, file types, task / notification / model-badge) keep the original
 * tailwind `*-400` hues.
 *
 * @see NockerlColors
 */

/**
 * Theme mode chosen in settings and persisted by `ThemeStore`. Resolves to a
 * concrete [NockerlColors] palette ([SYSTEM] follows the OS dark-mode setting).
 */
enum class ThemeMode(
    /** Stable storage key written to DataStore. */
    val key: String,
    /** Human-readable label for the settings switcher. */
    val label: String,
) {
    /** Always the light palette. */
    LIGHT("light", "Light"),

    /** Always the dark palette. */
    DARK("dark", "Dark"),

    /** Follow the OS light/dark setting. */
    SYSTEM("system", "System"),
    ;

    companion object {
        /** The default mode when no preference has been stored. */
        val DEFAULT = SYSTEM

        /** Resolve a stored [key] back to a mode, falling back to [DEFAULT]. */
        fun fromKey(key: String?): ThemeMode = entries.find { it.key == key } ?: DEFAULT
    }
}

/**
 * Resolve a [ThemeMode] to its concrete [NockerlColors].
 *
 * @param systemInDark whether the OS is currently in dark mode (used only when
 *   this mode is [ThemeMode.SYSTEM]).
 */
fun ThemeMode.colors(systemInDark: Boolean): NockerlColors =
    when (this) {
        ThemeMode.LIGHT -> LightColors
        ThemeMode.DARK -> DarkColors
        ThemeMode.SYSTEM -> if (systemInDark) DarkColors else LightColors
    }

/**
 * CompositionLocal carrying the active [NockerlColors]. Read it anywhere with
 * `LocalNockerlColors.current`. Defaults to [DarkColors] so previews / detached
 * composables still resolve real tokens.
 */
val LocalNockerlColors =
    staticCompositionLocalOf { DarkColors }

// ─────────────────────────────────────────────────────────────────────────────
// DARK: near-black canvas, dark chat-field ground, mid-dark cards a step above
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dark palette: the classic monochrome + cyan scheme, with tonal depth. Every
 * value is sourced from [NockerlDarkColors], with no hardcoded literals.
 */
val DarkColors =
    NockerlColors(
        // Canvas / planes.
        canvas = NockerlDarkColors.canvas,
        canvasAlt = NockerlDarkColors.canvasAlt,
        chatBg = NockerlDarkColors.chatBg,
        canvasEdge = NockerlDarkColors.canvasEdge,
        onCanvas = NockerlDarkColors.onCanvas,
        onCanvasMuted = NockerlDarkColors.onCanvasMuted,
        // Card tiers: a rising mid-dark ladder above the chat-field ground.
        cardSurface1 = NockerlDarkColors.cardSurface1,
        cardSurface2 = NockerlDarkColors.cardSurface2,
        cardSurface3 = NockerlDarkColors.cardSurface3,
        onCard = NockerlDarkColors.onCard,
        onCardMuted = NockerlDarkColors.onCardMuted,
        cardHairline = NockerlDarkColors.cardHairline,
        // Chrome shell rides the same dark family (pill, input bar, tab track).
        chromeSurface = NockerlDarkColors.chromeSurface,
        surfaceTranslucencySidebar = NockerlDarkColors.surfaceTranslucencySidebar,
        chromeActive = NockerlDarkColors.chromeActive,
        onChrome = NockerlDarkColors.onChrome,
        onChromeMuted = NockerlDarkColors.onChromeMuted,
        chromeHairline = NockerlDarkColors.chromeHairline,
        // Session chip: bold brand cyan that breaks the chrome convention.
        sessionChipActive = NockerlDarkColors.sessionChipActive,
        onSessionChip = NockerlDarkColors.onSessionChip,
        sessionChipInactive = NockerlDarkColors.sessionChipInactive,
        sessionChipNew = NockerlDarkColors.sessionChipNew,
        // Alternate plane (assistant bubble / sheet base).
        cardAlt = NockerlDarkColors.cardAlt,
        cardAlt2 = NockerlDarkColors.cardAlt2,
        onCardAlt = NockerlDarkColors.onCardAlt,
        onCardAltMuted = NockerlDarkColors.onCardAltMuted,
        altHairline = NockerlDarkColors.altHairline,
        // User bubble: dark near-black with a cyan tint + near-white text.
        userCard = NockerlDarkColors.userCard,
        userCard2 = NockerlDarkColors.userCard2,
        onUserCard = NockerlDarkColors.onUserCard,
        // Accents: cyan-led, cool categorical companions (no gold).
        accentPrimary = NockerlDarkColors.accentPrimary,
        accentPrimaryHi = NockerlDarkColors.accentPrimaryHi,
        onAccent = NockerlDarkColors.onAccent,
        accentSecondary = NockerlDarkColors.accentSecondary,
        accentTertiary = NockerlDarkColors.accentTertiary,
        accentQuaternary = NockerlDarkColors.accentQuaternary,
        accentPrimarySoft = NockerlDarkColors.accentPrimarySoft,
        accentSecondarySoft = NockerlDarkColors.accentSecondarySoft,
        accentTertiarySoft = NockerlDarkColors.accentTertiarySoft,
        accentQuaternarySoft = NockerlDarkColors.accentQuaternarySoft,
        accentWarm = NockerlDarkColors.accentWarm,
        accentWarmSoft = NockerlDarkColors.accentWarmSoft,
        // Engine identity: cloud (cloud) = brand cyan, Local Engine = teal.
        engineCloud = NockerlDarkColors.engineCloud,
        engineNockerl = NockerlDarkColors.engineNockerl,
        engineCloudSoft = NockerlDarkColors.engineCloudSoft,
        engineNockerlSoft = NockerlDarkColors.engineNockerlSoft,
        // Status.
        statusSuccess = NockerlDarkColors.statusSuccess,
        statusWarning = NockerlDarkColors.statusWarning,
        statusError = NockerlDarkColors.statusError,
        statusInfo = NockerlDarkColors.statusInfo,
        // Dot states.
        dotStreaming = NockerlDarkColors.dotStreaming,
        dotAttention = NockerlDarkColors.dotAttention,
        dotUnread = NockerlDarkColors.dotUnread,
        dotIdle = NockerlDarkColors.dotIdle,
        dotActive = NockerlDarkColors.dotActive,
        // Structure.
        divider = NockerlDarkColors.divider,
        outlineSubtle = NockerlDarkColors.outlineSubtle,
        shadowTint = NockerlDarkColors.shadowTint,
        surfaceHighlight = NockerlDarkColors.surfaceHighlight,
        scrim = NockerlDarkColors.scrim,
        bezel = NockerlDarkColors.bezel,
        // Categorical sets: flattened in the generated file with a prefix.
        family =
            FamilyColors(
                shellFs = NockerlDarkColors.familyShellFs,
                agent = NockerlDarkColors.familyAgent,
                scheduling = NockerlDarkColors.familyScheduling,
                planning = NockerlDarkColors.familyPlanning,
                external = NockerlDarkColors.familyExternal,
            ),
        modelType =
            ModelTypeColors(
                gpu = NockerlDarkColors.modelTypeGpu,
                llm = NockerlDarkColors.modelTypeLlm,
                embedding = NockerlDarkColors.modelTypeEmbedding,
                vision = NockerlDarkColors.modelTypeVision,
                audio = NockerlDarkColors.modelTypeAudio,
                creative = NockerlDarkColors.modelTypeCreative,
                utility = NockerlDarkColors.modelTypeUtility,
                temperature = NockerlDarkColors.modelTypeTemperature,
            ),
        fileType =
            FileTypeColors(
                kotlin = NockerlDarkColors.fileTypeKotlin,
                typescript = NockerlDarkColors.fileTypeTypescript,
                javascript = NockerlDarkColors.fileTypeJavascript,
                json = NockerlDarkColors.fileTypeJson,
                css = NockerlDarkColors.fileTypeCss,
                html = NockerlDarkColors.fileTypeHtml,
                yaml = NockerlDarkColors.fileTypeYaml,
                shell = NockerlDarkColors.fileTypeShell,
                python = NockerlDarkColors.fileTypePython,
                rust = NockerlDarkColors.fileTypeRust,
                image = NockerlDarkColors.fileTypeImage,
                folder = NockerlDarkColors.fileTypeFolder,
                default = NockerlDarkColors.fileTypeDefault,
            ),
        task =
            TaskColors(
                statusTodo = NockerlDarkColors.taskStatusTodo,
                statusInProgress = NockerlDarkColors.taskStatusInProgress,
                statusBlocked = NockerlDarkColors.taskStatusBlocked,
                statusDone = NockerlDarkColors.taskStatusDone,
                statusCancelled = NockerlDarkColors.taskStatusCancelled,
                priorityLow = NockerlDarkColors.taskPriorityLow,
                priorityMedium = NockerlDarkColors.taskPriorityMedium,
                priorityHigh = NockerlDarkColors.taskPriorityHigh,
                priorityUrgent = NockerlDarkColors.taskPriorityUrgent,
            ),
        notif =
            NotifColors(
                sourceSystem = NockerlDarkColors.notifSourceSystem,
                sourceAgent = NockerlDarkColors.notifSourceAgent,
                sourceTask = NockerlDarkColors.notifSourceTask,
                sourceCi = NockerlDarkColors.notifSourceCi,
                sourceMention = NockerlDarkColors.notifSourceMention,
                priorityLow = NockerlDarkColors.notifPriorityLow,
                priorityNormal = NockerlDarkColors.notifPriorityNormal,
                priorityHigh = NockerlDarkColors.notifPriorityHigh,
            ),
        modelBadge =
            ModelBadgeColors(
                large = NockerlDarkColors.modelBadgeLarge,
                medium = NockerlDarkColors.modelBadgeMedium,
                small = NockerlDarkColors.modelBadgeSmall,
                local = NockerlDarkColors.modelBadgeLocal,
                other = NockerlDarkColors.modelBadgeOther,
            ),
    )

// ─────────────────────────────────────────────────────────────────────────────
// LIGHT: soft off-white canvas, white card tiers, deeper-cyan accent
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Light palette: the classic monochrome + cyan scheme, with tonal depth. Every
 * value is sourced from [NockerlLightColors], with no hardcoded literals.
 */
val LightColors =
    NockerlColors(
        // Canvas / planes.
        canvas = NockerlLightColors.canvas,
        canvasAlt = NockerlLightColors.canvasAlt,
        chatBg = NockerlLightColors.chatBg,
        canvasEdge = NockerlLightColors.canvasEdge,
        onCanvas = NockerlLightColors.onCanvas,
        onCanvasMuted = NockerlLightColors.onCanvasMuted,
        // Card tiers: white → near-white ladder with subtle elevation.
        cardSurface1 = NockerlLightColors.cardSurface1,
        cardSurface2 = NockerlLightColors.cardSurface2,
        cardSurface3 = NockerlLightColors.cardSurface3,
        onCard = NockerlLightColors.onCard,
        onCardMuted = NockerlLightColors.onCardMuted,
        cardHairline = NockerlLightColors.cardHairline,
        // Chrome shell rides the white card family (pill, input bar, tabs).
        chromeSurface = NockerlLightColors.chromeSurface,
        surfaceTranslucencySidebar = NockerlLightColors.surfaceTranslucencySidebar,
        chromeActive = NockerlLightColors.chromeActive,
        onChrome = NockerlLightColors.onChrome,
        onChromeMuted = NockerlLightColors.onChromeMuted,
        chromeHairline = NockerlLightColors.chromeHairline,
        // Session chip: deep brand cyan that breaks the chrome convention.
        sessionChipActive = NockerlLightColors.sessionChipActive,
        onSessionChip = NockerlLightColors.onSessionChip,
        sessionChipInactive = NockerlLightColors.sessionChipInactive,
        sessionChipNew = NockerlLightColors.sessionChipNew,
        // Alternate plane (assistant bubble / sheets): gentle off-white.
        cardAlt = NockerlLightColors.cardAlt,
        cardAlt2 = NockerlLightColors.cardAlt2,
        onCardAlt = NockerlLightColors.onCardAlt,
        onCardAltMuted = NockerlLightColors.onCardAltMuted,
        altHairline = NockerlLightColors.altHairline,
        // User bubble: very light cyan over white + dark text.
        userCard = NockerlLightColors.userCard,
        userCard2 = NockerlLightColors.userCard2,
        onUserCard = NockerlLightColors.onUserCard,
        // Accents: cyan-led (deeper on white), cool companions (no gold).
        accentPrimary = NockerlLightColors.accentPrimary,
        accentPrimaryHi = NockerlLightColors.accentPrimaryHi,
        onAccent = NockerlLightColors.onAccent,
        accentSecondary = NockerlLightColors.accentSecondary,
        accentTertiary = NockerlLightColors.accentTertiary,
        accentQuaternary = NockerlLightColors.accentQuaternary,
        accentPrimarySoft = NockerlLightColors.accentPrimarySoft,
        accentSecondarySoft = NockerlLightColors.accentSecondarySoft,
        accentTertiarySoft = NockerlLightColors.accentTertiarySoft,
        accentQuaternarySoft = NockerlLightColors.accentQuaternarySoft,
        accentWarm = NockerlLightColors.accentWarm,
        accentWarmSoft = NockerlLightColors.accentWarmSoft,
        // Engine identity: cloud (cloud) = brand cyan, Local Engine = teal.
        engineCloud = NockerlLightColors.engineCloud,
        engineNockerl = NockerlLightColors.engineNockerl,
        engineCloudSoft = NockerlLightColors.engineCloudSoft,
        engineNockerlSoft = NockerlLightColors.engineNockerlSoft,
        // Status (slightly deeper tones for contrast on light surfaces).
        statusSuccess = NockerlLightColors.statusSuccess,
        statusWarning = NockerlLightColors.statusWarning,
        statusError = NockerlLightColors.statusError,
        statusInfo = NockerlLightColors.statusInfo,
        // Dot states.
        dotStreaming = NockerlLightColors.dotStreaming,
        dotAttention = NockerlLightColors.dotAttention,
        dotUnread = NockerlLightColors.dotUnread,
        dotIdle = NockerlLightColors.dotIdle,
        dotActive = NockerlLightColors.dotActive,
        // Structure.
        divider = NockerlLightColors.divider,
        outlineSubtle = NockerlLightColors.outlineSubtle,
        shadowTint = NockerlLightColors.shadowTint,
        surfaceHighlight = NockerlLightColors.surfaceHighlight,
        scrim = NockerlLightColors.scrim,
        bezel = NockerlLightColors.bezel,
        // Categorical sets: flattened in the generated file with a prefix.
        family =
            FamilyColors(
                shellFs = NockerlLightColors.familyShellFs,
                agent = NockerlLightColors.familyAgent,
                scheduling = NockerlLightColors.familyScheduling,
                planning = NockerlLightColors.familyPlanning,
                external = NockerlLightColors.familyExternal,
            ),
        modelType =
            ModelTypeColors(
                gpu = NockerlLightColors.modelTypeGpu,
                llm = NockerlLightColors.modelTypeLlm,
                embedding = NockerlLightColors.modelTypeEmbedding,
                vision = NockerlLightColors.modelTypeVision,
                audio = NockerlLightColors.modelTypeAudio,
                creative = NockerlLightColors.modelTypeCreative,
                utility = NockerlLightColors.modelTypeUtility,
                temperature = NockerlLightColors.modelTypeTemperature,
            ),
        fileType =
            FileTypeColors(
                kotlin = NockerlLightColors.fileTypeKotlin,
                typescript = NockerlLightColors.fileTypeTypescript,
                javascript = NockerlLightColors.fileTypeJavascript,
                json = NockerlLightColors.fileTypeJson,
                css = NockerlLightColors.fileTypeCss,
                html = NockerlLightColors.fileTypeHtml,
                yaml = NockerlLightColors.fileTypeYaml,
                shell = NockerlLightColors.fileTypeShell,
                python = NockerlLightColors.fileTypePython,
                rust = NockerlLightColors.fileTypeRust,
                image = NockerlLightColors.fileTypeImage,
                folder = NockerlLightColors.fileTypeFolder,
                default = NockerlLightColors.fileTypeDefault,
            ),
        task =
            TaskColors(
                statusTodo = NockerlLightColors.taskStatusTodo,
                statusInProgress = NockerlLightColors.taskStatusInProgress,
                statusBlocked = NockerlLightColors.taskStatusBlocked,
                statusDone = NockerlLightColors.taskStatusDone,
                statusCancelled = NockerlLightColors.taskStatusCancelled,
                priorityLow = NockerlLightColors.taskPriorityLow,
                priorityMedium = NockerlLightColors.taskPriorityMedium,
                priorityHigh = NockerlLightColors.taskPriorityHigh,
                priorityUrgent = NockerlLightColors.taskPriorityUrgent,
            ),
        notif =
            NotifColors(
                sourceSystem = NockerlLightColors.notifSourceSystem,
                sourceAgent = NockerlLightColors.notifSourceAgent,
                sourceTask = NockerlLightColors.notifSourceTask,
                sourceCi = NockerlLightColors.notifSourceCi,
                sourceMention = NockerlLightColors.notifSourceMention,
                priorityLow = NockerlLightColors.notifPriorityLow,
                priorityNormal = NockerlLightColors.notifPriorityNormal,
                priorityHigh = NockerlLightColors.notifPriorityHigh,
            ),
        modelBadge =
            ModelBadgeColors(
                large = NockerlLightColors.modelBadgeLarge,
                medium = NockerlLightColors.modelBadgeMedium,
                small = NockerlLightColors.modelBadgeSmall,
                local = NockerlLightColors.modelBadgeLocal,
                other = NockerlLightColors.modelBadgeOther,
            ),
    )
