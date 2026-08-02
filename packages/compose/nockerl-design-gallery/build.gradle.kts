// :nockerl-design-gallery: the maintained Compose gallery + visual-regression rail.
//
// NEVER published. This module holds the curated @ShowkaseComposable entries for every
// shipped design-system component and the Roborazzi screenshot test that renders each
// entry to a golden PNG (dark + light) HEADLESS, no emulator. The golden tree
// (src/test/screenshots/gallery/<theme>/<slug>.png) is version-controlled: the docs site
// consumes it, and `verifyRoborazziDebug` is the visual-regression gate.
//
//   ./gradlew :nockerl-design-gallery:recordRoborazziDebug   # (re)record goldens
//   ./gradlew :nockerl-design-gallery:verifyRoborazziDebug   # fail on any pixel diff
//
// One @ShowkaseRoot per module (GalleryShowkaseRoot lives here); the published
// components/tokens modules stay Showkase-free so consumers never inherit the gallery.
plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
    alias(libs.plugins.roborazzi)
}

android {
    namespace = "com.dizyx.nockerl.design.gallery"
    compileSdk = 35

    defaultConfig {
        minSdk = 26
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlin {
        compilerOptions {
            allWarningsAsErrors = true
            jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
        }
    }

    buildFeatures {
        compose = true
    }

    resourcePrefix = "nockerl_"

    testOptions {
        unitTests {
            // Robolectric-backed captures inflate real resources (the tokens
            // module's bundled Outfit font, M3 resources), so merged resources +
            // assets must be on the unit-test classpath.
            isIncludeAndroidResources = true
        }
    }
}

// Showkase code-gen options (KSP). Gallery entries are the public
// @ShowkaseComposable functions; skipPrivatePreviews keeps any private @Preview
// helpers out of the generated registry (and out of the captured golden set).
ksp {
    arg("skipPrivatePreviews", "true")
}

// Route the *_compare.png diff artifacts of a FAILED verify into the build dir so a
// visual regression surfaces its diff without dirtying the committed golden tree
// (only a deliberate re-record ever updates the tracked PNGs).
roborazzi {
    compare {
        outputDir.set(layout.buildDirectory.dir("outputs/roborazzi/compare"))
    }
}

dependencies {
    val composeBom = platform(libs.compose.bom)
    implementation(composeBom)

    // The components under showcase; api-exposes :nockerl-design-tokens transitively.
    implementation(project(":nockerl-design-components"))

    implementation(libs.compose.ui)
    implementation(libs.compose.material3)
    implementation(libs.compose.ui.tooling.preview)
    // Fat icon set is allowed HERE only (unpublished dev tooling); the published
    // components module keeps taking icons as ImageVector params instead.
    implementation(libs.compose.material.icons.extended)

    implementation(libs.showkase.annotation)
    implementation(libs.showkase)
    ksp(libs.showkase.processor)

    testImplementation(composeBom)
    testImplementation(libs.junit4)
    testImplementation(libs.robolectric)
    testImplementation(libs.roborazzi)
    testImplementation(libs.roborazzi.compose)
    testImplementation(libs.compose.ui.test.junit4)
    testImplementation(libs.androidx.activity.compose)
}
