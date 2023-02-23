var map = L.map('map',  {scrollWheelZoom: false}).setView([52.149223128614345, 4.976482146445905], 13);
const study_area = new L.LatLngBounds([[52.120615, 4.936205],[52.173524512614115, 5.014835759912897]]);
map.fitBounds(study_area)

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

var myStyle = {
    "color": getComputedStyle(document.documentElement).getPropertyValue('--black'),
    "weight": 3,
    "opacity": 1,
    fillOpacity: 0
};

fetch("studyarea/studyarea.geojson")
.then(function(response) {
return response.json();
})
.then(function(data) {
L.geoJSON(data, {style: myStyle}).addTo(map);
console.log("testing shapefile")
});

// load the normalisation data
var x_array;
var y_array;
var zero_locs;
var normalisation;
var inundation_with_no_rainfall;

fetch('tfjs-models/10x10_js/required_data/x_array.json')
  .then(res => res.json())
  .then(data => {
    x_array = data;
   });
fetch('tfjs-models/10x10_js/required_data/y_array.json')
  .then(res => res.json())
  .then(data => {
    y_array = data;
   });
fetch('tfjs-models/10x10_js/required_data/zero_locs.json')
  .then(res => res.json())
  .then(data => {
    zero_locs = data;
   });
fetch('tfjs-models/10x10_js/required_data/normalisation.json')
  .then(res => res.json())
  .then(data => {
    normalisation = data;
   });

fetch('tfjs-models/10x10_js/required_data/inundation_with_no_rainfall.json')
  .then(res => res.json())
  .then(data => {
    inundation_with_no_rainfall = data;
   });

// Load the model
var model;
(async function () {
    model = await tf.loadLayersModel("/tfjs-models/10x10_js/model/model.json");
    console.log("loaded model!");
    $(".progress-bar").hide();
    document.getElementById("predict-button").style.display = "inline";
})();

// Build the basic rainfall plot
var input = document.getElementsByName('input-rain');
var rainfall_per_hour = new Array();
for (var i = 0; i < input.length; i++){
    rainfall_per_hour.push(parseFloat(input[i].value))
    input[i].addEventListener('input', sliderChange);
}

document.getElementsByName('timeSlider')[0].addEventListener('input', timeSliderChange);

plot_rainfall = document.getElementById('rainfall-plot');
var data = [{
	x: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5],
	y: rainfall_per_hour,
    type: "bar",
    marker: {
        color: getComputedStyle(document.documentElement).getPropertyValue('--blue1')
      },
    name: "Rainfall (mm/hour)",
    width: 1.01,
    bargap: 0}]
var layout = {
    margin: { l: 50, t:0, r:0, b: 50},
    autosize: true,
    plot_bgcolor: getComputedStyle(document.documentElement).getPropertyValue('--black'),
    paper_bgcolor: getComputedStyle(document.documentElement).getPropertyValue('--black'),
    yaxis: {
        tick0: 0,
        gridcolor: getComputedStyle(document.documentElement).getPropertyValue('--grey'),
        gridwidth: 1,
        title: 'Rainfall (mm/hour)',
        linecolor: getComputedStyle(document.documentElement).getPropertyValue('--white'),
        titlefont: {
          family: 'Helvetica Neue, sans-serif',
          size: 16,
          color: getComputedStyle(document.documentElement).getPropertyValue('--white')
        },
        tickfont: {
            family: 'Helvetica Neue, sans-serif',
            size: 16,
            color: getComputedStyle(document.documentElement).getPropertyValue('--white')
          }
    }, 
    xaxis: {
        range: [0, 12],
        dtick: 1,
        gridcolor: getComputedStyle(document.documentElement).getPropertyValue('--grey'),
        gridwidth: 1,
        title: 'Time (hour)',
        linecolor: getComputedStyle(document.documentElement).getPropertyValue('--white'),
        titlefont: {
            family: 'Helvetica Neue, sans-serif',
            size: 16,
            color: getComputedStyle(document.documentElement).getPropertyValue('--white')
        },
        tickfont: {
            family: 'Helvetica Neue, sans-serif',
            size: 16,
            color: getComputedStyle(document.documentElement).getPropertyValue('--white')
          }
    }
    }
