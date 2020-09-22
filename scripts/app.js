const gapiKey = 0;
const ytapiKey = 0;
var onLoad = true;

var micIsSelected = true;

/* I will declare all html elements on this lines */
const audioElement = document.getElementById("audio-source");

/* Ask for mic permission and pass stream */
async function getMediaElement(constraints) {
  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    /* use the stream */
  } catch (err) {
    /* handle the error */
  }
  return stream;
}


/* Set up canvas' context and the function handle */
const canvas = document.querySelector('.visualizer-canvas');
var axisOffsetX = 5;
var axisOffsetY = 10;
var displayHandle = document.getElementById("display-type").value;

//var intendedWidth = document.querySelector('.container-canvas').clientWidth;
//canvas.setAttribute('width',intendedWidth);
//var drawVisual;  //requestAnimationFrame(f) var not needed.(?)

/* Visualizer settings */
const visFreqNFFT = document.querySelector('#vis-freq-nfft');
const visFreqZoom = document.querySelector('#vis-freq-zoom');

/* More information */
const textBox1 = document.querySelector('#text-box-1');
const textBox2 = document.querySelector('#text-box-2');
const textBox3 = document.querySelector('#text-box-3');


/* TODO: Change init function to navigator.getUserMedia for mic input */
async function init() {
  //if (onLoad){
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContext();
  //onLoad = false;
  //}

  /* Create an analyser node */
  var analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = visFreqNFFT.value;
  analyserNode.minDecibels = -60; //-90
  analyserNode.maxDecibels = 0; //-1ß
  analyserNode.smoothingTimeConstant = 0.85;

  /* Create a second analyser node */
  //var analyserNode2 = audioContext.createAnalyser();
  //analyserNode2.fftSize = visFreqNFFT.value;
  //analyserNode2.minDecibels = -40; //-90
  //analyserNode2.maxDecibels = 10; //-1ß
  //analyserNode2.smoothingTimeConstant = 0.85;

  /* Create a gain node */
  var gainNode = audioContext.createGain();
  gainNode.gain.value = 3;

  var gainOutNode = audioContext.createGain();
  gainOutNode.gain.value = 0;

  /* Some filters */
  var filterBP = audioContext.createBiquadFilter();
  filterBP.type = "bandpass";
  filterBP.frequency.value = 2000;
  //Turned off at start
  filterBP.gain.value = 0;
  filterBP.g = 0.25;


  /* A file source */
  if (!micIsSelected) {
    console.log('');
    /* Create a source node */
    //var audioElement = document.getElementById("audio-source");
    var audioSource = audioContext.createMediaElementSource(audioElement);
    gainOutNode.gain.value = 1;

  } else {
    var constraints = { audio: true, video: false }
    let stream = null;
    stream = await getMediaElement(constraints);
    var audioSource = audioContext.createMediaStreamSource(stream);
    console.log('Starting microphone source');
    gainOutNode.gain.value = 0;
  }

  //Other function definitions, inside INIT! 
  //@todo: Bring checkbox inside here.
  visFreqNFFT.addEventListener('change', function () {
    analyserNode.fftSize = visFreqNFFT.value;
  });
  visFreqZoom.addEventListener('change', function () {

  }); //<-- semicolon or not semicolon, that is the question.

  /* Start! */
  audioSource.connect(gainNode).connect(filterBP).connect(analyserNode).connect(gainOutNode).connect(audioContext.destination);
  //audioSource.connect(gainNode).connect(filterBP).connect(analyserNode2); //Second path.
  visualize(analyserNode, canvas, axisOffsetX, axisOffsetY);



}

/* After, or before the init function is declared, we should set an event listener */
/** Get midi value
*@param ffreq is the frequency
*@return midi_note_number
**/
function getMidiNumber(ffreq) {
  var finhz = ffreq;
  tuning = 440
  // https://newt.phys.unsw.edu.au/jw/notes.html 
  finhz = 12 * Math.log2((ffreq / tuning)) + 69;
  if ((finhz > 0 && finhz < 128) && isFinite(finhz)) {
    return finhz;
  } else if (finhz >= 128) {
    return 128;
  } else {
    //@todo: return null?
    return 20;
  }
}

