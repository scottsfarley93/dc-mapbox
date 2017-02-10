/*
This is mapbox-dc.js

Proivdes support for using mapbox-gl vector tile maps with the dc.js library.


*/

(function() { function _dc_mapbox(dc) {

    var dc_mapbox = {
        version: '0.0.1',
        defaultOptions : {
          center: new mapboxgl.LngLat(0, 0),
          zoom: 4,
          pointType: 'circle',
          pointColor: 'red',
          pointRadius: 5,
          brushOn: true,
          pointIcon: undefined,
          style:'mapbox://styles/mapbox/streets-v9',
          container: "map",
          renderPopup: false,
          brushOn: true
        }
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
          //render the map
            if(! _chart.map()){
                _map = _createMap(_chart.root());
                for(var ev in _cachedHandlers)
                    _map.on(ev, _cachedHandlers[ev]);

                if (_defaultCenter && _defaultZoom) {
                    _map.setCenter(_mapOptions.center).setZoom(_mapOptions.zoom)
                }
                _chart._postRender(); //called after render is complete
            }
            else
                //pass

            return _chart._doRedraw();
        };

        _chart._doRedraw = function() {
            return _chart;
        };

        _chart._postRender = function() {
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

    dc_mapbox.pointSymbolMap = function(parent, mapboxToken, options, chartGroup) {
      //constructs a new point symbol map with point symbols for each data point in the given dimension


        //combine properties from default properties
        _options = Object.assign({}, options, this.defaultOptions)

        var _renderPopup = _options.renderPopup;
        var _brushOn = _options.brushOn;
        var _center = _options.center;
        var _zoom = _options.zoom;


        //create a new chart base
        var _chart = dc_mapbox.mapboxBase(mapboxToken, _options);


        _chart.options = _options



        //Rendering and Drawing functions
        _chart._postRender = function() {
          //occurs after the base map has been rendered

          //register the filter handler
            _chart.filterHandler(areaFilter);

          //register filter event listeners
          _chart.map().on('moveend', boundsChangeFilter);
          _chart.map().on('zoomend', boundsChangeFilter);

          //add data source and layer
          _addMarkers()
        };


        _chart._doRedraw = function() {
          //called each time another chart in the group is updated
          //and on map bounds change
          //recompute the filter on the map's dimension

          //get a list of the groups currently within the filter on the dimension
          var groups = _chart._computeOrderedGroups(_chart.data())
          var groupsFiltered = groups.filter(function (d) {
              return _chart.valueAccessor()(d) !== 0;
          });

          //get the internal ids of each group within the current filter
          _idList = groupsFiltered.map(function(k){return k._id})

          //update the filter on the map layer
          _chart.map().setFilter("points", ["in", "_id"].concat(_idList))
        };


        //filter handlers

        var boundsChangeFilter = function(){
          //called when the map bounds change
          //filter the other charts in the group to these bounds

          filter = _chart.map().getBounds();

          //trigger filter events on other charts in the group
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

        var filterToBounds = function(bounds){
          //do the filtering on the map layer
            //get the corners of the filter
            var ne = bounds.getNorthEast()
            var sw = bounds.getSouthWest()

            //clear current filter
            _chart.map().setFilter('points', null)

            //filter to points that lie within the bounds
            _chart.map().setFilter("points", ['all',
                                                [">", "lat", sw.lat],
                                                ['<', 'lat', ne.lat],
                                                ['>', 'lng', sw.lng],
                                                ['<', 'lng', ne.lng]
                                              ])
        }

        var areaFilter = function(filter, filters){
          //filter the charts by the map bounds

          _chart.dimension().filter(null); //reset the filter so that they're not cumulative
          //signal to other charts that they need to be updated
          //communicate via crossfilter
          if (_brushOn){
            if (filters && filters.length>0) {
                _chart.dimension().filterFunction(function(d) {
                  var doesContain = contains(filters[0], d) //check if the filter bounds include each point
                  return doesContain
                });
                filterToBounds(filters[0])
            } // end if
          }

        }



        //chain functions that allow option specification
        //on creation

        _chart.brushOn = function(_) {
          //set brushing /filter by area option
            if (!arguments.length) {
                return _brushOn; //return current value if not set
            }
            _brushOn = _;
            return _chart;
        };

        //get/set center of map
        _chart.center = function(_){
          if (!arguments.length){
            return _center
          }
          _center = _;
          return _chart;
        }

        //get/set zoom of map
        _chart.zoom = function(_){
          if (!arguments.length){
            return _zoom
          }
          _zoom = _;
          return _chart;
        }



      //utility functions

        var _addMarkers = function(){
          //add the data to the map canvas

          //first convert to geojson, because mapbox can't consume straight json
          geojsonMarkers = _toGeoJson(_chart.data())


          //this happens async
          _chart.map().on('load', function() {
              //add the data source the the mpa
                    _chart.map().addSource("points", {
                        "type": "geojson",
                        "data": {
                            "type": "FeatureCollection",
                            "features": geojsonMarkers
                        }
                    });
                    _chart.map().addLayer({
                      //style the newly added source

                      //TODO: allow symbols
                        "id": "points",
                        "type": _chart.options.pointType,
                        "source": "points",
                        "icon": _chart.options.pointIcon,
                        // "layout": {
                        //       "icon-image": "airport-15",
                        //       "icon-padding": 0,
                        //       "icon-allow-overlap":true
                        //   },
                        "paint": {
                            "circle-radius": _chart.options.pointRadius,
                            "circle-color": _chart.options.pointColor,
                        }
                    });

                    //TODO: this isn't the best place for this
                    //makes the load seem jumpy
                    //but, since load comes async, it's difficult to do earlier ?
                    _chart.map().easeTo({center:_center, zoom: _zoom})
                }); // end on load
        }


        var _toGeoJson = function(data){
          //convert the chart data (DC/crossfilter dimension) into geojson for the map
          features = [] //array of geojson features
          _id = 0 //hold an internal id for filtering later on
          data.forEach(function(d){
            d.lat = d.key.lat
            d.lng = d.key.lng
            d._id = _id
            m = JSON.parse('{"type": "Feature", "geometry": {"type": "Point", "coordinates": ['+ d.lng +','+ d.lat+']}, "properties" : ' + JSON.stringify(d) + ' }')
            features.push(m)
            _id += 1
          }) // end forEach

          return features
        }

        var contains = function(bounds, point){
          //utility function
          //returns true if point is geographically within bounds
        		var sw = bounds.getSouthWest(),
        		    ne = bounds.getNorthEast()
        		return (point.lat >= sw.lat) && (point.lat <= ne.lat) &&
        		       (point.lng >= sw.lng) && (point.lng <= ne.lng);
        }


        //whole function returns the dc chart
        return _chart.anchor(parent, chartGroup);
    }; //end marker chart

    return dc_mapbox;
  } //end dc mapbox



  this.dc_mapbox = _dc_mapbox(dc);

}//end module
)();