var config = {staticPlot: true,
    responsive: true}

Plotly.newPlot( plot_rainfall, data, layout, config);


//initialse text
function sliderChange() {
    document.getElementById("rainfall-slider-text").style.color = getComputedStyle(document.documentElement).getPropertyValue('--white');
    document.getElementById("rainfall-slider-text").style.fontWeight = 'normal';
    stopVideo(); //stop video playback if you have new input.
    document.getElementById("predict-button").style.backgroundImage = getComputedStyle(document.documentElement).getPropertyValue('--gradient1'); // make prediction button blue to indicate this is not current rainfall for prediction
    let value = parseFloat(this.value)
    let index = parseInt(this.id.split("-")[this.id.split("-").length - 1])
    rainfall_per_hour[index] = value
    var sum = rainfall_per_hour.reduce(function(a, b) { return a + b; }, 0);
    let max_val = 160
    if (sum > max_val){
        document.getElementById("rainfall-slider-text").innerText = "Total rainfall can not exceed 160 mm in 12 hours!";
        max_value = max_val - (sum - value);
        this.value = max_value;
        rainfall_per_hour[index] = max_value;
    }
    if (sum < max_val){
        document.getElementById("rainfall-slider-text").innerText = "Total rainfall is " + sum.toString() + " mm";
    }
    var update = {y: [rainfall_per_hour]};
    Plotly.restyle(plot_rainfall, update);
}

function timeSliderChange() {
    if (arrayOfImages != null){
        stopVideo()
        imageShowIndex = parseInt(this.value)
        showImageOnMap()
    }
    else {
        imageShowIndex = parseInt(this.value)
        document.getElementById("time-slider-text").innerText = "Make a prediction before viewing the results"
    }
}

// Functions for making predicitons
var arrayOfImages = null;
var ImageBounds = null;

var imageShowIndex = 0;
var image = null;

function Predict() {
    document.getElementById("time-slider-text").style.color = getComputedStyle(document.documentElement).getPropertyValue('--white');
    document.getElementById("time-slider-text").style.fontWeight = 'normal';
    document.getElementById("time-slider-text").innerText = ""
    document.getElementById("predict-button").style.backgroundImage = getComputedStyle(document.documentElement).getPropertyValue('--gradient2');
    stopVideo();
    var reshaped_rainfall = new Array();
    for (var i = 0; i < rainfall_per_hour.length; i++){
        reshaped_rainfall.push([parseFloat(rainfall_per_hour[i] / normalisation[0][1])])
    }

    let input_tensor = tf.tensor([reshaped_rainfall]);
    let pred_array = model.predict(input_tensor).arraySync()[0];
    CreateImages(pred_array)
}

