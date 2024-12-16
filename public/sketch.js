//socket code from class drawing example
//Open and connect socket
let socket = io();

//Listen for confirmation of connection
socket.on('connect', function() {
  console.log("Connected with ID:", socket.id);
});


//code below - implementing p5.js sketch

//sound effect list:
  //reverb - dark blue
  //delay - green
  //chorus - light purple grey 
  //phaser - orange
  //distortion - grey
  //pitch shift - pink
  //frequency shifter - purple
  //auto-wah - yellow

let synthBlob;
let revFx, delFx, choFx, phaserFx, distortionFx, pitchFx, freqShiftFx, autoWahFx;
let trash;
let joints = [];
let activeEffects = []; //array of effects that are active

//all blob (circle) initial positions
let positions = [
  { x: 55, y: 55 }, //synth
  { x: 50, y: 450 }, //reverb
  { x: 120, y: 450 }, //delay
  { x: 190, y: 450 }, //chorus
  { x: 260, y: 450 }, //phaser
  { x: 330, y: 450 }, //distortion
  { x: 400, y: 450 }, //pitch shift
  { x: 470, y: 450 }, //freq shift
  { x: 540, y: 450 }, //auto wah
];

//initializing variables for dragging of blobss and melody/audio playing
let activeBlob = null;
let melodyPlaying = false; //check if melody is already playing
let audioStarted = false; //check if the audio has started

//tone.js documentation used: https://tonejs.github.io/docs/15.0.4/index.html
//overall volume - eventually will put volume slider
Tone.Destination.volume.value = -10;

//synth (sound type attached to melody) - triangle wave
let synth = new Tone.Synth({
  oscillator: { type: "triangle" }
});

//effect parameters
let chorus = new Tone.Chorus({
  frequency: 3,
  delayTime: 4,
  depth: 0.9,
  spread: 180,
}).start();

let reverb = new Tone.Reverb({
  decay: 20,
  preDelay: 0.5,
  wet: 1,
});

let delay = new Tone.FeedbackDelay({
  delayTime: "8n",
  feedback: 0.5,
  wet: 0.5,
});

let distortion = new Tone.Distortion({
  distortion: 0.4, //amount
  oversample: "4x", //sound quality?
});

let phaser = new Tone.Phaser({
  frequency: 0.5,
  octaves: 15,
  baseFrequency: 120,
});

let pitchShift = new Tone.PitchShift({
  pitch: 5, //semitones (pos up)
});

let freqShift = new Tone.FrequencyShifter({
  frequency: 0,
});

let autoWah = new Tone.AutoWah({
  baseFrequency: 100,
  octaves: 6,
  sensitivity: -30,
});

//melody parameters/notes
let melodyPattern = new Tone.Pattern(
  (time, note) => {
    if (note) {
      synth.triggerAttackRelease(note, "16n", time);
    }
  },
  ["C4", "E4", "G4", "A4"],"up"
);

melodyPattern.start(0);
synth.connect(Tone.Destination); 



