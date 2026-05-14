import mapboxgl from "https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

mapboxgl.accessToken = "pk.eyJ1IjoidHJpdG9uc3Rld2FydCIsImEiOiJjbXA0b3YwdHEwc2dmMnRvYWQ2Mnl2YWo5In0.-s-CghOxkjrQviwON0rr_A";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12",
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});

const bikeLaneStyle = {
  "line-color": "#32D400",
  "line-width": 5,
  "line-opacity": 0.6,
};

const svg = d3.select("#map").select("svg");

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString("en-US", { timeStyle: "short" });
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function filterTripsByTime(trips, timeFilter) {
  return timeFilter === -1
    ? trips
    : trips.filter((trip) => {
        const startedMinutes = minutesSinceMidnight(trip.started_at);
        const endedMinutes = minutesSinceMidnight(trip.ended_at);

        return (
          Math.abs(startedMinutes - timeFilter) <= 60 ||
          Math.abs(endedMinutes - timeFilter) <= 60
        );
      });
}

function computeStationTraffic(stations, trips) {
  const departures = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.start_station_id
  );

  const arrivals = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.end_station_id
  );

  return stations.map((station) => {
    const id = station.short_name;

    station.departures = departures.get(id) ?? 0;
    station.arrivals = arrivals.get(id) ?? 0;
    station.totalTraffic = station.departures + station.arrivals;
    station.trafficBalance = station.departures - station.arrivals;

    return station;
  });
}

map.on("load", async () => {
  map.addSource("boston_route", {
    type: "geojson",
    data: "https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson",
  });

  map.addLayer({
    id: "boston-bike-lanes",
    type: "line",
    source: "boston_route",
    paint: bikeLaneStyle,
  });

  map.addSource("cambridge_route", {
    type: "geojson",
    data: "RECREATION_BikeFacilities.geojson.txt",
  });

  map.addLayer({
    id: "cambridge-bike-lanes",
    type: "line",
    source: "cambridge_route",
    paint: bikeLaneStyle,
  });

  const jsonData = await d3.json(
    "https://dsc106.com/labs/lab07/data/bluebikes-stations.json"
  );

  const stations = jsonData.data.stations;

  const trips = await d3.csv(
    "https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv",
    (trip) => {
      trip.started_at = new Date(trip.started_at);
      trip.ended_at = new Date(trip.ended_at);
      return trip;
    }
  );

  const stationsWithTraffic = computeStationTraffic(stations, trips);

  const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(stationsWithTraffic, (d) => d.totalTraffic)])
    .range([0, 25]);

  const maxBalance = d3.max(stationsWithTraffic, (d) =>
    Math.abs(d.trafficBalance)
  );

  const colorScale = d3
    .scaleDiverging()
    .domain([-maxBalance, 0, maxBalance])
    .interpolator(d3.interpolateRdYlBu);

  const circles = svg
    .selectAll("circle")
    .data(stationsWithTraffic, (d) => d.short_name)
    .enter()
    .append("circle")
    .attr("fill", (d) => colorScale(d.trafficBalance))
    .attr("stroke", "white")
    .attr("stroke-width", 1)
    .attr("opacity", 0.8);

  function updatePositions() {
    circles
      .attr("cx", (d) => getCoords(d).cx)
      .attr("cy", (d) => getCoords(d).cy);
  }

  function updateTooltips() {
    circles.selectAll("title").remove();

    circles.append("title").text(
      (d) =>
        `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`
    );
  }

  function updateScatterPlot(timeFilter) {
    const filteredTrips = filterTripsByTime(trips, timeFilter);
    const filteredStations = computeStationTraffic(stations, filteredTrips);

    timeFilter === -1
      ? radiusScale.range([0, 25])
      : radiusScale.range([3, 50]);

    circles
      .data(filteredStations, (d) => d.short_name)
      .attr("r", (d) => radiusScale(d.totalTraffic))
      .attr("fill", (d) => colorScale(d.trafficBalance));

    updateTooltips();
    updatePositions();
  }

  const timeSlider = document.getElementById("time-slider");
  const selectedTime = document.getElementById("selected-time");
  const anyTimeLabel = document.getElementById("any-time");

  function updateTimeDisplay() {
    const timeFilter = Number(timeSlider.value);

    if (timeFilter === -1) {
      selectedTime.textContent = "";
      anyTimeLabel.style.display = "block";
    } else {
      selectedTime.textContent = formatTime(timeFilter);
      anyTimeLabel.style.display = "none";
    }

    updateScatterPlot(timeFilter);
  }

  timeSlider.addEventListener("input", updateTimeDisplay);
  updateTimeDisplay();

  map.on("move", updatePositions);
  map.on("zoom", updatePositions);
  map.on("resize", updatePositions);
  map.on("moveend", updatePositions);
});