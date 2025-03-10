"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import "chart.js/auto";

export default function Home() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [commentary, setCommentary] = useState("Loading market insights...");
  const [language, setLanguage] = useState("en");
  const [theme, setTheme] = useState("dark");
  const [timeframe, setTimeframe] = useState("15");
  const [marketData, setMarketData] = useState<any[]>([]);
  const [indicators, setIndicators] = useState<any[]>([]);
  const [autoTradeEnabled, setAutoTradeEnabled] = useState(false);
  const [isAudioContinuous, setIsAudioContinuous] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Inject TradingView widget script (ensure no duplicates)
  useEffect(() => {
    if (!document.querySelector("#tradingview-script")) {
      const script = document.createElement("script");
      script.id = "tradingview-script";
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = () => {
        if (chartRef.current) {
          new (window as any).TradingView.widget({
            width: "100%",
            height: "400",
            symbol: "OANDA:XAUUSD",
            interval: timeframe,
            timezone: "Etc/UTC",
            theme: theme,
            style: "1",
            locale: language,
            toolbar_bg: "#f1f3f6",
            hide_side_toolbar: false,
            allow_symbol_change: true,
            container_id: "tradingview_chart",
            studies: [
              "RSI@tv-basicstudies",
              "MACD@tv-basicstudies",
              "Moving Average@tv-basicstudies",
              "PivotPointsStandard@tv-basicstudies",
              "BollingerBands@tv-basicstudies",
              "Volume@tv-basicstudies",
              "Supertrend@tv-basicstudies",
              "SupportResistance@tv-basicstudies",
            ],
            overrides: {
              volumePaneSize: 30,
            },
          });
        }
      };
      document.body.appendChild(script);
    }
  }, [timeframe, theme, language]);

  // Fetch Market Data and Indicators every 5 seconds
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:5000/market-data?symbol=XAUUSDm");
        setMarketData(response.data);
      } catch (error) {
        console.error("Market data fetch error:", error);
      }
    };

    const fetchIndicators = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:5000/indicators?symbol=XAUUSDm");
        setIndicators(response.data);
      } catch (error) {
        console.error("Indicators fetch error:", error);
      }
    };

    fetchMarketData();
    fetchIndicators();
    const intervalId = setInterval(() => {
      fetchMarketData();
      fetchIndicators();
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  // Continuous commentary fetching and audio playback with proper cleanup
  useEffect(() => {
    let commentaryInterval: NodeJS.Timeout;

    const continuousFetchAndPlay = async () => {
      try {
        // Stop and clear previous audio if any
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current = null;
        }
        // Fetch commentary text
        const response = await axios.get("http://127.0.0.1:5000/ai-commentary?language=" + language);
        const text = response.data.message;
        setCommentary(text);
        // Fetch audio for the commentary text
        const audioResponse = await axios.post(
          "http://127.0.0.1:5000/text-to-speech",
          { text, language },
          { responseType: "blob" }
        );
        const url = URL.createObjectURL(audioResponse.data);
        const newAudio = new Audio(url);
        audioRef.current = newAudio;
        newAudio.play().catch((err) => console.error("Audio play error:", err));
      } catch (error) {
        console.error("Error in continuous commentary:", error);
      }
    };

    if (isAudioContinuous) {
      continuousFetchAndPlay(); // initial call
      commentaryInterval = setInterval(() => {
        continuousFetchAndPlay();
      }, 5000); // fetch and play every 5 seconds
    }

    return () => {
      if (commentaryInterval) clearInterval(commentaryInterval);
    };
  }, [isAudioContinuous, language]);

  // Auto trade functionality: triggers every 10 seconds if enabled
  useEffect(() => {
    const autoTradeInterval = setInterval(async () => {
      if (autoTradeEnabled && marketData.length > 0 && indicators.length > 0) {
        const latestMarket = marketData[marketData.length - 1];
        const latestIndicator = indicators[indicators.length - 1];
        // Example logic: if latest close price is greater than SMA_20, then SELL; else BUY
        const action = latestMarket.close > latestIndicator.SMA_20 ? "SELL" : "BUY";
        console.log("Auto trading triggered:", action, "at price", latestMarket.close);
        try {
          await sendTradeSignal(action);
        } catch (error) {
          console.error("Auto trade error:", error);
        }
      }
    }, 10000);
    return () => clearInterval(autoTradeInterval);
  }, [autoTradeEnabled, marketData, indicators]);

  const sendTradeSignal = async (action: string) => {
    try {
      const response = await axios.post("http://127.0.0.1:5000/trade", {
        symbol: "XAUUSDm",
        volume: 0.1,
        type: action, // Note: backend converts this to lowercase
      });
      console.log("Trade executed:", response.data);
    } catch (error) {
      console.error("Trade error:", error);
      alert("Trade execution failed. Please check the server connection.");
    }
  };

  return (
    <div className="grid min-h-screen p-8 gap-16 sm:p-20 font-sans bg-gray-900 text-white">
      <main className="flex flex-col gap-8 items-center w-full">
        <h1 className="text-3xl font-bold">AI Mastermind - Live Market</h1>
        <select
          onChange={(e) => setLanguage(e.target.value)}
          value={language}
          className="p-2 rounded bg-gray-700 text-white"
        >
          <option value="en">English</option>
          <option value="ur">اردو</option>
          <option value="hi">हिंदी</option>
        </select>
        <div className="flex gap-4">
          <button
            onClick={() => sendTradeSignal("BUY")}
            className="bg-green-500 px-4 py-2 rounded-md"
          >
            BUY
          </button>
          <button
            onClick={() => sendTradeSignal("SELL")}
            className="bg-red-500 px-4 py-2 rounded-md"
          >
            SELL
          </button>
          <button
            onClick={() => setAutoTradeEnabled(!autoTradeEnabled)}
            className="bg-blue-500 px-4 py-2 rounded-md"
          >
            {autoTradeEnabled ? "Disable Auto Trade" : "Enable Auto Trade"}
          </button>
        </div>
        <p className="mt-4">{commentary}</p>
        <button
          onClick={() => {
            // If stopping, pause and clear any playing audio
            if (isAudioContinuous && audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              audioRef.current = null;
            }
            setIsAudioContinuous(!isAudioContinuous);
          }}
          className="bg-indigo-500 px-4 py-2 rounded-md"
        >
          {isAudioContinuous ? "Stop Commentary Audio" : "Play Commentary Audio"}
        </button>

        {/* TradingView Chart Container */}
        <div id="tradingview_chart" ref={chartRef} className="w-full max-w-7xl h-96"></div>

        {/* Market Data Chart using react-chartjs-2 */}
        <div className="w-full max-w-7xl">
          <h2 className="text-xl font-bold">Market Data</h2>
          <Line
            data={{
              labels: marketData.map((d) =>
                new Date(d.time * 1000).toLocaleTimeString()
              ),
              datasets: [
                {
                  label: "Close Price",
                  data: marketData.map((d) => d.close),
                  borderColor: "#FFD700",
                  backgroundColor: "rgba(255, 215, 0, 0.3)",
                },
              ],
            }}
          />
        </div>

        {/* Indicators Chart using react-chartjs-2 */}
        <div className="w-full max-w-7xl">
          <h2 className="text-xl font-bold">Indicators</h2>
          <Line
            data={{
              labels: indicators.map((d) =>
                new Date(d.time * 1000).toLocaleTimeString()
              ),
              datasets: [
                {
                  label: "SMA 20",
                  data: indicators.map((d) => d.SMA_20),
                  borderColor: "#00FF00",
                  backgroundColor: "rgba(0, 255, 0, 0.3)",
                },
                {
                  label: "RSI 14",
                  data: indicators.map((d) => d.RSI_14),
                  borderColor: "#FF4500",
                  backgroundColor: "rgba(255, 69, 0, 0.3)",
                },
                {
                  label: "MACD",
                  data: indicators.map((d) => d.MACD),
                  borderColor: "#1E90FF",
                  backgroundColor: "rgba(30, 144, 255, 0.3)",
                },
              ],
            }}
          />
        </div>
      </main>
    </div>
  );
}