function setup() {
  createCanvas(800, 500);

  //sprites use p5.play library
  //synth blob (melody) sprite
  synthBlob = new Sprite();
  synthBlob.diameter = 50;
  synthBlob.position = createVector(positions[0].x, positions[0].y);
  synthBlob.color = color(90, 255, 255);
  synthBlob.drag = 10;

  //effect blob sprites
  revFx = new Sprite();
  revFx.diameter = 40;
  revFx.position = createVector(positions[1].x, positions[1].y);
  revFx.color = color('blue');
  revFx.drag = 10;

  delFx = new Sprite();
  delFx.diameter = 40;
  delFx.position = createVector(positions[2].x, positions[2].y);
  delFx.color = color('lightgreen');
  delFx.drag = 10;

  choFx = new Sprite();
  choFx.diameter = 40;
  choFx.position = createVector(positions[3].x, positions[3].y);
  choFx.color = color('lightblue');
  choFx.drag = 10;

  phaserFx = new Sprite();
  phaserFx.diameter = 40;
  phaserFx.position = createVector(positions[4].x, positions[4].y);
  phaserFx.color = color('orange');
  phaserFx.drag = 10;

  distortionFx = new Sprite();
  distortionFx.diameter = 40;
  distortionFx.position = createVector(positions[5].x, positions[5].y);
  distortionFx.color = color('grey');
  distortionFx.drag = 10;

  pitchFx = new Sprite();
  pitchFx.diameter = 40;
  pitchFx.position = createVector(positions[6].x, positions[6].y);
  pitchFx.color = color('pink');
  pitchFx.drag = 10;

  freqShiftFx = new Sprite();
  freqShiftFx.diameter = 40;
  freqShiftFx.position = createVector(positions[7].x, positions[7].y);
  freqShiftFx.color = color('purple');
  freqShiftFx.drag = 10;

  autoWahFx = new Sprite();
  autoWahFx.diameter = 40;
  autoWahFx.position = createVector(positions[8].x, positions[8].y);
  autoWahFx.color = color('yellow');
  autoWahFx.drag = 10;

  //trash can sprite
  trash = new Sprite();
  trash.width = 50;
  trash.height = 50;
  trash.position = createVector(750, 59);
  trash.collider = "static"; //not movable 
  trash.color = color(253, 114, 139);
  
  //reset page button 
  resetButton = createButton('Reset');
  resetButton.position(800, 25);
  resetButton.mousePressed(resetBlobs);
}

function draw() {
  clear();
  background(0, 250, 150); //green background

  //make sure circles don't go out of screen bounds
  let allBlobs = [synthBlob, revFx, delFx, choFx, phaserFx, distortionFx, pitchFx, freqShiftFx, autoWahFx];
  for (let blob of allBlobs) {
    blob.position.x = constrain(blob.position.x, 20, width - 20);
    blob.position.y = constrain(blob.position.y, 20, height - 20);
  }
  
  //text styling on p5 canvas for trash, fx, and sound (might remove when adding data storage)
  fill('white'); stroke('black'); textSize(20);
  text('trash', 728, 28);
  textSize(40);
  text('<- fx', 690, 460);
  text('<- sound', 110, 65);

  //update effect parameters based on distance fx blobs are from synth blob
  updateEffectParameters();

  //visible drawing of the line joints between circles
  stroke('white');
  strokeWeight(2);
  for (let joint of joints) {
    line(joint.a.x, joint.a.y, joint.b.x, joint.b.y);
  }

  //draw all blobs
  synthBlob.draw();
  revFx.draw();
  delFx.draw();
  choFx.draw();
  phaserFx.draw();
  distortionFx.draw();
  pitchFx.draw();
  freqShiftFx.draw();
  autoWahFx.draw();

  //draw the trash can blob
  trash.draw();

  //mouse dragging blobs (need to know which is currently being dragged)
  if (activeBlob) {
    if (activeBlob.mouse.dragging()) {
      activeBlob.moveTowards(
        constrain(mouseX + activeBlob.mouse.x, 20, width - 20),
        constrain(mouseY + activeBlob.mouse.y, 20, height - 20),
        1
      );
      
      //for socket help I used Cursor AI
      let blobType;
      if (activeBlob === synthBlob) blobType = 'synth';
        else if (activeBlob === revFx) blobType = 'reverb';
        else if (activeBlob === delFx) blobType = 'delay';
        else if (activeBlob === choFx) blobType = 'chorus';
        else if (activeBlob === phaserFx) blobType = 'phaser';
        else if (activeBlob === distortionFx) blobType = 'distortion';
        else if (activeBlob === pitchFx) blobType = 'pitch';
        else if (activeBlob === freqShiftFx) blobType = 'freqShift';
        else if (activeBlob === autoWahFx) blobType = 'autoWah';

      if (blobType) {
        let moveData = {
          type: blobType,
          x: activeBlob.x,
          y: activeBlob.y,
          senderId: socket.id
        };
        console.log("Emitting blob move:", moveData);
        socket.emit('blobMove', moveData);
      }
    }

    //check for collisions between fx blobs and the synthBlob (only within range)
    let otherBlobs = [revFx, delFx, choFx, phaserFx, distortionFx, pitchFx, freqShiftFx, autoWahFx];
    for (let blob of otherBlobs) {
      if (
        activeBlob === blob &&
        synthBlob.colliding(blob) &&
        synthBlob.pos.y > 50 &&
        synthBlob.pos.y < 400
      ) {
        //check if a joint already exists between blobs
        //ChatGPT generated exisiting joint code, 
        //I needed to find a way to have joints be jointed to more than one item, but exlude other items
        let existingJoint = joints.find(
          (joint) =>
            (joint.a === synthBlob.position && joint.b === blob.position) ||
            (joint.a === blob.position && joint.b === synthBlob.position)
        );

        if (!existingJoint) {
          // Create the joint locally
          joints.push({ a: synthBlob.position, b: blob.position });
          updateSignalChain();
          
          // Emit joint creation to other clients
          socket.emit('jointCreated', {
            blob1Type: 'synth',  //synthBlob is always one end
            blob2Type: getBlobType(blob),  //other blob we're connecting to
            senderId: socket.id
          });
        }
      }
    }
  }

  //start melody only if synthBlob is between the y range of 100 and 400
  //need to change this eventually and have melody start if the synthblob is pressed upon startup, or have a "play melody" button
  //right now when synthblob is dragged to top of screen the melody will stop - an easy fix but didn't get around to it
    if ((synthBlob.pos.y > 55 && synthBlob.pos.x > 50) || synthBlob.pos.y > 60) {
    if (!melodyPlaying) {
      startMusic();
      melodyPlaying = true;
    }
  } else if (melodyPlaying) {
    stopMusic();
    melodyPlaying = false;
  }

  //reset blobs back to original positions if they collide with the trash can
  resetIfCollidingWithTrash(synthBlob, 0);
  resetIfCollidingWithTrash(revFx, 1);
  resetIfCollidingWithTrash(delFx, 2);
  resetIfCollidingWithTrash(choFx, 3);
  resetIfCollidingWithTrash(phaserFx, 4);
  resetIfCollidingWithTrash(distortionFx, 5);
  resetIfCollidingWithTrash(pitchFx, 6);
  resetIfCollidingWithTrash(freqShiftFx, 7);
  resetIfCollidingWithTrash(autoWahFx, 8);
}

