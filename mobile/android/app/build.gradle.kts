import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.example.iskolar_mobile"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    defaultConfig {
        applicationId = "com.example.iskolar_mobile"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    val keystorePropertiesFile = rootProject.file("key.properties")
    val keystoreProperties = Properties()
    val hasKeystoreConfig = keystorePropertiesFile.exists()
    if (hasKeystoreConfig) {
        keystoreProperties.load(FileInputStream(keystorePropertiesFile))
    }

    signingConfigs {
        create("release") {
            if (hasKeystoreConfig) {
                val keyAliasVal = keystoreProperties.getProperty("keyAlias")
                val keyPasswordVal = keystoreProperties.getProperty("keyPassword")
                val storePasswordVal = keystoreProperties.getProperty("storePassword")
                val storeFilePath = keystoreProperties.getProperty("storeFile")

                if (!keyAliasVal.isNullOrBlank() && !keyPasswordVal.isNullOrBlank() && !storePasswordVal.isNullOrBlank() && !storeFilePath.isNullOrBlank()) {
                    keyAlias = keyAliasVal
                    keyPassword = keyPasswordVal
                    storeFile = file(storeFilePath)
                    storePassword = storePasswordVal
                }
            }
        }
    }

    buildTypes {
        release {
            if (hasKeystoreConfig) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    gradle.taskGraph.whenReady {
        val isReleaseRequested = allTasks.any { task ->
            task.name.contains("Release", ignoreCase = true) &&
            (task.name.startsWith("assemble") || task.name.startsWith("bundle") || task.name.startsWith("package") || task.name.startsWith("validateSigning"))
        }

        if (isReleaseRequested) {
            if (!hasKeystoreConfig) {
                throw org.gradle.api.GradleException(
                    "Release build cannot proceed without valid key.properties configuration. " +
                    "Please create mobile/android/key.properties from key.properties.example with valid keystore credentials."
                )
            }
            val keyAliasVal = keystoreProperties.getProperty("keyAlias")
            val keyPasswordVal = keystoreProperties.getProperty("keyPassword")
            val storePasswordVal = keystoreProperties.getProperty("storePassword")
            val storeFilePath = keystoreProperties.getProperty("storeFile")

            if (keyAliasVal.isNullOrBlank() || keyPasswordVal.isNullOrBlank() || storePasswordVal.isNullOrBlank() || storeFilePath.isNullOrBlank()) {
                throw org.gradle.api.GradleException(
                    "Release signing configuration in key.properties is incomplete. " +
                    "Please ensure keyAlias, keyPassword, storePassword, and storeFile are configured. " +
                    "Refer to key.properties.example for instructions."
                )
            }
            val storeFileObj = file(storeFilePath)
            if (!storeFileObj.exists()) {
                throw org.gradle.api.GradleException(
                    "Release keystore file does not exist at '${storeFileObj.absolutePath}'. " +
                    "Please ensure the keystore file exists or update key.properties."
                )
            }
        }
    }
}

flutter {
    source = "../.."
}

