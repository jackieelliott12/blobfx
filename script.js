//reverb - dark blue
//delay - green
//chorus - light purple grey 
//phaser - orange
//distortion - grey
//pitch shift - pink
//frequency shifter - purple
//auto-wah - yellow

let synthBlob, revFx, delFx, choFx, phaserFx, distortionFx, pitchFx, freqShiftFx, autoWahFx;
let trash;
let joints = [];
let activeEffects = []; //array of effects that are active

//blob positions
let positions = [
  { x: 50, y: 60 },   //synth
  { x: 50, y: 450 },  //reverb
  { x: 120, y: 450 }, //delay
  { x: 190, y: 450 }, //chorus
  { x: 260, y: 450 }, //phaser
  { x: 330, y: 450 }, //distortion
  { x: 400, y: 450 }, //pitch shift
  { x: 470, y: 450 }, //freq shift
  { x: 540, y: 450 }, //auto wah
];

//dragging
let activeBlob = null;
let melodyPlaying = false; //see if melody is already playing
let audioStarted = false; //see if the audio has started

//volume
Tone.Destination.volume.value = -10;

//synth
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


//melody parameters
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

  //sprite for synth blob circle
  synthBlob = new Sprite();
  synthBlob.diameter = 50;
  synthBlob.position = createVector(positions[0].x, positions[0].y);
  synthBlob.color = color(90, 255, 255); // Light cyan
  synthBlob.drag = 10;

  //effect blob sprites
  let effects = [
    { ref: () => (revFx = new Sprite()), pos: positions[1], color: color('blue') }, //reverb
    { ref: () => (delFx = new Sprite()), pos: positions[2], color: color('lightgreen') }, //delay
    { ref: () => (choFx = new Sprite()), pos: positions[3], color: color('lightblue') }, //chorus
    { ref: () => (phaserFx = new Sprite()), pos: positions[4], color: color('orange') }, //phaser
    { ref: () => (distortionFx = new Sprite()), pos: positions[5], color: color('grey') }, //distortion
    { ref: () => (pitchFx = new Sprite()), pos: positions[6], color: color('pink') }, //pitch shift
    { ref: () => (freqShiftFx = new Sprite()), pos: positions[7], color: color('purple') }, //freqShifter
    { ref: () => (autoWahFx = new Sprite()), pos: positions[8], color: color('yellow') }, //auto wah
  ];

  // Initialize each effect blob - from ChatGPT
  effects.forEach(({ ref, pos, color }) => {
    let blob = ref();
    blob.diameter = 40; //blob size
    blob.position = createVector(pos.x, pos.y);
    blob.color = color;
    blob.drag = 10;
  });

  //trash can sprite
  trash = new Sprite();
  trash.width = 50;
  trash.height = 50;
  trash.position = createVector(750, 59);
  trash.collider = "static";
  trash.color = color(253, 114, 139); //watermelony pink
  
  //reset button
  resetButton = createButton('Reset');
  resetButton.position(800, 25); //near the trash can
  resetButton.mousePressed(resetBlobs);

}

