//map options for mapbox vector tile map and dc chart on top
var mapOptions = {
  container: "map",
  style: 'mapbox://styles/sfarley2/ciz0ar5g7000q2spdnhi4m3m5',
  pointColor: 'red',
  pointRadius: 3,
  pointType: "circle",
  pointIcon: undefined,
  center: new mapboxgl.LngLat(-74.0059, 40.7127),
  zoom: 9,
  renderPopup: true
}

var days = ['Sunday', "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
var boroughs = ["Bronx", "Manhattan", "Queens", "Staten Island", "Brooklyn"]

myToken = "pk.eyJ1Ijoic2ZhcmxleTIiLCJhIjoiY2lmeWVydWtkNTJpb3RmbTFkdjQ4anhrMSJ9.jRJCOGU1AOHfNXHH7cwU7Q"



//load the data
$.getJSON("data/311.json", function(response){


  data = response['data']

  var colnames = response['meta']['view']['columns']

  processedData = []

  //convert arrays to objects so we can reference by name
  data.forEach(function(d){
    o = {}
    for (var i =0; i < colnames.length; i++){
      //asign column names
      key = colnames[i]['name'];
      value = d[i]
      o[key] = value
    }

    //numbers
    o.Latitude = +o.Latitude
    o.Longitude = +o.Longitude

    //distill attributes
    c = o['Incident Type'].split("-")
    o.category = c[0]
    o.subcategory =  c[1]

    if (boroughs.indexOf(o.Borough.toProperCase()) == -1){
      o.Borough = "Other"
    }



    //parse the dates
    ts = Date.parse(o['Creation Date'])
    o.created_at = new Date(ts)
    o.roundDate = roundDate(new Date(ts)) //compare days directly, instead of times


    //make sure spatial and temporal attributes are present
    if ((o.Latitude != 0) && (o.Longitude != 0) && ((o.created_at.getFullYear()  > 2012))){
      //make sure it has location info
      processedData.push(o)
    }
  })

  //set up the crossfilter
  facts = crossfilter(processedData)

  //make the crossfilter dimensions and groups

  //1. category of incident
  categoryDimension = facts.dimension(function(d){return d.category.toProperCase()});
  categoryGroup = categoryDimension.group().reduceCount();


  //2. borough of incident
  cityDimension = facts.dimension(function(d){return d.Borough.toProperCase()})
  cityGroup = cityDimension.group().reduceCount()

  //3.date of incident
  dateDimension = facts.dimension(function(d){return d.roundDate})
  dateGroup = dateDimension.group().reduceCount()

  //4. Geo lat/lng dimension
  geoDimension = facts.dimension(function(d){
    return new mapboxgl.LngLat(d.Longitude, d.Latitude)}
  );
  geoGroup = geoDimension.group().reduceCount();

  //5. Day of Week
  DoWDimension = facts.dimension(function(d){
    return days[d.roundDate.getDay()]
  })
  DoWGroup = DoWDimension.group().reduceCount()

  //make a new map and add the points
  mapChart = dc_mapbox.pointSymbolMap("#map", myToken, mapOptions)
    .dimension(geoDimension)
    .group(geoGroup)
    .popupTextFunction(function(d){
      return d.properties.Location;
    })



  var cityColorScale = d3.scale.ordinal()
    .domain(["Bronx", "Manhattan", "Queens", "Brooklyn", "Staten Island", "Other"])
    .range(['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c']);


  var cityChart = dc.pieChart("#cityChart")
    .height($("#cityChart").height() * 0.75)
    .width($("#cityChart").width())
    .dimension(cityDimension)
    .group(cityGroup)
    .colors(cityColorScale)
    .innerRadius(30)
    .externalLabels(10)
    .drawPaths(true)
    .externalRadiusPadding(25)



  var categoryChart = dc.pieChart("#typeChart")
    .height($("#typeChart").height() * 0.75)
    .width($("#typeChart").width())
    .dimension(categoryDimension)
    .group(categoryGroup)
    .innerRadius(30)
    .externalLabels(25)
    .drawPaths(true)
    .externalRadiusPadding(25)



  var DoWChart = dc.pieChart("#DoWChart")
    .height($("#DoWChart").height() * 0.75)
    .width($("#DoWChart").width())
    .dimension(DoWDimension)
    .group(DoWGroup)
    .innerRadius(30)
    .externalLabels(25)
    .drawPaths(true)
    .externalRadiusPadding(25)



  var dateChart = dc.lineChart("#dateChart")
    .dimension(dateDimension)
    .group(dateGroup)
    .x(d3.time.scale().domain(d3.extent(processedData, function(d){return d.roundDate})))
    .height($("#dateChart").height()*0.9)
    .width($("#dateChart").width()* 0.99)
    .colors("red")
    .interpolate('basis')
    .margins({top: 5, left: 25, right: 10, bottom: 25})

  dc.renderAll();
}) //end ajax


//capitalize the first letter of the string, so there's to ambiguity about names
String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

//round to nearest date
function roundDate(d){
  d.setHours(0);
  d.setMinutes(0);
  d.setSeconds(0);
  d.setMilliseconds(0);
  return d
}

Array.prototype.unique = function(){
   var u = {}, a = [];
   for(var i = 0, l = this.length; i < l; ++i){
      if(u.hasOwnProperty(this[i])) {
         continue;
      }
      a.push(this[i]);
      u[this[i]] = 1;
   }
   return a;
}
