package com.dizyx.nockerl.design.components

import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlControlShape
import com.dizyx.nockerl.design.tokens.NockerlPillShape

/**
 * The standardized **search field**: magnifier leading, clear (✕) trailing when
 * non-empty, filtering in place on every keystroke, Enter as the explicit submit
 * (search-field.mdx). Rides the same recessed-well treatment as
 * [NockerlTextField] so every input well matches.
 *
 * Search fields carry no visible label by convention. The accessible name is
 * REQUIRED via [contentDescription] instead (defaults to the placeholder; law
 * §14's persistent-label rule is satisfied by the semantics name + the
 * always-visible magnifier affordance).
 *
 * The icons are the slim icons-CORE defaults (magnifier + clear) so the field is
 * self-contained; [loading] swaps the clear affordance for a 16dp spinner while
 * an async source is in flight.
 *
 * @param value current query.
 * @param onValueChange change callback (live filtering).
 * @param modifier outer modifier.
 * @param placeholder hint text (also the default accessible name).
 * @param contentDescription the field's accessible name.
 * @param onSearch optional explicit-submit callback (IME search action).
 * @param enabled when `false`, dimmed and non-interactive.
 * @param loading render a spinner in the trailing slot (async in flight).
 * @param shape [NockerlControlShape] (default). Pass [NockerlPillShape] ONLY for
 *   the toolbar/input-bar idiom (pills are reserved, law §4).
 */
@Composable
fun NockerlSearchField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "Search",
    contentDescription: String = placeholder,
    onSearch: (() -> Unit)? = null,
    enabled: Boolean = true,
    loading: Boolean = false,
    shape: Shape = NockerlControlShape,
) {
    val colors = LocalNockerlColors.current
    // Distinct local because the semantics receiver's property shadows the parameter.
    val accessibleName = contentDescription

    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.semantics { this.contentDescription = accessibleName },
        enabled = enabled,
        placeholder = { Text(placeholder) },
        leadingIcon = {
            Icon(
                imageVector = Icons.Filled.Search,
                contentDescription = null, // decorative; the field itself is named
                tint = colors.onCardMuted,
            )
        },
        trailingIcon =
            when {
                loading -> {
                    {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = colors.accentPrimary,
                            strokeWidth = 2.dp,
                        )
                    }
                }
                value.isNotEmpty() -> {
                    {
                        NockerlIconButton(
                            icon = Icons.Filled.Close,
                            contentDescription = "Clear search",
                            onClick = { onValueChange("") },
                            enabled = enabled,
                        )
                    }
                }
                else -> null
            },
        singleLine = true,
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
        keyboardActions = KeyboardActions(onSearch = { onSearch?.invoke() }),
        shape = shape,
        colors = nockerlFieldColors(),
    )
}
