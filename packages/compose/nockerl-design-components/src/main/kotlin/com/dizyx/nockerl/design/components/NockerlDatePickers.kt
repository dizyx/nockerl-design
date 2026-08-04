package com.dizyx.nockerl.design.components

import androidx.compose.material3.DatePicker
import androidx.compose.material3.DateRangePicker
import androidx.compose.material3.DisplayMode
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.TimeInput
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberDateRangePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier

/**
 * The shared date/time picker CONTRACT on Compose,
 * wrapping the platform Material 3 pickers (per law §9, the interaction stays
 * native; the CONTRACT is what unifies):
 *
 * - **`weekStartsOn`** (0=Sunday … 6=Saturday): the DEFAULT is the device
 *   locale on every platform. M3's calendar derives its first day from the
 *   locale and exposes no per-day override. Under this contract, the unsupported
 *   explicit override FALLS BACK to the platform default (and this KDoc says
 *   so; the props table documents it). The prop exists so call sites are
 *   source-compatible across platforms.
 * - **`entryMode`** (`DEFAULT | DIAL | WHEEL | TEXT`): defaults to the platform
 *   idiom, namely M3 calendar (date) / clock dial (time). `TEXT` maps to M3 input
 *   modes; `WHEEL` is not an Android idiom and falls back to the default.
 * - **`minuteStep` / `minMillis` / `maxMillis`**: the web API is the shared
 *   contract. M3 has no native minute stepping. The selection SNAPS to the
 *   nearest step on read ([nockerlSnapMinutes], documented clamping); date
 *   bounds clamp via [SelectableDates].
 */
enum class NockerlPickerEntryMode {
    /** The platform idiom (M3 calendar / clock dial). */
    DEFAULT,

    /** The M3 clock dial (time; dates fall back to DEFAULT). */
    DIAL,

    /** Not an Android idiom: falls back to DEFAULT (documented). */
    WHEEL,

    /** Keyboard entry (M3 input modes). */
    TEXT,
}

/**
 * Date picker under the shared contract. Selection reports as UTC midnight
 * millis (the M3 convention).
 *
 * @param selectedDateMillis current selection (UTC millis), or `null`.
 * @param onDateSelected fires with the (bounds-clamped) selection.
 * @param modifier outer modifier.
 * @param weekStartsOn override in the 0 to 6 range (UNSUPPORTED on M3, locale-driven);
 *   documented fallback.
 * @param entryMode [NockerlPickerEntryMode.TEXT] = M3 input mode; everything
 *   else = the calendar.
 * @param minMillis earliest selectable date (UTC millis), inclusive.
 * @param maxMillis latest selectable date (UTC millis), inclusive.
 */
@Suppress("UNUSED_PARAMETER")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NockerlDatePicker(
    selectedDateMillis: Long?,
    onDateSelected: (Long) -> Unit,
    modifier: Modifier = Modifier,
    weekStartsOn: Int? = null,
    entryMode: NockerlPickerEntryMode = NockerlPickerEntryMode.DEFAULT,
    minMillis: Long? = null,
    maxMillis: Long? = null,
) {
    val state =
        rememberDatePickerState(
            initialSelectedDateMillis = selectedDateMillis,
            initialDisplayMode =
                if (entryMode == NockerlPickerEntryMode.TEXT) DisplayMode.Input else DisplayMode.Picker,
            selectableDates = nockerlSelectableDates(minMillis, maxMillis),
        )
    LaunchedEffect(state) {
        snapshotFlow { state.selectedDateMillis }
            .collect { millis ->
                if (millis != null) {
                    onDateSelected(nockerlClampMillis(millis, minMillis, maxMillis))
                }
            }
    }
    DatePicker(state = state, modifier = modifier)
}

