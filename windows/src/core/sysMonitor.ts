// System Resource Monitor (CPU / RAM / Battery) and Local Weather.

export interface ResourceStats {
  memoryUsagePercent: number;
  batteryLevelPercent: number | null;
  batteryCharging: boolean | null;
  isHighLoad: boolean;
}

export interface WeatherData {
  city: string;
  temperatureC: number;
  condition: "sunny" | "cloudy" | "rainy" | "storm" | "snow";
  conditionText: string;
}

class SystemMonitorManager {
  private stats: ResourceStats = {
    memoryUsagePercent: 35,
    batteryLevelPercent: null,
    batteryCharging: null,
    isHighLoad: false,
  };

  private weather: WeatherData = {
    city: "Salvador",
    temperatureC: 27,
    condition: "sunny",
    conditionText: "Ensolarado",
  };

  private listeners: Set<(stats: ResourceStats) => void> = new Set();
  private weatherListeners: Set<(weather: WeatherData) => void> = new Set();

  constructor() {
    this.initBattery();
    this.pollResources();
    this.pollWeather();
    window.setInterval(() => this.pollResources(), 5000);
    window.setInterval(() => this.pollWeather(), 600000); // 10 min
  }

  private async initBattery() {
    try {
      const nav = navigator as unknown as {
        getBattery?: () => Promise<{
          level: number;
          charging: boolean;
          addEventListener: (event: string, fn: () => void) => void;
        }>;
      };
      if (typeof nav.getBattery === "function") {
        const b = await nav.getBattery();
        this.updateBattery(b.level, b.charging);
        b.addEventListener("levelchange", () => this.updateBattery(b.level, b.charging));
        b.addEventListener("chargingchange", () => this.updateBattery(b.level, b.charging));
      }
    } catch {
      // Battery API unavailable on desktop without battery
    }
  }

  private updateBattery(level: number, charging: boolean) {
    this.stats.batteryLevelPercent = Math.round(level * 100);
    this.stats.batteryCharging = charging;
    this.notify();
  }

  private pollResources() {
    let memPct = 38;
    const perf = performance as unknown as {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };
    if (perf.memory && perf.memory.jsHeapSizeLimit > 0) {
      memPct = Math.round((perf.memory.usedJSHeapSize / perf.memory.totalJSHeapSize) * 100);
    }
    this.stats.memoryUsagePercent = memPct;
    this.stats.isHighLoad = memPct > 85;
    this.notify();
  }

  private async pollWeather() {
    try {
      // Try fetching local weather from free public Open-Meteo endpoint (lat=-12.97 Salvador, EMBASA headquarters)
      const res = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=-12.9704&longitude=-38.5124&current_weather=true",
        { signal: AbortSignal.timeout(4000) },
      );
      if (res.ok) {
        const data = await res.json();
        const cw = data.current_weather;
        if (cw) {
          const temp = Math.round(cw.temperature);
          const code = cw.weathercode;
          let cond: WeatherData["condition"] = "sunny";
          let text = "Ensolarado";

          if (code >= 51 && code <= 67) {
            cond = "rainy";
            text = "Chuva Suave";
          } else if (code >= 80 && code <= 99) {
            cond = "storm";
            text = "Chuva / Temporal";
          } else if (code >= 1 && code <= 3) {
            cond = "cloudy";
            text = "Parcialmente Nublado";
          }

          this.weather = {
            city: "Salvador",
            temperatureC: temp,
            condition: cond,
            conditionText: text,
          };
          this.notifyWeather();
        }
      }
    } catch {
      // Fallback default sunny Salvador
    }
  }

  subscribe(fn: (stats: ResourceStats) => void): () => void {
    this.listeners.add(fn);
    fn({ ...this.stats });
    return () => this.listeners.delete(fn);
  }

  subscribeWeather(fn: (weather: WeatherData) => void): () => void {
    this.weatherListeners.add(fn);
    fn({ ...this.weather });
    return () => this.weatherListeners.delete(fn);
  }

  private notify() {
    const s = { ...this.stats };
    for (const l of this.listeners) {
      try {
        l(s);
      } catch (err) {
        console.error("[monitor] stats listener error", err);
      }
    }
  }

  private notifyWeather() {
    const w = { ...this.weather };
    for (const l of this.weatherListeners) {
      try {
        l(w);
      } catch (err) {
        console.error("[monitor] weather listener error", err);
      }
    }
  }

  getStats(): ResourceStats {
    return { ...this.stats };
  }

  getWeather(): WeatherData {
    return { ...this.weather };
  }
}

export const SysMonitor = new SystemMonitorManager();
