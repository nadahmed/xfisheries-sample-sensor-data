import axios from 'axios';
import data from '../../output.json';

interface SensorData {
  Time: string;
  Temperature: number;
  DO: number;
  pH: number;
  Ammonia: number;
}

const DEVICE_TOKENS = {
  TEMPERATURE: process.env.TB_TEMP_TOKEN,
  DO: process.env.TB_DO_TOKEN,
  PH: process.env.TB_PH_TOKEN,
  AMMONIA: process.env.TB_AMMONIA_TOKEN
};

const THINGSBOARD_URL = 'https://demo.thingsboard.io/api/v1';
const DHAKA_OFFSET = 6 * 60 * 60 * 1000; // UTC+6 in milliseconds

// Convert HH:MM:SS to total minutes
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Get current Dhaka time in HH:MM:SS format
const getDhakaTime = (): string => {
    const now = new Date();
    const dhakaTime = new Date(now.getTime() + DHAKA_OFFSET);
    
    return dhakaTime.toISOString().substring(11, 19); // Extracts HH:MM:SS
  };

export default async (req: Request) => {
    const { next_run } = await req.json()

    console.log("Received event! Next invocation at:", next_run)
    try {
        const currentTime = getDhakaTime();
        const currentMinutes = timeToMinutes(currentTime);
        const entries = data as SensorData[];

        // Find the closest next entry
        let closestEntry: SensorData | undefined;
        let smallestDiff = Infinity;

        entries.forEach(entry => {
        const entryMinutes = timeToMinutes(entry.Time);
        let diff = entryMinutes - currentMinutes;
        
        // Handle midnight wrap-around
        if (diff < 0) diff += 1440;  // 1440 minutes = 24 hours
        
        // Find the smallest non-negative difference
        if (diff < smallestDiff) {
            smallestDiff = diff;
            closestEntry = entry;
        }
        });

        if (!closestEntry) {
            return;
        }

        // Prepare payloads
        const requests = [
        {
            token: DEVICE_TOKENS.TEMPERATURE,
            payload: { temperature: closestEntry.Temperature }
        },
        {
            token: DEVICE_TOKENS.DO,
            payload: { do: closestEntry.DO }
        },
        {
            token: DEVICE_TOKENS.PH,
            payload: { ph: closestEntry.pH }
        },
        {
            token: DEVICE_TOKENS.AMMONIA,
            payload: { ammonia: closestEntry.Ammonia }
        }
    ];

    // Send data
    const responses = await Promise.all(
      requests.map(({ token, payload }) => 
        axios.post(`${THINGSBOARD_URL}/${token}/telemetry`, payload)
      )
    );

    return;
  } catch (error) {
    console.error('Error:', error);
    return;
  }
};