import axios from 'axios';
import data from '../../output.json';

interface SensorData {
  Time: string;
  Temperature: number;
  DO: number;
  pH: number;
  Ammonia: number;
}

// Device access tokens (store these in Netlify environment variables)
const DEVICE_TOKENS = {
  TEMPERATURE: process.env.TB_TEMP_TOKEN,
  DO: process.env.TB_DO_TOKEN,
  PH: process.env.TB_PH_TOKEN,
  AMMONIA: process.env.TB_AMMONIA_TOKEN
};

const THINGSBOARD_URL = 'https://thingsboard.cloud/api/v1';

export default async (req: Request) => {
    const { next_run } = await req.json()

    console.log("Received event! Next invocation at:", next_run)
  try {
    // Get current time in HH:MM:SS format (adjust timezone if needed)
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Find matching data entry
    const entry = (data as SensorData[]).find(item => item.Time === currentTime);
    
    if (!entry) {
      return { statusCode: 404, body: 'No data found for current time' };
    }

    // Prepare payloads for each device
    const requests = [
      {
        token: DEVICE_TOKENS.TEMPERATURE,
        payload: { temperature: entry.Temperature }
      },
      {
        token: DEVICE_TOKENS.DO,
        payload: { do: entry.DO }
      },
      {
        token: DEVICE_TOKENS.PH,
        payload: { ph: entry.pH }
      },
      {
        token: DEVICE_TOKENS.AMMONIA,
        payload: { ammonia: entry.Ammonia }
      }
    ];

    // Send data to ThingsBoard
    const responses = await Promise.all(
      requests.map(({ token, payload }) => 
        axios.post(`${THINGSBOARD_URL}/${token}/telemetry`, payload)
      )
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Data sent successfully', responses: responses.map(r => r.status) })
    };
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};