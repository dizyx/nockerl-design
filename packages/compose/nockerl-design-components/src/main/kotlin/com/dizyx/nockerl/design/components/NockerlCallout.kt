package com.dizyx.nockerl.design.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlCardShape
import com.dizyx.nockerl.design.tokens.NockerlColors
import com.dizyx.nockerl.design.tokens.NockerlControlShape
import com.dizyx.nockerl.design.tokens.NockerlPanelShape
import com.dizyx.nockerl.design.tokens.nockerlLitSurface
import com.dizyx.nockerl.design.tokens.nockerlRecessedSurface

/**
 * The **callout**: the persistent in-content aside (callout.mdx). The INVERSE
 * of the banner: a RECESSED `canvasAlt` well ("fields sink", design-laws §2)
 * with an inner top shade ([nockerlRecessedSurface]) instead of a drop shadow,
 * led by the [NockerlStatusDisc] coin and an uppercase eyebrow (the sanctioned
 * overline exception to the uppercase-is-for-buttons rule, law §11).
 *
 * Two special tones:
 * - [NockerlCalloutTone.IMPORTANT], the nested-hairline-frames treatment (law
 *   §6's "dimensional box-in-a-box"): three concentric intent-mixed borders
 *   (55% → 32% → 16%) stepping card → panel → control radii, the innermost a
 *   SOLID `cardSurface1` panel.
 * - [NockerlCalloutTone.QUOTE]: italic muted prose behind a faded quotemark,
 *   with an optional [cite] line.
 *
 * @param message the callout prose (plain text; compose richer bodies at the
 *   call site around this component when needed).
 * @param modifier outer modifier (callouts typically `fillMaxWidth()`).
 * @param tone the editorial tone (defaults to [NockerlCalloutTone.NOTE]).
 * @param title optional eyebrow override (defaults to the tone's own name).
 * @param showIcon render the leading disc (default true; QUOTE always renders
 *   its quotemark instead).
 * @param cite optional attribution line (QUOTE tone only).
 */
