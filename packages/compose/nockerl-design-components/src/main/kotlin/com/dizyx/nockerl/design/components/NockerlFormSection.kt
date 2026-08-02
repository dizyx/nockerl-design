package com.dizyx.nockerl.design.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlCard
import com.dizyx.nockerl.design.tokens.NockerlElevation
import com.dizyx.nockerl.design.tokens.NockerlEyebrow

/**
 * The **form section**: the RATIFIED lifted-card treatment for grouped fields
 * (r2, B8; form-layout.mdx): an uppercase eyebrow title (the sanctioned overline
 * exception, law §11) + optional description, with the fields on a [NockerlCard]
 * at the shared 12dp interior rhythm. This settles the Android flat-divider vs
 * Voice lifted-card split: the CARD wins on every platform.
 *
 * **Settings grammar.** This IS the "SettingsCard": the settings-section
 * usage of the one form-section component. Two optional slots complete it:
 * [headerAccessory] (trailing the eyebrow title, where an info tip rides) and
 * [footer] (inside the card under a hairline: hints or section actions).
 *
 * @param title the section title (rendered uppercase).
 * @param modifier outer modifier (sections are typically `fillMaxWidth()`).
 * @param description optional supporting line under the title.
 * @param elevation the wrapped [NockerlCard]'s ladder rung, letting a consumer place the
 *   section at any rung (e.g. [NockerlElevation.Level3] when it floats over other content).
 *   Default [NockerlElevation.Level2] preserves the ratified lifted-card lift.
 * @param headerAccessory optional trailing header slot (e.g. [NockerlInfoTip]).
 * @param footer optional card footer under a hairline (hint text / actions).
 * @param content the section's fields, stacked at the 12dp rhythm.
 */
@Composable
fun NockerlFormSection(
    title: String,
    modifier: Modifier = Modifier,
    description: String? = null,
    elevation: Dp = NockerlElevation.Level2,
    headerAccessory: (@Composable () -> Unit)? = null,
    footer: (@Composable ColumnScope.() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val colors = LocalNockerlColors.current

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    text = title.uppercase(),
                    // The shared §11 `eyebrow` role (v1.18.0): Outfit 500 / 12sp; ONE role
                    // across every section header (replaces labelMedium + a FontWeight.Medium
                    // override, which already rendered at the same 500).
                    style = NockerlEyebrow,
                    color = colors.onCardMuted,
                )
                if (description != null) {
                    Text(
                        text = description,
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.onCardMuted,
                    )
                }
            }
            headerAccessory?.invoke()
        }
        NockerlCard(modifier = Modifier.fillMaxWidth(), elevation = elevation) {
            Column(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    content = content,
                )
                if (footer != null) {
                    // The footer zone: a hairline, then the muted footer rhythm.
                    Box(
                        modifier =
                            Modifier
                                .fillMaxWidth()
                                .height(1.dp)
                                .background(colors.cardHairline),
                    )
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        content = footer,
                    )
                }
            }
        }
    }
}
