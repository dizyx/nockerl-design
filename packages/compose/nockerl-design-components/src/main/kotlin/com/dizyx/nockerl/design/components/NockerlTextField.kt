package com.dizyx.nockerl.design.components

import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldColors
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.VisualTransformation
import com.dizyx.nockerl.design.tokens.LocalNockerlColors
import com.dizyx.nockerl.design.tokens.NockerlControlShape

/**
 * The standardized **text field**: one recessed input well for every single-line
 * (and short multi-line) entry, replacing the per-screen `OutlinedTextField`
 * recolors client #1 re-derives (text-field spec; "cards lift, fields sink",
 * design-laws §2).
 *
 * Treatment (RATIFIED, r2 C1): the field SINKS into a `canvasAlt` inset well on
 * the 12dp control radius with a hairline resting border; focus = the accent
 * border at M3's 2dp focused thickness (the ratified 2px outline focus); error
 * swaps the family to `statusError` and colors the supporting line.
 *
 * Label + error are BUNDLED (persistent [label], never placeholder-as-label, per
 * law §14): [errorText] non-null puts the field in the error state and replaces
 * [helperText] on the supporting line, so error is text, never color alone.
 *
 * @param value current text.
 * @param onValueChange change callback.
 * @param modifier outer modifier (fields are typically `fillMaxWidth()`).
 * @param label persistent floating label.
 * @param placeholder hint shown while empty (an ADDITION to the label, never a
 *   replacement).
 * @param helperText persistent supporting line under the field.
 * @param errorText when non-null: error state + this text on the supporting line.
 * @param leadingIcon optional leading slot.
 * @param trailingIcon optional trailing slot (visibility toggle, unit, …).
 * @param enabled when `false`, dimmed and non-interactive.
 * @param singleLine single-line entry (the default).
 * @param maxLines line cap for multi-line fields.
 * @param visualTransformation e.g. `PasswordVisualTransformation()`.
 * @param keyboardOptions IME type/action configuration.
 * @param keyboardActions IME action callbacks.
 */
@Composable
fun NockerlTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String? = null,
    helperText: String? = null,
    errorText: String? = null,
    leadingIcon: (@Composable () -> Unit)? = null,
    trailingIcon: (@Composable () -> Unit)? = null,
    enabled: Boolean = true,
    singleLine: Boolean = true,
    maxLines: Int = if (singleLine) 1 else 5,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
) {
    val supporting = errorText ?: helperText

    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier,
        enabled = enabled,
        label = label?.let { { Text(it) } },
        placeholder = placeholder?.let { { Text(it) } },
        supportingText = supporting?.let { { Text(it) } },
        isError = errorText != null,
        leadingIcon = leadingIcon,
        trailingIcon = trailingIcon,
        singleLine = singleLine,
        maxLines = maxLines,
        visualTransformation = visualTransformation,
        keyboardOptions = keyboardOptions,
        keyboardActions = keyboardActions,
        shape = NockerlControlShape,
        colors = nockerlFieldColors(),
    )
}

/**
 * The shared field color mapping: the recessed `canvasAlt` well, hairline resting
 * border, accent focus border, and status-red error family. Internal: the search
 * field rides the same treatment so every input well in the system matches.
 */
@Composable
internal fun nockerlFieldColors(): TextFieldColors {
    val colors = LocalNockerlColors.current
    return OutlinedTextFieldDefaults.colors(
        focusedTextColor = colors.onCard,
        unfocusedTextColor = colors.onCard,
        disabledTextColor = colors.onCardMuted.copy(alpha = DISABLED_ALPHA),
        focusedContainerColor = colors.canvasAlt,
        unfocusedContainerColor = colors.canvasAlt,
        disabledContainerColor = colors.canvasAlt.copy(alpha = DISABLED_ALPHA),
        errorContainerColor = colors.canvasAlt,
        cursorColor = colors.accentPrimary,
        errorCursorColor = colors.statusError,
        focusedBorderColor = colors.accentPrimary,
        unfocusedBorderColor = colors.cardHairline,
        disabledBorderColor = colors.cardHairline.copy(alpha = DISABLED_ALPHA),
        errorBorderColor = colors.statusError,
        focusedLabelColor = colors.accentPrimary,
        unfocusedLabelColor = colors.onCardMuted,
        disabledLabelColor = colors.onCardMuted.copy(alpha = DISABLED_ALPHA),
        errorLabelColor = colors.statusError,
        focusedPlaceholderColor = colors.onCardMuted,
        unfocusedPlaceholderColor = colors.onCardMuted,
        disabledPlaceholderColor = colors.onCardMuted.copy(alpha = DISABLED_ALPHA),
        focusedSupportingTextColor = colors.onCardMuted,
        unfocusedSupportingTextColor = colors.onCardMuted,
        disabledSupportingTextColor = colors.onCardMuted.copy(alpha = DISABLED_ALPHA),
        errorSupportingTextColor = colors.statusError,
        focusedLeadingIconColor = colors.onCardMuted,
        unfocusedLeadingIconColor = colors.onCardMuted,
        focusedTrailingIconColor = colors.onCardMuted,
        unfocusedTrailingIconColor = colors.onCardMuted,
    )
}
