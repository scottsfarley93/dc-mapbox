/*
This is mapbox-dc.js

Proivdes support for using mapbox-gl vector tile maps with the dc.js library.


TODO:
 - Mapbox styling functions
 - Popups


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
          renderPopup: true,
          brushOn: true,
          popupTextFunction: function(d){
            return d.properties.key
          },
          //necessary because we're using dimension instead of group -- bad
          latitudeField: "Latitude",
          longitudeField: "Longitude"
        },
        _toGeoJsonArray : function(data, latitudeField, longitudeField){
          //convert the chart data (DC/crossfilter dimension) into geojson for the map
          if (latitudeField == undefined){
            latitudeField = this.defaultOptions.latitudeField
          }
          if (longitudeField == undefined){
            longitudeField = this.defaultOptions.longitudeField
          }
          features = [] //array of geojson features
          _id = 0 //hold an internal id for filtering later on
          data.forEach(function(d){
            d.lat = d[latitudeField]
            d.lng = d[longitudeField]
            d._id = _id
            m = JSON.parse('{"type": "Feature", "geometry": {"type": "Point", "coordinates": ['+ d.lng +','+ d.lat+']}, "properties" : ' + JSON.stringify(d) + ' }')
            features.push(m)
            _id += 1
          }) // end forEach

          return features
        },
        _contains : function(bounds, point){
          //utility function
          //returns true if point is geographically within bounds
            var sw = bounds.getSouthWest(),
                ne = bounds.getNorthEast()
            return (point.lat >= sw.lat) && (point.lat <= ne.lat) &&
                   (point.lng >= sw.lng) && (point.lng <= ne.lng);
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
            map.on('load', function(d){
              map.addSource('points', {"type": "geojson", "data": {
                                "type": "FeatureCollection",
                                "features": []
                            }})
              map.addLayer({
                //TODO: allow symbols
                  "id": "points",
                  "type": mapOptions.pointType,
                  "source": "points",
                  "icon": mapOptions.pointIcon,
                  "paint": {
                      "circle-radius": mapOptions.pointRadius,
                      "circle-color": mapOptions.pointColor,
                  }
              }, 'road');
              if (mapOptions.renderPopup){
                  _chart.map().on('click', function (e) {
                    //first get the feature that was clicked
                    var features = _chart.map().queryRenderedFeatures(e.point, { layers: ['points'] });

                    if (!features.length) {
                        return;
                    }

                    var feature = features[0];

                    //format the popup via the function set in the options
                    //TODO: this won't change after the map has been rendered
                    //set this is another function
                    //so it can be called as a chained method
                    var popupText = mapOptions.popupTextFunction(feature)


                    //show the popup on the mapd
                    var popup = new mapboxgl.Popup()
                        .setLngLat(feature.geometry.coordinates)
                        .setHTML(popupText)
                        .addTo(_chart.map());
                });
              } //end if

            })//end on load
            return map;
        };


        _chart.createMap = function(_) {
          //prepare the map container for rendering
            if(!arguments.length) {
                return _createMap;
            }
            _createMap = _;
            _createMap();
            _doRender();
            return _chart;
        };

        _chart._setData = function(dataArray){
          //first convert to geojson, because mapbox can't consume straight json
          dat = _chart.dimension().top(Infinity)
          console.log(dat)
          geojsonMarkers = dc_mapbox._toGeoJsonArray(dat, mapOptions.latitudeField, mapOptions.longitudeField)
          if (_chart.map().loaded()){
            _chart._setMarkers(geojsonMarkers)
          }else{
            _chart.map().on('load', function(d){
              _chart._setMarkers(geojsonMarkers)
            })
          }
        }

        _chart._setMarkers = function(geojsonFeatureArray){
          _chart.map().getSource('points').setData({
                  "type": "FeatureCollection",
                  "features": geojsonFeatureArray
              });
        }

        _chart._doRender = function() {
          //render the map
            if(! _chart.map()){
                _map = _createMap(_chart.root());
                for(var ev in _cachedHandlers)
                    _map.on(ev, _cachedHandlers[ev]);

                if (_defaultCenter && _defaultZoom) {
                    _map.setCenter(_mapOptions.center).setZoom(_mapOptions.zoom)
                }
                _chart._setData(); //set the geojson source
                _chart._postRender(); //called after render is complete
            }
            else{
              _chart._setData();
            }

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
        _options = Object.assign({}, this.defaultOptions, options)

        //parse throught the options and set variables
        var _renderPopup = _options.renderPopup;
        var _brushOn = _options.brushOn;
        var _center = _options.center;
        var _zoom = _options.zoom;
        var _popupData = undefined;

        //set the container in the options to be the same as what's in the parent so the user doesn't need to sepcify twice
        var _container = parent.replace("#", "")
        _options.container = _container

        //create a new chart base
        // var _chart = dc_mapbox.mapboxBase(mapboxToken, _options);

        var _chart = function(){
          var map = dc_mapbox.mapboxBase(mapboxToken, _options);
          return map
        }()


        _chart.options = _options



        //Rendering and Drawing functions
        _chart._postRender = function() {
          //occurs after the base map has been rendered

          // //register the filter handler
          _chart.filterHandler(areaFilter);
          //
          // //register filter event listeners
          _chart.map().on('moveend', boundsChangeFilter);
          _chart.map().on('zoomend', boundsChangeFilter);
          //

        };


        _chart._doRedraw = function() {
          //called each time another chart in the group is updated
          //and on map bounds change
          //recompute the filter on the map's dimension
          //get a list of the groups currently within the filter on the dimension
          var groups = _chart._computeOrderedGroups(_chart.dimension().top(Infinity))
          var groupsFiltered = groups.filter(function (d) {
              return _chart.valueAccessor()(d) !== 0;
          });
          //
          //get the internal ids of each group within the current filter
          _idList = groupsFiltered.map(function(k){
            return k._id})

          // this seems hacky
          // If we don't first check to see if the map is loaded
          // we get an error on trying to filter before the style is done loading
          //presumably this is onl a problem on the init
          //not when the filter is actually being used during the session
          if (_chart.map().loaded()){
            // set the filter immediately
            _chart.map().setFilter("points", ["in", "_id"].concat(_idList))
          }else{
            _chart.map().on('load', function(){
              // set the filter as soon as the map has loaded
              _chart.map().setFilter("points", ["in", "_id"].concat(_idList))
            })
          }
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
                  var doesContain = dc_mapbox._contains(filters[0], d) //check if the filter bounds include each point
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

        _chart.renderPopup = function(_){
          if (!arguments.length){
            return _renderPopup;
          }
          _renderPopup = _;
          return _chart
        }
        _chart.popupTextFunction = function(_){
          if (!arguments.length){
            return _chart.options.popupTextFunction;
          }
          _chart.options.popupTextFunction = _
          return _chart;
        }


        //whole function returns the dc chart
        return _chart.anchor(parent, chartGroup);
    }; //end marker chart

    return dc_mapbox;
  } //end dc mapbox



  this.dc_mapbox = _dc_mapbox(dc);

}//end module
)();
