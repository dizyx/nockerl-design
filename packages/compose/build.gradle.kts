// Root build for the Compose library project. Mirrors android-native/build.gradle.kts:
// module plugins declared `apply false` (applied per-module), ktlint applied to every
// project, detekt on the default config. AGP 9's built-in Kotlin means no kotlin-android.
plugins {
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
}

allprojects {
    apply(plugin = "org.jlleitschuh.gradle.ktlint")

    ktlint {
        android = true
        verbose = true
        outputToConsole = true
        enableExperimentalRules = false
    }
}

detekt {
    buildUponDefaultConfig = true
    allRules = false
}