function draw() {
  clear();
  background(0, 250, 150); //green background

  // Make sure circles don't go out of bounds
  let allBlobs = [synthBlob, revFx, delFx, choFx, phaserFx, distortionFx, pitchFx, freqShiftFx, autoWahFx];
  for (let blob of allBlobs) {
    blob.position.x = constrain(blob.position.x, 20, width - 20);
    blob.position.y = constrain(blob.position.y, 20, height - 20);
  }

  // Update effect parameters based on distance
  updateEffectParameters();

  // Draw visible line joints
  stroke('white');
  strokeWeight(2);
  for (let joint of joints) {
    line(joint.a.x, joint.a.y, joint.b.x, joint.b.y);
  }

  // Draw all blobs
  synthBlob.draw();
  revFx.draw();
  delFx.draw();
  choFx.draw();
  phaserFx.draw();
  distortionFx.draw();
  pitchFx.draw();
  freqShiftFx.draw();
  autoWahFx.draw();

  // Draw the trash can blob
  trash.draw();

  // Dragging blobs
  if (activeBlob) {
    if (activeBlob.mouse.dragging()) {
      activeBlob.moveTowards(
        constrain(mouseX + activeBlob.mouse.x, 20, width - 20),
        constrain(mouseY + activeBlob.mouse.y, 20, height - 20),
        1
      );
    }

    // Check for collisions between blobs and the synthBlob (only within the valid range)
    let otherBlobs = [revFx, delFx, choFx, phaserFx, distortionFx, pitchFx, freqShiftFx, autoWahFx];
    for (let blob of otherBlobs) {
      if (
        activeBlob === blob &&
        synthBlob.colliding(blob) &&
        synthBlob.pos.y > 100 &&
        synthBlob.pos.y < 400
      ) {
        // Check if a joint already exists
        let existingJoint = joints.find(
          (joint) =>
            (joint.a === synthBlob.position && joint.b === blob.position) ||
            (joint.a === blob.position && joint.b === synthBlob.position)
        );

        if (!existingJoint) {
          joints.push({ a: synthBlob.position, b: blob.position });
          updateSignalChain();
        }
      }
    }
  }

  // Start melody only if synthBlob is between the y range of 100 and 400
  if (synthBlob.pos.y > 100 && synthBlob.pos.y < 400 && !melodyPlaying) {
    startMusic();
    melodyPlaying = true;
  } else if ((synthBlob.pos.y <= 100 || synthBlob.pos.y >= 400) && melodyPlaying) {
    stopMusic();
    melodyPlaying = false;
  }

  // Reset blobs back to original positions if they collide with the trash can
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

function updateEffectParameters() {
  let effectsWithDistances = [
    { blob: revFx, effect: reverb, param: (dist) => reverb.wet.value = map(dist, 0, width, 0.1, 1) },
    {
      blob: delFx,
      effect: delay,
      param: (dist) => {
        let newDelayTime = map(dist, 0, width, 0.05, 1); // Map distance to delayTime range
        delay.delayTime.rampTo(newDelayTime, 0.1); // Smoothly transition delayTime over 0.1 seconds
      }
    },
    { blob: choFx, effect: chorus, param: (dist) => chorus.depth = map(dist, 0, width, 0.1, 1) },
    { blob: phaserFx, effect: phaser, param: (dist) => phaser.octaves = map(dist, 0, width, 0.1, 10) },
    { blob: distortionFx, effect: distortion, param: (dist) => distortion.distortion = map(dist, 0, width, 0.1, 1) },
    { blob: pitchFx, effect: pitchShift, param: (dist) => pitchShift.pitch = map(dist, 0, width, -12, 12) },
    { blob: freqShiftFx, effect: freqShift, param: (dist) => freqShift.frequency.rampTo(map(dist, 0, width, 0, 1000), 0.1) },
    { blob: autoWahFx,
      effect: autoWah,
      param: (dist) => {
        autoWah.baseFrequency = map(dist, 0, width, 200, 800); // Smaller frequency range
        autoWah.octaves = map(dist, 0, width, 2, 6); // Narrower octaves range
        autoWah.sensitivity = map(dist, 0, width, -30, 0); // Reduced sensitivity range
      }
    },
  ];


  for (let { blob, param } of effectsWithDistances) {
    if (isBlobJointedToSynth(blob)) {
      let distance = dist(synthBlob.position.x, synthBlob.position.y, blob.position.x, blob.position.y);
      param(distance);
    }
  }
}




//move blobs back to start
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
    //remove joints form blob
    joints = joints.filter(
      (joint) => joint.a !== blob.position && joint.b !== blob.position
    );

    updateSignalChain(); //update chain when blob removed

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

function mouseReleased() {
  activeBlob = null;
}

function startMusic() {
  if (!melodyPlaying) {
    Tone.Transport.bpm.value = 120; 
    Tone.Transport.start();
  }
}

function stopMusic() {
  if (melodyPlaying) {
    Tone.Transport.pause();
  }
}