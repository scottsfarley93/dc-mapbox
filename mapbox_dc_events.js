
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
          data.forEach(function(d){
            lat = d.key[1]
            lng = d.key[0]
            m = JSON.parse('{"type": "Feature", "geometry": {"type": "Point", "coordinates": ['+ lng +','+ lat+']}, "properties" : {"key":"value"} }')
            features.push(m)
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
          // //execute geoBounds filter after moving or zooming
          //   if (_chart.brushOn()) {
          //       if (_filterByArea) {
          //         //execute filter
          //           _chart.filterHandler(doFilterByArea);
          //       }
          //
          //       _chart.map().on('zoomend moveend', zoomFilter, this );
          //       if (!_filterByArea)
          //           _chart.map().on('click', zoomFilter, this );
          //       _chart.map().on('zoomstart', zoomStart, this);
          //   }
          _addMarkers()
        };

        _chart._doRedraw = function() {
          console.log("Do redraw")
            // var groups = _chart._computeOrderedGroups(_chart.data()).filter(function (d) {
            //     return _chart.valueAccessor()(d) !== 0;
            // });
            // if (_currentGroups && _currentGroups.toString() === groups.toString()) {
            //     return;
            // }
            // _currentGroups=groups;
            //
            // if (_rebuildMarkers) {
            //     _markerList=[];
            // }
            // _layerGroup.clearLayers();
            //
            // var addList=[];
            // var cList = []
            // groups.forEach(function(v,i) {
            //     var key = _chart.keyAccessor()(v);
            //     var marker = null;
            //     if (!_rebuildMarkers && key in _markerList) {
            //         marker = _markerList[key];
            //     }
            //     else {
            //         marker = createmarker(v,key);
            //     }
            //     if (!_chart.cluster()) {
            //         _layerGroup.addLayer(marker);
            //         cList.push(marker)
            //     }
            //     else {
            //         addList.push(marker);
            //     }
            // });
            //
            // if (cList.length > 0 || addList.length > 0){
            //   _chart.markersOn = true
            // }else{
            //   _chart.markersOn = false
            // }
            //
            // if (_chart.cluster() && addList.length > 0) {
            //     _layerGroup.addLayers(addList);
            // }
        };

        //accessor functions
        _chart.locationAccessor = function(_) {
            // if (!arguments.length) {
            //     return _location;
            // }
            // _location= _;
            // return _chart;
        };

        // _chart.marker = function(_) {
        //     // if (!arguments.length) {
        //     //     return _marker;
        //     // }
        //     // _marker= _;
        //     // return _chart;
        // };
        //
        // _chart.icon = function(_) {
        //     if (!arguments.length) {
        //         return _icon;
        //     }
        //     _icon= _;
        //     return _chart;
        // };
        //
        // _chart.popup = function(_) {
        //     if (!arguments.length) {
        //         return _popup;
        //     }
        //     _popup= _;
        //     return _chart;
        // };
        //
        // _chart.renderPopup = function(_) {
        //     if (!arguments.length) {
        //         return _renderPopup;
        //     }
        //     _renderPopup = _;
        //     return _chart;
        // };
        //
        //
        // _chart.cluster = function(_) {
        //     if (!arguments.length) {
        //         return _cluster;
        //     }
        //     _cluster = _;
        //     return _chart;
        // };
        //
        // _chart.clusterOptions = function(_) {
        //     if (!arguments.length) {
        //         return _clusterOptions;
        //     }
        //     _clusterOptions = _;
        //     return _chart;
        // };
        //
        // _chart.rebuildMarkers = function(_) {
        //     if (!arguments.length) {
        //         return _rebuildMarkers;
        //     }
        //     _rebuildMarkers = _;
        //     return _chart;
        // };
        //
        // _chart.brushOn = function(_) {
        //     if (!arguments.length) {
        //         return _brushOn;
        //     }
        //     _brushOn = _;
        //     return _chart;
        // };
        //
        // _chart.filterByArea = function(_) {
        //     if (!arguments.length) {
        //         return _filterByArea;
        //     }
        //     _filterByArea = _;
        //     return _chart;
        // };
        //
        // _chart.markerGroup = function() {
        //     return _layerGroup;
        // };
        //
        // var createmarker = function(v,k) {
        //     var marker = _marker(v);
        //     marker.key = k;
        //     siteID = k.alt // hack --> id is the site id, function in main.js
        //     siteDetails = lookupSite(siteID) //could be list, because multiple samples at one site
        //     siteName = siteDetails.SiteName
        //     html = siteName
        //     html += "<br />"
        //     html += "<a href='javascript:void(0);' onclick='openSiteDetails(" + siteID + ");'>Details</a>"
        //     if (_chart.renderPopup()) {
        //         marker.bindPopup(html);
        //     }
        //     if (_chart.brushOn() && !_filterByArea) {
        //         marker.on("click",selectFilter);
        //     }
        //     _markerList[k]=marker;
        //     return marker;
        // };
        //
        // var zoomStart = function(e) {
        //     _zooming=true;
        // };
        //
        // var zoomFilter = function(e) {
        //   //geoBounds filter function
        //     if (e.type === "moveend" && (_zooming || e.hard)) {
        //         return;
        //     }
        //     _zooming=false;
        //
        //     if (_filterByArea) {
        //         var filter;
        //         if (_chart.map().getCenter().equals(_chart.center()) && _chart.map().getZoom() === _chart.zoom()) {
        //           //there was no change, so don't filter
        //             filter = null;
        //         }else if (!_chart.markersOn){
        //           //pass
        //           return
        //         }
        //         else {
        //           //a change occurred, filter
        //             filter = _chart.map().getBounds();
        //         }
        //         dc.events.trigger(function () {
        //           //redraw all dashboard charts
        //             _chart.filter(null);
        //             if (filter) {
        //                 _innerFilter=true;
        //                 _chart.filter(filter);
        //                 _innerFilter=false;
        //             }
        //             dc.redrawAll(_chart.chartGroup()); //do redraw
        //         });
        //     }
        // };
        //
        // var doFilterByArea = function(dimension, filters) {
        //     _chart.dimension().filter(null);
        //     if (filters && filters.length>0) {
        //         _chart.dimension().filterFunction(function(d) {
        //             if (!(d in _markerList)) {
        //                 return false;
        //             }
        //             var locO = _markerList[d].getLatLng();
        //             return locO && filters[0].contains(locO);
        //         });
        //         if (!_innerFilter && _chart.map().getBounds().toString !== filters[0].toString()) {
        //             _chart.map().fitBounds(filters[0]);
        //         }
        //     }
        // };
        //
        // var selectFilter = function(e) {
        //     if (!e.target) return;
        //     var filter = e.target.key;
        //     dc.events.trigger(function () {
        //         _chart.filter(filter);
        //         dc.redrawAll(_chart.chartGroup());
        //     });
        // };

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