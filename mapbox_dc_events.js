
(function() { function _dc_mapbox(dc) {

    var dc_mapbox = {
        version: '0.0.1'
    };

    dc_mapbox.mapboxBase = function(mapboxToken, mapOptions) {
        console.log(mapboxToken)
        _chart = dc.marginMixin(dc.baseChart({})); //_chart inherits from dc

        _chart.margins({left:0, top:0, right:0, bottom:0});

        var _map;

        var _mapOptions= mapOptions;
        var _defaultCenter=false;
        var _defaultZoom=false;

        var _cachedHandlers = {};

        _createMap = function() {
          //create the mapbox gl map
            mapboxgl.accessToken = mapboxToken;
            var map = new mapboxgl.Map(_mapOptions);

            return map;
        };


        _chart.createMap = function(_) {
          //prepare the map container for rendering
            if(!arguments.length) {
                return _createMap;
            }
            _createMap = _;
            return _chart;
        };

        _chart._doRender = function() {
                      console.log("base rendering.")
          //render the map
            if(! _chart.map()){
                _map = _createMap(_chart.root());
                for(var ev in _cachedHandlers)
                    _map.on(ev, _cachedHandlers[ev]);

                if (_defaultCenter && _defaultZoom) {
                    _map.setCenter([0,0]).setZoom(2)
                }
                _chart._postRender(); //called after render is complete
            }
            else
                //pass

            return _chart._doRedraw();
        };

        _chart._doRedraw = function() {
              console.log("base do redraw.")
            return _chart;
        };

        _chart._postRender = function() {
            console.log("base post render.")
            return _chart;
        };
        _chart.map = function() {
            return _map;
        };

        // combine Leaflet events into d3 & dc events
          dc.override(_chart, 'on', function(event, callback) {
              var leaflet_events = ['zoomend', 'moveend'];
              if(leaflet_events.indexOf(event) >= 0) {
                  if(_map) {
                      _map.on(event, callback);
                  }
                  else {
                      _cachedHandlers[event] = callback;
                  }
                  return this;
              }
              else return _chart._on(event, callback);
          });
        return _chart;
    };

    dc_mapbox.markerChart = function(parent, chartGroup, mapboxToken, mapOptions) {
        var _chart = dc_mapbox.mapboxBase(mapboxToken, mapOptions); //create a base map
        //initialize the map

        var _renderPopup = true;

        var _rebuildMarkers = false;
        var _brushOn = true;
        var _filterByArea = true;

        var _filter;
        var _innerFilter=false;
        var _zooming=false;
        var _layerGroup = false;
        var _markerList = [];
        var _currentGroups=false;

        _chart.renderTitle(false);
        _chart.markersOn = false;

        var _location = function(d) {
          //get location of marker
          //grouping is by L.latLng object
            return _chart.keyAccessor()(d);
        };

        var _toGeoJson = function(data){
          features = []
          _id = 0
          data.forEach(function(d){
            d.lat = d.key.lat
            d.lng = d.key.lng
            m = JSON.parse('{"type": "Feature", "geometry": {"type": "Point", "coordinates": ['+ d.lng +','+ d.lat+']}, "properties" : ' + JSON.stringify(d) + ' }')
            features.push(m)
            _id += 1
          }) // end forEach

          return features
        }


        var _addMarkers = function(){

          geojsonMarkers = _toGeoJson(_chart.data())

          _chart.map().on('load', function() {
            console.log("Loadinga!")
                    _chart.map().addSource("points", {
                        "type": "geojson",
                        "data": {
                            "type": "FeatureCollection",
                            "features": geojsonMarkers
                        }
                    });
                    _chart.map().addLayer({
                        "id": "points",
                        "type": "circle",
                        "source": "points",
                        "paint": {
                            "circle-radius": 8,
                            "circle-color": "#000"
                        }
                    });
                }); // end on load
        }
        //
        // var _marker = function(d,map) {
        //   //create the circle markers using this factory
        //     var marker = new L.CircleMarker(_chart.toLocArray(_chart.locationAccessor()(d)), globals.config.map.markerRadius,{
        //       //TODO: do stuff with _id here
        //         icon: _icon(),
        //         clickable: (_chart.brushOn() && !_filterByArea),
        //         draggable: false,
        //         fill: 'red',
        //         fillOpacity:0.5,
        //         stroke: 'red'
        //     });
        //     return marker;
        // };
        //
        // var _icon = function(d,map) {
        //   //custom icon here if required
        //     return new L.Icon.Default();
        // };
        //
        // var _popup = function(d,marker) {
        //   //populate the popup
        //     return _chart.title()(d);
        // };

        _chart._postRender = function() {
          console.log("Post Render")

          //register the filter handler
            _chart.filterHandler(doFilterByArea);

          //register filter event listeners
          _chart.map().on('moveend', zoomFilter);

          _addMarkers()
        };

        var doFilterByArea = function(filter, filters){
          _chart.dimension().filter(null);
          //signal to other charts that they need to be updated
          //communicate via crossfilter
          if (filters && filters.length>0) {
              _chart.dimension().filterFunction(function(d) {
                var doesContain = contains(filters[0], d) //check if the filter bounds include each point
                return doesContain
              });
              filterToArray(filters[0])
          } // end if
        }

        var filterToArray = function(filter){
          var ne = filter.getNorthEast()
          var sw = filter.getSouthWest()
          _chart.map().setFilter('points', null)
          _chart.map().setFilter("points", ['all', [">", "lat", sw.lat], ['<', 'lat', ne.lat], ['>', 'lng', sw.lng], ['<', 'lng', ne.lng]])
        }

        _chart._doRedraw = function() {

          // console.log(_chart.filters())
            var groups = _chart._computeOrderedGroups(_chart.data()).filter(function (d) {
                return _chart.valueAccessor()(d) !== 0;
            });
        };

        var zoomFilter = function(){
          filter = _chart.map().getBounds();
          console.log(filter)
          dc.events.trigger(function () {
            //redraw all dashboard charts
              _chart.filter(null);
              if (filter) {
                  _innerFilter=true;
                  _chart.filter(filter);
                  _innerFilter=false;
              }
              dc.redrawAll(_chart.chartGroup()); //do redraw
          });
        }

        //accessor functions
        _chart.locationAccessor = function(_) {
            if (!arguments.length) {
                return _location;
            }
            _location= _;
            return _chart;
        };

        _chart.brushOn = function(_) {
            if (!arguments.length) {
                return _brushOn;
            }
            _brushOn = _;
            return _chart;
        };

        var contains = function(bounds, point){
        		var sw = bounds.getSouthWest(),
        		    ne = bounds.getNorthEast()
        		return (point.lat >= sw.lat) && (point.lat <= ne.lat) &&
        		       (point.lng >= sw.lng) && (point.lng <= ne.lng);
        }


        //
        var selectFilter = function(e) {
            if (!e.target) return;
            var filter = e.target.key;
            dc.events.trigger(function () {
                _chart.filter(filter);
                dc.redrawAll(_chart.chartGroup());
            });
        };

        return _chart.anchor(parent, chartGroup);
    };

  dc_mapbox.d3 = d3;
  dc_mapbox.crossfilter = crossfilter;
  dc_mapbox.dc = dc;

  return dc_mapbox;
  }



      this.dc_mapbox = _dc_mapbox(dc);

}
)();