//changing effect parameters when the blobs are at different distances
function updateEffectParameters() {
  let effectsWithDistances = [
    //reverb effect parameters
    //wet value mapped - amount of non-affected signal being passed through (0-1 scale)
    { blob: revFx, effect: reverb, param: (dist) => reverb.wet.value = map(dist, 0, width, 0.1, 1) },
    //delay effect, mapped to delay timing
    //delay "rampTo" transition code from ChatGPT. Otherwise distortion would occur when actively moving delay blob
    {
      blob: delFx,
      effect: delay,
      param: (dist) => {
        let newDelayTime = map(dist, 0, width, 0.05, 1); // Map distance to delayTime range
        delay.delayTime.rampTo(newDelayTime, 0.1); // Smoothly transition delayTime over 0.1 seconds
      }
    },
    //chorus mapped to depth
    { blob: choFx, effect: chorus, param: (dist) => chorus.depth = map(dist, 0, width, 0.1, 1) },
    //phaser mapped to octaves
    { blob: phaserFx, effect: phaser, param: (dist) => phaser.octaves = map(dist, 0, width, 0.1, 10) },
    //distortion mapped to distortion amount
    { blob: distortionFx, effect: distortion, param: (dist) => distortion.distortion = map(dist, 0, width, 0.1, 1) },
    //pitch shifter mapped to pitch
    { blob: pitchFx, effect: pitchShift, param: (dist) => pitchShift.pitch = map(dist, 0, width, -12, 12) },
    //frequency shifter mapped to frequency
    { blob: freqShiftFx, effect: freqShift, param: (dist) => freqShift.frequency.rampTo(map(dist, 0, width, 0, 1000), 0.1) },
    //auto-wah mapped to frequency, octaves, and sensitivity 
    //might change, not super dramatic as an effect - not sure
    { blob: autoWahFx,
      effect: autoWah,
      param: (dist) => {
        autoWah.baseFrequency = map(dist, 0, width, 200, 800); //smaller frequency range
        autoWah.octaves = map(dist, 0, width, 2, 6); //narrower octave range
        autoWah.sensitivity = map(dist, 0, width, -30, 0); //reduced sensitivity range
      }
    },
  ];


  //ChatGPT jointed + blob position fx parameter code
  for (let { blob, param } of effectsWithDistances) {
    if (isBlobJointedToSynth(blob)) {
      let distance = dist(synthBlob.position.x, synthBlob.position.y, blob.position.x, blob.position.y);
      param(distance);
    }
  }
}