/** Get midi descriptors 
* returns a variable length array whose length is the number of midi notes
**/
function getMidiValues(fdataArray, fnumberBins, nfftby2, fsby2) {
  //lower bound is [0...20, then 21 -->
  midiVectorLength = getMidiNumber(fsby2 * (fnumberBins / nfftby2));
  midiVector = new Array(Math.floor(midiVectorLength) - 20);

  var n = 0;
  midiVectorIx = new Array(Math.floor(fnumberBins)); //Redundant
  for (n = 0; n < fnumberBins; n++) {
    midiVectorIx[n] = Math.floor(getMidiNumber(fsby2 * ((n + 1) / nfftby2)));
  }

  //Get midi values for the current frequency vector
  for (n = 0; n < midiVector.length; n++) {
    //midiVectorLength - 20 is the length of the vector
    var indexes = [];
    var i = 0;

    //Get indexes of same midi notes. Case that n=0:<20, n=1:21, n=2:22,...
    for (i = 0; i < midiVectorIx.length; i++) {
      if (midiVectorIx[i] === n + 20) {
        indexes.push(i);
      }
    }
    // Fill in midiVector
    var sum = 0;
    if (indexes.length > 0) {
      sum = 0;
      for (i = 0; i < indexes.length; i++) {
        sum = sum + fdataArray[indexes[i]];
      }
      midiVector[n] = sum / indexes.length;
    } else {
      //No note found
      midiVector[n] = 0;
    }
  }
  return midiVector;
}

/** Get chroma vector
 * 
 **/
function getChromaVec(fdataFrame){
  // Definition 
  var chromaVector = new Array(12);
  var n=0, m=0, p=0, q=0;
  let counts = [];
  for (n=0; n<12; n++){
    //Starting in A0
    let octaveJumps = [];
    for (m=21; m<=128; m=m+12){
      octaveJumps.push(n+m);
    }

    let sum=0, count=0;
    for (p=0; p<octaveJumps.length; p++){
      if (octaveJumps[p]-20<fdataFrame.length){
        if (fdataFrame[octaveJumps[p]-20]>0){
          count = count + 1;
        }
        sum = sum + fdataFrame[octaveJumps[p]-20];
      }else{
        sum = sum;
      }
    }
    counts.push(count);
    if (count>1){
      chromaVector[n] = sum;
      //chromaVector[n] = sum / count;
    }else{
      chromaVector[n] = sum;
    }
    
 
    }

    //Normalize??
    //var max = Math.max(chromaVector);
    //for (n=0; n<chromaVector/)...

    //Reduce!?
    var maxi=Math.max(counts);
    for (n=0; n<12; n++){
      if (maxi>0){
      chromaVector[n] = chromaVector[n]/maxi;
      }
    }

    return chromaVector;
  }


/** Get max value
*@param dataArray is the data array
*@param length is the length of the data array
*@return ix is the index of the max element in the array
**/
function getArrayMaxIndex(dataArray, length) {
  let x = 0;
  let val = 0;
  let ix = 0;
  for (x = 0; x < length; x++) {
    if (dataArray[x] > val) {
      val = dataArray[x];
      ix = x;
    }
  }
  return ix;
}

