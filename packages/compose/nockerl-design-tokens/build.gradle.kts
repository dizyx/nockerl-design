// @dizyx/nockerl-design-tokens: the Kotlin/Compose token + theme layer.
// Contents: the generated NockerlTokens.kt (Style Dictionary → scripts/build.ts) plus a
// hand-written semantic layer (NockerlColors/palettes, ThemeMode, LocalNockerlColors,
// NockerlTheme, NockerlTypography [Outfit], NockerlShapes [card=16], elevation material).
// Published to GitHub Packages Maven as com.dizyx.nockerl:design-tokens.
plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.compose)
    `maven-publish`
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

    // Expose a single `release` component for Maven publishing, with sources.
    publishing {
        singleVariant("release") {
            withSourcesJar()
        }
    }
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
version = "2.0.0"

publishing {
    publications {
        register<MavenPublication>("release") {
            groupId = "com.dizyx.nockerl"
            artifactId = "design-tokens"
            afterEvaluate { from(components["release"]) }
        }
    }
    repositories {
        maven {
            name = "GitHubPackages"
            url = uri("https://maven.pkg.github.com/dizyx/nockerl-design")
            credentials {
                username = System.getenv("GITHUB_ACTOR") ?: ""
                password = System.getenv("GITHUB_TOKEN") ?: ""
            }
        }
    }
}
