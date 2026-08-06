package com.dizyx.nockerl.design.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlElevation
import com.dizyx.nockerl.design.tokens.NockerlPanelShape
import com.dizyx.nockerl.design.tokens.NockerlSurface

/**
 * The **agent-run widget** is the compact "an agent is working"
 * card, a TOOL-CARD-FAMILY SIBLING composed entirely from shipped cells (the
 * verdict: real new composition, not a new invention): the IDENTITY header
 * ([NockerlAvatar] + name + mono model badge) leads, the lifecycle chip
 * (dot + label + elapsed: the spawn/tool grammar, [NockerlSpawnStatus])
 * trails, an optional one-line detail sits under.
 *
 * Identity-led (avatar) where the spawn block is mechanism-led (family tile).
 * The two read as siblings, not twins.
 *
 * @param name the agent's display name (drives the avatar initials).
 * @param status the lifecycle state ([NockerlSpawnStatus], one shared ladder).
 * @param modifier outer modifier (typically `fillMaxWidth()`).
 * @param model optional model badge text (mono keycap, e.g. "large-4").
 * @param elapsed optional elapsed label in the chip.
 * @param detail optional one-line status detail (current step / last output).
 * @param animate `false` freezes the RUNNING pulse (deterministic goldens).
 * @param statusLabel overrides the chip's state text (default = the English
 *   [NockerlSpawnStatus.label]; 1.0 strings stance).
 */
@Composable
fun NockerlAgentWidget(
    name: String,
    status: NockerlSpawnStatus,
    modifier: Modifier = Modifier,
    model: String? = null,
    elapsed: String? = null,
    detail: String? = null,
    animate: Boolean = true,
    statusLabel: String? = null,
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
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                NockerlAvatar(name = name)
                Spacer(modifier = Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = name,
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Medium,
                            color = colors.onCard,
                        )
                        if (model != null) {
                            Spacer(modifier = Modifier.width(8.dp))
                            NockerlBadge(text = model, tone = NockerlBadgeTone.ACCENT, mono = true)
                        }
                    }
                    if (detail != null) {
                        Text(
                            text = detail,
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.onCardMuted,
                        )
                    }
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    NockerlStatusDot(
                        status = status.dotStatus,
                        pulse = animate && status == NockerlSpawnStatus.RUNNING,
                    )
                    Text(
                        text = statusLabel ?: status.label,
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
        }
    }
}