/** Fills canvas container with a last column, and shifts the remaining columns to
* the left. Optionally, set number of group of pixels (pixel width and pixel height)
*@param fcanvasContainer is offCanvas.getContext('2d').createImageData(WIDTH, HEIGHT); 
*@param fdataColumn
*@param fdataLength
*@param fwidth
*@param fheight
*for expected behaviour, fdataLength == fheight
**/
function fillCanvasContainer(fcanvasContainer, fdataColumn, fdataLength, fwidth, fheight) {
  //Implement
  let h = 0;
  let w = 0;
  let d = 0;
  let coord = 0;
  let newVal = 0;
  let colorArray = new Array(4);
  for (h = 0; h < fheight; h++) {
    //fwidth - 1, cause last colum to fill is the one with the fdataColumn vector.
    //(consider branching filling in another function for simplicity)
    for (w = 0; w < (fwidth - 1); w++) {
      coord = h * (fwidth * 4) + w * 4;
      coord_nextx = h * (fwidth * 4) + (w + 1) * 4; //Branch this to a function
      // Shift one pixel to the left
      fcanvasContainer.data[coord] = fcanvasContainer.data[coord_nextx];
      fcanvasContainer.data[coord + 1] = fcanvasContainer.data[coord_nextx + 1];
      fcanvasContainer.data[coord + 2] = fcanvasContainer.data[coord_nextx + 2];
      fcanvasContainer.data[coord + 3] = fcanvasContainer.data[coord_nextx + 3];
      //if (h=0)
    }//w
  }//h

  // Add last column. Just adds until fdataLength. 
  for (d = 0; d < fdataLength; d++) {
    newVal = fdataColumn[d];
    coord_lc = d * (fwidth * 4) + (fwidth - 1) * 4;
    colorArray[0] = 1;
    colorArray[1] = 20;
    colorArray[2] = 150;
    if (newVal > 10) {
      colorArray[3] = (newVal * 1.1) + 10;
    } else {
      colorArray[3] = (newVal * 1.1) + 10;
    }
    fcanvasContainer.data[coord_lc] = colorArray[0];
    fcanvasContainer.data[coord_lc + 1] = colorArray[1];
    fcanvasContainer.data[coord_lc + 2] = colorArray[2];
    fcanvasContainer.data[coord_lc + 3] = colorArray[3];
  }//last column

  return fcanvasContainer;
}

/** Fills data container with an array which is mapped from a bigger or smaller 
 * array.
*@param fnewArray is offCanvas.getContext('2d').createImageData(WIDTH, HEIGHT); 
*@param fnewLength
*@param fArray
*@param fLength
**/
function fillArrayData(fnewArray, fnewLength, fArray, fLength) {
  let newData = 0;
  let d = 0;
  let numProm = 0;
  if (fLength > fnewLength) {
    //Compress
    numProm = Math.floor(fLength / fnewLength);
    //console.log(":compress:" + numProm + ":");
    for (d = 0; d < fnewLength; d++) {

      //Calculate avg
      newData = 0;
      for (i = 0; i < numProm; i++) {
        newData = newData + fArray[(d * numProm) + i];
      }
      newData = newData / numProm;

      //Fill in split
      fnewArray[d] = newData;
    }
  } else {
    if (fLength < fnewLength) {
      //Expand
      numProm = 1 + Math.floor(fnewLength / fLength);
      //console.log(":expand:"+numProm+":");
      for (d = 0; d < fLength; d++) {
        for (i = 0; i < numProm; i++) {
          fnewArray[(d * numProm) + i] = fArray[d];
        }
      }
    } else {
      //sizes are the same
      return fArray;
    }
  }
  return fnewArray;
}

/** Flips a data array  **/
function flipArray(flipDataArray, farrayLength) {
  let thisNewArray = new Array(farrayLength);
  let n = 0;
  for (n = 1; n <= farrayLength; n++) {
    thisNewArray[farrayLength - n] = flipDataArray[n - 1];
  }
  return thisNewArray;
}


