export interface Fish {
  id: string;
  x: number; // Percent width of sonar screen (0 - 100) or position in pond
  y: number; // Speed/depth percent (usually depth value in meters based on max depth)
  depth: number; // Actual depth in meters (e.g. 1.8)
  size: 'small' | 'medium' | 'large';
  weight: number; // in kg (simulated)
  speed: number; // moving speed factor
  direction: 1 | -1; // swimming direction or speed vector
  species: string; // Mas, Nila, Patin, Bawal, Gurame, Lele
  active: boolean;
}

export interface SonarSettings {
  frequency: 'CHIRP' | '200kHz' | '50kHz';
  beamAngle: 7 | 20 | 47; // Narrow, Medium, Wide
  sensitivity: number; // 1 to 100
  depthRange: 'auto' | 5 | 10 | 15; // in meters
  noiseFilter: 'low' | 'medium' | 'high' | 'off';
  fishSymbols: boolean; // Show fish icons or raw sonar arches
  fishDepthLabels: boolean;
  colorPalette: 'marine' | 'daylight' | 'grayscale';
  alarmSmall: boolean;
  alarmMedium: boolean;
  alarmLarge: boolean;
  soundEnabled: boolean;
}

export interface CatchLog {
  id: string;
  timestamp: string; // ISO date string
  species: string;
  weight: number; // in kg
  length: number; // in cm
  bait: string;
  depth: number; // capture absolute depth
  notes: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface PondStructure {
  id: string;
  type: 'weed' | 'rock' | 'log' | 'food';
  x: number; // Coordinate in percent (0 - 100)
  y: number; // Coordinate in percent (0 - 100)
  radius: number; // influence radius
  amount?: number; // for food (depletes over time)
  createdAt: number;
}

export interface DeviceStatus {
  connected: boolean;
  connecting: boolean;
  battery: number; // 0 - 100 %
  signalStrength: number; // 0 - 5 bars
  waterTemp: number; // in Celsius
  airTemp: number; // in Celsius
  waterClarity: 'keruh' | 'sedang' | 'jernih';
  phLevel: number; // 6.5 - 8.5
  error: string | null;
}