@Composable
fun NockerlCallout(
    message: String,
    modifier: Modifier = Modifier,
    tone: NockerlCalloutTone = NockerlCalloutTone.NOTE,
    title: String? = null,
    showIcon: Boolean = true,
    cite: String? = null,
) {
    if (tone == NockerlCalloutTone.IMPORTANT) {
        ImportantFrames(modifier = modifier) {
            CalloutCore(
                message = message,
                tone = tone,
                title = title,
                showIcon = showIcon,
                cite = cite,
                // Innermost frame panel: SOLID card surface, no well treatment.
                framed = true,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    } else {
        CalloutCore(
            message = message,
            tone = tone,
            title = title,
            showIcon = showIcon,
            cite = cite,
            framed = false,
            modifier = modifier,
        )
    }
}

/** The editorial tone ladder: each maps onto the canonical alert-intent hues. */
enum class NockerlCalloutTone(
    /** The default eyebrow text. */
    val eyebrow: String,
) {
    /** Neutral aside: muted eyebrow, no intent hue. */
    NOTE("Note"),

    /** Helpful guidance: success green. */
    TIP("Tip"),

    /** The ONE cyan editorial tone: nested-frames treatment. */
    IMPORTANT("Important"),

    /** Caution ahead: warning amber. */
    WARNING("Warning"),

    /** Destructive/irreversible: error red. */
    CAUTION("Caution"),

    /** Special notice: the warm accent. */
    NOTICE("Notice"),

    /** Quotation: italic prose behind a faded quotemark. */
    QUOTE("Quote"),
    ;

    /** The tone's alert intent, or `null` for the neutral tones (note/quote). */
    val intent: NockerlAlertIntent?
        get() =
            when (this) {
                NOTE, QUOTE -> null
                TIP -> NockerlAlertIntent.SUCCESS
                IMPORTANT -> NockerlAlertIntent.INFO
                WARNING -> NockerlAlertIntent.WARNING
                CAUTION -> NockerlAlertIntent.DANGER
                NOTICE -> NockerlAlertIntent.NOTICE
            }

    /** The tone hue (neutral tones fall back to the on-card ink). */
    fun color(colors: NockerlColors): Color = intent?.color(colors) ?: colors.onCard
}

/** The callout body shared by the plain well and the framed IMPORTANT form. */
@Composable
private fun CalloutCore(
    message: String,
    tone: NockerlCalloutTone,
    title: String?,
    showIcon: Boolean,
    cite: String?,
    framed: Boolean,
    modifier: Modifier = Modifier,
) {
    val colors = LocalNockerlColors.current
    val hue = tone.color(colors)
    val intent = tone.intent
    val neutral = intent == null

    val surface =
        if (framed) {
            // Innermost frame panel: solid lifted surface, control radius, no
            // border of its own (the frames carry the lines), no well shade.
            modifier
                .background(colors.cardSurface1, NockerlControlShape)
        } else {
            // The recessed well: canvasAlt + inner top shade + whispered border.
            modifier
                .nockerlRecessedSurface(shape = NockerlPanelShape)
                .background(colors.canvasAlt)
                .border(
                    width = 1.dp,
                    color = lerp(colors.cardHairline, hue, CALLOUT_BORDER_MIX),
                    shape = NockerlPanelShape,
                )
        }

    Row(
        modifier = surface.padding(horizontal = 20.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (tone == NockerlCalloutTone.QUOTE) {
            // The faded quotemark replaces the disc (canon: tone hue at 45%).
            Text(
                text = "“",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Medium, // bold caps at 500 (law §11)
                color = hue.copy(alpha = QUOTE_MARK_MIX),
            )
        } else if (showIcon && intent != null) {
            NockerlStatusDisc(intent = intent)
        }

        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = (title ?: tone.eyebrow).uppercase(),
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Medium,
                color = if (neutral) colors.onCardMuted else hue,
            )
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                fontStyle = if (tone == NockerlCalloutTone.QUOTE) FontStyle.Italic else FontStyle.Normal,
                color = if (tone == NockerlCalloutTone.QUOTE) colors.onCardMuted else colors.onCard,
            )
            if (cite != null && tone == NockerlCalloutTone.QUOTE) {
                Text(
                    text = "by $cite",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.onCardMuted,
                )
            }
        }
    }
}

/**
 * The IMPORTANT tone's nested hairline frames (law §6): three concentric
 * intent-mixed borders (55% / 32% / 16%) stepping down the radius ladder
 * (card 16 → panel 12 → control 12) with falling opacity, plus the outer
 * frame's own top catch-light. Pure geometry; the content panel sits inside.
 */
@Composable
private fun ImportantFrames(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val colors = LocalNockerlColors.current
    val hue = NockerlAlertIntent.INFO.color(colors)

    Box(
        modifier =
            modifier
                .border(1.dp, hue.copy(alpha = FRAME_OUTER_MIX), NockerlCardShape)
                .nockerlLitSurface(shape = NockerlCardShape)
                .padding(8.dp),
    ) {
        Box(
            modifier =
                Modifier
                    .border(1.dp, hue.copy(alpha = FRAME_MID_MIX), NockerlPanelShape)
                    .padding(4.dp),
        ) {
            Box(
                modifier =
                    Modifier.border(1.dp, hue.copy(alpha = FRAME_INNER_MIX), NockerlControlShape),
            ) {
                content()
            }
        }
    }
}

/** Hairline→tone border mix for the recessed well (canon 18%). */
private const val CALLOUT_BORDER_MIX = 0.18f

/** Quotemark fade (canon 45% of the tone hue). */
private const val QUOTE_MARK_MIX = 0.45f

/** Nested-frame opacities, outermost → innermost (canon 55/32/16%). */
private const val FRAME_OUTER_MIX = 0.55f
private const val FRAME_MID_MIX = 0.32f
private const val FRAME_INNER_MIX = 0.16f
