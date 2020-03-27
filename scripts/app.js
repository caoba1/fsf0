const gapiKey=0;
const ytapiKey=0;

var micIsSelected = false;

/* I will declare all html elements on this lines */
const audioElement = document.getElementById("audio-source");
/* Set up canvas' context and the function handle */
const canvas = document.querySelector('.visualizer-canvas');

//var intendedWidth = document.querySelector('.container-canvas').clientWidth;
//canvas.setAttribute('width',intendedWidth);
//var drawVisual;  //requestAnimationFrame(f) var not needed.(?)


/* TODO: Change init function to navigator.getUserMedia for mic input */
function init() {
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

  /* A file source */
  if (!micIsSelected){
    console.log('');
    /* Create a source node */
    //var audioElement = document.getElementById("audio-source");
    var audioSource = audioContext.createMediaElementSource(audioElement);

  }else{
    console.log('Option unavailable');
  }

  /* Start! */
  audioSource.connect(gainNode).connect(analyserNode).connect(audioContext.destination);
  visualize(analyserNode, canvas);
}

/* After, or before the init function is declared, we should set an event listener */


/*Should it be good practice to have other functionality outside the init? */
/*------------------------------------------------*/
/* The visualizer function, from MDN */
/**
*@param analyserNode is the analyser from which to draw the canvas
*@param canvas is the canvas element
**/
function visualize(analyserNode, canvas){
  WIDTH = canvas.width;
  HEIGHT = canvas.height;

  /* The drawing function has to fetch an animation frame */
  var drawingFunction = function() {
      drawVisual = requestAnimationFrame(drawingFunction);
        canvasContext.clearRect(0, 0, WIDTH, HEIGHT);
  var bufferLength = analyserNode.frequencyBinCount;
  var dataArray = new Uint8Array(bufferLength);

  canvasContext.clearRect(0, 0, WIDTH, HEIGHT);
  // SizeOf dataArray should === bufferLength, always
  analyserNode.getByteFrequencyData(dataArray);
  //Draw spectrum
  canvasContext.fillStyle = 'rgb(255, 255, 255)'; //Background
  canvasContext.fillRect(0, 0, WIDTH, HEIGHT);

  var barWidth = (WIDTH / bufferLength) * 2.5;
  var barHeight;
  var x = 0;

  for(var i = 0; i < bufferLength; i++) {
    barHeight = dataArray[i];
    canvasContext.fillStyle = 'rgb(' + (barHeight+100) + ',50,50)';
    canvasContext.fillRect(x,HEIGHT-barHeight/2,barWidth,barHeight/2);
    x += barWidth + 1;
  }};
  drawingFunction();
}