/*Should it be good practice to have other functionality outside the init? */
/*------------------------------------------------*/
/* The visualizer function, from MDN */
/**
*@param analyserNode is the analyser from which to draw the canvas
*@param canvas is the canvas element
**/
function visualize(analyserNode, canvas, offsetX, offsetY) {

  WIDTH = parseInt(canvas.width - offsetX);
  HEIGHT = parseInt(canvas.height - offsetY);
  var bufferLength = analyserNode.frequencyBinCount;
  console.log(":" + HEIGHT + ":" + WIDTH + ":" + bufferLength + ":");

  //NUMBER_OF_BINS = 32;

  var canvasContext = canvas.getContext("2d");

  /* A container for the spectral (2d image) data */
  var offCanvas = document.createElement('canvas');
  var spectralContainer = offCanvas.getContext('2d').createImageData(WIDTH, HEIGHT);

  var pointerSpectrum = 0;
  var dataLength = HEIGHT;
  //var dataLength = bufferLength;
  var newDataArray = new Array(dataLength);


  /* The drawing function has to fetch an animation frame */
  var drawingFunction = function () {
    drawVisual = requestAnimationFrame(drawingFunction);

    /* Changing visualization parameters, and only these which are
 not part of an audio context node */
    /* Set visualization parameters */
    untilFreq = visFreqZoom.value;
    binNumber = Math.floor((untilFreq * bufferLength) / (44100 / 2));
    var newFreqVector = new Array(binNumber);
    var zoomFreqs = true;


    // Setup canvas
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);

    // SizeOf dataArray should === bufferLength, always
    var dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteFrequencyData(dataArray);

    //Get index of maximum frequency
    let maxFreqIx = getArrayMaxIndex(dataArray, bufferLength);

    // Clear canvas
    canvasContext.fillStyle = 'rgba(255, 255, 255,0)'; // Background
    canvasContext.fillRect(0, 0, WIDTH + offsetX, HEIGHT + offsetY);

    if (document.getElementById("display-type").value === "fvst") {
      // Drawing freq. vs. time.
      drawAxis(canvasContext, offsetX, offsetY, "t", "freq.");

      //Just show a subset of frequencies
      if (zoomFreqs) {
        var s = 0;
        for (s = 0; s < binNumber; s++) {
          newFreqVector[s] = dataArray[s];
        }
        newDataArray = fillArrayData(newDataArray, dataLength, newFreqVector, binNumber);
      } else {
        //All data in canvas!
        newDataArray = fillArrayData(newDataArray, dataLength, dataArray, bufferLength);
      }

      newDataArray = flipArray(newDataArray, dataLength); //Because canvas is upside-down. 
      spectralContainer = fillCanvasContainer(spectralContainer, newDataArray, dataLength, WIDTH, HEIGHT);

      if (zoomFreqs) {
        maxFreq = (HEIGHT * maxFreqIx / binNumber);
      } else {
        maxFreq = (HEIGHT * maxFreqIx / bufferLength);
      }

      // Draw thick line
      let coord = (HEIGHT - parseInt(maxFreq)) * (WIDTH * 4) + WIDTH * 4;
      let thickness = 3;
      let n = 0;
      for (n = 0; n < thickness; n++) {
        coord = ((HEIGHT - Math.floor(maxFreq) + n - Math.floor(thickness / 2)) * (WIDTH * 4) + (WIDTH - 1) * 4);
        spectralContainer.data[coord] = 255;
        spectralContainer.data[coord + 1] = 0;
        spectralContainer.data[coord + 2] = 0;
        spectralContainer.data[coord + 3] = 255;
      }

      offCanvas.getContext('2d').putImageData(spectralContainer, 0, 0);
      canvasContext.drawImage(offCanvas, offsetX, 0, WIDTH + offsetX, HEIGHT + offsetY); //TODO Check scaling

    } else if (document.getElementById("display-type").value === "cvst") {
      drawAxis(canvasContext, offsetX, offsetY, "t", "");

      /*
      //Just show a subset of frequencies
      if (zoomFreqs) {
        var s = 0;
        for (s = 0; s < binNumber; s++) {
          newFreqVector[s] = dataArray[s];
        }
      } else {
        //All data in canvas! <<Deprecated>>
      }

      midiFreqVector = getMidiValues(newFreqVector, binNumber, bufferLength, 22050); //Array init insitde getMidiValues !? --> @todo: Memory issues... 
      */

      midiFreqVector = getMidiValues(dataArray, bufferLength, bufferLength, 22050); //Array init insitde getMidiValues !? --> @todo: Memory issues... 

      // Roll on in chroma
      chromaVector = getChromaVec(midiFreqVector);

      //For drawing in canvas.
      //newDataArray = fillArrayData(newDataArray, dataLength, midiFreqVector, midiFreqVector.length); //Fill canvas column info
      newDataArray = fillArrayData(newDataArray, dataLength, chromaVector, chromaVector.length); //Fill canvas column info
      newDataArray = flipArray(newDataArray, dataLength); //Flip because canvas is upside-down. 
      spectralContainer = fillCanvasContainer(spectralContainer, newDataArray, dataLength, WIDTH, HEIGHT); //Add column to canvas

      drawChromaNotes(canvasContext,offsetX,offsetY);
      //Draw!
      offCanvas.getContext('2d').putImageData(spectralContainer, 0, 0);
      canvasContext.drawImage(offCanvas, offsetX, 0, WIDTH + offsetX, HEIGHT + offsetY); //TODO Check scaling

     

    } else {
      // Drawing power vs. freq.
      drawAxis(canvasContext, offsetX, offsetY, "freq.", "|X(f)|");

      var barWidth = (WIDTH / bufferLength) * 2.5;
      var barHeight;
      var x = 0;

      for (var i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];
        canvasContext.fillStyle = 'rgb(20,160,' + (barHeight + 60) + ')';
        canvasContext.fillRect(x + offsetX, HEIGHT - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth + 1;
      }
    }
    // Fill info boxes
    textBox1.value = "Approx. " + (maxFreqIx / bufferLength) * (44100 / 2) + " Hz";
    textBox2.value = dataArray[maxFreqIx] + " /255 Rel. Pow. ([-20 10]dB Rel.)";
    textBox3.value = "Midi # " + getMidiNumber((maxFreqIx / bufferLength) * (44100 / 2));
  };
  drawingFunction();
}

