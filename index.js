"use strict";

var vertexShaderSource = `#version 300 es

in vec4 a_position;
in vec4 a_color;

// transformation matrix
uniform mat4 u_matrix;

out vec4 u_color;

void main() {
  gl_Position = u_matrix * a_position;
  u_color = a_color;
}
`;

var fragmentShaderSource = `#version 300 es

precision highp float;

in vec4 u_color;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  outColor = u_color;
}
`;

// Inputs
var input = {
  object: {
    id: document.getElementById("obj"), //object id
    translationX: document.getElementById("tx"), // translation x
    translationY: document.getElementById("ty"), // translation y
    translationZ: document.getElementById("tz"), // translation z
    rotationX: document.getElementById("rx"), // rotation x
    rotationY: document.getElementById("ry"), // rotation y
    rotationZ: document.getElementById("rz"), // rotation z
    scaleX: document.getElementById("sx"), // scale x
    scaleY: document.getElementById("sy"), // scale y
    scaleZ: document.getElementById("sz"), // scale z
    addObject: document.getElementById("add"),
    delObject: document.getElementById("del"),
  },
  camera: {
    fildOfView: document.getElementById("fild"),  
    translationX: document.getElementById("ctx"), 
    translationY: document.getElementById("cty"), 
    translationZ: document.getElementById("ctz"), 
    far: document.getElementById("far"), 
    rotationX: document.getElementById("crx"),
    rotationY: document.getElementById("cry"),
    rotationZ: document.getElementById("crz"),
  },
  labelText: {
    objTranslationX: document.getElementById("ltx"),
    objTranslationY: document.getElementById("lty"),
    objTranslationZ: document.getElementById("ltz"),
    objRotationX: document.getElementById("lrx"),
    objRotationY: document.getElementById("lry"),
    objRotationZ: document.getElementById("lrz"),
    objScaleX: document.getElementById("lsx"),
    objScaleY: document.getElementById("lsy"),
    objScaleZ: document.getElementById("lsz"),
    camFildOfView: document.getElementById("lfild"),
    camTranslationX: document.getElementById("lctx"),
    camTranslationY: document.getElementById("lcty"),
    camTranslationZ: document.getElementById("lctz"),
    camRotationX: document.getElementById("lcrx"),
    camRotationY: document.getElementById("lcry"),
    camRotationZ: document.getElementById("lcrz"),
  },
};

// Global attributes
var app = {
  canvas: null,
  gl: null,
  program: null,  
  positionAttributeLocation: null,
  colorAttributeLocation: null,
  matrixLocation: null, 
  objectIndex: 0,
  objects: [],
};

// camera
class Camera {
  constructor() {
    this.matrix = [
      1,0,0,0,
      0,1,0,0,
      0,0,1,0,
      0,0,0,1,
    ];
    this.att = {
      fildOfView: degToRad(60),
      aspect: 0,
      near: 1,
      far: 2000,
      translation: [0,0, 100],
      rotation: [0,0,0],
    };
  }
  setMatrix() {
    var matrix = m4.createMatrix();
    matrix = m4.translate(matrix, this.att.translation[0],this.att.translation[1],this.att.translation[2]);
    this.matrix = matrix 
  }
}

// object
class Object {
  constructor() {
    this.positionBuffer = null;
    this.matrix = [
      1,0,0,0,
      0,1,0,0,
      0,0,1,0,
      0,0,0,1,
    ];
    this.transf = {
      translation: [0,0,0],
      rotation: [0,0,0],
      scale: [1,1,1],
    };
  }
  setMatrix(viewProjectionMatrix) {
    var matrix = m4.translate(viewProjectionMatrix, this.transf.translation[0],this.transf.translation[1],this.transf.translation[2]);
        matrix = m4.xRotate(matrix, this.transf.rotation[0]);
        matrix = m4.yRotate(matrix, this.transf.rotation[1]);
        matrix = m4.zRotate(matrix, this.transf.rotation[2]);
        matrix = m4.scale(matrix, this.transf.scale[0], this.transf.scale[1], this.transf.scale[2]);

    this.matrix = matrix 
  }
}

