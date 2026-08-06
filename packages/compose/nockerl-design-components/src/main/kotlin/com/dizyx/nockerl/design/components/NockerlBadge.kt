package com.dizyx.nockerl.design.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlColors
import com.dizyx.nockerl.design.tokens.NockerlPillShape

/**
 * The standardized **badge**: a PASSIVE state marker, never a control
 * (badge.mdx). Replaces the recolored M3 `Badge` + hand-rolled source pills
 * client #1 re-derives per call site. Three forms, mirroring the shipped Swift
 * `NockerlBadge`:
 * - [NockerlBadge] (count): a solid pill carrying an unread count, capped "99+".
 * - [NockerlBadgeDot]: a bare 8dp disc for unseen-but-uncounted activity.
 * - [NockerlBadge] (label): a tonal pill naming a state; soft (tone at the fixed
 *   0.15 wash + full-hue label) or solid (tone fill + contrast-picked ink).
 *
 * Tones map 1:1 onto semantic palette slots via [NockerlBadgeTone], never a raw
 * hue. Count/dot default to [NockerlBadgeTone.DANGER]: the unread hue is
 * RATIFIED danger-red. Client #1's agent-orange inbox badge conforms
 * at swap time ([NockerlBadgeTone.AGENT] stays available for categorical uses).
 *
 * Anchoring: pin to a host with a plain `Box` overlay at the call site. This
 * library deliberately ships the badge itself, not a `BadgedBox` clone.
 */
@Composable
fun NockerlBadge(
    count: Int,
    modifier: Modifier = Modifier,
    tone: NockerlBadgeTone = NockerlBadgeTone.DANGER,
    contentDescription: String? = null,
) {
    val hue = tone.color(LocalNockerlColors.current)
    val text = nockerlBadgeCountText(count)
    // Distinct local: the semantics receiver's `contentDescription` property shadows
    // the parameter inside the lambda (self-assignment trap).
    val accessibleName = contentDescription ?: text
    Box(
        modifier =
            modifier
                .semantics { this.contentDescription = accessibleName }
                .defaultMinSize(minWidth = BADGE_MIN_SIZE, minHeight = BADGE_MIN_SIZE)
                .clip(NockerlPillShape)
                .background(hue),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            color = pickOnAccent(hue),
            maxLines = 1,
            modifier = Modifier.padding(horizontal = 4.dp),
        )
    }
}

/**
 * The tonal **label pill** form names a state ("Draft", "CI").
 *
 * @param text the pill label (also the accessible name).
 * @param tone the semantic hue.
 * @param modifier outer modifier.
 * @param variant soft (default) or solid fill.
 * @param mono render the label in the monospace family for a code / file-type /
 *   version pill (web parity: `NockerlBadge mono`). The tone is unchanged; for the
 *   quiet hue-free language tag use [NockerlLanguageBadge] instead.
 */
@Composable
fun NockerlBadge(
    text: String,
    tone: NockerlBadgeTone,
    modifier: Modifier = Modifier,
    variant: NockerlBadgeVariant = NockerlBadgeVariant.SOFT,
    mono: Boolean = false,
) {
    val hue = tone.color(LocalNockerlColors.current)
    val solid = variant == NockerlBadgeVariant.SOLID
    Box(
        modifier =
            modifier
                .defaultMinSize(minHeight = BADGE_MIN_SIZE)
                .clip(NockerlPillShape)
                .background(if (solid) hue else hue.copy(alpha = BADGE_SOFT_WASH_ALPHA)),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            fontFamily = if (mono) FontFamily.Monospace else null,
            color = if (solid) pickOnAccent(hue) else hue,
            maxLines = 1,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 1.dp),
        )
    }
}

/**
 * The bare **dot** form marks unseen-but-uncounted activity.
 *
 * @param contentDescription the REQUIRED accessible name (a bare dot has no text;
 *   an unnamed dot is the a11y breach, design-laws §13).
 * @param modifier outer modifier.
 * @param tone the semantic hue (defaults to the ratified danger-red unread hue).
 */
