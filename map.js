import mapboxgl from "https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm";

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

map.on("load", async () => {
  // Boston
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

  // Cambridge
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
});