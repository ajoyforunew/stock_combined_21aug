
import React from "react";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  TimeScale
} from "chart.js";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  TimeScale
);

const StockChart = ({ data }) => {
  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      tooltip: { mode: "index", intersect: false },
    },
    interaction: {
      mode: "nearest",
      axis: "x",
      intersect: false
    },
    scales: {
      x: { type: "time", time: { unit: "day" } },
      y: { beginAtZero: false }
    }
  };

  return <Line data={data} options={options} />;
};

export default StockChart;