//move blobs back to starting positions
function resetBlobs() {
  let blobs = [synthBlob, revFx, delFx, choFx, phaserFx, distortionFx, pitchFx, freqShiftFx, autoWahFx];
  blobs.forEach((blob, index) => {
    blob.position.x = positions[index].x;
    blob.position.y = positions[index].y;
    blob.speed = 0;
  });

  joints = [];
  updateSignalChain();
}

//if fx blob chained to synth, connect fx to sound of melody
function updateSignalChain() {
  synth.disconnect(); //clear all previous connections
  activeEffects = []; //reset active effects

  //add fx if jointed
  if (isBlobJointedToSynth(revFx)) {
    activeEffects.push(reverb); 
    console.log("reverb connected");
  }
  if (isBlobJointedToSynth(delFx)) {
    activeEffects.push(delay);
    console.log("delay connected");
  }
  if (isBlobJointedToSynth(choFx)) {
    activeEffects.push(chorus);
    console.log("chorus connected");
  }
  if (isBlobJointedToSynth(phaserFx)) {
    activeEffects.push(phaser);
    console.log("phaser connected");
  }
  if (isBlobJointedToSynth(distortionFx)) {
    activeEffects.push(distortion);
    console.log("distortion connected");
  }
  if (isBlobJointedToSynth(pitchFx)) {
    activeEffects.push(pitchShift);
    console.log("pitch shift connected");
  }
  if (isBlobJointedToSynth(freqShiftFx)) {
    activeEffects.push(freqShift);
    console.log("frequency shift connected");
  }
  if (isBlobJointedToSynth(autoWahFx)) {
    activeEffects.push(autoWah);
    console.log("auto-wah connected");
  }

  //chain all active effects and connect to destination - ChatGPT
  let chain = synth;
  for (let effect of activeEffects) {
    chain.connect(effect);
    chain = effect;
  }
  chain.connect(Tone.Destination);
}

//check if a blob is jointed to synthBlob - Chat
function isBlobJointedToSynth(blob) {
  return joints.some(
    (joint) =>
      (joint.a === synthBlob.position && joint.b === blob.position) ||
      (joint.a === blob.position && joint.b === synthBlob.position)
  );
}

//reset blobs if they collide with the trash can
function resetIfCollidingWithTrash(blob, index) {
  if (blob.colliding(trash)) {
    //remove joints from blob
    joints = joints.filter(
      (joint) => joint.a !== blob.position && joint.b !== blob.position
    );

    updateSignalChain(); //update signal chain when blob removed

    //reset position
    blob.position.x = positions[index].x;
    blob.position.y = positions[index].y;
    blob.speed = 0; //stop movement

    //clear activeBlob if the resetting blob was being controlled
    if (activeBlob === blob) {
      activeBlob = null;
    }
  }
}

//mousePressed to detect which blob is controlled
function mousePressed() {
  if (!audioStarted) {
    Tone.start(); //start audio when synth blob moved
    audioStarted = true;
    console.log("Audio started");
  }

  let blobs = [synthBlob, revFx, delFx, choFx, phaserFx, distortionFx, pitchFx, freqShiftFx, autoWahFx];
  for (let blob of blobs) {
    if (blob.mouse.pressing()) {
      activeBlob = blob;
      break;
    }
  }
}

//when mouse is released, the active blob is no longer dragged
function mouseReleased() {
  activeBlob = null;
}

//to start melody
function startMusic() {
  if (!melodyPlaying) {
    Tone.Transport.bpm.value = 120; 
    Tone.Transport.start();
  }
}

//to stop melody
function stopMusic() {
  if (melodyPlaying) {
    Tone.Transport.pause();
  }
}

