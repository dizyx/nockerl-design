// Nockerl Design: Compose (Android) library builds.
// Greenfield Gradle project (ADR-0006/0007 Phase C). Publishes the Kotlin/Compose
// side of the design system to GitHub Packages Maven; the app is client #1.
// Versions mirror android-native's matrix (gradle/libs.versions.toml) so extracted
// code compiles unchanged: AGP 9.1.0 (built-in Kotlin, NO kotlin-android plugin),
// Kotlin 2.3.20, Gradle 9.3.1, Compose BOM 2026.02.01.
pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode = RepositoriesMode.FAIL_ON_PROJECT_REPOS
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "nockerl-design-compose"

include(":nockerl-design-tokens")
include(":nockerl-design-components")
// The maintained Showkase gallery + Roborazzi golden rail. NEVER published.
// It exists so the library proves its components visually (ADR-0007: galleries
// live with the libraries) and the docs site consumes the golden PNGs.
include(":nockerl-design-gallery")