var camera = [];
camera.push(new Camera);

function main() {
  InitProgram();
  drawScene();
}

// draw the scene
function drawScene() {
  webglUtils.resizeCanvasToDisplaySize(app.gl.canvas);
  app.gl.viewport(0, 0, app.gl.canvas.width, app.gl.canvas.height);   // Tell WebGL how to convert from clip space to pixels
  app.gl.clearColor(0, 0, 0, 1);                                      // Clear the canvas
  app.gl.clear(app.gl.COLOR_BUFFER_BIT | app.gl.DEPTH_BUFFER_BIT);
  app.gl.enable(app.gl.DEPTH_TEST);                                   // turn on depth testing
  app.gl.useProgram(app.program);                                     // Tell it to use our program (pair of shaders)

  camera[0].att.aspect = app.gl.canvas.clientWidth / app.gl.canvas.clientHeight;

  var projectionMatrix = m4.perspective(camera[0].att.fildOfView, camera[0].att.aspect, camera[0].att.near, camera[0].att.far);

  /* var camMatrix = [
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    0,0,0,1,
  ];
  camMatrix = m4.translate(camMatrix, 0, 0, 500); */
  camera[0].setMatrix();

  var viewMatrix = m4.inverse(camera[0].matrix);

  var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

  app.objects.map(object => {      
    app.gl.bindVertexArray(object.shader);     // Bind the attribute/buffer set we want.
    
    object.setMatrix(viewProjectionMatrix);

    app.gl.uniformMatrix4fv(app.matrixLocation, false, object.matrix);

    // Draw the rectangle.
    var primitiveType = app.gl.TRIANGLES;
    var offset = 0;
    var count = 6 * 6;
    app.gl.drawArrays(primitiveType, offset, count);
  })
}
// init program
function InitProgram(){
  app.canvas = document.querySelector("#canvas");
  app.gl = app.canvas.getContext("webgl2");
  if (!app.gl) {return;}
  
  app.program = webglUtils.createProgramFromSources(app.gl,[vertexShaderSource, fragmentShaderSource]); 

  app.positionAttributeLocation = app.gl.getAttribLocation(app.program, "a_position"); // look up where the vertex data needs to go.
  app.colorAttributeLocation = app.gl.getAttribLocation(app.program, "a_color");
  app.matrixLocation = app.gl.getUniformLocation(app.program, "u_matrix");             // look up uniform locations
}
//
function createNewObject() { // return the index object
  app.objects.push( new Object() );
  app.objects[app.objects.length - 1].positionBuffer = app.gl.createBuffer();                  // Create a buffer
  app.objects[app.objects.length - 1].shader = app.gl.createVertexArray();                     // Create a vertex array object (attribute state)
  app.gl.bindVertexArray(app.objects[app.objects.length - 1].shader);                          // and make it the one we're currently working with
  app.gl.enableVertexAttribArray(app.positionAttributeLocation);         // Turn on the attribute
  app.gl.bindBuffer(app.gl.ARRAY_BUFFER, app.objects[app.objects.length - 1].positionBuffer);  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  
  setObject();

  var size = 3;               // 3 components per iteration
  var type = app.gl.FLOAT;    // the data is 32bit floats
  var normalize = false;      // don't normalize the data
  var stride = 0;             // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0;             // start at the beginning of the buffer
  app.gl.vertexAttribPointer(app.positionAttributeLocation, size, type, normalize, stride, offset);

  SetObjectColor();
  
  return (app.objects.length - 1)
}
// set color
function SetObjectColor(){
  var colorBuffer = app.gl.createBuffer();              // create the color buffer, make it the current ARRAY_BUFFER
  app.gl.bindBuffer(app.gl.ARRAY_BUFFER, colorBuffer);
  
  setColors();
  
  app.gl.enableVertexAttribArray(app.colorAttributeLocation);   // Turn on the attribute

  var size = 3;                             // 3 components per iteration
  var type = app.gl.UNSIGNED_BYTE;          // the data is 8bit unsigned bytes
  var normalize = true;                     // convert from 0-255 to 0.0-1.0
  var stride = 0;                           // 0 = move forward size * sizeof(type) each iteration to get the next color
  var offset = 0;                           // start at the beginning of the buffer
  app.gl.vertexAttribPointer(app.colorAttributeLocation, size, type, normalize, stride, offset);
}

