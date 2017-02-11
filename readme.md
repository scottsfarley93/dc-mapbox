## DC-Mapbox

This is a library to facilitate communication between ```mapboxgl``` maps, ```crossfilter``` filters, and ```dc.js``` charts. This library draws heavily on the designs of the [DC.Leaflet.js](https://github.com/dc-js/dc.leaflet.js) plugin. However, without the conception of an overlay layer, much of the code was changed to support the mapbox message passing interface. It is not finished, but works moderately well for simple tasks.

#### Demo
There is a live demo [here](http://scottsfarley.com/dc-mapbox/examples/)

### Requirements

- [dc.js](https://github.com/dc-js/dc.js)
- [d3.js](https://github.com/d3/d3)
- [crossfilter.js](https://github.com/square/crossfilter)
- [mapbox-gl.js](https://github.com/mapbox/mapbox-gl-js)

### API Reference
Most of the options are currently set in the map options, though some are set via the chained methods common in d3. Only a single chart is currently supported -- a map with a ```circles``` overlay. The map extends the dc base chart mixin and the mapbox base map class. The map supports filtering by map bounds and live updating from filters applied on other dc charts on the page.

You must have a ```mapboxToken``` to use the mapbox API, you can get one [here](https://www.mapbox.com/studio/account/tokens/). The ```parent``` is the container into which you want to put the new chart.

**Constructor:** ```dc_mapbox.pointSymbolMap(parent, mapboxToken, options, chartGroup)```

**Options:**

- ```center:``` Center of the map at session start (default ```new mapboxgl.LngLat(0, 0)```)
- ```zoom```: Zoom level of map at session start (default ```4```)
- ```pointType```: Type of symbol to display.  Currently only ```circle``` is supported. (default ```circle```)
- ```pointColor```: Color of the symbol (default ```red```)
- ```pointRadius```: Radius of the symbol (default ```4```)
- ```brushOn```: Does the map fire filter events as it is browsed? (default ```true```)
- ```style```: Vector tileset for the map (default ```'mapbox://styles/mapbox/streets-v9'```)
- ```renderPopup```: Should a popup appear on click? (default ```true```)


**Methods:**
- ```.dimension(crossfilterDimension)```: set the crossfilter dimension for the chart. Currently ***must*** return a ```mapboxgl.LngLat``` object (***REQUIRED***)
- ```.dimension(crossfilterGroup)```: set the crossfilter grouping for the chart. (***REQUIRED***)
- ```.brushOn(boolean)```: Get or set the ```brushOn``` property.


**Example**


```

var mapOptions = {
  style: 'mapbox://styles/sfarley2/ciz0ar5g7000q2spdnhi4m3m5', //set to tileset of choice
  pointColor: 'red', //modify circle narker properties
  pointRadius: 3,
  pointType: "circle",
  //set initial zoom
  center: new mapboxgl.LngLat(-74.0059, 40.7127),
  zoom: 9,
}

var myToken = "my/mapbox/token/"

facts = crossfilter(data)

//4. Geo lat/lng dimension
geoDimension = facts.dimension(function(d){
  return new mapboxgl.LngLat(d.Longitude, d.Latitude)}
);
geoGroup = geoDimension.group().reduceCount();

//make a new map and add the points
var mapChart = dc_mapbox.pointSymbolMap("#map", myToken, mapOptions)
  .dimension(geoDimension)
  .group(geoGroup)

```

An annotated source for the library can be found [here](mapbox_dc.js) and an commented example can be found in the examples folder of this repository, with [html](examples/index.html) and [javascript](examples/main.js).