/**
 * The **range MODE** of the date-picker family: a start→end
 * date range on the ONE contract, so a standalone range picker is unnecessary.
 * On Compose the platform reality is M3's separate [DateRangePicker] (its state
 * differs from the single picker's), presented here as the family's range mode,
 * NOT a duplicate component (law §9/§12: honor the platform, unify the contract).
 *
 * Both ends report as UTC-midnight millis (the M3 convention); either may be
 * `null` mid-selection. Bounds clamp via the same [SelectableDates] +
 * [nockerlClampMillis] contract as the single picker.
 *
 * @param startDateMillis current range start (UTC millis), or `null`.
 * @param endDateMillis current range end (UTC millis), or `null`.
 * @param onRangeSelected fires with the (bounds-clamped) start/end, either nullable.
 * @param modifier outer modifier.
 * @param entryMode [NockerlPickerEntryMode.TEXT] = M3 input mode; else the calendar.
 * @param minMillis earliest selectable date (UTC millis), inclusive.
 * @param maxMillis latest selectable date (UTC millis), inclusive.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NockerlDateRangePicker(
    startDateMillis: Long?,
    endDateMillis: Long?,
    onRangeSelected: (start: Long?, end: Long?) -> Unit,
    modifier: Modifier = Modifier,
    entryMode: NockerlPickerEntryMode = NockerlPickerEntryMode.DEFAULT,
    minMillis: Long? = null,
    maxMillis: Long? = null,
) {
    val state =
        rememberDateRangePickerState(
            initialSelectedStartDateMillis = startDateMillis,
            initialSelectedEndDateMillis = endDateMillis,
            initialDisplayMode =
                if (entryMode == NockerlPickerEntryMode.TEXT) DisplayMode.Input else DisplayMode.Picker,
            selectableDates = nockerlSelectableDates(minMillis, maxMillis),
        )
    LaunchedEffect(state) {
        snapshotFlow { state.selectedStartDateMillis to state.selectedEndDateMillis }
            .collect { (start, end) ->
                onRangeSelected(
                    start?.let { nockerlClampMillis(it, minMillis, maxMillis) },
                    end?.let { nockerlClampMillis(it, minMillis, maxMillis) },
                )
            }
    }
    DateRangePicker(state = state, modifier = modifier)
}

/**
 * Time picker under the shared contract.
 *
 * @param hour initial hour (0 to 23).
 * @param minute initial minute: snapped to [minuteStep] on the way in AND out.
 * @param onTimeSelected fires with the (step-snapped) hour/minute.
 * @param modifier outer modifier.
 * @param entryMode DIAL/DEFAULT = the M3 clock dial; TEXT = M3 [TimeInput];
 *   WHEEL falls back to the dial (documented).
 * @param minuteStep snap increment (1 = free); M3 has no native stepping, so
 *   the selection snaps on read: the documented clamping behavior.
 * @param is24Hour force 24h; `null` follows the device setting.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NockerlTimePicker(
    hour: Int,
    minute: Int,
    onTimeSelected: (hour: Int, minute: Int) -> Unit,
    modifier: Modifier = Modifier,
    entryMode: NockerlPickerEntryMode = NockerlPickerEntryMode.DEFAULT,
    minuteStep: Int = 1,
    is24Hour: Boolean? = null,
) {
    val state =
        if (is24Hour != null) {
            rememberTimePickerState(
                initialHour = hour,
                initialMinute = nockerlSnapMinutes(minute, minuteStep),
                is24Hour = is24Hour,
            )
        } else {
            rememberTimePickerState(
                initialHour = hour,
                initialMinute = nockerlSnapMinutes(minute, minuteStep),
            )
        }
    LaunchedEffect(state) {
        snapshotFlow { state.hour to state.minute }
            .collect { (h, m) -> onTimeSelected(h, nockerlSnapMinutes(m, minuteStep)) }
    }
    if (entryMode == NockerlPickerEntryMode.TEXT) {
        TimeInput(state = state, modifier = modifier)
    } else {
        TimePicker(state = state, modifier = modifier)
    }
}

/**
 * Snap a minute value to the nearest [step] (the contract's documented clamping:
 * platforms without native stepping honor the contract by snapping). A step of
 * `<= 1` is a no-op; 60 wraps back to 0. Pure + shared with Swift.
 */
fun nockerlSnapMinutes(
    minute: Int,
    step: Int,
): Int {
    if (step <= 1) return minute.coerceIn(0, 59)
    val snapped = (Math.round(minute / step.toFloat()) * step) % 60
    return snapped.coerceIn(0, 59)
}

/** Clamp millis into the contract bounds (either side optional). */
fun nockerlClampMillis(
    value: Long,
    min: Long?,
    max: Long?,
): Long = value.coerceIn(min ?: Long.MIN_VALUE, max ?: Long.MAX_VALUE)

/** [SelectableDates] enforcing the contract's min/max bounds on the calendar. */
@OptIn(ExperimentalMaterial3Api::class)
private fun nockerlSelectableDates(
    min: Long?,
    max: Long?,
): SelectableDates =
    object : SelectableDates {
        override fun isSelectableDate(utcTimeMillis: Long): Boolean =
            (min == null || utcTimeMillis >= min) && (max == null || utcTimeMillis <= max)
    }
