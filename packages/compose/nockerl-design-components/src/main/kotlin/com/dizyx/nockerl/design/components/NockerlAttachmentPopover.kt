package com.dizyx.nockerl.design.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlElevation
import com.dizyx.nockerl.design.tokens.NockerlPanelShape
import com.dizyx.nockerl.design.tokens.nockerlShadow

/**
 * The **attachment popover**: the floating cluster of pending-image thumbnails
 * that appears ABOVE the chat pill the moment something is attached, brought up
 * from the Android app (chat/ui/ChatInputBar.kt · PendingImageRow) as design-system
 * truth (R5-2 ).
 *
 * Each thumbnail is chrome that FLOATS on the same top layer as the input pill (L3
 * lift, so the message cards scroll UNDER it), traced by the warm agent-family edge
 * that marks it as *dismissable* transient chrome, distinct from the persistent
 * cyan edge of the pill itself. A compact red badge in the top-end corner removes
 * it. The row scrolls horizontally when the attachments overflow.
 *
 * This owns only the FRAME (float + warm edge + remove badge); the caller supplies
 * each image as a [Painter] and handles the actual pick/decode/upload. The app's
 * base64/CDN plumbing composes AROUND this, never inside it.
 *
 * @param attachments one [Painter] per pending attachment, in display order.
 * @param onRemove fired with the index whose remove badge was tapped.
 * @param modifier outer modifier (the host places this directly above the pill).
 * @param enabled when `false`, the remove badges are inert.
 * @param attachmentContentDescription each thumbnail's a11y name (1.0 strings stance).
 * @param removeContentDescription each remove badge's a11y name.
 */
@Composable
fun NockerlAttachmentPopover(
    attachments: List<Painter>,
    onRemove: (Int) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    attachmentContentDescription: String = "Attachment",
    removeContentDescription: String = "Remove attachment",
) {
    Row(
        modifier =
            modifier
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        attachments.forEachIndexed { index, painter ->
            AttachmentThumbnail(
                painter = painter,
                enabled = enabled,
                onRemove = { onRemove(index) },
                attachmentContentDescription = attachmentContentDescription,
                removeContentDescription = removeContentDescription,
            )
        }
    }
}

/** Small-tile silhouette for the floating thumbnails (android raw 8dp → 12dp panel token). */
private val AttachmentThumbnailShape = NockerlPanelShape

/**
 * One floating thumbnail: a 52dp image tile (bottom-anchored so the remove badge
 * can overhang the top-end corner) with the L3 float, the warm agent-family edge,
 * and a compact red remove badge.
 */
@Composable
private fun AttachmentThumbnail(
    painter: Painter,
    enabled: Boolean,
    onRemove: () -> Unit,
    attachmentContentDescription: String,
    removeContentDescription: String,
) {
    val colors = LocalNockerlColors.current
    // 56dp box gives the 18dp badge room to overhang the 52dp tile's top-end corner.
    Box(modifier = Modifier.size(56.dp)) {
        Image(
            painter = painter,
            contentDescription = attachmentContentDescription,
            modifier =
                Modifier
                    .size(52.dp)
                    .align(Alignment.BottomStart)
                    // L3: thumbnails float on the same top chrome layer as the pill.
                    .nockerlShadow(elevation = NockerlElevation.Level3, shape = AttachmentThumbnailShape)
                    .clip(AttachmentThumbnailShape)
                    // Warm agent-family edge = "dismissable chrome" (vs the pill's cyan).
                    .border(1.5.dp, colors.family.agent, AttachmentThumbnailShape),
            contentScale = ContentScale.Crop,
        )
        Box(
            contentAlignment = Alignment.Center,
            modifier =
                Modifier
                    .size(18.dp)
                    .align(Alignment.TopEnd)
                    .clip(CircleShape)
                    .background(colors.statusError)
                    .then(
                        if (enabled) Modifier.clickable(onClick = onRemove) else Modifier,
                    ).semantics { contentDescription = removeContentDescription },
        ) {
            Icon(
                imageVector = Icons.Filled.Close,
                contentDescription = null,
                tint = pickOnAccent(colors.statusError),
                modifier = Modifier.size(12.dp),
            )
        }
    }
}