//below from chat and cursor on joints and sockets
function emitBlobPosition(blob, blobType) {
  let data = {
      type: blobType,
      x: blob.x,
      y: blob.y
  };
  console.log(`Emitting move: ${blobType} to ${blob.x}, ${blob.y}`);
  socket.emit('blobMove', data);
}

function removeJoint(blob1, blob2) {
    for (let i = joints.length - 1; i >= 0; i--) {
        if ((joints[i].a === blob1.position && joints[i].b === blob2.position) ||
            (joints[i].a === blob2.position && joints[i].b === blob1.position)) {
            joints.splice(i, 1);
            updateSignalChain();
        }
    }
}

// Make joint creation easier to understand
function createJoint(blob1, blob2) {
    // Check if joint already exists
    let jointExists = joints.some(function(joint) {
        return (joint.a === blob1.position && joint.b === blob2.position) ||
               (joint.a === blob2.position && joint.b === blob1.position);
    });

    // If no joint exists, create one
    if (!jointExists) {
        joints.push({ a: blob1.position, b: blob2.position });
        updateSignalChain();
        
        // Tell other clients about the new joint
        socket.emit('jointCreated', {
            blob1Type: getBlobType(blob1),
            blob2Type: getBlobType(blob2),
            senderId: socket.id
        });
    }
}

//get blob type functions and socket with blobs generated by Cursor AI 
//was having issues trying to get socket to work on my own using the class example code with tone.js
socket.on('jointCreated', function(data) {
  console.log("Received joint creation:", data);
  if (data.senderId !== socket.id) {
      let [blob1, blob2] = getBlobsByType(data.blob1Type, data.blob2Type);
      
      if (blob1 && blob2) {
          // Check if joint already exists
          let existingJoint = joints.find(
              (joint) =>
                  (joint.a === blob1.position && joint.b === blob2.position) ||
                  (joint.a === blob2.position && joint.b === blob1.position)
          );
          
          if (!existingJoint) {
              joints.push({ a: blob1.position, b: blob2.position });
              updateSignalChain();
              console.log("Created joint between", data.blob1Type, "and", data.blob2Type);
          }
      }
  }
});
socket.on('jointDestroyed', function(data) {
  console.log("Received joint destruction:", data);
  if (data.senderId !== socket.id) {
      let blob1, blob2;
      [blob1, blob2] = getBlobsByType(data.blob1Type, data.blob2Type);
      
      // Find and remove the joint
      removeJoint(blob1, blob2);
  }
});
//get blobs by type for socket
function getBlobsByType(type1, type2) {
  let blobMap = {
      'synth': synthBlob,
      'reverb': revFx,
      'delay': delFx,
      'chorus': choFx,
      'phaser': phaserFx,
      'distortion': distortionFx,
      'pitch': pitchFx,
      'freqShift': freqShiftFx,
      'autoWah': autoWahFx
  };
  return [blobMap[type1], blobMap[type2]];
}
function getBlobType(blob) {
  let blobTypes = {
      [synthBlob]: 'synth',
      [revFx]: 'reverb',
      [delFx]: 'delay',
      [choFx]: 'chorus',
      [phaserFx]: 'phaser',
      [distortionFx]: 'distortion',
      [pitchFx]: 'pitch',
      [freqShiftFx]: 'freqShift',
      [autoWahFx]: 'autoWah'
  };
  return blobTypes[blob] || null;
}

//socket listener
socket.on('blobMove', function(data) {
  console.log("Received blob move data:", data);
  
  //don't update if it's the same client that sent the data
  if (data.senderId === socket.id) {
      console.log("Ignoring own movement");
      return;
  }

  let blob;
  switch(data.type) {
      case 'synth': blob = synthBlob; break;
      case 'reverb': blob = revFx; break;
      case 'delay': blob = delFx; break;
      case 'chorus': blob = choFx; break;
      case 'phaser': blob = phaserFx; break;
      case 'distortion': blob = distortionFx; break;
      case 'pitch': blob = pitchFx; break;
      case 'freqShift': blob = freqShiftFx; break;
      case 'autoWah': blob = autoWahFx; break;
  }
  
  if (blob) {
      blob.x = data.x;
      blob.y = data.y;
      console.log(`Updated ${data.type} blob to position:`, blob.x, blob.y);
  }
});
//Above is for socket io