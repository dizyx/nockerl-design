package com.dizyx.nockerl.design.gallery

import com.airbnb.android.showkase.annotation.ShowkaseRoot
import com.airbnb.android.showkase.annotation.ShowkaseRootModule

/**
 * The Showkase **root module**: the single entry point the Showkase KSP
 * processor uses to aggregate every `@ShowkaseComposable` (and any
 * `@ShowkaseColor` / `@ShowkaseTypography`) in this module into one generated
 * component registry.
 *
 * Exactly one [ShowkaseRootModule] may be annotated [ShowkaseRoot] per module
 * graph, which is why the root lives HERE, in the unpublished gallery module,
 * and not in the published components/tokens artifacts (consumers must be free
 * to declare their own roots). The generated registry backs both gallery
 * consumers:
 *  - any on-device Showkase browser host, and
 *  - the headless Roborazzi screenshot test, which reads the same registry to
 *    render each component to a golden PNG.
 */
@ShowkaseRoot
class GalleryShowkaseRoot : ShowkaseRootModule
