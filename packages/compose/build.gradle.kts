// Root build for the Compose library project. Mirrors android-native/build.gradle.kts:
// module plugins declared `apply false` (applied per-module), ktlint applied to every
// project, detekt on the default config. AGP 9's built-in Kotlin means no kotlin-android.
import com.vanniktech.maven.publish.MavenPublishBaseExtension
import org.gradle.plugins.signing.SigningExtension

plugins {
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.maven.publish) apply false
    alias(libs.plugins.ktlint)
    alias(libs.plugins.detekt)
}

// ── Maven Central publishing, shared ────────────────────────────────────────────────
//
// WHY A PLUGIN RATHER THAN PLAIN maven-publish
// The Central Portal is not a Maven repository. It takes a signed bundle uploaded to its
// publisher API and then runs a validation and release lifecycle against a deployment id,
// so `maven-publish` pointing at a URL cannot talk to it at all. The alternative is not
// "some Gradle config", it is a hand written Portal client: bundle layout, four checksums
// per file, signatures, upload, poll. That is a lot of fiddly correctness to own for
// something that is solved.
//
// This is a BUILD time dependency only. It configures the publication and never appears in
// the published POM, so no consumer of the design system resolves it. The exposure is to
// our own build integrity rather than to anyone downstream, which is why the version is
// pinned in the catalog rather than left to float.
//
// Applied per module (each declares its own artifactId and description); everything that
// must be identical across artifacts is defined ONCE here.
//
// SIGNING IS CONDITIONAL BY DESIGN. Central requires signed artifacts, but a contributor
// with no key must still be able to build. Signing switches on only when a key is present,
// so `assembleRelease` works on a laptop and a release run signs.
subprojects {
    plugins.withId("com.vanniktech.maven.publish") {
        // Read through the provider API rather than System.getenv: the build has the
        // configuration cache on, and a direct env read at configuration time is an
        // undeclared input that invalidates it.
        val signingKey = providers.environmentVariable("SIGNING_KEY").orNull
        val signingPassword = providers.environmentVariable("SIGNING_PASSWORD").orNull
        val hasSigningKey = !signingKey.isNullOrBlank()

        extensions.configure<MavenPublishBaseExtension> {
            // Uploads to the Central Portal and leaves the deployment for a human to
            // release, so a bad build can be dropped instead of being permanent. Maven
            // Central is immutable once released.
            publishToMavenCentral()

            if (hasSigningKey) {
                signAllPublications()
            }

            pom {
                url.set("https://github.com/dizyx/nockerl-design")
                inceptionYear.set("2026")

                licenses {
                    license {
                        name.set("MIT License")
                        url.set("https://github.com/dizyx/nockerl-design/blob/main/LICENSE")
                        distribution.set("repo")
                    }
                }

                developers {
                    developer {
                        id.set("mclenithan")
                        name.set("Patrick McLenithan")
                        url.set("https://github.com/mclenithan")
                    }
                }

                scm {
                    connection.set("scm:git:git://github.com/dizyx/nockerl-design.git")
                    developerConnection.set("scm:git:ssh://git@github.com/dizyx/nockerl-design.git")
                    url.set("https://github.com/dizyx/nockerl-design")
                }
            }
        }

        if (hasSigningKey) {
            extensions.configure<SigningExtension> {
                useInMemoryPgpKeys(signingKey, signingPassword)
            }
        }
    }
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
