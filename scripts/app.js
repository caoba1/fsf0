const gapiKey=0;
const ytapiKey=0;

var micIsSelected = true;

/* I will declare all html elements on this lines */
const audioElement = document.getElementById("audio-source");

async function getMediaElement(constraints) {
  let stream = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    /* use the stream */
  } catch(err) {
    /* handle the error */
  }
  return stream;
}


/* Set up canvas' context and the function handle */
const canvas = document.querySelector('.visualizer-canvas');
var axisOffsetX=5;
var axisOffsetY=10;
var displayHandle= document.getElementById("display-type").value;

//var intendedWidth = document.querySelector('.container-canvas').clientWidth;
//canvas.setAttribute('width',intendedWidth);
//var drawVisual;  //requestAnimationFrame(f) var not needed.(?)


/* TODO: Change init function to navigator.getUserMedia for mic input */
async function init() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContext();

  /* Create an analyser node */
  var analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 256;
  analyserNode.minDecibels = -90;
  analyserNode.maxDecibels = -10;
  analyserNode.smoothingTimeConstant = 0.85;

  /* Create a gain node */
  var gainNode = audioContext.createGain();
  gainNode.gain.value = 1;

  var gainOutNode = audioContext.createGain();
  gainOutNode.gain.value = 0;



  /* A file source */
  if (!micIsSelected){
    console.log('');
    /* Create a source node */
    //var audioElement = document.getElementById("audio-source");
    var audioSource = audioContext.createMediaElementSource(audioElement);
    gainOutNode.gain.value = 0;

  }else{
    var constraints = {audio: true, video:false}
    let stream = null;
    stream = await getMediaElement(constraints);
    var audioSource = audioContext.createMediaStreamSource(stream);
    console.log('Starting microphone source');
  }

  /* Start! */
  audioSource.connect(gainNode).connect(analyserNode).connect(gainOutNode).connect(audioContext.destination);
  visualize(analyserNode, canvas, axisOffsetX, axisOffsetY);
}

/* After, or before the init function is declared, we should set an event listener */