@Composable
fun NockerlBadgeDot(
    contentDescription: String,
    modifier: Modifier = Modifier,
    tone: NockerlBadgeTone = NockerlBadgeTone.DANGER,
) {
    require(contentDescription.isNotBlank()) {
        "NockerlBadgeDot requires a non-empty accessible name: a bare dot has no text (design-laws §13)."
    }
    // Distinct local: see the count overload. The receiver property shadows the param.
    val accessibleName = contentDescription
    Box(
        modifier =
            modifier
                .semantics { this.contentDescription = accessibleName }
                .size(BADGE_DOT_SIZE)
                .clip(CircleShape)
                .background(tone.color(LocalNockerlColors.current)),
    )
}

/** The semantic tone ladder, mirroring the Swift `NockerlBadgeTone` 1:1. */
enum class NockerlBadgeTone {
    /** Brand cyan (`accentPrimary`). */
    ACCENT,

    /** Neutral role/meta label in muted card ink (react parity). */
    NEUTRAL,

    /** Status green (`statusSuccess`). */
    SUCCESS,

    /** Status amber (`statusWarning`). */
    WARNING,

    /** Status red (`statusError`). */
    DANGER,

    /** Status cyan-info (`statusInfo`). */
    INFO,

    /** Agent orange (`family.agent`), client #1's inbox-badge hue. */
    AGENT,
    ;

    /** Resolve the tone to its palette slot. */
    fun color(colors: NockerlColors): Color =
        when (this) {
            NEUTRAL -> colors.onCardMuted
            ACCENT -> colors.accentPrimary
            SUCCESS -> colors.statusSuccess
            WARNING -> colors.statusWarning
            DANGER -> colors.statusError
            INFO -> colors.statusInfo
            AGENT -> colors.family.agent
        }
}

/** Fill treatment of the label-pill form. */
enum class NockerlBadgeVariant {
    /** Tone at the fixed low-alpha wash with a full-hue label (the quiet default). */
    SOFT,

    /** Solid tone fill with a contrast-picked ink (the loud form). */
    SOLID,
}

/**
 * The **language badge**: the first-class Badge variant for code-language
 * metadata ("typescript", "kotlin") on CodeBlock / DiffViewer / Markdown hosts.
 * Deliberately QUIET and hue-free: a language is metadata, never status. Muted
 * ink on the alt-canvas wash, MONOSPACE type, pill silhouette (the Badge family
 * shape). Labels normalize through the shared [nockerlLanguageLabel] contract
 * (trim + lowercase) so every host renders the identical tag.
 *
 * @param language the raw language name (any case); blank renders nothing.
 * @param modifier outer modifier.
 */
@Composable
fun NockerlLanguageBadge(
    language: String,
    modifier: Modifier = Modifier,
) {
    val label = nockerlLanguageLabel(language) ?: return
    val colors = LocalNockerlColors.current
    Box(
        modifier =
            modifier
                .defaultMinSize(minHeight = BADGE_MIN_SIZE)
                .clip(NockerlPillShape)
                .background(colors.canvasAlt),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            fontFamily = FontFamily.Monospace,
            color = colors.onCanvasMuted,
            maxLines = 1,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 1.dp),
        )
    }
}

/**
 * The shared language-label normalization (identical on web + Swift):
 * trim + lowercase; blank in, `null` out ("TypeScript" -> "typescript").
 */
fun nockerlLanguageLabel(raw: String): String? {
    val trimmed = raw.trim().lowercase()
    return trimmed.ifEmpty { null }
}

/** Render text for a count: the raw number through 99, then the "99+" cap. */
internal fun nockerlBadgeCountText(count: Int): String = if (count > 99) "99+" else count.toString()

/** Bare-dot diameter (the ratified 8dp disc). */
private val BADGE_DOT_SIZE = 8.dp

/** Minimum count-pill square so single digits stay circular. */
private val BADGE_MIN_SIZE = 16.dp

/** The fixed tonal wash: the same 0.15 wash client #1's source pills use (law §5). */
private const val BADGE_SOFT_WASH_ALPHA = 0.15f