function setAttributes(){
    // Set transitions
    input.object.translationX.value = String(app.objects[app.objectIndex].transf.translation[0]);
    input.labelText.objTranslationX.value = String(app.objects[app.objectIndex].transf.translation[0]);
    input.object.translationY.value = String(app.objects[app.objectIndex].transf.translation[1]);
    input.labelText.objTranslationY.value = String(app.objects[app.objectIndex].transf.translation[1]);
    input.object.translationZ.value = String(app.objects[app.objectIndex].transf.translation[2]);
    input.labelText.objTranslationZ.value = String(app.objects[app.objectIndex].transf.translation[2]);
    // Set rotations
    input.object.rotationX.value = String(radToDeg(app.objects[app.objectIndex].transf.rotation[0]));
    input.labelText.objRotationX.value = String(radToDeg(app.objects[app.objectIndex].transf.rotation[0]));
    input.object.rotationY.value = String(radToDeg(app.objects[app.objectIndex].transf.rotation[1]));
    input.labelText.objRotationY.value = String(radToDeg(app.objects[app.objectIndex].transf.rotation[1]));
    input.object.rotationZ.value = String(radToDeg(app.objects[app.objectIndex].transf.rotation[2]));
    input.labelText.objRotationZ.value = String(radToDeg(app.objects[app.objectIndex].transf.rotation[2]));
    // Set scale
    //input.object.scaleX.setAttribute("value", String(app.objects[app.objectIndex].transf.scale[0]));
    input.object.scaleX.value = String(app.objects[app.objectIndex].transf.scale[0]);
    input.labelText.objScaleX.value = String( app.objects[app.objectIndex].transf.scale[0]);
    input.object.scaleY.value = String(app.objects[app.objectIndex].transf.scale[1]);
    input.labelText.objScaleY.value = String(app.objects[app.objectIndex].transf.scale[1]);
    input.object.scaleZ.value = String(app.objects[app.objectIndex].transf.scale[2]);
    input.labelText.objScaleZ.value = String(app.objects[app.objectIndex].transf.scale[2]);
}

