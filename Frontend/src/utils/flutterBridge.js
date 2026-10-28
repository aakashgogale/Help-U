/**
 * Production-Ready Flutter JS Bridge
 * Handles secure and optimized communication with native mobile features.
 */
import api from '../services/api';

class FlutterBridge {
  constructor() {
    this.isFlutter =
      typeof window !== "undefined" &&
      window.flutter_inappwebview;
  }

  /**
   * Waits for the native WebView bride to be fully available.
   */
  waitForFlutter() {
    return new Promise((resolve) => {
      if (this.isFlutter) return resolve(true);

      window.addEventListener(
        "flutterInAppWebViewPlatformReady",
        () => {
          this.isFlutter = true;
          resolve(true);
        },
        { once: true }
      );

      // 1-second timeout as safety
      setTimeout(() => resolve(false), 1000);
    });
  }

  /**
   * Universal call to any Flutter JS Handler with availability check.
   */
  async callHandler(handlerName, data = {}) {
    await this.waitForFlutter();

    if (!this.isFlutter) {
      // Quietly return failure for web browsers - this is expected
      return { success: false, error: "Not inside Flutter WebView" };
    }

    try {
      return await window.flutter_inappwebview.callHandler(handlerName, data);
    } catch (error) {
      console.error(`[FlutterBridge] Error calling native handler ${handlerName}:`, error);
      return { success: false, error: error.message };
    }
  }

  /* ================================
        CAMERA (NATIVE)
  ================================== */
  async openCamera() {
    try {
      const result = await this.callHandler("openCamera");

      if (result && result.success) {
        // Convert base64 to blob without using fetch to avoid any CSP connect-src issues
        const byteString = atob(result.base64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: result.mimeType || 'image/jpeg' });

        return new File([blob], result.fileName || `cam_${Date.now()}.jpg`, {
          type: result.mimeType || 'image/jpeg',
        });
      }
      return null;
    } catch (error) {
      console.error("[FlutterBridge] Camera Error:", error);
      return null;
    }
  }

  /* ================================
        LOCATION (NATIVE + FALLBACK)
  ================================== */
  async getCurrentLocation() {
    // Tier 1: Flutter Native Handler (fastest, bypasses WebView permission prompts)
    try {
      const result = await this.callHandler("getLocation");

      if (result && result.success && typeof result.latitude === 'number' && typeof result.longitude === 'number') {
        return {
          latitude: result.latitude,
          longitude: result.longitude,
          source: 'flutter_native'
        };
      }
    } catch (flutterErr) {
      if (this.isFlutter) {
        console.warn("[FlutterBridge] Flutter native getLocation not responding:", flutterErr);
      }
    }

    // Helper for browser GPS attempts
    const getBrowserPosition = (enableHighAccuracy, timeout = 7000) => {
      return new Promise((resolve, reject) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          return reject(new Error("Geolocation not supported by browser"));
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              source: 'browser_gps'
            });
          },
          (err) => reject(err),
          {
            enableHighAccuracy,
            timeout,
            maximumAge: 30000
          }
        );
      });
    };

    // Tier 2A: Browser High-Accuracy GPS
    try {
      const gpsResult = await getBrowserPosition(true, 6000);
      return gpsResult;
    } catch (gpsHighErr) {
      // Tier 2B: Browser Low-Accuracy (Cellular / Wi-Fi) fallback
      try {
        const gpsCoarseResult = await getBrowserPosition(false, 6000);
        return gpsCoarseResult;
      } catch (gpsCoarseErr) {
        console.warn("[FlutterBridge] Browser GPS failed, attempting IP fallback:", gpsCoarseErr);
      }
    }

    // Tier 3: IP-Based Geolocation Fallback (ensures user always gets city/locality)
    try {
      const ipRes = await api.get('/public/ip-location');
      if (ipRes.data?.success && ipRes.data?.latitude && ipRes.data?.longitude) {
        return {
          latitude: parseFloat(ipRes.data.latitude),
          longitude: parseFloat(ipRes.data.longitude),
          city: ipRes.data.city || '',
          region: ipRes.data.region || '',
          pincode: ipRes.data.pincode || '',
          source: 'ip_fallback'
        };
      }
    } catch (ipErr) {
      console.warn("[FlutterBridge] Backend IP lookup failed:", ipErr.message);
    }

    // Tier 4: Direct client IP lookup fallback
    try {
      const directIpRes = await fetch('http://ip-api.com/json/?fields=status,country,regionName,city,zip,lat,lon');
      const directIpData = await directIpRes.json();
      if (directIpData && directIpData.status === 'success' && directIpData.lat && directIpData.lon) {
        return {
          latitude: directIpData.lat,
          longitude: directIpData.lon,
          city: directIpData.city || '',
          region: directIpData.regionName || '',
          pincode: directIpData.zip || '',
          source: 'ip_fallback'
        };
      }
    } catch (directErr) {
      // Ignore
    }

    throw new Error("Unable to retrieve location via GPS or network");
  }

  /**
   * Triggers native haptic feedback.
   */
  async hapticFeedback(type = "medium") {
    return this.callHandler("haptic", { type });
  }

  /**
   * Opens App/System Settings (Native)
   */
  async openAppSettings() {
    return this.callHandler("openSettings");
  }
}

const bridgeInstance = new FlutterBridge();
export default bridgeInstance;
export const flutterBridge = bridgeInstance;
