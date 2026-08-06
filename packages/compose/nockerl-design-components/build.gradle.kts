// @dizyx/nockerl-design-components: the Compose component layer (leaf-first extraction).
// Depends on nockerl-design-tokens for the theme/token vocabulary. First slice: the button
// family (NockerlButton / NockerlIconButton / NockerlChip) + the internal control plumbing
// (NockerlControlInternals). Published to Maven Central as com.dizyx.nockerl:design-components.
plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.maven.publish)
}

android {
    namespace = "com.dizyx.nockerl.design.components"
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

    // The release variant is the published one. The sources and javadoc jars are wired by
    // the publishing plugin below rather than here, so there is one place that decides
    // what a published artifact contains.
}

dependencies {
    val composeBom = platform(libs.compose.bom)
    implementation(composeBom)

    // api (not implementation): consumers of the components get the theme + tokens
    // transitively, since they need NockerlTheme / LocalNockerlColors to host these controls.
    api(project(":nockerl-design-tokens"))

    implementation(libs.androidx.core.ktx)
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.material3)
    implementation(libs.compose.ui.tooling.preview)
    // icons-CORE only (slim common set): self-contained defaults like the search
    // field's magnifier/clear. icons-extended remains banned in published modules.
    implementation(libs.compose.material.icons.core)
    debugImplementation(libs.compose.ui.tooling)

    // Pure-JVM contract tests (ContractTests.kt): the shared cross-platform
    // semantics (stepper/accordion/pickers/contrast) + token bindings. No
    // Robolectric: nothing here renders.
    testImplementation(composeBom)
    testImplementation(libs.junit4)
}

group = "com.dizyx.nockerl"
// ONE VERSION LINE with the tokens module + the npm packages. The release workflow
// verifies this equals the git tag before publishing.
version = "2.2.0"

// Published to Maven Central. Everything shared across the two artifacts (licence,
// developers, scm, signing) is configured once in the root build; this declares only what
// is specific to this module. The javadoc jar is real generated API documentation rather
// than the usual empty placeholder; see the tokens module for why that needs no Dokka.
mavenPublishing {
    coordinates("com.dizyx.nockerl", "design-components", version.toString())

    configure(
        com.vanniktech.maven.publish.AndroidSingleVariantLibrary(
            variant = "release",
            sourcesJar = true,
            publishJavadocJar = true,
        ),
    )

    pom {
        name.set("Nockerl Design Components")
        description.set(
            "Jetpack Compose components of the Nockerl design system: buttons, chips, " +
                "fields, surfaces and the shared control plumbing, built on the Nockerl " +
                "design tokens.",
        )
    }
}
