
(function() { function _dc_leaflet(dc) {

    var dc_leaflet = {
        version: '0.3.2'
    };

    dc_leaflet.leafletBase = function(_chart) {
        _chart = dc.marginMixin(dc.baseChart(_chart)); //_chart inherits from dc

        _chart.margins({left:0, top:0, right:0, bottom:0});

        var _map;

        var _mapOptions={};
        var _defaultCenter=false;
        var _defaultZoom=false;

        var _cachedHandlers = {};

        var _createLeaflet = function() {
          var map = L.map("map",_mapOptions);
            return map;
        };

        var _tiles=function(map) {
          //create a tile layer and add it to the map
            L.tileLayer('http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
            }).addTo(map);
        };

        _chart.createLeaflet = function(_) {
            if(!arguments.length) {
                return _createLeaflet;
            }
            _createLeaflet = _;
            return _chart;
        };

        _chart._doRender = function() {
            if(! _chart.map()){
                _map = _createLeaflet(_chart.root());
                for(var ev in _cachedHandlers)
                    _map.on(ev, _cachedHandlers[ev]);

                if (_defaultCenter && _defaultZoom) {
                    _map.setView(_chart.toLocArray(_defaultCenter), _defaultZoom);
                }
                _chart.tiles()(_map); //add tiles
                _chart._postRender();
            }
            else
                //pass

            return _chart._doRedraw(); //re-draw all charts after map has been completed
        };

        _chart._doRedraw = function() {
            return _chart;
        };

        _chart._postRender = function() {
            return _chart;
        };

        _chart.mapOptions = function(_) {
            if (!arguments.length) {
                return _mapOptions;
            }
            _mapOptions = _;
            return _chart;
        };

        _chart.center = function(_) {
            if (!arguments.length) {
                return _defaultCenter;
            }
            _defaultCenter = _;
            return _chart;
        };

        _chart.zoom = function(_) {
            if (!arguments.length) {
                return _defaultZoom;
            }
            _defaultZoom = _;
            return _chart;
        };

        _chart.tiles = function(_) {
            if (!arguments.length) {
                return _tiles;
            }
            _tiles = _;
            return _chart;
        };

        _chart.map = function() {
            return _map;
        };

        _chart.toLocArray = function(value) {
            if (typeof value === "string") {
                // expects '11.111,1.111'
                value = value.split(",");
            }
            // else expects [11.111,1.111] --> array
            return value;
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

    dc_leaflet.markerChart = function(parent, chartGroup) {
        var _chart = dc_leaflet.leafletBase({}); //create a base map
        //initialize the map

        var _renderPopup = true;
        var _cluster = false; // requires leaflet.markerCluster
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

        var _marker = function(d,map) {
          //create the circle markers using this factory
            var marker = new L.CircleMarker(_chart.toLocArray(_chart.locationAccessor()(d)), globals.config.map.markerRadius,{
              //TODO: do stuff with _id here
                icon: _icon(),
                clickable: (_chart.brushOn() && !_filterByArea),
                draggable: false,
                fill: 'red',
                fillOpacity:0.5,
                stroke: 'red'
            });
            return marker;
        };

        var _icon = function(d,map) {
          //custom icon here if required
            return new L.Icon.Default();
        };

        var _popup = function(d,marker) {
          //populate the popup
            return _chart.title()(d);
        };

        _chart._postRender = function() {
          //execute geoBounds filter after moving or zooming
            // if (_chart.brushOn()) {
            //     if (_filterByArea) {
            //       //execute filter
            //         _chart.filterHandler(doFilterByArea);
            //     }
            //
            //     _chart.map().on('zoomend moveend', zoomFilter, this );
            //     if (!_filterByArea)
            //         _chart.map().on('click', zoomFilter, this );
            //     _chart.map().on('zoomstart', zoomStart, this);
            // }
            //
            // if (_cluster) {//do clustering
            //     _layerGroup = new L.MarkerClusterGroup(_clusterOptions?_clusterOptions:null);
            // }
            // else { //don't cluster, but make layer
            //     _layerGroup = new L.LayerGroup();
            // }
            _chart.map().addLayer(_layerGroup); //add layer to the map
        };

        _chart._doRedraw = function() {
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
            if (!arguments.length) {
                return _location;
            }
            _location= _;
            return _chart;
        };

        _chart.marker = function(_) {
            if (!arguments.length) {
                return _marker;
            }
            _marker= _;
            return _chart;
        };

        _chart.icon = function(_) {
            if (!arguments.length) {
                return _icon;
            }
            _icon= _;
            return _chart;
        };

        _chart.popup = function(_) {
            if (!arguments.length) {
                return _popup;
            }
            _popup= _;
            return _chart;
        };

        _chart.renderPopup = function(_) {
            if (!arguments.length) {
                return _renderPopup;
            }
            _renderPopup = _;
            return _chart;
        };


        _chart.cluster = function(_) {
            if (!arguments.length) {
                return _cluster;
            }
            _cluster = _;
            return _chart;
        };

        _chart.clusterOptions = function(_) {
            if (!arguments.length) {
                return _clusterOptions;
            }
            _clusterOptions = _;
            return _chart;
        };

        _chart.rebuildMarkers = function(_) {
            if (!arguments.length) {
                return _rebuildMarkers;
            }
            _rebuildMarkers = _;
            return _chart;
        };

        _chart.brushOn = function(_) {
            if (!arguments.length) {
                return _brushOn;
            }
            _brushOn = _;
            return _chart;
        };

        _chart.filterByArea = function(_) {
            if (!arguments.length) {
                return _filterByArea;
            }
            _filterByArea = _;
            return _chart;
        };

        _chart.markerGroup = function() {
            return _layerGroup;
        };

        var createmarker = function(v,k) {
            var marker = _marker(v);
            marker.key = k;
            siteID = k.alt // hack --> id is the site id, function in main.js
            siteDetails = lookupSite(siteID) //could be list, because multiple samples at one site
            siteName = siteDetails.SiteName
            html = siteName
            html += "<br />"
            html += "<a href='javascript:void(0);' onclick='openSiteDetails(" + siteID + ");'>Details</a>"
            if (_chart.renderPopup()) {
                marker.bindPopup(html);
            }
            if (_chart.brushOn() && !_filterByArea) {
                marker.on("click",selectFilter);
            }
            _markerList[k]=marker;
            return marker;
        };

        var zoomStart = function(e) {
            _zooming=true;
        };

        var zoomFilter = function(e) {
          //geoBounds filter function
            // if (e.type === "moveend" && (_zooming || e.hard)) {
            //     return;
            // }
            // _zooming=false;
            //
            // if (_filterByArea) {
            //     var filter;
            //     if (_chart.map().getCenter().equals(_chart.center()) && _chart.map().getZoom() === _chart.zoom()) {
            //       //there was no change, so don't filter
            //         filter = null;
            //     }else if (!_chart.markersOn){
            //       //pass
            //       return
            //     }
            //     else {
            //       //a change occurred, filter
            //         filter = _chart.map().getBounds();
            //     }
            //     dc.events.trigger(function () {
            //       //redraw all dashboard charts
            //         _chart.filter(null);
            //         if (filter) {
            //             _innerFilter=true;
            //             _chart.filter(filter);
            //             _innerFilter=false;
            //         }
            //         dc.redrawAll(_chart.chartGroup()); //do redraw
            //     });
            // }
        };

        var doFilterByArea = function(dimension, filters) {
            // _chart.dimension().filter(null);
            // if (filters && filters.length>0) {
            //     _chart.dimension().filterFunction(function(d) {
            //         if (!(d in _markerList)) {
            //             return false;
            //         }
            //         var locO = _markerList[d].getLatLng();
            //         return locO && filters[0].contains(locO);
            //     });
            //     if (!_innerFilter && _chart.map().getBounds().toString !== filters[0].toString()) {
            //         _chart.map().fitBounds(filters[0]);
            //     }
            // }
        };

        var selectFilter = function(e) {
            // if (!e.target) return;
            // var filter = e.target.key;
            // dc.events.trigger(function () {
            //     _chart.filter(filter);
            //     dc.redrawAll(_chart.chartGroup());
            // });
        };

        return _chart
    };

  dc_leaflet.d3 = d3;
  dc_leaflet.crossfilter = crossfilter;
  dc_leaflet.dc = dc;

  return dc_leaflet;
  }


  if (typeof define === 'function' && define.amd) {
      define(["dc"], _dc_leaflet);
  } else if (typeof module == "object" && module.exports) {
      var _dc = require('dc');
      module.exports = _dc_leaflet(_dc);
  } else {
      this.dc_leaflet = _dc_leaflet(dc);
  }
}
)();