// input control
input.object.id.onchange = function(e) {
  app.objectIndex = Number(e.target.value);
  setAttributes();
}
input.object.translationX.oninput = function(e) {  // Translation x
  input.labelText.objTranslationX.value = e.target.value;
  app.objects[app.objectIndex].transf.translation[0] = Number(e.target.value);
  drawScene();
}
input.object.translationY.oninput = function(e) {  // Translation y
  input.labelText.objTranslationY.value = e.target.value;
  app.objects[app.objectIndex].transf.translation[1] = Number(e.target.value);
  drawScene();
}
input.object.translationZ.oninput = function(e) {  // Translation z
  input.labelText.objTranslationZ.value = e.target.value;
  app.objects[app.objectIndex].transf.translation[2] = Number(e.target.value);
  drawScene();
}
input.object.rotationX.oninput = function(e) { // Rotation x
  input.labelText.objRotationX.value = e.target.value;
  app.objects[app.objectIndex].transf.rotation[0] = degToRad(Number(e.target.value));
  drawScene();
}
input.object.rotationY.oninput = function(e) { // Rotation y
  input.labelText.objRotationY.value = e.target.value;
  app.objects[app.objectIndex].transf.rotation[1] = degToRad(Number(e.target.value));
  drawScene();
}
input.object.rotationZ.oninput = function(e) { // Rotation z
  input.labelText.objRotationZ.value = e.target.value;
  app.objects[app.objectIndex].transf.rotation[2] = degToRad(Number(e.target.value));
  drawScene();
}
input.object.scaleX.oninput = function(e) {  // Scale x
  input.labelText.objScaleX.value = e.target.value;
  if(Number(e.target.value) == 0) {
    app.objects[app.objectIndex].transf.scale[0] = 0.01;
  }
  else{
    app.objects[app.objectIndex].transf.scale[0] = Number(e.target.value); 
  }
  drawScene();
}
input.object.scaleY.oninput = function(e) {  // Scale y
  input.labelText.objScaleY.value = e.target.value;
  if(Number(e.target.value) == 0) {
    app.objects[app.objectIndex].transf.scale[1] = 0.01;
  }
  else{
    app.objects[app.objectIndex].transf.scale[1] = Number(e.target.value); 
  }
  drawScene();
}
input.object.scaleZ.oninput = function(e) {  // Scale z
  input.labelText.objScaleZ.value = e.target.value;
  if(Number(e.target.value) == 0) {
    app.objects[app.objectIndex].transf.scale[2] = 0.01;
  }
  else{
    app.objects[app.objectIndex].transf.scale[2] = Number(e.target.value); 
  }
  drawScene();
}
input.object.addObject.onclick = function(e) { // Add object
  var index = createNewObject();

  app.objects[index].transf.translation = [0, 0, -500];
  app.objects[index].transf.rotation = [degToRad(0), degToRad(0), degToRad(0)];
  app.objects[index].transf.scale = [1, 1, 1];

  var option = document.createElement("option");
  option.text = String(index);
  option.value = String(index);
  input.object.id.appendChild(option);
  input.object.id.value = String(index)

  app.objectIndex = index;

  setAttributes();

  drawScene();
}
input.object.delObject.onclick = function(e) { // Delete object
  var index = Number(input.object.id.value);
  var updateIndex = input.object.id.length - 1

  app.objects.splice(index, 1);
  input.object.id.remove(updateIndex);

  app.objectIndex = updateIndex - 1;
  if(app.objectIndex > -1){setAttributes();}  

  drawScene();
}

// camera control
input.camera.fildOfView.oninput = function(e) { // Fild of view
  input.labelText.camFildOfView.value = e.target.value;
  camera[0].att.fildOfView = degToRad(Number(e.target.value));
  drawScene();
}
input.camera.translationX.oninput = function(e) { // Camera translation x
  input.labelText.camTranslationX.value = e.target.value;
  camera[0].att.translation[0] = Number(e.target.value);
  drawScene();
}
input.camera.translationY.oninput = function(e) { // Camera translation y
  input.labelText.camTranslationY.value = e.target.value;
  camera[0].att.translation[1] = Number(e.target.value);
  drawScene();
}
input.camera.translationZ.oninput = function(e) { // Camera translation z
  input.labelText.camTranslationZ.value = e.target.value;
  camera[0].att.translation[2] = Number(e.target.value);
  drawScene();
}

