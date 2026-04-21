// app.config.js
// 1. THIS IS THE FIX: We import from 'expo/config-plugins' (no '@')
const { withAndroidManifest, withGradleProperties } = require('expo/config-plugins');
require('dotenv').config({ path: './.env.local' });

// --- FIX #1 (The Manifest fix) ---
const withManifestTools = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest.$) manifest.$ = {};
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    const application = manifest.application.find(app => app.$['android:name'] === '.MainApplication');
    if (application) {
      if (!application.$) application.$ = {};
      application.$['tools:replace'] = 'android:appComponentFactory';
    }
    return config;
  });
};

// --- FIX #2 (The "Big Hammer" fix) ---
const withGradlePropertiesFix = (config) => {
  return withGradleProperties(config, (config) => {
    config.modResults.push(
      { type: 'property', key: 'android.useAndroidX', value: 'true' },
      { type: 'property', key: 'android.enableJetifier', value: 'true' }
    );
    return config;
  });
};

// --- Your Original Config ---
const myConfig = {
  "expo": {
    "name": "MyMobileApp",
    "slug": "MyMobileApp",
    "version": "1.0.0",
    "owner": "p_chiranth", 

    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleId": "com.p-chiranth.mymobileapp"
    },
    
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.p_chiranth.mymobileapp" 
    },

    "web": {
      "favicon": "./assets/favicon.png"
    },

    "plugins": [
      "expo-font",
      [
        "@react-native-google-signin/google-signin",
        {
          "webClientId": process.env.YOUR_WEB_CLIENT_ID, 
          "iosUrlScheme": "com.googleusercontent.apps.700080148965-9786p6vo4metipld4bs5ihgkaf5mmpi" 
        }
      ],
      "@react-native-voice/voice"
    ],
    
    "extra": {
      "eas": {
        "projectId": "4632fa6d-7593-4a42-9624-2c85944ceab0"
      },
      "webClientId": process.env.YOUR_WEB_CLIENT_ID,
      "GEMINI_API_KEY": process.env.GEMINI_API_KEY,
      "VITE_API_KEY": process.env.VITE_API_KEY,
      "VITE_AUTH_DOMAIN": process.env.VITE_AUTH_DOMAIN,
      "VITE_PROJECT_ID": process.env.VITE_PROJECT_ID,
      "VITE_STORAGE_BUCKET": process.env.VITE_STORAGE_BUCKET,
      "VITE_MESSAGING_SENDER_ID": process.env.VITE_MESSAGING_SENDER_ID,
      "VITE_APP_ID": process.env.VITE_APP_ID,
    }
  }
};

// --- We "wrap" the config in BOTH fixes ---
module.exports = withGradlePropertiesFix(withManifestTools(myConfig));