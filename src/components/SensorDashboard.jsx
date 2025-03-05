import React, { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from "recharts";
import "./SensorDashboard.css";

const SensorDashboard = () => {
  const [sensorData, setSensorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [latestReading, setLatestReading] = useState(null);
  const [timeRange, setTimeRange] = useState("hour"); // 'hour', 'day', 'month', 'all'
  const [chartType, setChartType] = useState("temperature"); // 'temperature', 'humidity', 'gas'

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          "https://esp32-room-sensor.azurewebsites.net/api/sensor"
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // Process data to ensure timestamps are Date objects and values are numbers
        const processedData = data
          .map((item) => ({
            ...item,
            timestamp: new Date(item.timestamp),
            temperature: parseFloat(item.temperature),
            humidity: parseFloat(item.humidity),
            gasVoltage: parseFloat(item.gasVoltage),
          }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        setSensorData(processedData);

        // Set the latest reading
        if (processedData.length > 0) {
          setLatestReading(processedData[0]);
        }

        setError(null);
      } catch (err) {
        setError(`Error fetching sensor data: ${err.message}`);
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    // Fetch data immediately
    fetchData();

    // Then set up an interval to fetch data every 30 seconds
    const intervalId = setInterval(fetchData, 30000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  // Function to determine gas level status
  const getGasStatus = (voltage) => {
    if (voltage > 1.0) return "danger";
    if (voltage > 0.5) return "warning";
    return "safe";
  };

  // Filter data based on selected time range
  const getFilteredData = () => {
    if (!sensorData.length) return [];

    const now = new Date();

    switch (timeRange) {
      case "hour":
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        return sensorData.filter((d) => d.timestamp >= hourAgo);
      case "day":
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return sensorData.filter((d) => d.timestamp >= dayAgo);
      case "month":
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return sensorData.filter((d) => d.timestamp >= monthAgo);
      case "all":
      default:
        return sensorData;
    }
  };

  // Prepare data for charts (reversed to show oldest to newest left to right)
  const chartData = getFilteredData().slice().reverse();

  // Format timestamp for chart display
  const formatChartTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    if (timeRange === "hour") {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (timeRange === "day") {
      return `${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else {
      return `${date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      })} ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }
  };

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{`${new Date(
            payload[0].payload.timestamp
          ).toLocaleString()}`}</p>
          {chartType === "temperature" && (
            <p className="value temperature">{`Temperature: ${payload[0].value.toFixed(
              1
            )}°C`}</p>
          )}
          {chartType === "humidity" && (
            <p className="value humidity">{`Humidity: ${payload[0].value.toFixed(
              1
            )}%`}</p>
          )}
          {chartType === "gas" && (
            <p className="value gas">{`Gas Level: ${payload[0].value.toFixed(
              2
            )}V`}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>ESP32 Sensor Dashboard</h1>
        <p className="dashboard-subtitle">
          Real-time monitoring of environmental conditions
        </p>
      </header>

      {loading && sensorData.length === 0 && (
        <div className="loading-indicator">Loading sensor data...</div>
      )}

      {error && <div className="error-message">{error}</div>}

      {latestReading && (
        <div className="current-readings">
          <h2>Current Readings</h2>
          <div className="readings-grid">
            <div className="reading-card temperature">
              <div className="reading-icon">🌡️</div>
              <div className="reading-value">
                {latestReading.temperature.toFixed(1)}°C
              </div>
              <div className="reading-label">Temperature</div>
            </div>

            <div className="reading-card humidity">
              <div className="reading-icon">💧</div>
              <div className="reading-value">
                {latestReading.humidity.toFixed(1)}%
              </div>
              <div className="reading-label">Humidity</div>
            </div>

            <div
              className={`reading-card gas ${getGasStatus(
                latestReading.gasVoltage
              )}`}
            >
              <div className="reading-icon">🌫️</div>
              <div className="reading-value">
                {latestReading.gasVoltage.toFixed(2)}V
              </div>
              <div className="reading-label">Gas Level</div>
              <div className="gas-status">
                {getGasStatus(latestReading.gasVoltage).toUpperCase()}
              </div>
            </div>

            <div className="reading-card time">
              <div className="reading-icon">🕒</div>
              <div className="reading-value">
                {formatDate(latestReading.timestamp)}
              </div>
              <div className="reading-label">Last Updated</div>
            </div>
          </div>
        </div>
      )}

      <div className="chart-section">
        <h2>Sensor History</h2>

        <div className="chart-controls">
          <div className="control-group">
            <label>Chart Type:</label>
            <div className="button-group">
              <button
                className={chartType === "temperature" ? "active" : ""}
                onClick={() => setChartType("temperature")}
              >
                Temperature
              </button>
              <button
                className={chartType === "humidity" ? "active" : ""}
                onClick={() => setChartType("humidity")}
              >
                Humidity
              </button>
              <button
                className={chartType === "gas" ? "active" : ""}
                onClick={() => setChartType("gas")}
              >
                Gas Level
              </button>
            </div>
          </div>

          <div className="control-group">
            <label>Time Range:</label>
            <div className="button-group">
              <button
                className={timeRange === "hour" ? "active" : ""}
                onClick={() => setTimeRange("hour")}
              >
                Last Hour
              </button>
              <button
                className={timeRange === "day" ? "active" : ""}
                onClick={() => setTimeRange("day")}
              >
                Last Day
              </button>
              <button
                className={timeRange === "month" ? "active" : ""}
                onClick={() => setTimeRange("month")}
              >
                Last Month
              </button>
              <button
                className={timeRange === "all" ? "active" : ""}
                onClick={() => setTimeRange("all")}
              >
                All Data
              </button>
            </div>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatChartTimestamp}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {chartType === "temperature" && (
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    name="Temperature (°C)"
                    stroke="#e74c3c"
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                )}
                {chartType === "humidity" && (
                  <Line
                    type="monotone"
                    dataKey="humidity"
                    name="Humidity (%)"
                    stroke="#3498db"
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                )}
                {chartType === "gas" && (
                  <Line
                    type="monotone"
                    dataKey="gasVoltage"
                    name="Gas Level (V)"
                    stroke="#95a5a6"
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                )}
                <Brush
                  dataKey="timestamp"
                  height={30}
                  stroke="#8884d8"
                  tickFormatter={formatChartTimestamp}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="no-data-message">
            No historical data available for the selected time range.
          </p>
        )}
      </div>

      <div className="history-section">
        <h2>Data Log</h2>
        {sensorData.length > 0 ? (
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Temperature (°C)</th>
                  <th>Humidity (%)</th>
                  <th>Gas Level (V)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredData().map((reading, index) => (
                  <tr key={index} className={getGasStatus(reading.gasVoltage)}>
                    <td>{formatDate(reading.timestamp)}</td>
                    <td>{reading.temperature.toFixed(1)}</td>
                    <td>{reading.humidity.toFixed(1)}</td>
                    <td>{reading.gasVoltage.toFixed(2)}</td>
                    <td className="status-cell">
                      <span
                        className={`status-indicator ${getGasStatus(
                          reading.gasVoltage
                        )}`}
                      >
                        {getGasStatus(reading.gasVoltage).toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-data-message">No historical data available.</p>
        )}
      </div>

      <footer className="dashboard-footer">
        <p>ESP32 Sensor Monitoring System &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default SensorDashboard;