// transformations and matrix operations for a matrix 4D
var m4 = {
  createMatrix: function(){
    return [
      1,0,0,0,
      0,1,0,0,
      0,0,1,0,
      0,0,0,1,
    ]
  },
  projection: function(width, height, depth) { // project a matrix
    return [
       2 / width, 0, 0, 0,
       0, -2 / height, 0, 0,
       0, 0, 1 / depth, 0,
      -1, 1, 0, 1,
    ];
  },  
  perspective: function(fieldOfViewInRadians, aspect, near, far) {
    var f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians);
    var rangeInv = 1.0 / (near - far);

    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0,
    ];
  },
  multiply: function(a, b) { // matrix multiply
    var a00 = a[0 * 4 + 0];
    var a01 = a[0 * 4 + 1];
    var a02 = a[0 * 4 + 2];
    var a03 = a[0 * 4 + 3];
    var a10 = a[1 * 4 + 0];
    var a11 = a[1 * 4 + 1];
    var a12 = a[1 * 4 + 2];
    var a13 = a[1 * 4 + 3];
    var a20 = a[2 * 4 + 0];
    var a21 = a[2 * 4 + 1];
    var a22 = a[2 * 4 + 2];
    var a23 = a[2 * 4 + 3];
    var a30 = a[3 * 4 + 0];
    var a31 = a[3 * 4 + 1];
    var a32 = a[3 * 4 + 2];
    var a33 = a[3 * 4 + 3];
    var b00 = b[0 * 4 + 0];
    var b01 = b[0 * 4 + 1];
    var b02 = b[0 * 4 + 2];
    var b03 = b[0 * 4 + 3];
    var b10 = b[1 * 4 + 0];
    var b11 = b[1 * 4 + 1];
    var b12 = b[1 * 4 + 2];
    var b13 = b[1 * 4 + 3];
    var b20 = b[2 * 4 + 0];
    var b21 = b[2 * 4 + 1];
    var b22 = b[2 * 4 + 2];
    var b23 = b[2 * 4 + 3];
    var b30 = b[3 * 4 + 0];
    var b31 = b[3 * 4 + 1];
    var b32 = b[3 * 4 + 2];
    var b33 = b[3 * 4 + 3];
    return [
      b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
      b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
      b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
      b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
      b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
      b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
      b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
      b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
      b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
      b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
      b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
      b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
      b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
      b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
      b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
      b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33,
    ];
  },
  translation: function(tx, ty, tz) { // make the translation matrix
    return [
       1,  0,  0,  0,
       0,  1,  0,  0,
       0,  0,  1,  0,
       tx,  ty,  tz,  1,
    ];
  },  
  xRotation: function(angleInRadians) { // make the rotation matrix in x axis
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);
    return [
      1, 0, 0, 0,
      0, c, s, 0,
      0, -s, c, 0,
      0, 0, 0, 1,
    ];
  },  
  yRotation: function(angleInRadians) { // make the rotation matrix in y axis
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);
    return [
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1,
    ];
  },
  zRotation: function(angleInRadians) { // make the rotation matrix in z axis
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);
    return [
       c, s, 0, 0,
      -s, c, 0, 0,
       0, 0, 1, 0,
       0, 0, 0, 1,
    ];
  },  
  scaling: function(sx, sy, sz) {
    return [
      sx, 0,  0,  0,
      0, sy,  0,  0,
      0,  0, sz,  0,
      0,  0,  0,  1,
    ];
  },
  translate: function(m, tx, ty, tz) { // do the translation
    return m4.multiply(m, m4.translation(tx, ty, tz));
  },  
  xRotate: function(m, angleInRadians) { // do the rotation in x axis
    return m4.multiply(m, m4.xRotation(angleInRadians));
  },
  yRotate: function(m, angleInRadians) { // do the rotation in y axis
    return m4.multiply(m, m4.yRotation(angleInRadians));
  },
  zRotate: function(m, angleInRadians) { // do the rotation in z axis
    return m4.multiply(m, m4.zRotation(angleInRadians));
  },
  scale: function(m, sx, sy, sz) {
    return m4.multiply(m, m4.scaling(sx, sy, sz));
  },
  inverse: function(m) {
    var m00 = m[0 * 4 + 0];
    var m01 = m[0 * 4 + 1];
    var m02 = m[0 * 4 + 2];
    var m03 = m[0 * 4 + 3];
    var m10 = m[1 * 4 + 0];
    var m11 = m[1 * 4 + 1];
    var m12 = m[1 * 4 + 2];
    var m13 = m[1 * 4 + 3];
    var m20 = m[2 * 4 + 0];
    var m21 = m[2 * 4 + 1];
    var m22 = m[2 * 4 + 2];
    var m23 = m[2 * 4 + 3];
    var m30 = m[3 * 4 + 0];
    var m31 = m[3 * 4 + 1];
    var m32 = m[3 * 4 + 2];
    var m33 = m[3 * 4 + 3];
    var tmp_0  = m22 * m33;
    var tmp_1  = m32 * m23;
    var tmp_2  = m12 * m33;
    var tmp_3  = m32 * m13;
    var tmp_4  = m12 * m23;
    var tmp_5  = m22 * m13;
    var tmp_6  = m02 * m33;
    var tmp_7  = m32 * m03;
    var tmp_8  = m02 * m23;
    var tmp_9  = m22 * m03;
    var tmp_10 = m02 * m13;
    var tmp_11 = m12 * m03;
    var tmp_12 = m20 * m31;
    var tmp_13 = m30 * m21;
    var tmp_14 = m10 * m31;
    var tmp_15 = m30 * m11;
    var tmp_16 = m10 * m21;
    var tmp_17 = m20 * m11;
    var tmp_18 = m00 * m31;
    var tmp_19 = m30 * m01;
    var tmp_20 = m00 * m21;
    var tmp_21 = m20 * m01;
    var tmp_22 = m00 * m11;
    var tmp_23 = m10 * m01;

    var t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
             (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
    var t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
             (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
    var t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
             (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
    var t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
             (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

    var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

    return [
      d * t0,
      d * t1,
      d * t2,
      d * t3,
      d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
           (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
      d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
           (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
      d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
           (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
      d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
           (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
      d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
           (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
      d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
           (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
      d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
           (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
      d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
           (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
      d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
           (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
      d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
           (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
      d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
           (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
      d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
           (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02)),
    ];
  },
};

// transform from degree to radian
function degToRad(d) {
  return d * Math.PI / 180;
}
function radToDeg(r) {
  return Math.ceil(r * 180 / Math.PI);
}

// set the object vertexs 
function setObject() {
  app.gl.bufferData(
    app.gl.ARRAY_BUFFER,
    new Float32Array([
      // front
      -40, 40, 0,
      40,40, 0,
      -40, -40,0,
      -40, -40,0,
      40,-40, 0,
      40,40,0,
      // back
      -40, 40, 80,
      40,40, 80,
      -40, -40, 80,
      -40, -40, 80,
      40,-40, 80,
      40,40, 80,     
      // top
      -40,  40,  0,
      -40,  40,  80,
      40, 40,  80,
      40, 40,  80,
      40, 40,  0,
      -40,  40,  0,     
      // botton
      -40,  -40, 0,
      -40, -40, 80,
      40,  -40, 80,
      40,  -40, 80,
      40, -40, 0,
      -40,  -40, 0,      
      //left
      -40,  40,  0,
      -40,  40,  80,
      -40,  -40, 80,
      -40,  -40, 80,
      -40,  -40, 0,
      -40,  40,  0,      
      //rigth
      40,  40,  0,
      40,  40,  80,
      40,  -40, 80,
      40,  -40, 80,
      40,  -40, 0,
      40,  40,  0, 
    ]),
    app.gl.STATIC_DRAW);
}

// Set the object colors
function setColors(){
  app.gl.bufferData(
    app.gl.ARRAY_BUFFER,
    new Uint8Array([
      //front
      200, 70, 120,
      200, 70, 120,
      200, 70, 120,
      200, 70, 120,
      200, 70, 120,
      200, 70, 120,      
      //back
      200, 70, 120,
      200, 70, 120,
      200, 70, 120,
      200, 70, 120,
      200, 70, 120,
      200, 70, 120,      
      //top
      80, 70, 200,
      80, 70, 200,
      80, 70, 200,
      80, 70, 200,
      80, 70, 200,
      80, 70, 200,      
      //botton
      80, 70, 200,
      80, 70, 200,
      80, 70, 200,
      80, 70, 200,
      80, 70, 200,
      80, 70, 200,      
      //left
      70, 200, 210,
      70, 200, 210,
      70, 200, 210,
      70, 200, 210,
      70, 200, 210,
      70, 200, 210,      
      //rigth
      70, 200, 210,
      70, 200, 210,
      70, 200, 210,
      70, 200, 210,
      70, 200, 210,
      70, 200, 210,
    ]),
    app.gl.STATIC_DRAW
  );
}

main();