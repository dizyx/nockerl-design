package com.dizyx.nockerl.design.gallery

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.airbnb.android.showkase.annotation.ShowkaseComposable
import com.dizyx.nockerl.design.components.NockerlAvatar
import com.dizyx.nockerl.design.components.NockerlAvatarSize
import com.dizyx.nockerl.design.components.NockerlBadge
import com.dizyx.nockerl.design.components.NockerlBadgeDot
import com.dizyx.nockerl.design.components.NockerlBadgeTone
import com.dizyx.nockerl.design.components.NockerlBadgeVariant
import com.dizyx.nockerl.design.components.NockerlLanguageBadge
import com.dizyx.nockerl.design.components.NockerlLockup
import com.dizyx.nockerl.design.components.NockerlLogo
import com.dizyx.nockerl.design.components.NockerlStatusDot
import com.dizyx.nockerl.design.components.NockerlStatusDotStatus
import com.dizyx.nockerl.design.tokens.LocalNockerlColors

/**
 * Gallery entries for the **identity + state-marker family**: the avatar
 * ([NockerlAvatar]), the badge forms ([NockerlBadge] / [NockerlBadgeDot]), and
 * the semantic status dot ([NockerlStatusDot]).
 *
 * Live-state motion (the dot's pulse) is deliberately rendered STATIC here:
 * goldens must be deterministic; motion is documented in code + the docs site.
 *
 * @see GalleryGroup
 */

/** The avatar ramp: initials fallback across all five sizes, presence, and blank-name. */
@ShowkaseComposable(name = "Avatar · Sizes + fallback + presence", group = GROUP)
@Preview
@Composable
fun GalleryAvatars() {
    GalleryGroup {
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            NockerlAvatar(name = "Ada Lovelace", size = NockerlAvatarSize.XS)
            NockerlAvatar(name = "Ada Lovelace", size = NockerlAvatarSize.SM)
            NockerlAvatar(
                name = "Ada Lovelace",
                size = NockerlAvatarSize.MD,
                presence = LocalNockerlColors.current.dotActive,
            )
            NockerlAvatar(name = "Ada Lovelace", size = NockerlAvatarSize.LG)
            NockerlAvatar(name = "", size = NockerlAvatarSize.XL)
        }
    }
}

/** The badge forms: count (with the 99+ cap), bare dot, and the tonal pill pair. */
@ShowkaseComposable(name = "Badge · Count + dot + pills", group = GROUP)
@Preview
@Composable
fun GalleryBadges() {
    GalleryGroup {
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            NockerlBadge(count = 3)
            NockerlLanguageBadge("TypeScript")
            NockerlLanguageBadge("kotlin")
            NockerlBadge(count = 120)
            NockerlBadgeDot(contentDescription = "Unseen activity")
        }
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            NockerlBadge(text = "Draft", tone = NockerlBadgeTone.INFO)
            NockerlBadge(text = "CI failing", tone = NockerlBadgeTone.DANGER)
            NockerlBadge(text = "Ready", tone = NockerlBadgeTone.SUCCESS)
            NockerlBadge(
                text = "Agent",
                tone = NockerlBadgeTone.AGENT,
                variant = NockerlBadgeVariant.SOLID,
            )
        }
    }
}

/** The semantic status-dot ladder (static: pulse is motion, not golden material). */
@ShowkaseComposable(name = "StatusDot · Semantic ladder", group = GROUP)
@Preview
@Composable
fun GalleryStatusDots() {
    GalleryGroup {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            NockerlStatusDotStatus.entries.forEach { status ->
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    NockerlStatusDot(status = status)
                    Text(
                        text = status.accessibleName,
                        style = MaterialTheme.typography.labelMedium,
                        color = LocalNockerlColors.current.onCardMuted,
                    )
                }
            }
        }
    }
}

/** The brand lockup (law §11): mark + Nockerl (thin) + optional cyan product word. */
@ShowkaseComposable(name = "Lockup · Brand lockup grammar", group = GROUP)
@Preview
@Composable
fun GalleryLockup() {
    GalleryGroup {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            // The mark alone (three-peaks, three-shade, theme-aware ink).
            NockerlLogo(size = 32.dp)
            // Wordmark only: monochrome "Nockerl" (extralight 200).
            NockerlLockup(size = 28.dp)
            // Product lockup: "Nockerl" + the cyan 400 product word.
            NockerlLockup(product = "Voice", size = 28.dp)
            // Stacked, larger: mark over the wordmark.
            NockerlLockup(product = "Console", size = 40.dp, stacked = true)
        }
    }
}
