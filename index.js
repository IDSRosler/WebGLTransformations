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
    translationX: document.getElementById("ctx"), // translation x
    translationY: document.getElementById("cty"), // translation y
    translationZ: document.getElementById("ctz"), // translation z
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
// object
class Object {
  constructor() {
    this.positionBuffer = null;
    this.shape = null;
    this.matrix = null;
    this.transf = {
      translation: null,
      rotation: null,
      scale: null,
    };
  }
  setMatrix() {     
    var matrix = m4.projection(app.gl.canvas.clientWidth, app.gl.canvas.clientHeight, 400);
    matrix = m4.translate(matrix, this.transf.translation[0], this.transf.translation[1], this.transf.translation[2]);
    matrix = m4.xRotate(matrix, this.transf.rotation[0]);
    matrix = m4.yRotate(matrix, this.transf.rotation[1]);
    matrix = m4.zRotate(matrix, this.transf.rotation[2]);
    matrix = m4.scale(matrix, this.transf.scale[0], this.transf.scale[1], this.transf.scale[2]);

    this.matrix = matrix 
  }
}

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

  app.objects.map(object => {
      
    app.gl.bindVertexArray(object.shader);     // Bind the attribute/buffer set we want.
    
    object.setMatrix();

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
input.object.translationX.oninput = function(e) {  // translation x
  input.labelText.objTranslationX.value = e.target.value;
  app.objects[app.objectIndex].transf.translation[0] = Number(e.target.value);
  drawScene();
}
input.object.translationY.oninput = function(e) {  // translation y
  input.labelText.objTranslationY.value = e.target.value;
  app.objects[app.objectIndex].transf.translation[1] = Number(e.target.value);
  drawScene();
}
input.object.translationZ.oninput = function(e) {  // translation z
  input.labelText.objTranslationZ.value = e.target.value;
  app.objects[app.objectIndex].transf.translation[2] = Number(e.target.value);
  drawScene();
}
input.object.rotationX.oninput = function(e) { // rotation x
  input.labelText.objRotationX.value = e.target.value;
  app.objects[app.objectIndex].transf.rotation[0] = degToRad(Number(e.target.value));
  drawScene();
}
input.object.rotationY.oninput = function(e) { // rotation y
  input.labelText.objRotationY.value = e.target.value;
  app.objects[app.objectIndex].transf.rotation[1] = degToRad(Number(e.target.value));
  drawScene();
}
input.object.rotationZ.oninput = function(e) { // rotation z
  input.labelText.objRotationZ.value = e.target.value;
  app.objects[app.objectIndex].transf.rotation[2] = degToRad(Number(e.target.value));
  drawScene();
}
input.object.scaleX.oninput = function(e) {  // scale x
  input.labelText.objScaleX.value = e.target.value;
  if(Number(e.target.value) == 0) {
    app.objects[app.objectIndex].transf.scale[0] = 0.01;
  }
  else{
    app.objects[app.objectIndex].transf.scale[0] = Number(e.target.value); 
  }
  drawScene();
}
input.object.scaleY.oninput = function(e) {  // scale y
  input.labelText.objScaleY.value = e.target.value;
  if(Number(e.target.value) == 0) {
    app.objects[app.objectIndex].transf.scale[1] = 0.01;
  }
  else{
    app.objects[app.objectIndex].transf.scale[1] = Number(e.target.value); 
  }
  drawScene();
}
input.object.scaleZ.oninput = function(e) {  // scale z
  input.labelText.objScaleZ.value = e.target.value;
  if(Number(e.target.value) == 0) {
    app.objects[app.objectIndex].transf.scale[2] = 0.01;
  }
  else{
    app.objects[app.objectIndex].transf.scale[2] = Number(e.target.value); 
  }
  drawScene();
}
input.object.addObject.onclick = function(e) { // add object
  var index = createNewObject();
  app.objects[index].transf.translation = [30, 50, 0];
  app.objects[index].transf.rotation = [degToRad(30), degToRad(30), degToRad(0)];
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
input.object.delObject.onclick = function(e) { // delete object
  var index = Number(input.object.id.value);
  var updateIndex = input.object.id.length - 1

  app.objects.splice(index, 1);
  input.object.id.remove(updateIndex);

  app.objectIndex = updateIndex - 1;
  if(app.objectIndex > -1){setAttributes();}  

  drawScene();
}

// transformations and matrix operations for a matrix 4D
var m4 = {
  projection: function(width, height, depth) { // project a matrix
    return [
       2 / width, 0, 0, 0,
       0, -2 / height, 0, 0,
       0, 0, 1 / depth, 0,
      -1, 1, 0, 1,
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
      0, 0, 0,
      80,0, 0,
      0, 80,0,
      0, 80,0,
      80,0, 0,
      80,80,0,
      // back
      0,  0,  80,
      80, 0,  80,
      0,  80, 80,
      0,  80, 80,
      80, 0,  80,
      80, 80, 80,      
      // top
      0,  0,  0,
      0,  0,  80,
      80, 0,  80,
      80, 0,  80,
      80, 0,  0,
      0,  0,  0,      
      // botton
      0,  80, 0,
      80, 80, 0,
      0,  80, 80,
      0,  80, 80,
      80, 80, 0,
      80, 80, 80,      
      //left
      0,  0,  0,
      0,  0,  80,
      0,  80, 80,
      0,  80, 80,
      0,  80, 0,
      0,  0,  0,      
      //rigth
      80, 0,  0,
      80, 0,  80,
      80, 80, 80,
      80, 80, 80,
      80, 80, 0,
      80, 0, 0,
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