function CreateImages(pred_array){ 
    var gridsize = 10;
    var min_x = Math.min.apply(Math, x_array);
    var min_y = Math.min.apply(Math, y_array);
    var max_x = Math.max.apply(Math, x_array);
    var max_y = Math.max.apply(Math, y_array);
    var width = (max_x - min_x) / gridsize;
    var height = (max_y - min_y) / gridsize;

    arrayOfImages = [];
    //first add an empty image for the first timestep
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var context = canvas.getContext('2d');
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    var image = new Image();
    image.src=canvas.toDataURL();
    arrayOfImages.push(image);

    //now add the others
    for (var t  = 0; t < pred_array.length; t++){
        var index = 0;
        var depths = new Array(zero_locs.length).fill(0);   
        for (var i = 0; i < zero_locs.length; i++){
            if (zero_locs[i] != false){
                depths[i] = (pred_array[t][index] * normalisation[1][1]);
                index = index + 1
            }
        }
        for (var z = 0; z < depths.length; z++){ // subtract the inundation when there is no rainfall. Barely makes a difference but avoids confusion when there is no rainfall.
            depths[z] = depths[z] - inundation_with_no_rainfall[z];
        }
        if (1 == 0){ // I use this code to save the inundation when there is no rainfall. I post process this inundation out, to avoid confusion. has little to no influence since this inundation is very small. put t==0 if you want to turn on
            let json_string = "["
            for (var j = 0; j < depths.length; j++){
                json_string = json_string + depths[j];
                json_string = json_string + ", ";
            }
            json_string = json_string + "]";
            console.log(json_string)
        }

        var buffer = new Uint8ClampedArray(width * height * 4); // have enough bytes

        for(var i = 0; i < depths.length; i++) {
            var pos_x = (x_array[i] - min_x) / gridsize;
            var pos_y = (max_y - y_array[i]) / gridsize;
            var pos = (pos_y * width + pos_x) * 4; // position in buffer based on x and y
            var color = ColorMap(depths[i] / normalisation[1][1])
            buffer[pos] = color[0]     // some R value [0, 255]
            buffer[pos+1] = color[1]          // some G value
            buffer[pos+2] = color[2]           // some B value
            buffer[pos+3] = color[3]      // set alpha channel
        }

        // create off-screen canvas element
        var canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d');

        canvas.width = width;
        canvas.height = height;

        // create imageData object
        var idata = ctx.createImageData(width, height);

        // set our buffer as source
        idata.data.set(buffer);

        // update canvas with new data
        ctx.putImageData(idata, 0, 0);

        // create a new img object
        var image=new Image();

        // set the img.src to the canvas data url
        image.src=canvas.toDataURL();

        // append the new img object to the page
        // document.body.appendChild(image);
        arrayOfImages.push(image);
    }
    console.log(depths.length)
    imageBounds = [[52.1229223, 4.9410346], [52.1710826, 5.0142276]];
    imageShowIndex = 0;
    startVideo()
    document.getElementById("predict-button").style.backgroundImage = getComputedStyle(document.documentElement).getPropertyValue('--gradient3')
}

var playingVideo = false;
function startVideo(){
    playingVideo = true;
    document.getElementsByClassName('output')[0].scrollIntoView();
    showImageOnMap()
}

function stopVideo(){
    if (playingVideo == true){
        playingVideo = false;
        clearTimeout(video_timer);
    }
}

function showImageOnMap() {
    if (image != null) {
        if (map.hasLayer(image)){
            map.removeLayer(image);
        }
    }
    image = L.imageOverlay(arrayOfImages[imageShowIndex], imageBounds).addTo(map);
    document.getElementById("time-slider-text").innerText = `Inundation at t = ${imageShowIndex}`
    if (playingVideo == true){
        let range = document.getElementsByClassName('timeSlider')[0];
        range.value = imageShowIndex;
        if (imageShowIndex < 12){
            imageShowIndex = imageShowIndex + 1;
        }
        else {
            imageShowIndex = 0;
        }
        video_timer = setTimeout(showImageOnMap, 200);
    }
}

legend_colors = [
    [0,0,255,0],
    [0,0,255,55],
    [0,0,255, 100],
    [0,0,255, 155],
    [0,0,255,200],
    [0,0,255,255]
]

tresholds = [0.02, 0.05, 0.1, 0.2, 0.3]
makeLegend()

function ColorMap(input_value) {
    for (var i = 0; i < tresholds.length; i++){
        if (input_value < tresholds[i]) {
            return legend_colors[i];
        }
    }
    return legend_colors[legend_colors.length-1]
}


function makeLegend(){
    let color_legend = document.getElementsByClassName('legend-color');
    let text_legend = document.getElementsByClassName('legend-text');

    for (var i = 0; i < legend_colors.length; i++){
        let newElement = document.createElementNS('http://www.w3.org/2000/svg','rect');
        newElement.setAttribute('fill',`rgb(${legend_colors[i][0]},${legend_colors[i][1]},${legend_colors[i][2]})`);
        newElement.setAttribute('fill-opacity', `${legend_colors[i][3]/255}`)
        newElement.setAttribute('width','100%');
        newElement.setAttribute('height','100%');
        newElement.setAttribute('stroke','white');
        newElement.setAttribute('stroke-width','2');
        color_legend[i].appendChild(newElement);

        if (i < tresholds.length){
            const textnode = document.createTextNode("< " + parseInt(tresholds[i] * 100) + " cm");
            text_legend[i].appendChild(textnode)
        }
        else {
            const textnode = document.createTextNode(">= " + parseInt(tresholds[i-1] * 100) + " cm");
            text_legend[i].appendChild(textnode)
        }
    }
}

