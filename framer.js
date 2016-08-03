
/* instantiate and configure map */
/**********************************
* Step0: Load data from json file *
**********************************/
queue()
.defer(d3.json, "./data/data.json")
.defer(d3.json, "./data/places.json")
.defer(d3.json, "./data/countries.geojson")
.defer(d3.json, "./data/country_codes.json")
.await(makeGraphs);

function makeGraphs(error, UmsData, UmsPlaces,WGeoMap,countrycodes_ISO_TO_UN_TO_NAME_table) {


	// VARIABLES FOR MAP
    var breweryMarkers = new L.FeatureGroup();

    var mymap = L.map('mapid').setView([59.903,10.745],10);
    var shapes 
	

    // VARIABLES FOR DATA
	var shapes 
	var trajLayer
	var clickCircle=[]
	var listfilters=[]
	var listPlacesActivated=[]



    function update_country_div(filter){
		g = listfilters.indexOf(filter)
		if (g==-1){
			listfilters.push(filter)
		}else 
		{  listfilters.splice(g, 1);
		}

		if (listfilters.length==0){
			filtername = 'none'
		}else {
			filtername = listfilters.join();
		}
		document.getElementById('selected-country').innerHTML = filtername

	}


	Dic_ISO2UN={}
	Dic_UN2ISO={}
	Dic_UN2NAME={}
	_.each(countrycodes_ISO_TO_UN_TO_NAME_table,function(d){
		Dic_ISO2UN[d.A2_ISO] = d.A3_UN
		Dic_UN2ISO[d.A3_UN] = d.A2_ISO
		Dic_UN2NAME[d.A3_UN] = d.COUNTRY
	})
	

    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpandmbXliNDBjZWd2M2x6bDk3c2ZtOTkifQ._QA7i5Mpkd_m30IGElHziw', {
    		maxZoom: 18,
    		id: 'mapbox.streets'
    	}).addTo(mymap);

	
    shapes   = L.featureGroup().addTo(mymap);
    //*******************
    // prepare data
    //*******************

	var myDicLocations = {}
	console.log(UmsPlaces)
	_.each(UmsPlaces, function (d) {
		myDicLocations[d.id] = {"lat": d.lat, "lng":d.lng, "pos":d.id,"name":d.name,"rad":d.rad };

	})
    // PARSE JSON DATA 
	var fullDateFormat = d3.time.format('%Y-%m-%d %H:%M');
	//var yearFormat = d3.time.format('%Y');
	var monthFormat = d3.time.format('%b');
	//var dayOfWeekFormat = d3.time.format('%a');
	var dayOfYear = d3.time.format('%j');
	// normalize/parse data so dc can correctly sort & bin them
	// I like to think of each "d" as a row in a spreadsheet

	// SOME DATA REFORMAT
	_.each(UmsData, function(d) {
		d.collect_time = fullDateFormat.parse(d.collect_time);
		d.collect_month = monthFormat(d.collect_time );
		//d.collect_day = dayOfWeekFormat(d.collect_time );
		d.collect_dayofyear = dayOfYear(d.collect_time );

		//console.log(myDicLocations[d.loc].name)
		d.locname =  myDicLocations[d.loc].name;

		d.country =  Dic_ISO2UN[d.country];

	});




	/****************************************
	* 	Run the data through crossfilter    *
	****************************************/
		// set crossfilter
	var facts = crossfilter(UmsData);


	/******************************************************
	* Create the Dimensions                               *
	* A dimension is something to group or filter by.     *
	* Crossfilter can filter by exact value, or by range. *
	******************************************************/

	// create dimensions (x-axis values)
	var DateDim  = facts.dimension(function(d) {return d.collect_time;});

	// dc.pluck: short-hand for same kind of anon. function we used for yearDim
	var monthDim  = facts.dimension(dc.pluck('collect_month')),
	//dayOfWeekDim = facts.dimension(dc.pluck('collect_day')),

	CountryDim = facts.dimension(function(d) {return d.country;}),
	PosDim = facts.dimension(function(d) {return d.locname}),

	DoYDim = facts.dimension(function(d) {return d.collect_dayofyear;}), 
	
	allDim = facts.dimension(function(d) {return d;});



	/******************************************************
	* Create the GROUPS                                   *
	******************************************************/
	
	// timeline : count per measure 
	//var hits = DateDim.group().reduceSum(function(d) {return d.count;})
	var totalCountPerMeasure = DateDim.group().reduceSum(function(d) {
		return d.count;
	});


	var month_total = monthDim.group().reduceSum(function(d) {return d.count;});

	var countCountry = CountryDim.group().reduceSum(function(d) {return d.count;});

	var all = facts.groupAll();

	var place_unik = PosDim.group().reduceSum(function(d) {return d.count;});


	// CREATE FILTERS
	//minDate = new Date(2016, 6, 01)


	//DateDim.filter( function(d) {return d>minDate})


	/******************************************************
	* Step1: Create the dc.js chart objects & ling to div *
	******************************************************/

	var hitslineChart  = dc.lineChart("#chart-line-hitsperday"),
	indextimelinechart = dc.barChart("#chart-line-index"),
	countryDistinctChart = dc.rowChart("#chart-raw-countries"),
	monthChart  =  dc.pieChart('#chart-ring-month'),
	placeChart  =  dc.pieChart('#chart-ring-places'),
	dataCount = dc.dataCount('#data-count'),
	dataTable = dc.dataTable('-----#data-table'),
	WChart = dc.geoChoroplethChart("#chart-world");


	//var NationChart = dc.pieChart('#chart-ring-nation')


	/***************************************
	* 	Step4: Create the Visualisations   *
	***************************************/


	//*******************
    // THE GEOCHOROPLETH
    //*******************

    width = 500
    height = 400
	var projection = d3.geo.mercator()
		.center([0,0])
		.scale(70)
		.rotate([0,0]);
	var projection = d3.geo.equirectangular()
			.scale(90)
		    .translate([width/2,height/2])
	
	/*var projection =d3.geo.mercator()
  	.scale(100)
    .translate([width/2, height]);*/

	WChart.width(width)
	.height(height)
	.dimension(CountryDim)
	.group(countCountry)
	.colors(d3.scale.quantize().range(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"]))
	.colorDomain([0, 200])
	.colorCalculator(function (d) { return d ? WChart.colors()(d) : '#ccc'; })
	.overlayGeoJson(WGeoMap.features, "state", function (d) { return d.id})
	.projection(projection)
	.render();

	
    //*******************
    // TIMELINES
    //*******************

	// The main timeline
	hitslineChart
	.width(500).height(200)
	.dimension(DateDim)
	.group(totalCountPerMeasure)
	.elasticY(true)
	//.elasticX(false)
	.rangeChart(indextimelinechart)
	.x(d3.time.scale().domain([DateDim.bottom(1)[0].collect_time,DateDim.top(1)[0].collect_time]))
	//.mouseZoomable(true)
	.brushOn(false)
	//.xUnits(d3.time.days)
	.renderHorizontalGridLines(true)
	//.xAxis();


	// The small timeline
	indextimelinechart.width(500).height(70)
    //.margins({top: 0, right: 50, bottom: 20, left: 40})
    .dimension(DateDim)
    .group(totalCountPerMeasure)
    .centerBar(true)
    .gap(1)
    .elasticY(true)
    .x(d3.time.scale().domain([DateDim.bottom(1)[0].collect_time,DateDim.top(1)[0].collect_time]))
    //.round(d3.time.month.round)
    .alwaysUseRounding(true)
    //.xUnits(d3.time.months)
    .brushOn(true)
    //.mouseZoomable(true);


    //*******************
    // the pie charts
    //*******************

    // count per months
    monthChart
    .width(150)
    .height(150)
    .dimension(monthDim)
    .group(month_total)
    .innerRadius(20)

    // count per place
    placeChart
    .width(150)
    .height(150)
    .dimension(PosDim)
    .group(place_unik)
    .innerRadius(20)


	/*NationChart
		.width(150)
	.height(150)
	.dimension(CountryDim)
	.group(countCountry)
	.innerRadius(20)
	.on("filtered", function(chart,filter) {
		update_country_div(filter)
		});
		*/

    //*******************
    // the country ditribution
    //*******************
    
	countryDistinctChart
	.width(400)
	.height(400)
	.elasticX(true)
	.dimension(CountryDim)
	.group(countCountry)
	//.sortBy(dc.pluck('country'))
	//.order(d3.descending)
	.on("filtered", function(chart,filter) {
		update_country_div(filter)
	})
	.rowsCap(15)
	 .othersGrouper(false) 
	.ordering(function(d) { return -d.value; })
	.label(function (d){
		//console.log( d)
       return Dic_UN2NAME[d.key];
    })
	.render();


	//*******************
    // the data tables
    //*******************
	dataCount
	.dimension(facts)
	.group(all);


	//*******************
    // the MAP
    //*******************

	dataTable
	.dimension(allDim)
	.group(function (d) { return 'dc.js insists on putting a row here so I remove it using JS'; })
	.size(100)
	.columns([
		function (d) { return d.collect_time; },
		function (d) { return d.country; },
		function (d) { return d.count; },
		function (d) { return d.lat; },
		function (d) { return d.lon;},
		])
	.sortBy(dc.pluck('collect_time'))
	.order(d3.descending)
	.on('renderlet', function (table) {
		// each time table is rendered remove nasty extra row dc.js insists on adding
		table.select('tr.dc-table-group').remove();

		// update map with breweries to match filtered data
		breweryMarkers.clearLayers();
		 
		//myDicLocations[d.id] = {"lat": d.lat, "lng":d.lng, "pos":d.id,"name":d.name,"rad":d.rad };
		_.each(myDicLocations, function (item) {
				var marker1 = L.marker([item.lat, item.lng],{
							"area": item.pos,
							"area_name" : myDicLocations[item.pos].name
						});
				//marker.bindPopup(" <p> <a id='day'>reset</a> </p> ");
				/*var marker  = L.circle([item.lat, item.lng],  1609 * 10, {
							color: '#fff',
							fillOpacity: 0,
							opacity: 0.8
						})*/

				marker1.on("click", function (e) {
					
					console.log('liste place activated',listPlacesActivated)
					console.log('liste layers activated',clickCircle)
					// test if the layer is already in the activated ones
					isplaceactive = listPlacesActivated.indexOf(e.target.options.area_name)

					if (isplaceactive ==-1){
						// if place not active
						// GET clicked site name
						var area_name=myDicLocations[item.pos].name
						// activate it
						

						// draw a new marker
						CI = L.circle(e.latlng, 1609 * 10, {
							color: '#f07300',
							fillOpacity: 0.5,
							opacity: 0.8,
							"area":item.pos,
							"area_name":area_name

						})
						.addTo(mymap);

						clickCircle.push(CI);
						listPlacesActivated.push(area_name)
						// display it on the board
						document.getElementById('selected-area').innerHTML = listPlacesActivated.join();


					console.log('Fin ajout liste place activated',listPlacesActivated)
					console.log('Fin ajout liste layers activated',clickCircle)

					}else  {  
						listPlacesActivated.splice(isplaceactive, 1);

						j=-1
						_.each(clickCircle,function(di){
							//console.log(di,e)
							j+=1
							if (di.options.area == e.target.options.area){
								mymap.removeLayer(di);
								clickCircle.splice(j,1)
							}
						});

						document.getElementById('selected-area').innerHTML =listPlacesActivated.join();
					
					console.log('Fin delete liste place activated',listPlacesActivated)
					console.log('Fin delete liste layers activated',clickCircle)
					}

					// filter the data
					if (listPlacesActivated.length ==0){
						PosDim.filterAll();
					}else{
						PosDim.filter(function(d){
						  return listPlacesActivated.indexOf(d) > -1;
						})
					}

					dc.redrawAll();
					
				});

				//breweryMarkers.addLayer(marker);
				breweryMarkers.addLayer(marker1);
		});

		mymap.addLayer(breweryMarkers);
		mymap.fitBounds(breweryMarkers.getBounds());
			
		});


	/****************************
	* Step6: Render the Charts  *
	****************************/
	  // register handlers
	  d3.selectAll('a#all').on('click', function () {
	  	dc.filterAll();
	  	dc.renderAll();
	  });

	  d3.selectAll('a#year').on('click', function () {
	  	yearChart.filterAll();
	  	dc.redrawAll();
	  });

	  d3.selectAll('a#month').on('click', function () {
	  	monthChart.filterAll();
	  	dc.redrawAll();
	  });

	  d3.selectAll('a#day').on('click', function () {
	  	dayChart.filterAll();
	  	dc.redrawAll();
	  });

	  // showtime!
	  dc.renderAll();
	 // Once rendered you can call `.redrawAll()` to update charts incrementally when the data
	    // changes, without re-rendering everything
	   // dc.redrawAll();
	
}
/*
 roundChart.width(990)
                    .height(200)
                    .margins({top: 10, right: 50, bottom: 30, left: 60})
                    .dimension(rounds)
                    .group(statsByRounds)
                    .colors(d3.scale.category10())
                    .keyAccessor(function (p) {
                        return p.value.amountRaised;
                    })
                    .valueAccessor(function (p) {
                        return p.value.deals;
                    })
                    .radiusValueAccessor(function (p) {
                        return p.value.amountRaised;
                    })
                    .x(d3.scale.linear().domain([0, 5000]))
                    .r(d3.scale.linear().domain([0, 9000]))
                    .minRadiusWithLabel(15)
                    .elasticY(true)
                    .yAxisPadding(150)
                    .elasticX(true)
                    .xAxisPadding(300)
                    .maxBubbleRelativeSize(0.07)
                    .renderHorizontalGridLines(true)
                    .renderVerticalGridLines(true)
                    .renderLabel(true)
                    .renderTitle(true)
                    .title(function (p) {
                        return p.key
                                + "\n"
                                + "Amount Raised: " + numberFormat(p.value.amountRaised) + "M\n"
                                + "Number of Deals: " + numberFormat(p.value.deals);
                    });
            roundChart.yAxis().tickFormat(function (s) {
                return s + " deals";
            });
            roundChart.xAxis().tickFormat(function (s) {
                return s + "M";
            });
*/