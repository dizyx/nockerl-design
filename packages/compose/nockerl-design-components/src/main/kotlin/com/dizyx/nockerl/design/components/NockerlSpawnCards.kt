package com.dizyx.nockerl.design.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlColors
import com.dizyx.nockerl.design.tokens.NockerlControlShape
import com.dizyx.nockerl.design.tokens.NockerlElevation
import com.dizyx.nockerl.design.tokens.NockerlPanelShape
import com.dizyx.nockerl.design.tokens.NockerlSurface
import com.dizyx.nockerl.design.tokens.nockerlLitSurface
import com.dizyx.nockerl.design.tokens.nockerlShadow

/**
 * The **spawn cards** (WS1 #2652a): the agent-spawn surfaces as TOOL-CARD-FAMILY
 * siblings (the verdict: EXTEND the tool-card grammar, don't invent): the family
 * TILE leads, a status chip (dot + label + elapsed) trails, children stack inside.
 * The dashboard app's spawn UI is INPUT only. This is the fresh-spec'd system
 * grammar every client adopts.
 *
 * - [NockerlSpawnBlockCard], the parent spawn block: an agent-family tile
 *   (color in a FILLED tile, never bare, per law §6), title + optional subtitle,
 *   the lifecycle chip, and a children slot at the card rhythm.
 * - [NockerlSpawnChildCard], one spawned child: status dot, name, optional
 *   model badge (mono keycap), elapsed.
 *
 * Lifecycle maps to the canon ladder: RUNNING = info-cyan with the live pulse
 * (freeze via `animate = false`, for deterministic goldens), SUCCESS / ERROR = the
 * warm status slots.
 */
enum class NockerlSpawnStatus(
    /** The chip label. */
    val label: String,
) {
    /** The spawn is live: info-cyan, pulsing dot. */
    RUNNING("Running"),

    /** Completed cleanly, using `statusSuccess`. */
    SUCCESS("Done"),

    /** Failed, using `statusError`. */
    ERROR("Failed"),
    ;

    internal val dotStatus: NockerlStatusDotStatus
        get() =
            when (this) {
                RUNNING -> NockerlStatusDotStatus.INFO
                SUCCESS -> NockerlStatusDotStatus.SUCCESS
                ERROR -> NockerlStatusDotStatus.ERROR
            }

    internal fun color(colors: NockerlColors) =
        when (this) {
            RUNNING -> colors.statusInfo
            SUCCESS -> colors.statusSuccess
            ERROR -> colors.statusError
        }
}

/**
 * The parent **spawn block** card.
 *
 * @param title the spawn block's name (e.g. the task or agent group).
 * @param status the lifecycle state (drives the trailing chip).
 * @param modifier outer modifier (typically `fillMaxWidth()`).
 * @param subtitle optional supporting line (model, task id).
 * @param elapsed optional elapsed label rendered in the chip ("1m 12s").
 * @param animate `false` freezes the RUNNING pulse (deterministic goldens).
 * @param statusLabel overrides the chip's state text (default = the English
 *   [NockerlSpawnStatus.label]; 1.0 strings stance: overridable, no i18n framework).
 * @param children optional spawned-children slot (stack [NockerlSpawnChildCard]s).
 */
@Composable
fun NockerlSpawnBlockCard(
    title: String,
    status: NockerlSpawnStatus,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    elapsed: String? = null,
    animate: Boolean = true,
    statusLabel: String? = null,
    children: (@Composable ColumnScope.() -> Unit)? = null,
) {
    val colors = LocalNockerlColors.current

    NockerlSurface(
        modifier = modifier.fillMaxWidth(),
        shape = NockerlPanelShape,
        color = colors.cardSurface1,
        elevation = NockerlElevation.Level1,
        border = colors.cardHairline,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                SpawnFamilyTile()
                Spacer(modifier = Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Medium,
                        color = colors.onCard,
                    )
                    if (subtitle != null) {
                        Text(
                            text = subtitle,
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.onCardMuted,
                        )
                    }
                }
                SpawnStatusChip(status = status, elapsed = elapsed, animate = animate, label = statusLabel)
            }
            if (children != null) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    content = children,
                )
            }
        }
    }
}

/**
 * One spawned **child** row-card.
 *
 * @param name the child agent's name.
 * @param status the child's lifecycle state.
 * @param modifier outer modifier (typically `fillMaxWidth()`).
 * @param model optional model badge text (mono keycap, e.g. "small").
 * @param elapsed optional elapsed label (muted, trailing).
 * @param animate `false` freezes the RUNNING pulse (deterministic goldens).
 */
@Composable
fun NockerlSpawnChildCard(
    name: String,
    status: NockerlSpawnStatus,
    modifier: Modifier = Modifier,
    model: String? = null,
    elapsed: String? = null,
    animate: Boolean = true,
) {
    val colors = LocalNockerlColors.current

    NockerlSurface(
        modifier = modifier.fillMaxWidth(),
        shape = NockerlControlShape,
        color = colors.cardSurface2,
        elevation = NockerlElevation.Level1,
        border = colors.cardHairline,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            NockerlStatusDot(
                status = status.dotStatus,
                pulse = animate && status == NockerlSpawnStatus.RUNNING,
            )
            Text(
                text = name,
                style = MaterialTheme.typography.bodySmall,
                color = colors.onCard,
                modifier = Modifier.weight(1f, fill = false),
            )
            if (model != null) {
                NockerlBadge(text = model, tone = NockerlBadgeTone.ACCENT, mono = true)
            }
            Spacer(modifier = Modifier.weight(1f))
            if (elapsed != null) {
                Text(
                    text = elapsed,
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.onCardMuted,
                )
            }
        }
    }
}

/**
 * The spawn lifecycle **chip**: dot + label (+ elapsed), the tool-card status
 * grammar. Color never stands alone (label carries the state, law §13).
 */
@Composable
private fun SpawnStatusChip(
    status: NockerlSpawnStatus,
    elapsed: String?,
    animate: Boolean,
    label: String? = null,
) {
    val colors = LocalNockerlColors.current
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        NockerlStatusDot(
            status = status.dotStatus,
            pulse = animate && status == NockerlSpawnStatus.RUNNING,
        )
        Text(
            text = label ?: status.label,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Medium,
            color = status.color(colors),
        )
        if (elapsed != null) {
            Text(
                text = elapsed,
                style = MaterialTheme.typography.labelSmall,
                color = colors.onCardMuted,
            )
        }
    }
}

/**
 * The agent-family TILE, the spawn glyph knocked out of a filled
 * `family.agent` control-radius square (law §6: color rides a filled tile,
 * never bare; the tool-card family-tile idiom).
 */
@Composable
private fun SpawnFamilyTile() {
    val colors = LocalNockerlColors.current
    Box(
        contentAlignment = Alignment.Center,
        modifier =
            Modifier
                .size(28.dp)
                .nockerlShadow(elevation = NockerlElevation.Level1, shape = NockerlControlShape)
                .clip(NockerlControlShape)
                .background(colors.family.agent)
                .nockerlLitSurface(shape = NockerlControlShape),
    ) {
        Icon(
            imageVector = Icons.Filled.Share,
            contentDescription = null, // the title carries the name
            tint = colors.canvas,
            modifier = Modifier.size(16.dp),
        )
    }
}