/**
*@param canvas The canvas element to write the axis
*@param offsetX Not implemented
*@param offsetY Not implemented
**/
function drawAxis(canvasContext, offsetX, offsetY, labelX, labelY) {
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

/**
*@param canvas The canvas element to write the axis
*@param offsetX Not implemented
*@param offsetY Not implemented
**/
function drawChromaNotes(canvasContext, offsetX, offsetY) {
  var axisCanvas = document.createElement('canvas');
  var axisContext = axisCanvas.getContext('2d');
  axisContext.font = "10px Poppins";

  var gradient = canvasContext.createLinearGradient(0, 0, 20, 0);
  gradient.addColorStop("0"," magenta");
  gradient.addColorStop("1", "red");
  axisContext.fillStyle = gradient;

  axisContext.fillText("A", 7, 139);
  axisContext.fillText("B", 7, 128);
  axisContext.fillText("H", 7, 116);
  axisContext.fillText("C", 7, 103);
  axisContext.fillText("Db", 7, 92);
  axisContext.fillText("D", 7, 80);
  axisContext.fillText("Eb", 7, 67);
  axisContext.fillText("E", 7, 54);
  axisContext.fillText("F", 7, 43);
  axisContext.fillText("Gb", 7, 32);
  axisContext.fillText("G", 7, 21);
  axisContext.fillText("Ab", 7, 10);
  canvasContext.drawImage(axisCanvas, 0, 0, 320, 150);
}



//
var checkbox = document.querySelector("input[name=checkbox]");

checkbox.addEventListener('change', function () {
  if (this.checked) {
    // Checkbox is checked..
    micIsSelected = true;
    audioElement.style.display = "none";
    init();
  } else {
    micIsSelected = false;
    audioElement.style.display = "block";
    init();
    // Checkbox is not checked..
  }
});
