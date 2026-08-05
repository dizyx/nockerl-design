// @dizyx/nockerl-design-tokens: the Kotlin/Compose token + theme layer.
// Contents: the generated NockerlTokens.kt (Style Dictionary → scripts/build.ts) plus a
// hand-written semantic layer (NockerlColors/palettes, ThemeMode, LocalNockerlColors,
// NockerlTheme, NockerlTypography [Outfit], NockerlShapes [card=16], elevation material).
// Published to GitHub Packages Maven as com.dizyx.nockerl:design-tokens.
plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.maven.publish)
}

android {
    namespace = "com.dizyx.nockerl.design.tokens"
    compileSdk = 35

    defaultConfig {
        minSdk = 26
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    // AGP 9 built-in Kotlin: the kotlin {} block lives INSIDE android {} (no
    // kotlin-android plugin). Warnings-as-errors from day one (inventory §4).
    kotlin {
        compilerOptions {
            allWarningsAsErrors = true
            jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
        }
    }

    buildFeatures {
        compose = true
    }

    // Every library resource (bundled Outfit fonts) is prefixed to avoid consumer
    // resource collisions.
    resourcePrefix = "nockerl_"

    // The release variant is the published one. The sources and javadoc jars are wired by
    // the publishing plugin below rather than here, so there is one place that decides
    // what a published artifact contains.
}

dependencies {
    val composeBom = platform(libs.compose.bom)
    implementation(composeBom)

    implementation(libs.androidx.core.ktx)
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.material3)
    implementation(libs.compose.ui.tooling.preview)
    debugImplementation(libs.compose.ui.tooling)
}

group = "com.dizyx.nockerl"
// ONE VERSION LINE with the npm packages (tokens + react). The release workflow
// verifies this equals the git tag before publishing.
version = "2.1.0"

// Published to Maven Central. Everything shared across the two artifacts (licence,
// developers, scm, signing) is configured once in the root build; this declares only what
// is specific to this module.
//
// Central requires a javadoc jar alongside sources. `publishJavadocJar = true` runs the
// standard javadoc task over the Java stubs the Kotlin compiler already emits, which
// produces real per class API pages (50 of them here, covering the public surface) rather
// than the empty placeholder jar that is the usual answer for Kotlin. That is enough to
// satisfy Central AND useful to a reader, without adding Dokka: a second documentation
// pipeline that could drift from the docs site, for output this already covers.
mavenPublishing {
    coordinates("com.dizyx.nockerl", "design-tokens", version.toString())

    configure(
        com.vanniktech.maven.publish.AndroidSingleVariantLibrary(
            variant = "release",
            sourcesJar = true,
            publishJavadocJar = true,
        ),
    )

    pom {
        name.set("Nockerl Design Tokens")
        description.set(
            "Design tokens and theming for Jetpack Compose: the generated colour, type, " +
                "shape, spacing and elevation values of the Nockerl design system, plus the " +
                "NockerlTheme entry point.",
        )
    }
}
