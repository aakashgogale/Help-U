/**
 * Production-Ready Flutter JS Bridge
 * Handles secure and optimized communication with native mobile features.
 */
import api from '../services/api';

class FlutterBridge {
  constructor() {
    this.isFlutter = typeof window !== "undefined" && Boolean(window.flutter_inappwebview);
  }

  /**
   * Dynamically checks if the Flutter InAppWebView JavaScript bridge is ready.
   */
  isFlutterReady() {
    return (
      typeof window !== "undefined" &&
      Boolean(window.flutter_inappwebview && typeof window.flutter_inappwebview.callHandler === "function")
    );
  }

  /**
   * Waits for the native WebView bridge to be fully available.
   */
  waitForFlutter() {
    return new Promise((resolve) => {
      if (this.isFlutterReady()) {
        this.isFlutter = true;
        return resolve(true);
      }

      let resolved = false;
      const onReady = () => {
        if (resolved) return;
        resolved = true;
        this.isFlutter = true;
        resolve(true);
      };

      if (typeof window !== "undefined") {
        window.addEventListener("flutterInAppWebViewPlatformReady", onReady, { once: true });
      }

      // Check every 80ms for up to 1.2s in case bridge attaches without the event
      let elapsed = 0;
      const interval = setInterval(() => {
        elapsed += 80;
        if (this.isFlutterReady()) {
          clearInterval(interval);
          if (typeof window !== "undefined") {
            window.removeEventListener("flutterInAppWebViewPlatformReady", onReady);
          }
          if (!resolved) {
            resolved = true;
            this.isFlutter = true;
            resolve(true);
          }
        } else if (elapsed >= 1200) {
          clearInterval(interval);
          if (!resolved) {
            resolved = true;
            this.isFlutter = this.isFlutterReady();
            resolve(this.isFlutter);
          }
        }
      }, 80);
    });
  }

  /**
   * Universal call to any Flutter JS Handler with availability check.
   */
  async callHandler(handlerName, data = {}) {
    if (!this.isFlutterReady()) {
      await this.waitForFlutter();
    }

    if (!this.isFlutterReady()) {
      return { success: false, error: "Not inside Flutter WebView" };
    }

    try {
      const res = await window.flutter_inappwebview.callHandler(handlerName, data);
      return res !== undefined && res !== null ? res : { success: false, error: "Empty response from native handler" };
    } catch (error) {
      console.warn(`[FlutterBridge] Error calling native handler ${handlerName}:`, error);
      return { success: false, error: error?.message || String(error) };
    }
  }

  /* ================================
        CAMERA (NATIVE)
  ================================== */
  async openCamera() {
    try {
      const result = await this.callHandler("openCamera");

      if (result && result.success && result.base64) {
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
        LOCATION (NATIVE + FALLBACKS)
  ================================== */
  async getCurrentLocation() {
    // Tier 1: Flutter Native Handler (fastest, bypasses WebView permission prompts)
    try {
      if (this.isFlutterReady() || (await this.waitForFlutter())) {
        const result = await this.callHandler("getLocation");
        if (
          result &&
          result.success &&
          typeof result.latitude === 'number' &&
          typeof result.longitude === 'number'
        ) {
          return {
            latitude: result.latitude,
            longitude: result.longitude,
            accuracy: result.accuracy || 10,
            source: 'flutter_native'
          };
        }
      }
    } catch (flutterErr) {
      console.warn("[FlutterBridge] Flutter native getLocation not responding:", flutterErr);
    }

    // Helper for browser GPS attempts
    const getBrowserPosition = (enableHighAccuracy, timeout = 4000) => {
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
            maximumAge: 60000
          }
        );
      });
    };

    // Tier 2A: Browser High-Accuracy GPS
    try {
      const gpsResult = await getBrowserPosition(true, 4000);
      if (gpsResult && typeof gpsResult.latitude === 'number') {
        return gpsResult;
      }
    } catch (gpsHighErr) {
      // If user explicitly denied permission (code 1), don't waste time trying coarse
      if (gpsHighErr?.code !== 1) {
        try {
          const gpsCoarseResult = await getBrowserPosition(false, 3000);
          if (gpsCoarseResult && typeof gpsCoarseResult.latitude === 'number') {
            return gpsCoarseResult;
          }
        } catch (gpsCoarseErr) {
          console.warn("[FlutterBridge] Browser GPS coarse failed:", gpsCoarseErr);
        }
      }
    }

    // Tier 3: Backend IP-Based Geolocation Fallback (multi-provider resilient)
    try {
      const ipRes = await api.get('/public/ip-location');
      if (ipRes.data?.success && ipRes.data?.latitude && ipRes.data?.longitude) {
        return {
          latitude: parseFloat(ipRes.data.latitude),
          longitude: parseFloat(ipRes.data.longitude),
          city: ipRes.data.city || '',
          region: ipRes.data.region || '',
          pincode: ipRes.data.pincode || '',
          source: 'backend_ip'
        };
      }
    } catch (ipErr) {
      console.warn("[FlutterBridge] Backend IP lookup failed:", ipErr.message);
    }

    // Tier 4A: Direct Client HTTPS IP Geolocation (ipwho.is - HTTPS, CORS-enabled, no mixed content)
    try {
      const directIpRes = await fetch('https://ipwho.is/', { headers: { 'Accept': 'application/json' } });
      const directIpData = await directIpRes.json();
      if (directIpData && directIpData.success && directIpData.latitude && directIpData.longitude) {
        return {
          latitude: parseFloat(directIpData.latitude),
          longitude: parseFloat(directIpData.longitude),
          city: directIpData.city || '',
          region: directIpData.region || '',
          pincode: directIpData.postal || '',
          source: 'ip_fallback_ipwhois'
        };
      }
    } catch (directErr) {
      // Continue to next HTTPS provider
    }

    // Tier 4B: Direct Client HTTPS IP Geolocation (freeipapi.com - HTTPS, CORS-enabled)
    try {
      const freeIpRes = await fetch('https://freeipapi.com/api/json');
      const freeIpData = await freeIpRes.json();
      if (freeIpData && freeIpData.latitude && freeIpData.longitude) {
        return {
          latitude: parseFloat(freeIpData.latitude),
          longitude: parseFloat(freeIpData.longitude),
          city: freeIpData.cityName || '',
          region: freeIpData.regionName || '',
          pincode: freeIpData.zipCode || '',
          source: 'ip_fallback_freeipapi'
        };
      }
    } catch (freeIpErr) {
      // Continue
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