/*Should it be good practice to have other functionality outside the init? */
/*------------------------------------------------*/
/* The visualizer function, from MDN */
/**
*@param analyserNode is the analyser from which to draw the canvas
*@param canvas is the canvas element
**/
function visualize(analyserNode, canvas, offsetX, offsetY){

  WIDTH = canvas.width-offsetX;
  HEIGHT = canvas.height-offsetY;

  var canvasContext = canvas.getContext("2d");

  /* A container for the spectral data */
  var offCanvas = document.createElement('canvas');
  var spectralContainer = offCanvas.getContext('2d').createImageData(WIDTH, HEIGHT);

  var pointerSpectrum = 0;
  /* The drawing function has to fetch an animation frame */
  var drawingFunction = function() {
    drawVisual = requestAnimationFrame(drawingFunction);

    var bufferLength = analyserNode.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);

    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    // SizeOf dataArray should === bufferLength, always
    analyserNode.getByteFrequencyData(dataArray);

    //Draw spectrum
    canvasContext.fillStyle = 'rgba(255, 255, 255,0)'; //Background
    canvasContext.fillRect(0, 0, WIDTH+offsetX, HEIGHT+offsetY);

    if (document.getElementById("display-type").value === "fvst"){
      // Drawing freq. vs. time.
      drawAxis(canvasContext,offsetX,offsetY,"t","freq.");

      // Repost the data.
      var tentativeCounter=0;
      for (var ii = 0; ii < HEIGHT; ii++){
        for(var i = 0; i < (WIDTH-1); i++) {
          spectralContainer.data[(ii-1)*(WIDTH*4)+((i-1)*4)+1] = spectralContainer.data[(ii-1)*(WIDTH*4)+((i-1)*4)+5];
          spectralContainer.data[(ii-1)*(WIDTH*4)+((i-1)*4)+2] = spectralContainer.data[(ii-1)*(WIDTH*4)+((i-1)*4)+6];
          spectralContainer.data[(ii-1)*(WIDTH*4)+((i-1)*4)+3] = spectralContainer.data[(ii-1)*(WIDTH*4)+((i-1)*4)+7];
          spectralContainer.data[(ii-1)*(WIDTH*4)+((i-1)*4)+4] = spectralContainer.data[(ii-1)*(WIDTH*4)+((i-1)*4)+8];
          if (i===(WIDTH-2)){
            if (dataArray[HEIGHT-ii]>20){
            spectralContainer.data[(ii-1)*(WIDTH*4)+((i-1)*4)+4]=15;
            spectralContainer.data[(ii-1)*(WIDTH*4)+((i-1)*4)+5]=80;
            spectralContainer.data[(ii-1)*(WIDTH*4)+((i-1)*4)+6]=dataArray[HEIGHT-ii]+60;
            spectralContainer.data[(ii-1)*(WIDTH*4)+((i-1)*4)+7]=255;
            tentativeCounter += 1;
          }else{
            spectralContainer.data[(ii-1)*(WIDTH*4)+((i-1)*4)+4]=255;
            spectralContainer.data[(ii-1)*(WIDTH*4)+((i-1)*4)+5]=255;
            spectralContainer.data[(ii-1)*(WIDTH*4)+((i-1)*4)+6]=255;
            spectralContainer.data[(ii-1)*(WIDTH*4)+((i-1)*4)+7]=0;
          }

          }
        }
        tentativeCounter=0;
      }

      offCanvas.getContext('2d').putImageData(spectralContainer, 0, 0);
      canvasContext.drawImage(offCanvas, offsetX, 0, WIDTH+offsetX, HEIGHT+offsetY); //TODO Check scaling

    }else{
      // Drawing power vs. freq.
      drawAxis(canvasContext,offsetX,offsetY,"freq.","|X(f)|");

      var barWidth = (WIDTH / bufferLength) * 2.5;
      var barHeight;
      var x = 0;

      for(var i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];
        canvasContext.fillStyle = 'rgb(20,160,' + (barHeight+60) + ')';
        canvasContext.fillRect(x+offsetX,HEIGHT-barHeight/2,barWidth,barHeight/2);
        x += barWidth + 1;
      }
    }
  };
  drawingFunction();
}

/**
*@param canvas The canvas element to write the axis
*@param offsetX Not implemented
*@param offsetY Not implemented
**/
function drawAxis(canvasContext,offsetX,offsetY,labelX,labelY){
  var axisCanvas = document.createElement('canvas');
  var axisContext = axisCanvas.getContext('2d');
  for (var x = 0.5; x < 320; x += 10) {
    axisContext.moveTo(x, 0);
    axisContext.lineTo(x, 150);
  }
  for (var y = 0.5; y < 150; y += 10) {
    axisContext.moveTo(0, y);
    axisContext.lineTo(320, y);
  }
  axisContext.strokeStyle = "#eee";
  axisContext.stroke();

  axisContext.beginPath();
  axisContext.moveTo(0, 140); //x-axis
  axisContext.lineTo(320, 140);
  axisContext.moveTo(270, 135);
  axisContext.lineTo(280, 140);
  axisContext.lineTo(270, 145);

  axisContext.moveTo(5, 0);
  axisContext.lineTo(5, 150);
  axisContext.moveTo(0, 5);
  axisContext.lineTo(5, 0);
  axisContext.lineTo(10, 5);

  axisContext.strokeStyle = "#000";
  axisContext.stroke();

  axisContext.font = "10px Poppins";
  axisContext.textAlign = "center";
  axisContext.fillText(labelY, 20, 20);
  axisContext.fillText(labelX, 148, 150);
  canvasContext.drawImage(axisCanvas, 0, 0, 320, 150);
}
