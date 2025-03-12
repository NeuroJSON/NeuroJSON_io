import * as THREE from "three"; // For rendering 3D objects
import * as pako from "pako"; // For decompressing gzipped files
import $ from "jquery";
import Stats from "stats-js";
import nj from "numjs";
import jdata from "jda";
import bjdata from "bjd";
import uPlot from "uplot";
import { Buffer } from "buffer";
import { Data3DTexture } from "three";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
window.THREE = THREE;


const urldata = {}; // Cache for fetched data
const niitype = {
  2: "uint8",
  4: "int16",
  8: "int32",
  16: "float32",
  32: "complex64",
  64: "float64",
}; // Data type mapping for NIFTI files

var controls;
let hasthreejs=false;
var lastvolume=null;
var lastvolumedim=[];
var lastvolumedata=null;
var lastclim=0;
var renderer;
var camera;
let extdata=[];
let intdata=[];
var xyzscale;
var scene;
var stats;
var boundingbox;
var reqid;
var bbxsize=[0,0,0];;
var randseed=1648335518;
var texture;


function drawpreview(cfg){
  scene.remove.apply(scene, scene.children);
  if(cfg.hasOwnProperty('Shapes')){
    if(cfg.Shapes instanceof nj.NdArray) {
      if(isWebGL2Available()){
        let box={Grid: {Size: cfg.Shapes.shape}};
        drawshape(box,0);
        lastvolume=drawvolume(cfg.Shapes);
        boundingbox.add( lastvolume );
      }
    } else if(cfg.Shapes.constructor===Object && cfg.Shapes._ArraySize_ != null){
      let box={Grid: {Size: cfg.Shapes._ArraySize_}};
      drawshape(box,0);
      if(isWebGL2Available()){
        let jd=new jdata(cfg.Shapes,{});
        cfg.Shapes=jd.decode().data;
        lastvolume=drawvolume(cfg.Shapes);
        boundingbox.add( lastvolume );
      }
    }else{
     if(cfg.Domain !=null && cfg.Domain.Dim!=null){
       let box={Grid: {Size: cfg.Domain.Dim}};
       drawshape(box,0);
     }
     if(cfg.Shapes != null && cfg.Shapes.length>0)
       cfg.Shapes.forEach(drawshape);
   }
  }else{
   if(cfg.hasOwnProperty('MeshNode') && cfg.hasOwnProperty('MeshSurf')) {
     if(cfg.MeshNode instanceof nj.NdArray) {
       drawsurf(cfg.MeshNode, cfg.MeshSurf);
     } else {
       if(cfg.MeshNode.hasOwnProperty('_ArraySize_')) {
         let nodesize = cfg.MeshNode._ArraySize_;
         let surfsize = cfg.MeshSurf._ArraySize_;
         let jd=new jdata(cfg,{});
         cfg=jd.decode().data;
         drawsurf(nj.array(cfg.MeshNode, 'float32'), nj.array(cfg.MeshSurf, 'uint32'));
       } else {
         drawsurf(nj.array(Array.from(cfg.MeshNode), 'float32').reshape(cfg.MeshNode.length/3, 3), nj.array(Array.from(cfg.MeshSurf), 'uint32').reshape(cfg.MeshSurf.length/3, 3));
       }
     }
   } else if(cfg.hasOwnProperty('NIFTIData') && cfg.NIFTIData instanceof nj.NdArray) {
     let box={Grid: {Size: cfg.NIFTIData.shape}};
     drawshape(box,0);
     if(isWebGL2Available()) {
       lastvolume=drawvolume(cfg.NIFTIData);
       boundingbox.add( lastvolume );
     }
   } else if(cfg instanceof nj.NdArray) {
     let box={Grid: {Size: Array.from(cfg.shape)}};
     if(xyzscale !== undefined) {
       box.Grid.Size[0]*=xyzscale[0];
       box.Grid.Size[1]*=xyzscale[1];
       box.Grid.Size[2]*=xyzscale[2];
     }
     drawshape(box,0);
     if(isWebGL2Available()) {
       lastvolume=drawvolume(cfg);
       boundingbox.add( lastvolume );
     }
   } else if(cfg.hasOwnProperty('NIFTIData')) {
     if(!cfg.NIFTIData.hasOwnProperty('_ArraySize_')) {
        cfg.NIFTIData = nj.array(cfg.NIFTIData);
     } else {
       let jd=new jdata(cfg.NIFTIData,{});
       cfg.NIFTIData=jd.decode().data;
     }
     let box={Grid: {Size: Array.from(cfg.NIFTIData.shape)}};
     if(cfg.hasOwnProperty('NIFTIHeader') && cfg.NIFTIHeader.hasOwnProperty('VoxelSize')) {
        xyzscale = cfg.NIFTIHeader.VoxelSize;
     }
     if(xyzscale !== undefined) {
       box.Grid.Size[0]*=xyzscale[0];
       box.Grid.Size[1]*=xyzscale[1];
       box.Grid.Size[2]*=xyzscale[2];
     }
     drawshape(box,0);
     if(isWebGL2Available()){
       lastvolume=drawvolume(cfg.NIFTIData);
       boundingbox.add( lastvolume );
     }
   } else {
     if(!cfg.hasOwnProperty('_ArraySize_')) {
        cfg = nj.array(cfg);
     } else {
       let jd=new jdata(cfg,{});
       cfg=jd.decode().data;
     }
     let box={Grid: {Size: cfg.shape}};
     drawshape(box,0);
     if(isWebGL2Available()){
       lastvolume=drawvolume(cfg);
       boundingbox.add( lastvolume );
     }
   }
  }
  if(reqid === undefined) {
    requestAnimationFrame(update);
  }
  return cfg;
}


// function dopreview(key, idx, isinternal, hastime) {
//   console.log("🟢 dopreview() started for key:", key, "Index:", idx);

//   console.log("🟢 dopreview() called with key:", key, "Index:", idx, "Internal:", isinternal);


//     let ndim = 0;
 
//     if (hastime === undefined) hastime = [];
//     if (isinternal === undefined) isinternal = true;
 
//     let dataroot = isinternal ? intdata[idx][2] : key;

//     console.log("📊 Data received in dopreview:", dataroot);

//     console.log("✅ Clearing scene...");
//     scene.children.forEach((child) => scene.remove(child));
//     console.log("✅ Scene cleared. Adding new objects...");

//     const testCube = new THREE.Mesh(
//       new THREE.BoxGeometry(50, 50, 50),
//       new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
//     );
//     scene.add(testCube);
//     console.log("✅ Test cube added to scene.");
  

 
//     if (dataroot.hasOwnProperty('_ArraySize_')) {
//        ndim = dataroot._ArraySize_.length;
//        let jd = new jdata(dataroot, {});
 
//        if (isinternal) {
//           intdata[idx][2] = jd.decode().data;
//           dataroot = intdata[idx][2];
//        } else {
//           extdata[idx][2] = jd.decode().data;
//           dataroot = extdata[idx][2];
//        }
//     } else if (dataroot instanceof nj.NdArray) {
//        ndim = dataroot.shape.length;
//     }
 
//     if (ndim < 3 && ndim > 0) {
//        const opts = {
//           title: `Preview for ${isinternal ? intdata[idx][3] : extdata[idx][3]}`,
//           width: 1100,
//           height: 400,
//           series: [{}, {}],
//           axes: [{}, {}],
//           scales: { x: { time: false } }
//        };
 
//        $('#chartpanel').css('padding', '10px').show();
//        $('#chartpanel').html('<h4>Data preview</h4><a href="javascript:void(0)" class="closebtn" onclick="$(\'#chartpanel\').hide()" title="Close">&times;</a><div id="plotchart"></div>');
 
//        if (dataroot instanceof nj.NdArray) {
//           if (dataroot.shape[0] > dataroot.shape[1]) dataroot = dataroot.transpose();
//           let plotdata = dataroot.tolist();
 
//           if (hastime.length === 0) {
//              plotdata = plotdata[0] instanceof Array ? plotdata.unshift([...Array(plotdata[0].length).keys()]) : [[...Array(plotdata.length).keys()], plotdata];
//           }
 
//           opts.series = [];
//           for (let i = 0; i < plotdata.length; i++) {
//              opts.series.push({
//                 stroke: `rgba(${(materialcolor[i] & 0xff)}, ${((materialcolor[i] & 0xff00) >>> 8)}, ${((materialcolor[i] & 0xff000000) >>> 24)}, 1)`,
//                 label: i === 0 ? (hastime.length === 0 ? 'x' : "Time") : (hastime.length === 0 ? `y${i}` : hastime[i])
//              });
//           }
 
//           new uPlot(opts, plotdata, document.getElementById('plotchart'));
//        } else {
//           new uPlot(opts, [[...Array(dataroot.length).keys()], dataroot], document.getElementById('plotchart'));
//        }
 
//        $('body').animate({ scrollTop: $('#chartpanel').offset().top - 20 }, 'fast');
//     } else {
//        if (typeof scene === 'undefined') {
//           initcanvas();

//           console.log("✅ Calling initcanvas()...");
//           initcanvas();
//           console.log("✅ initcanvas() executed.");

//        }
 
//        $("#credits").show();
//        if (reqid !== undefined) cancelAnimationFrame(reqid);
//        reqid = requestAnimationFrame(update);
 
//        if (isinternal) intdata[idx][2] = drawpreview(dataroot);
//        else extdata[idx][2] = drawpreview(dataroot);
 
//        window.scrollTo(0, 0);
//     }
 
//     $('#loadingdiv').css('display', 'none');

//     console.log("Previewing data:", key);
//     console.log("Index:", idx, "Internal:", isinternal, "Has time:", hastime);

//     console.log("🟢 Running dopreview() for:", key, "Index:", idx);
    
//     console.log("📊 Data received last:", dataroot);


//  }

// function dopreview(key, idx, isinternal, hastime) {
//   let ndim=0;

//   if(hastime === undefined)
//      hastime=[];
//   if(isinternal === undefined)
//      isinternal=true;
//   let dataroot = (isinternal) ? intdata[idx][2] : key;
//   if(dataroot.hasOwnProperty('_ArraySize_')) {
//      ndim = dataroot._ArraySize_.length;
//      let jd=new jdata(dataroot, {});
//      if(isinternal) {
//        intdata[idx][2] = jd.decode().data;
//        dataroot = intdata[idx][2];
//      } else {
//        extdata[idx][2] = jd.decode().data;
//        dataroot = extdata[idx][2];
//      }
//   } else if(dataroot instanceof nj.NdArray) {
//      ndim = dataroot.shape.length;
//   }

//   if(ndim < 3 && ndim > 0) {
//     const opts = {
//       title: "Preview for "+(isinternal ? intdata[idx][3] : extdata[idx][3]),
//       width: 1100,
//       height: 400,
//       series: [
//   {},{}
//       ],
//       axes: [
//   {},{}
//       ],
//       scales: {
//         "x": {
//            time: false
//         }
//       }
//     };
//     $('#chartpanel').css('padding','10px');
//     $('#chartpanel').show();
//     $('#chartpanel').html('<h4>Data preview</h4><a href="javascript:void(0)" class="closebtn" onclick="$(\'#chartpanel\').hide()" title="Close">&times;</a><div id="plotchart"></div>');
//     if(dataroot instanceof nj.NdArray) {
//       if(dataroot.shape[0] > dataroot.shape[1])
//          dataroot=dataroot.transpose();
//       let plotdata = dataroot.tolist();
//       if(hastime.length == 0) {
//         if(plotdata[0] instanceof Array)
//            plotdata.unshift([...Array(plotdata[0].length).keys()]);
//         else
//            plotdata=[ [...Array(plotdata.length).keys()], plotdata ];
//       }
//       opts.series=[];
//       for(let i=0; i<plotdata.length; i++) {
//           opts.series.push({stroke: "rgba("+(materialcolor[i] & 0xff)+","+ ((materialcolor[i] & 0xff00) >>> 8)+","+ ((materialcolor[i] & 0xff000000) >>> 24)+", 1)"});
//           opts.series[i].label=((i==0)? ((hastime.length == 0) ? 'x' : "Time") : ((hastime.length == 0) ? 'y'+i : hastime[i]));
//       }
//       let u = new uPlot(opts, plotdata, document.getElementById('plotchart'));
//     } else {
//       let u = new uPlot(opts, [ [...Array(dataroot.length).keys()], dataroot ], document.getElementById('plotchart'));
//     }
//     $('body').animate({ scrollTop: $('#chartpanel').offset().top - 20  }, 'fast');
//   } else {
//     if (typeof scene === 'undefined') {
//       initcanvas();
//     }
//     $("#credits").show();
//     if(reqid !== undefined) {
//        cancelAnimationFrame(reqid);
//     }
//     reqid=requestAnimationFrame(update);

//     if(isinternal)
//       intdata[idx][2] = drawpreview(dataroot);
//     else
//       extdata[idx][2] = drawpreview(dataroot);
//     window.scrollTo(0, 0);
//   }
//   $('#loadingdiv').css('display', 'none');
// }

function dopreview(key, idx, isinternal, hastime) {
  let ndim=0;

  if(hastime === undefined)
     hastime=[];
  if(isinternal === undefined)
     isinternal=true;
  let dataroot = (isinternal) ? intdata[idx][2] : key;
  // if(dataroot.hasOwnProperty('_ArraySize_')) {
  //    ndim = dataroot._ArraySize_.length;
  //    let jd=new jdata(dataroot, {});
  //    if(isinternal) {
  //      intdata[idx][2] = jd.decode().data;
  //      dataroot = intdata[idx][2];
  //    } else {
  //      extdata[idx][2] = jd.decode().data;
  //      dataroot = extdata[idx][2];
  //    }
  // } else if(dataroot instanceof nj.NdArray) {
  //    ndim = dataroot.shape.length;
  // }

  if (dataroot?.hasOwnProperty('_ArraySize_')) {
    ndim = dataroot._ArraySize_.length;
    let jd = new jdata(dataroot, {});

    // ✅ Ensure intdata[idx] or extdata[idx] exists before setting properties
    if (isinternal) {
        if (!intdata[idx]) intdata[idx] = [];  // ✅ Fix: Initialize if undefined
        intdata[idx][2] = jd.decode().data;
        dataroot = intdata[idx][2];
    } else {
        if (!extdata[idx]) extdata[idx] = [];  // ✅ Fix: Initialize if undefined
        extdata[idx][2] = jd.decode().data;
        dataroot = extdata[idx][2];
    }
  } else if (dataroot instanceof nj.NdArray) {
    ndim = dataroot.shape.length;
  }

  if(ndim < 3 && ndim > 0) {
    const opts = {
      title: "Preview for "+(isinternal ? intdata[idx][3] : extdata[idx][3]),
      width: 1100,
      height: 400,
      series: [
  {},{}
      ],
      axes: [
  {},{}
      ],
      scales: {
        "x": {
           time: false
        }
      }
    };
    $('#chartpanel').css('padding','10px');
    $('#chartpanel').show();
    $('#chartpanel').html('<h4>Data preview</h4><a href="javascript:void(0)" class="closebtn" onclick="$(\'#chartpanel\').hide()" title="Close">&times;</a><div id="plotchart"></div>');
    if(dataroot instanceof nj.NdArray) {
      if(dataroot.shape[0] > dataroot.shape[1])
         dataroot=dataroot.transpose();
      let plotdata = dataroot.tolist();
      if(hastime.length == 0) {
        if(plotdata[0] instanceof Array)
           plotdata.unshift([...Array(plotdata[0].length).keys()]);
        else
           plotdata=[ [...Array(plotdata.length).keys()], plotdata ];
      }
      opts.series=[];
      for(let i=0; i<plotdata.length; i++) {
          opts.series.push({stroke: "rgba("+(materialcolor[i] & 0xff)+","+ ((materialcolor[i] & 0xff00) >>> 8)+","+ ((materialcolor[i] & 0xff000000) >>> 24)+", 1)"});
          opts.series[i].label=((i==0)? ((hastime.length == 0) ? 'x' : "Time") : ((hastime.length == 0) ? 'y'+i : hastime[i]));
      }
      let u = new uPlot(opts, plotdata, document.getElementById('plotchart'));
    } else {
      let u = new uPlot(opts, [ [...Array(dataroot.length).keys()], dataroot ], document.getElementById('plotchart'));
    }
    $('body').animate({ scrollTop: $('#chartpanel').offset().top - 20  }, 'fast');
  } else {
    if (typeof scene === 'undefined') {
      initcanvas();
    }
    $("#credits").show();
    if(reqid !== undefined) {
       cancelAnimationFrame(reqid);
    }
    reqid=requestAnimationFrame(update);

    // if(isinternal)
    //   intdata[idx][2] = drawpreview(dataroot);
    // else
    //   extdata[idx][2] = drawpreview(dataroot);
    if (isinternal) {
      if (!intdata[idx]) intdata[idx] = [];  // ✅ Fix: Initialize if undefined
      intdata[idx][2] = drawpreview(dataroot);
    } else {
      if (!extdata[idx]) extdata[idx] = [];  // ✅ Fix: Initialize if undefined
      extdata[idx][2] = drawpreview(dataroot);
    }
    window.scrollTo(0, 0);
  }
  $('#loadingdiv').css('display', 'none');
}

function drawshape(shape,index){
    let keys = Object.keys(shape);
    let obj, c0, c1, dc, height, geometry, material;
    const dir={XLayers:0,YLayers:1,ZLayers:2,XSlabs:0,YSlabs:1,ZSlabs:2};
  
    switch(keys[0]){
      case "Grid":
        resetscene(shape.Grid.Size);
        boundingbox=createbox(shape.Grid.Size,shape.Grid.hasOwnProperty('O')?shape.Grid.O:[0,0,0],shape.Grid.Tag);
        const geo = new THREE.EdgesGeometry( boundingbox.geometry );
        const mat = new THREE.LineDashedMaterial( { color: 0xFFFF00, linewidth: 3, dashSize: 3, gapSize: 1 } );
        boundingbox = new THREE.LineSegments( geo, mat );
        boundingbox.computeLineDistances();
        scene.add( boundingbox );
  
        bbxsize=shape.Grid.Size;
        if(shape.Grid.hasOwnProperty('O'))
           controls.target.set( shape.Grid.Size[0]*0.5+shape.Grid.O[0], shape.Grid.Size[1]*0.5+shape.Grid.O[1], shape.Grid.Size[2]*0.5+shape.Grid.O[2]);
        else
           controls.target.set( shape.Grid.Size[0]*0.5, shape.Grid.Size[1]*0.5,shape.Grid.Size[2]*0.5);
  
        break;
      case "Box":
        boundingbox.add( createbox(shape.Box.Size,shape.Box.O,shape.Box.Tag) );
        break;
      case "Subgrid":
        boundingbox.add( createbox(shape.Subgrid.Size,shape.Subgrid.O,shape.Subgrid.Tag) );
        break;
      case "XLayers":
      case "YLayers":
      case "ZLayers":
        if(shape[keys[0]] != null)
           for (let i = 0; i < shape[keys[0]].length; i++)
              boundingbox.add( createlayer(shape[keys[0]][i], dir[keys[0]], shape[keys[0]][i][2]) );
        break;
      case "XSlabs":
      case "YSlabs":
      case "ZSlabs":
        if(shape[keys[0]] != null && shape[keys[0]].Bound != null){
           let slabs=shape[keys[0]].Bound;
       if(slabs.length>0 && !Array.isArray(slabs[0]))
           boundingbox.add(createlayer(slabs, dir[keys[0]]));
       else
               for (let i = 0; i < slabs.length; i++)
                   boundingbox.add( createlayer(slabs[i], dir[keys[0]], shape[keys[0]].Tag ) );
        }
        break;
      case "Sphere":
        geometry = new THREE.SphereGeometry(shape.Sphere.R, 32,32);
        //geometry.applyMatrix4( new THREE.Matrix4().makeTranslation(shape.Sphere.O[0],shape.Sphere.O[1],shape.Sphere.O[2]) );
        material = new THREE.MeshBasicMaterial( { color: materialcolor[shape.Sphere.Tag], wireframe: true, transparent: true,  } );
        obj = new THREE.Mesh( geometry, material );
        obj.position.set(shape.Sphere.O[0],shape.Sphere.O[1],shape.Sphere.O[2]);
        boundingbox.add( obj );
        break;
      case "Cylinder":
        c0 = new THREE.Vector3( shape.Cylinder.C0[0],shape.Cylinder.C0[1],shape.Cylinder.C0[2] );
        c1 = new THREE.Vector3( shape.Cylinder.C1[0],shape.Cylinder.C1[1],shape.Cylinder.C1[2] );
        dc=c1;
        height= c0.distanceTo(c1);
        geometry = new THREE.CylinderGeometry(shape.Cylinder.R, shape.Cylinder.R, height, 32);
        geometry.translate( 0, height*0.5 - 1, 0 );
        geometry.rotateX( Math.PI*0.5 ); // orient along z-axis - required
        dc.sub(c0).normalize();
        geometry.lookAt( dc );
        geometry.translate((c0.x+c1.x), (c0.y+c1.y), (c0.z+c1.z))
        material = new THREE.MeshBasicMaterial( { color: materialcolor[shape.Cylinder.Tag], wireframe: true, transparent: false } );
        obj = new THREE.Mesh( geometry, material );
        boundingbox.add( obj );
        break;
    }
}

var materialcolor=[];
for(let i=0;i<256;i++){
    randseed=mulberry32(randseed);
    materialcolor.push(randseed);
}

function mulberry32(a) {
  let t = a += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0);
}

function drawsurf(node, tri){
    $("#mip-radio-button,#iso-radio-button,#interp-radio-button").prop( "disabled", true);
  
    const geometry = new THREE.BufferGeometry();
    tri = tri.subtract(1);
    node = nj.array(node.slice(null, [0,3]).tolist(), 'float32');
    geometry.setIndex( new THREE.BufferAttribute(tri.selection.data, 1) );
    geometry.setAttribute( 'position', new THREE.BufferAttribute(node.selection.data, 3 ) );
    geometry.computeVertexNormals();
    var material = new THREE.MeshNormalMaterial( {
      color: 0xFFFF00,
      polygonOffset: true,
      polygonOffsetFactor: 1, // positive value pushes polygon further away
      polygonOffsetUnits: 1,
      side: THREE.DoubleSide
    } );
    lastvolume = new THREE.Mesh( geometry, material );
    scene.add( lastvolume )
  
    var geo = new THREE.WireframeGeometry( lastvolume.geometry ); // or WireframeGeometry
    var mat = new THREE.LineBasicMaterial( { color: 0x666666 } );
    var wireframe = new THREE.LineSegments( geo, mat );
    lastvolume.add( wireframe );
  
    let box={
              Grid: {
                Size: [nj.max(node.slice(null, [0,1])), nj.max(node.slice(null, [1,2])), nj.max(node.slice(null, [2,3]))],
                O: [nj.min(node.slice(null, [0,1])), nj.min(node.slice(null, [1,2])), nj.min(node.slice(null, [2,3]))]
             }};
    box.Grid.Size[0] -= box.Grid.O[0];
    box.Grid.Size[1] -= box.Grid.O[1];
    box.Grid.Size[2] -= box.Grid.O[2];
    drawshape(box,0);
  
    boundingbox.add( lastvolume )
  }

function resetscene(s){
    let diag=Math.sqrt(s[0]*s[0]+s[1]*s[1]+s[2]*s[2]);
    let distcenter=Math.sqrt(s[0]*s[0]+1.5*1.5*s[1]*s[1]+1.5*1.5*s[2]*s[2]);
    let near=distcenter-diag;
    let far =distcenter+diag;

    $("#camera-near").prop('min',0);
    $("#camera-near").prop('max',far*2);
    $("#camera-near").val(near);

    $("#camera-far").prop('min',0);
    $("#camera-far").prop('max',2*far);
    $("#camera-far").val(far);

    scene.remove.apply(scene, scene.children);
    const light = new THREE.AmbientLight(0xffffff );
    scene.add(light);

    const light1 = new THREE.PointLight( 0xffffff, 3 );
    light1.position.set(0,s[1]*1.5,0);
    scene.add( light1 );

    const light2 = new THREE.PointLight( 0xffffff, 3 );
    light2.position.set( s[0]*1.5,s[1]*1.5,s[2]*1.5 );
    scene.add( light2 );

    const light3 = new THREE.PointLight( 0xffffff, 3 );
    light3.position.set( -s[0]*1.5,-s[1]*1.5,-s[2]*1.5 );
    scene.add( light3 );

    //light.position.set(s[0]*1.5,s[1]*1.5,s[2]*1.5);
    camera.far=far;
    camera.near=near;
    camera.position.set(s[0]*2,s[1]*1.5,s[2]*1.5);
    camera.lookAt(new THREE.Vector3(s[0]*0.5,s[1]*0.5,s[2]*0.5));
    camera.zoom=0.7*Math.min($("#canvas").width()/(Math.sqrt(s[0]*s[0]+s[1]*s[1])), $("#canvas").height()/s[2]);
    camera.updateProjectionMatrix();
    camera.updateMatrix();
}

function createbox(bsize, orig, tag){
    const geometry = new THREE.BoxGeometry(bsize[0],bsize[1],bsize[2]);
    geometry.translate(bsize[0]*0.5+orig[0],bsize[1]*0.5+orig[1],bsize[2]*0.5+orig[2]);
    const material = new THREE.MeshNormalMaterial( { transparent: true, opacity: 0.6, side:THREE.DoubleSide, wireframe: false, depthWrite :false } );
    const obj = new THREE.Mesh( geometry, material );
    return obj;
}

function createlayer(s, dim, tag){
    let bsize=bbxsize;
    bsize[dim]=Math.abs(s[0]-s[1]);
    let orig=[0,0,0];
    orig[dim]=Math.min(s[0],s[1]);
    return createbox(bsize, orig, tag);
}

const texture_scale={
  uint8:255.0,
  uint16:65535.0,
  uint32:4294967295.0,
  int8:127.0,
  int16:32767.0,
  int32:2147483647.0,
  float32:1.0,
};

function drawvolume(volume){

    $("#mip-radio-button,#iso-radio-button,#interp-radio-button").prop( "disabled", false);
  
    lastvolumedim=volume.shape;
    let dim = lastvolumedim;
  
    $("#cross-t").prop( "disabled", true );
  
    if(dim.length > 3 && dim[3] > 0) {
      $('#cross-t').prop('min', 0);
      $('#cross-t').prop('max', dim[3]-1);
      $('#cross-t').val(0);
      $("#cross-t").prop( "disabled", false );
      $("#cross-t").prop('title', ''+$("#cross-t").val()+' ['+$("#cross-t").prop('min')+','+$("#cross-t").prop('max')+']');
    }
  
    lastvolumedata=nj.array(volume.transpose().flatten().selection.data, 'float32');
  
    texture = new Data3DTexture(lastvolumedata.selection.data, dim[0], dim[1], dim[2]);
    texture.format = THREE.RedFormat;
    texture.type = THREE.FloatType; //texture_dtype[lastvolumedata.dtype];
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    // texture.format = RedFormat;  // THREE.RedFormat
    // texture.type = FloatType;    // THREE.FloatType
    // texture.minFilter = texture.magFilter = LinearFilter;  // THREE.LinearFilter
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;
  
    // Colormap textures
    const cmtextures = {
        viridis: new THREE.TextureLoader().load( 'https://threejs.org/examples/textures/cm_viridis.png', render ),
        gray: new THREE.TextureLoader().load( 'https://threejs.org/examples/textures/cm_gray.png', render )
    };
  
    // Material
    const shader = document.getElementById('mip-radio-button').checked ? MipRenderShader : (document.getElementById('iso-radio-button').checked ? IsoRenderShader : InterpRenderShader());
  
    const uniforms = THREE.UniformsUtils.clone( shader.uniforms );
  
    uniforms[ "u_data" ].value = texture;
    uniforms[ "u_size" ].value.set( dim[0], dim[1], dim[2] );
    uniforms[ "u_clim" ].value.set( volume.min(), volume.max() );
    uniforms[ "u_renderstyle" ].value = document.getElementById('mip-radio-button').checked ? 0 : 1;
    uniforms[ "u_renderthreshold" ].value =  0.5;
    uniforms[ "u_scale" ].value =  texture_scale[lastvolumedata.dtype];
    uniforms[ "u_cmdata" ].value = cmtextures[ "viridis" ];
    uniforms[ "u_minslice" ].value.set( parseFloat($("#cross-x-low").val()), parseFloat($("#cross-y-low").val()), parseFloat($("#cross-z-low").val()) );
    uniforms[ "u_maxslice" ].value.set( parseFloat($("#cross-x-hi").val()), parseFloat($("#cross-y-hi").val()), parseFloat($("#cross-z-hi").val()) );
  
    lastclim=uniforms[ "u_clim" ].value;
    $("#clim-low").prop( "disabled", false );
    
    $("#clim-low").prop('min',lastclim.x);
    $("#clim-low").prop('max',lastclim.y);
    $("#clim-low").val(lastclim.x);
    $("#clim-low").prop('title',''+lastclim.x+'['+lastclim.x+','+lastclim.y+']');
  
    $("#clim-hi").prop( "disabled", false );
    $("#clim-hi").prop('min',lastclim.x);
    $("#clim-hi").prop('max',lastclim.y);
    $("#clim-hi").val(lastclim.y);
    $("#clim-hi").prop('title',''+lastclim.y+'['+lastclim.x+','+lastclim.y+']');
  
    $("#isothreshold").prop( "disabled", false );
    $("#isothreshold").prop('min',lastclim.x);
    $("#isothreshold").prop('max',lastclim.y);
    $("#isothreshold").val(uniforms[ "u_renderthreshold" ].value);
    $("#isothreshold").prop('title', ''+$("#isothreshold").val()+' ['+$("#isothreshold").prop('min')+','+$("#isothreshold").prop('max')+']');
  
    $("#x_thickness").prop('max',dim[0]);
    $("#y_thickness").prop('max',dim[1]);
    $("#z_thickness").prop('max',dim[2]);
  
    const material = new THREE.ShaderMaterial( {
        uniforms: uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader,
        side: THREE.BackSide // The volume shader uses the backface as its "reference point"
    } );
    if(shader.hasOwnProperty('glslVersion')) {
      material.glslVersion=shader.glslVersion;
    }
    material.uniforms.cameraPos.value.copy( camera.position );
  
    // THREE.Mesh
    const geometry = new THREE.BoxGeometry(dim[0], dim[1], dim[2]);
    geometry.translate(dim[0]*0.5, dim[1]*0.5, dim[2]*0.5 );
  
    const mesh = new THREE.Mesh( geometry, material );
    mesh.frustumCulled = false;
    if(xyzscale !== undefined) {
      mesh.scale.set(xyzscale[0],xyzscale[1],xyzscale[2]);
    }
  
    return mesh;
}


function initcanvas() {

  console.log("✅ initcanvas() is running...");
  console.log("🔍 Checking if canvas exists:", document.getElementById("canvas"));


  // ✅ Ensure #canvas exists before proceeding
  let canvas = document.querySelector("#canvas");

  if (!canvas) {
      console.error("❌ Error: #canvas element not found in DOM!");
      return;
  }

  if (!(canvas instanceof HTMLCanvasElement)) {
      console.error("❌ Error: canvas is not a real <canvas> element!", canvas);
      return;
  }

  console.log("✅ Canvas initialized:", canvas);

  const width = canvas.clientWidth || 800; // Default width if missing
  const height = canvas.clientHeight || 600; // Default height if missing

  console.log("✅ Canvas dimensions:", { width, height });

  scene = new THREE.Scene();
  boundingbox = scene;

  console.log("🔍 Checking canvas before accessing width:", canvas);

  // ✅ Fix: Correctly set up the Orthographic Camera
  // camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000);

  camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000);

  // camera.up = new THREE.Vector3(0, 0, 1);
  // camera.lookAt(new THREE.Vector3(0, 0, 0));

  camera.up = new THREE.Vector3(0, 0, 1);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
  camera.updateProjectionMatrix();

  renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);

  // ✅ Fix: Ensure renderer attaches to the correct canvas
  // canvas.appendChild(renderer.domElement);

  document.getElementById("canvas")?.appendChild(renderer.domElement);


  controls = new OrbitControls(camera, renderer.domElement);
  controls.minZoom = 0.5;
  controls.maxZoom = 40;
  controls.enableKeys = false;

  controls.update();

  function onPositionChange(o) {
    renderer.updateComplete = false;
  }
  controls.addEventListener("change", onPositionChange);
  console.log("✅ Three.js Initialized Successfully.");

  stats = createStats();
  document.getElementById("renderpanel").appendChild(stats.domElement);

  console.log("✅ Three.js Initialized Successfully.");

  // ✅ Attach Event Listeners
  $("#camera-near").on("input", function () {
    camera.near = parseFloat($(this).val());
    renderer.render(scene, camera);
    controls.update();
    renderer.updateComplete = false;
  });

  $("#camera-far").on("input", function () {
    camera.far = parseFloat($(this).val());
    renderer.render(scene, camera);
    controls.update();
    renderer.updateComplete = false;
  });

  $("#clim-low").on("input", function () {
    $(this).prop("title", $(this).val() + " [" + $(this).prop("min") + "," + $(this).prop("max") + "]");
    if (lastvolume !== null) {
        let val = lastvolume.material.uniforms["u_clim"].value;
        lastvolume.material.uniforms["u_clim"].value.set(parseFloat($(this).val()), val.y);
        renderer.updateComplete = false;
    }
  });

  $("#clim-hi").on("input", function () {
    $(this).prop("title", $(this).val() + " [" + $(this).prop("min") + "," + $(this).prop("max") + "]");
    if (lastvolume !== null) {
        let val = lastvolume.material.uniforms["u_clim"].value;
        lastvolume.material.uniforms["u_clim"].value.set(val.x, parseFloat($(this).val()));
        renderer.updateComplete = false;
    }
  });

  $("#isothreshold").on("input", function () {
    $(this).prop("title", $(this).val() + " [" + $(this).prop("min") + "," + $(this).prop("max") + "]");
    if (lastvolume !== null) {
        let val = lastvolume.material.uniforms["u_renderthreshold"].value;
        lastvolume.material.uniforms["u_renderthreshold"].value = parseFloat($(this).val());
        renderer.updateComplete = false;
    }
  });

  $("#mip-radio-button").on("change", function () {
    if (lastvolume !== null) {
      const unfs = lastvolume.material.uniforms;
      lastvolume.material = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(MipRenderShader.uniforms),
        vertexShader: MipRenderShader.vertexShader,
        fragmentShader: MipRenderShader.fragmentShader,
        side: THREE.BackSide
      });
      lastvolume.material.uniforms = unfs;
      renderer.updateComplete = false;
    }
  });

  $("#iso-radio-button").on("change", function () {
    if (lastvolume !== null) {
      const unfs = lastvolume.material.uniforms;
      lastvolume.material = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(IsoRenderShader.uniforms),
        vertexShader: IsoRenderShader.vertexShader,
        fragmentShader: IsoRenderShader.fragmentShader,
        side: THREE.BackSide
      });
      lastvolume.material.uniforms = unfs;
      renderer.updateComplete = false;
   }
  });

  $("#interp-radio-button").on("change", function () {
    if (lastvolume !== null) {
      const unfs = lastvolume.material.uniforms;
      lastvolume.material = new THREE.RawShaderMaterial(InterpRenderShader());
      lastvolume.material.uniforms = unfs;
      lastvolume.material.uniforms.cameraPos.value.copy(camera.position);
      renderer.updateComplete = false;
    }
  });

  $("#cross-x-low, #cross-y-low, #cross-z-low, #cross-x-hi, #cross-y-hi, #cross-z-hi").on("input", function () {
      setcrosssectionsizes(this);
  });

  $("#x_thickness, #y_thickness, #z_thickness").on("input", function () {
      let eid = $(this).attr("id");
      let linkedLow = `#cross-${eid.replace("_thickness", "-low")}`;
      let linkedHigh = `#cross-${eid.replace("_thickness", "-hi")}`;

      if ($(this).val() == 0) {
          $(linkedLow).val(0);
          $(linkedHigh).val(1);
      } else {
          $(linkedLow).val(($(linkedLow).val() + $(linkedHigh).val()) * 0.5);
      }
      setcrosssectionsizes($(linkedLow));
  });

  $("#pos-x-view, #neg-x-view, #pos-y-view, #neg-y-view, #pos-z-view, #neg-z-view").on("click", function () {
      setControlAngles(Math.PI * 90 / 180, Math.PI * 90 / 180);
      renderer.updateComplete = false;
  });

  $('#cross-t').on('mouseup', function() {
    $(this).prop('title', $(this).val() + ' [' + $(this).prop('min') + ',' + $(this).prop('max') + ']');
    if (lastvolume !== null && lastvolumedata !== undefined) {
      let dim = lastvolumedim;
      let offset = (Math.min($(this).val(), dim[3] - 2) * dim[0] * dim[1] * dim[2]);

      let texture = new Data3DTexture(lastvolumedata.selection.data.slice(offset - 1, offset + dim[0] * dim[1] * dim[2] - 1), dim[0], dim[1], dim[2]);
      texture.format = THREE.RedFormat;
      texture.type = texture_dtype[lastvolumedata.dtype];
      texture.minFilter = texture.magFilter = THREE.LinearFilter;
      texture.unpackAlignment = 1;
      texture.needsUpdate = true;

      lastvolume.material.uniforms["u_data"].value = texture;
      renderer.updateComplete = false;
    }
  });
}


function createFragmentShader(mode) {
    return [
          '		precision highp float;',
          '		precision mediump sampler3D;',
  
          '		uniform vec3 u_size;',
          '		uniform int u_renderstyle;',
          '		uniform float u_renderthreshold;',
          '		uniform vec2 u_clim;',
  
          '		uniform sampler3D u_data;',
          '		uniform sampler2D u_cmdata;',
          '		uniform vec3 u_minslice;',
          '		uniform vec3 u_maxslice;',
          '		uniform float u_scale;',
  
          '		varying vec3 v_position;',
          '		varying vec4 v_nearpos;',
          '		varying vec4 v_farpos;',
  
          // The maximum distance through our rendering volume is sqrt(3).
          '		const int MAX_STEPS = 887;	// 887 for 512^3, 1774 for 1024^3',
          '		const int REFINEMENT_STEPS = 2;',
          '		const float relative_step_size = 0.5;',
          '		const vec4 ambient_color = vec4(0.2, 0.4, 0.2, 1.0);',
          '		const vec4 diffuse_color = vec4(0.8, 0.2, 0.2, 1.0);',
          '		const vec4 specular_color = vec4(1.0, 1.0, 1.0, 1.0);',
          '		const float shininess = 40.0;',
  
          '		void cast_mip(vec3 start_loc, vec3 step, int nsteps, vec3 view_ray);',
          '		void cast_iso(vec3 start_loc, vec3 step, int nsteps, vec3 view_ray);',
  
          '		float sample1(vec3 texcoords);',
          '		vec4 apply_colormap(float val);',
          '		vec4 add_lighting(float val, vec3 loc, vec3 step, vec3 view_ray);',
  
          '		void main() {',
          // Normalize clipping plane info
          '				vec3 farpos = v_farpos.xyz / v_farpos.w;',
          '				vec3 nearpos = v_nearpos.xyz / v_nearpos.w;',
  
          // Calculate unit vector pointing in the view direction through this fragment.
          '				vec3 view_ray = normalize(nearpos.xyz - farpos.xyz);',
          // Compute the (negative) distance to the front surface or near clipping plane.
          // v_position is the back face of the cuboid, so the initial distance calculated in the dot
          // product below is the distance from near clip plane to the back of the cuboid
  
          '				float distance = dot(nearpos - v_position, view_ray);',
          '				vec3 cmp = (-vec3(0.5) - v_position) / view_ray;',
          '				vec3 cmpu = (u_size * vec3(1.0, 1.0, 1.0)) / view_ray + cmp;',
          '				cmp = min(cmp, cmpu);',
          '				distance = max(distance, max(cmp.x, max(cmp.y, cmp.z)));',
  
          // Now we have the starting position on the front surface
          '				vec3 front = v_position + view_ray * distance;',
  
          // Decide how many steps to take
          '				int nsteps = max(1, int(-distance / relative_step_size + 0.5));',
  
          // Get starting location and step vector in texture coordinates
          '				vec3 step = ((v_position - front) / u_size) / float(nsteps);',
          '				vec3 start_loc = front / u_size;',
  
      // Clip starting position and step count within the bounding box defined by u_minslice and u_maxslice
      // allowing for cross-sectional views.
      `       vec3 nstepminbound = mix(vec3(float(0)), (u_maxslice - start_loc) / step, greaterThan(start_loc, u_maxslice));
              float skips = max(nstepminbound.x, max(nstepminbound.y, nstepminbound.z));
              nstepminbound = mix(vec3(float(0)), (u_minslice - start_loc) / step, lessThan(start_loc, u_minslice));
              skips = max(skips, max(nstepminbound.x, max(nstepminbound.y, nstepminbound.z)));
              start_loc += skips * step;
              nsteps -= int(skips + 0.5);`,
      
      `       vec3 nstepmaxbound = mix(vec3(float(nsteps)), ceil((u_maxslice - start_loc) / step), greaterThan((start_loc + float(nsteps) * step), u_maxslice));
              nstepmaxbound = min(nstepmaxbound, mix(vec3(float(nsteps)), ceil((u_minslice - start_loc) / step), lessThan((start_loc + float(nsteps) * step), u_minslice)));
              nsteps = int(min(nstepmaxbound.x, min(nstepmaxbound.y, nstepmaxbound.z)) + 0.5);`,
  
          // For testing: show the number of steps. This helps to establish
          // whether the rays are correctly oriented
          //'gl_FragColor = vec4(0.0, float(nsteps) / 1.0 / u_size.x, 1.0, 1.0);',
          //'return;',
      `
              if(` + mode + `) {
                  cast_mip(start_loc, step, nsteps, view_ray);
              }
              else {
                  cast_iso(start_loc, step, nsteps, view_ray);
              }
      `,
          '		}',
  
  
          '		float sample1(vec3 texcoords) {',
          '				/* Sample float value from a 3D texture. Assumes intensity data. */',
          '				return texture(u_data, texcoords.xyz).r;',
          '		}',
  
  
          '		vec4 apply_colormap(float val) {',
          '				val = (val*u_scale - u_clim.x) / (u_clim.y - u_clim.x);',
          '				return texture2D(u_cmdata, vec2(val, 0.5));',
          '		}',
  
  
          '		void cast_mip(vec3 start_loc, vec3 step, int nsteps, vec3 view_ray) {',
  
          '				float max_val = 0.0;',
          '				vec3 loc = start_loc;',
  
          // Enter the raycasting loop. In WebGL 1 the loop index cannot be compared with
          // non-constant expression. So we use a hard-coded max, and an additional condition
          // inside the loop.
      isWebGL2Available() ? 'for (int iter=0; iter<=nsteps; iter++) {' : 'for (int iter=0; iter<=MAX_STEPS; iter++) {\nif(iter >= nsteps) break;',
          // Sample from the 3D texture
          '						float val = sample1(loc);',
          // Apply MIP operation
                                                        ' max_val = max(val, max_val);',
          // Advance location deeper into the volume
          '						loc += step;',
          '				}',
          // Resolve final color
          '				gl_FragColor = apply_colormap(max_val);',
          '		}',
  
          '		void cast_iso(vec3 start_loc, vec3 step, int nsteps, vec3 view_ray) {',
  
          '				vec4 color3 = vec4(0.0);	// final color',
          '				vec3 dstep = 1.0 / u_size;	// step to sample derivative',
          '				vec3 loc = start_loc;',
  
          '				float low_threshold = u_renderthreshold - 0.02 * (u_clim.y - u_clim.x);',
          '				float val = 0.0;',
  
          // Enter the raycasting loop. In WebGL 1 the loop index cannot be compared with
          // non-constant expression. So we use a hard-coded max, and an additional condition
          // inside the loop.
      isWebGL2Available() ? 'for (int iter=0; iter<=nsteps; iter++) {' : 'for (int iter=0; iter<=MAX_STEPS; iter++) {\nif(iter >= nsteps) break;',
          // Sample from the 3D texture
          '						val = sample1(loc)*u_scale;',
  
          '						if (val > u_renderthreshold) {',
          // Take the last interval in smaller steps
          '								break;',
          '						}',
  
          // Advance location deeper into the volume
          '						loc += step;',
          '				}',
      
      '				if (val > u_renderthreshold) {',
          // Take the last interval in smaller steps
          '						vec3 iloc = loc - 0.5 * step;',
          '						vec3 istep = step / float(REFINEMENT_STEPS);',
          '						for (int i=0; i<REFINEMENT_STEPS; i++) {',
          '								val = sample1(iloc);',
          '								if (val > u_renderthreshold) {',
          '										gl_FragColor = add_lighting(val, iloc, dstep, view_ray);',
          '										return;',
          '								}',
          '								iloc += istep;',
          '						}',
      '						gl_FragColor = add_lighting(val, iloc, dstep, view_ray);',
          '				}',
      '       else {',
          '			    	gl_FragColor = vec4(0.0);',
      '       }',
          '		}',
  
          '		vec4 add_lighting(float val, vec3 loc, vec3 step, vec3 view_ray)',
          '		{',
          // Calculate color by incorporating lighting
  
          // View direction
          '				vec3 V = normalize(view_ray);',
  
          // calculate normal vector from gradient
          '				vec3 N;',
          '				float val1, val2;',
          '				val1 = sample1(loc + vec3(-step[0], 0.0, 0.0));',
          '				val2 = sample1(loc + vec3(+step[0], 0.0, 0.0));',
          '				N[0] = val1 - val2;',
          '				val = max(max(val1, val2), val);',
          '				val1 = sample1(loc + vec3(0.0, -step[1], 0.0));',
          '				val2 = sample1(loc + vec3(0.0, +step[1], 0.0));',
          '				N[1] = val1 - val2;',
          '				val = max(max(val1, val2), val);',
          '				val1 = sample1(loc + vec3(0.0, 0.0, -step[2]));',
          '				val2 = sample1(loc + vec3(0.0, 0.0, +step[2]));',
          '				N[2] = val1 - val2;',
          '				val = max(max(val1, val2), val);',
  
          '				float gm = length(N); // gradient magnitude',
          '				N = normalize(N);',
  
          // Flip normal so it points towards viewer
          '				float Nselect = float(dot(N, V) > 0.0);',
          '				N = (2.0 * Nselect - 1.0) * N;	// ==	Nselect * N - (1.0-Nselect)*N;',
  
          // Init colors
          '				vec4 ambient_color = vec4(0.0, 0.0, 0.0, 0.0);',
          '				vec4 diffuse_color = vec4(0.0, 0.0, 0.0, 0.0);',
          '				vec4 specular_color = vec4(0.0, 0.0, 0.0, 0.0);',
  
          // note: could allow multiple lights
          '				for (int i=0; i<1; i++)',
          '				{',
                                   // Get light direction (make sure to prevent zero devision)
          '						vec3 L = normalize(view_ray);	//lightDirs[i];',
          '						float lightEnabled = float( length(L) > 0.0 );',
          '						L = normalize(L + (1.0 - lightEnabled));',
  
          // Calculate lighting properties
          '						float lambertTerm = clamp(dot(N, L), 0.0, 1.0);',
          '						vec3 H = normalize(L+V); // Halfway vector',
          '						float specularTerm = pow(max(dot(H, N), 0.0), shininess);',
  
          // Calculate mask
          '						float mask1 = lightEnabled;',
  
          // Calculate colors
          '						ambient_color +=	mask1 * ambient_color;	// * gl_LightSource[i].ambient;',
          '						diffuse_color +=	mask1 * lambertTerm;',
          '						specular_color += mask1 * specularTerm * specular_color;',
          '				}',
  
          // Calculate final color by componing different components
          '				vec4 final_color;',
          '				vec4 color = apply_colormap(val);',
          '				final_color = color * (ambient_color + diffuse_color) + specular_color;',
          '				final_color.a = color.a;',
          '				return final_color;',
          '		}',
      ].join( '\n' );
}

function isWebGL2Available (){
  try {
    let canvas = document.createElement( 'canvas' );
    return !! ( window.WebGL2RenderingContext && canvas.getContext( 'webgl2' ) );
  } catch ( e ) {
    return false;
  }
}

var MipRenderShader = {
	uniforms: {
		'u_size': { value: new THREE.Vector3( 1, 1, 1 ) },
		'u_renderstyle': { value: 0 },
		'u_renderthreshold': { value: 0.5 },
		'u_clim': { value: new THREE.Vector2( 1, 1 ) },
		'u_data': { value: null },
		'u_cmdata': { value: null },
		'u_minslice': { value: new THREE.Vector3( 0, 0, 0 ) },
		'u_maxslice': { value: new THREE.Vector3( 1, 1, 1 ) },
		'u_scale': { value: 1.0 },
		'steps': { value: 200 },
                'cameraPos': { value: new THREE.Vector3() }
	},
	vertexShader: [
		'		varying vec4 v_nearpos;',
		'		varying vec4 v_farpos;',
		'		varying vec3 v_position;',

		'		void main() {',
		// Prepare transforms to map to "camera view". See also:
		// https://threejs.org/docs/#api/renderers/webgl/WebGLProgram
		'				mat4 viewtransformf = modelViewMatrix;',
		'				mat4 viewtransformi = inverse(modelViewMatrix);',

		// Project local vertex coordinate to camera position. Then do a step
		// backward (in cam coords) to the near clipping plane, and project back. Do
		// the same for the far clipping plane. This gives us all the information we
		// need to calculate the ray and truncate it to the viewing cone.
		'				vec4 position4 = vec4(position, 1.0);',
		'				vec4 pos_in_cam = viewtransformf * position4;',

		// Intersection of ray and near clipping plane (z = -1 in clip coords)
		'				pos_in_cam.z = -pos_in_cam.w;',
		'				v_nearpos = viewtransformi * pos_in_cam;',

		// Intersection of ray and far clipping plane (z = +1 in clip coords)
		'				pos_in_cam.z = pos_in_cam.w;',
		'				v_farpos = viewtransformi * pos_in_cam;',

		// Set varyings and output pos
		'				v_position = position;',
		'				gl_Position = projectionMatrix * viewMatrix * modelMatrix * position4;',
		'		}',
	].join( '\n' ),
	fragmentShader: createFragmentShader(true)
};

var IsoRenderShader = {
	uniforms: MipRenderShader.uniforms,
	vertexShader: MipRenderShader.vertexShader,
	fragmentShader: createFragmentShader(false)
};

function InterpRenderShader() {
    // Material
  
    const interpVertexShader = /* glsl */`
      in vec3 position;
  
      uniform mat4 modelMatrix;
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      uniform vec3 cameraPos;
  
      out vec3 vOrigin;
      out vec3 vDirection;
  
      void main() {
          vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  
          vOrigin = vec3( inverse( modelMatrix ) * vec4( cameraPos, 1.0 ) ).xyz;
          vDirection = position - vOrigin;
  
          gl_Position = projectionMatrix * mvPosition;
      }
    `;
  
    const interpFragmentShader = /* glsl */`
      precision highp float;
      precision highp sampler3D;
  
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
  
      in vec3 vOrigin;
      in vec3 vDirection;
  
      out vec4 color;
  
      uniform sampler3D u_data;
  
      uniform float u_renderthreshold;
      uniform float steps;
      uniform float u_scale;
  
      vec2 hitBox( vec3 orig, vec3 dir ) {
          const vec3 box_min = vec3( - 0.5 );
          const vec3 box_max = vec3( 0.5 );
          vec3 inv_dir = 1.0 / dir;
          vec3 tmin_tmp = ( box_min - orig ) * inv_dir;
          vec3 tmax_tmp = ( box_max - orig ) * inv_dir;
          vec3 tmin = min( tmin_tmp, tmax_tmp );
          vec3 tmax = max( tmin_tmp, tmax_tmp );
          float t0 = max( tmin.x, max( tmin.y, tmin.z ) );
          float t1 = min( tmax.x, min( tmax.y, tmax.z ) );
          return vec2( t0, t1 );
      }
  
      float sample1( vec3 p ) {
          return texture( u_data, p ).r;
      }
  
      #define epsilon .0001
  
      vec3 normal( vec3 coord ) {
          if ( coord.x < epsilon ) return vec3( 1.0, 0.0, 0.0 );
          if ( coord.y < epsilon ) return vec3( 0.0, 1.0, 0.0 );
          if ( coord.z < epsilon ) return vec3( 0.0, 0.0, 1.0 );
          if ( coord.x > 1.0 - epsilon ) return vec3( - 1.0, 0.0, 0.0 );
          if ( coord.y > 1.0 - epsilon ) return vec3( 0.0, - 1.0, 0.0 );
          if ( coord.z > 1.0 - epsilon ) return vec3( 0.0, 0.0, - 1.0 );
  
          float step = 0.01;
          float x = sample1( coord + vec3( - step, 0.0, 0.0 ) ) - sample1( coord + vec3( step, 0.0, 0.0 ) );
          float y = sample1( coord + vec3( 0.0, - step, 0.0 ) ) - sample1( coord + vec3( 0.0, step, 0.0 ) );
          float z = sample1( coord + vec3( 0.0, 0.0, - step ) ) - sample1( coord + vec3( 0.0, 0.0, step ) );
  
          return normalize( vec3( x, y, z ) );
      }
  
      void main(){
  
          vec3 rayDir = normalize( vDirection );
          vec2 bounds = hitBox( vOrigin, rayDir );
  
          if ( bounds.x > bounds.y ) discard;
  
          bounds.x = max( bounds.x, 0.0 );
  
          vec3 p = vOrigin + bounds.x * rayDir;
          vec3 inc = 1.0 / abs( rayDir );
          float delta = min( inc.x, min( inc.y, inc.z ) );
          delta /= steps;
  
          for ( float t = bounds.x; t < bounds.y; t += delta ) {
  
              float d = sample1( p + 0.5 )*u_scale;
  
              //if ( d > 3 ) {
  
                  color.rgb = normal( p + 0.5 ) * 0.5 + ( p * 1.5 + 0.25 );
                  color.a = 1.;
                  break;
  
              //}
  
              p += rayDir * delta;
  
          }
  
          if ( color.a == 0.0 ) discard;
      }
    `;
  
     const material = new THREE.RawShaderMaterial( {
      uniforms: THREE.UniformsUtils.clone( MipRenderShader.uniforms ),
      vertexShader: interpVertexShader,
      fragmentShader: interpFragmentShader,
      glslVersion: THREE.GLSL3
     } );
     return material;
}

function createStats() {
    var stats = new Stats();
    stats.setMode(0);
  
    stats.domElement.style.position = 'relative';
  
    return stats;
}

function setcrosssectionsizes(e) {
  let eid=$(e).attr('id');
  let deltaeid=eid.replace('cross-','').replace(/-(low|hi)$/,'_thickness');
  let dvalue=parseInt($('#'+deltaeid).val());

  if(dvalue>0) {
     let othereid='';
     dvalue /= (eid.match(/-x-/) ? lastvolumedim[0] : (eid.match(/-y-/) ? lastvolumedim[1]: lastvolumedim[2]));

     if(eid.match(/-low/)) {
        othereid='#'+eid.replace(/-low$/, '-hi');
        $(othereid).val(Math.min(parseFloat($(e).val())+dvalue, 1))
     } else {
        othereid='#'+eid.replace(/-hi$/, '-low');
        $(othereid).val(Math.max(parseFloat($(e).val())-dvalue, 0))
     }
     $(othereid).prop('title', ''+$(othereid).val()+' ['+$(othereid).prop('min')+','+$(othereid).prop('max')+']');
  }

  $(e).prop('title', ''+$(e).val()+' ['+$(e).prop('min')+','+$(e).prop('max')+']');
  if(lastvolume !== null){
    lastvolume.material.uniforms[ "u_minslice" ].value.set( parseFloat($("#cross-x-low").val()), parseFloat($("#cross-y-low").val()), parseFloat($("#cross-z-low").val()) );
    lastvolume.material.uniforms[ "u_maxslice" ].value.set( parseFloat($("#cross-x-hi").val()), parseFloat($("#cross-y-hi").val()), parseFloat($("#cross-z-hi").val()) );
    renderer.updateComplete = false;
  }
}

function setControlAngles(polar, azimuth) {
    let mi = controls.minAzimuthAngle;
    let mx = controls.maxAzimuthAngle;
    let mip = controls.minPolarAngle;
    let mxp = controls.maxPolarAngle;
    controls.minAzimuthAngle = azimuth;
    controls.maxAzimuthAngle = azimuth;
    controls.minPolarAngle = polar;
    controls.maxPolarAngle = polar;
    controls.update();
    controls.minAzimuthAngle = mi;
    controls.maxAzimuthAngle = mx;
    controls.minPolarAngle = mip;
    controls.maxPolarAngle = mxp;
}

function render(){
    renderer.render( scene, camera );
  }

function update() {
    reqid=requestAnimationFrame(update);
    if(renderer.updateComplete === undefined || !renderer.updateComplete) {
//      if(document.getElementById('mip-radio-button').checked && lastvolume !== undefined)
//          lastvolume.material.uniforms.cameraPos.value.copy( camera.position );
      renderer.render(scene, camera);
      renderer.updateComplete = true;
    }
    controls.update();
    stats.update();
}

import { baseURL } from "../services/instance"; // Import CORS proxy

function previewdataurl(url, idx) {
  console.log("🟢 previewdataurl() called for:", url, "Index:", idx);
  console.log("🔎 Checking file format for:", url);
  console.log("🔎 Extracted extension:", url.split('.').pop());


  // ✅ Ensure valid file types before proceeding
  // if (!/\.(nii|nii\.gz|jdt|jdb|bmsh|jmsh)$/i.test(url)) {
  //   console.warn("⚠️ Unsupported file format for previe:", url);
  //   return;
  // }

  if (!/\.(nii|nii\.gz|jdt|jdb|bmsh|jmsh|bnii|gz)$/i.test(url)) {
    console.warn("⚠️ Unsupported file format for preview:", url);
    return;
  }

  // ✅ Fix CORS Proxy Handling
  // const proxiedURL = `${baseURL.replace(/\/$/, '')}/${url.replace(/^https:\/\/neurojson\.(io|org)(:7777)?\/?/, "")}`;
  const proxiedURL = `${baseURL.replace(/\/$/, '')}/${url.replace(/^https:\/\/neurojson\.(io|org)(:7777)?\/?/, "")}`;

  console.log("📌 Final Proxied URL:", proxiedURL);

  // ✅ Check if data is already cached
  if (urldata.hasOwnProperty(proxiedURL)) {
    console.log("✅ Using cached preview data.");
    previewdata(urldata[proxiedURL], idx, false);
    return;
  }

  $('#loadingdiv').css('display', 'block');
  $('#loadingstatus').text('Loading from external URL');

  var oReq = new XMLHttpRequest();
  oReq.open("GET", proxiedURL, true);
  oReq.setRequestHeader("X-Requested-With", "XMLHttpRequest");  // ✅ Required Header
  // oReq.setRequestHeader("Origin", window.location.origin);       // ✅ Origin Header
  oReq.responseType = "arraybuffer";


  // oReq.onload = function () {
  
  //   let arrayBuffer = oReq.response;
  //   console.log("📥 Fetched data size:", oReq.response ? oReq.response.byteLength : "No response");
  //   if (!arrayBuffer || arrayBuffer.byteLength === 0) {
  //     console.error("❌ No valid response received from:", proxiedURL);
  //     return;
  //   }
  //   console.log("📥 Raw Response (First 100 chars):", new TextDecoder().decode(arrayBuffer.slice(0, 100)));
  //   console.log("📥 Full Response Length:", arrayBuffer.byteLength);


  //   let bjd;
  //   if (url.match(/\.nii\.gz/)) {
  //     console.log("🔄 Processing NIfTI file...");
  //     let origdata = pako.ungzip(arrayBuffer);
  //     const header = new DataView(origdata.buffer);
  //     let ndim = header.getUint16(40, true);
  //     let datatype = header.getUint16(70, true);

  //     let dims = [], totallen = 1;
  //     for (let i = 1; i <= ndim; i++) {
  //       dims.push(header.getUint16(40 + i * 2, true));
  //       totallen *= dims[i - 1];
  //     }

  //     let voxelsize = [];
  //     for (let i = 1; i <= ndim; i++) {
  //       voxelsize.push(header.getFloat32(76 + i * 4, true));
  //     }
  //     let voxeloffset = header.getFloat32(108, true);
  //     let type = niitype[datatype];

  //     let typename = type.charAt(0).toUpperCase() + type.slice(1) + "Array";
  //     let typecast = new Function('d,o,l', `return new ${typename}(d,o,l)`);

  //     bjd = nj.array(typecast(origdata.buffer, Math.floor(voxeloffset), totallen), niitype[datatype]);
  //     bjd = { NIFTIHeader: { VoxelSize: voxelsize }, NIFTIData: bjd.reshape(dims.reverse()).transpose() };
  //   } else {
  //     console.log("🔄 Processing BJData...");
  //     bjd = bjdata.decode(new Uint8Array(arrayBuffer));
  //     let jd = new jdata(bjd[0], { base64: false });
  //     bjd = jd.decode().data;
  //   }

  //   let plotdata = bjd;

  //   // ✅ Restore `linkpath` processing if required
  //   let linkpath = url.split(/:*\$\./);
  //   if (linkpath.length > 1 && !linkpath[1].match(/^Mesh[NSEVT]/)) {
  //     let objpath = linkpath[1].split(/(?<!\\)\./);
  //     for (let i = 0; i < objpath.length; i++) {
  //       if (plotdata.hasOwnProperty(objpath[i])) {
  //         plotdata = plotdata[objpath[i]];
  //       }
  //     }
  //   }

  //   // ✅ Handle NIfTI VoxelSize if present
  //   if (bjd.hasOwnProperty('NIFTIHeader') && bjd['NIFTIHeader'].hasOwnProperty('VoxelSize')) {
  //     xyzscale = bjd['NIFTIHeader']['VoxelSize'];
  //     plotdata = bjd.NIFTIData;
  //   }

  //   // ✅ Fix MeshNode & MeshSurf conversion
  //   if (bjd.hasOwnProperty('MeshVertex3') && !bjd.hasOwnProperty('MeshNode'))
  //     bjd.MeshNode = bjd.MeshVertex3;

  //   if (bjd.hasOwnProperty('MeshTri3') && !bjd.hasOwnProperty('MeshSurf'))
  //     bjd.MeshSurf = bjd.MeshTri3;

  //   // ✅ Fix MeshElem processing
  //   if (!plotdata.hasOwnProperty('MeshSurf') && plotdata.hasOwnProperty('MeshElem')) {
  //     if (plotdata.MeshElem instanceof nj.NdArray) {
  //       const dat = plotdata;
  //       let f123 = nj.stack([dat.MeshElem.pick(null, 3), dat.MeshElem.pick(null, 0), dat.MeshElem.pick(null, 1)]);
  //       let f124 = nj.stack([dat.MeshElem.pick(null, 3), dat.MeshElem.pick(null, 1), dat.MeshElem.pick(null, 2)]);
  //       let f134 = nj.stack([dat.MeshElem.pick(null, 2), dat.MeshElem.pick(null, 0), dat.MeshElem.pick(null, 3)]);
  //       let f234 = nj.stack([dat.MeshElem.pick(null, 1), dat.MeshElem.pick(null, 0), dat.MeshElem.pick(null, 2)]);
  //       let tris = nj.concatenate(f123, f124, f134, f234).T;
  //       let surftri = {};

  //       for (let i = 0; i < tris.shape[0]; i++) {
  //         let trikey = tris.pick(i).tolist().sort((a, b) => a - b).toString();
  //         if (surftri.hasOwnProperty(trikey)) {
  //           surftri[trikey] = -1;
  //         } else {
  //           surftri[trikey] = i;
  //         }
  //       }

  //       surftri = Object.values(surftri).filter(num => num >= 0);
  //       plotdata.MeshSurf = nj.zeros([surftri.length, 3], 'uint32');
  //       for (let i = 0; i < surftri.length; i++) {
  //         plotdata.MeshSurf.set(i, 0, tris.pick(surftri[i]).get(0));
  //         plotdata.MeshSurf.set(i, 1, tris.pick(surftri[i]).get(1));
  //         plotdata.MeshSurf.set(i, 2, tris.pick(surftri[i]).get(2));
  //       }
  //     }
  //   }

  //   // ✅ Fix time-series data preview
  //   if (plotdata.hasOwnProperty('data') && plotdata.data.hasOwnProperty('dataTimeSeries')) {
  //     let serieslabel = true;
  //     if (plotdata.data.hasOwnProperty('measurementList')) {
  //       serieslabel = Array(plotdata.data.measurementList.length);
  //       for (let i = 0; i < serieslabel.length; i++) {
  //         serieslabel[i] = 'S' + plotdata.data.measurementList[i].sourceIndex + 'D' + plotdata.data.measurementList[i].detectorIndex;
  //       }
  //     }
  //     previewdata(nj.concatenate(plotdata.data.time.reshape(plotdata.data.time.size, 1), plotdata.data.dataTimeSeries).T, idx, false, serieslabel);
  //   }

  //   // ✅ Cache the processed data
  //   urldata[proxiedURL] = plotdata;

  //   console.log("✅ Data cached for:", proxiedURL);

  //   // ✅ Send to preview renderer
  //   if (plotdata instanceof nj.NdArray || plotdata.hasOwnProperty('MeshNode')) {
  //     console.log("✅ Sending data to preview renderer.");
  //     previewdata(plotdata, idx, false);
  //   } else {
  //     console.warn("⚠️ No valid preview data found.");
  //   }
  // };

  oReq.onload = function () {
    let arrayBuffer = oReq.response;
    console.log("📥 Fetched data size:", arrayBuffer ? arrayBuffer.byteLength : "No response");

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        console.error("❌ No valid response received from:", proxiedURL);
        return;
    }

    // ✅ Check if response is an error (HTML page or JSON response)
    const textResponse = new TextDecoder().decode(arrayBuffer.slice(0, 100));
    if (textResponse.startsWith("<!DOCTYPE html") || textResponse.includes("<html")) {
        console.error("❌ Received an HTML error page instead of binary data.");
        console.error("🔍 Response Preview:", textResponse);
        return;
    }
    if (textResponse.includes("{") && textResponse.includes("error")) {
        console.error("❌ Received JSON error response:", textResponse);
        return;
    }

    console.log("✅ Valid binary file received. Processing...");
    let bjd;

    // ✅ Process NIfTI (.nii.gz) Files
    if (url.match(/\.nii\.gz/)) {
        console.log("🔄 Processing NIfTI file...");
        let origdata = pako.ungzip(arrayBuffer);
        const header = new DataView(origdata.buffer);
        let ndim = header.getUint16(40, true);
        let datatype = header.getUint16(70, true);

        let dims = [], totallen = 1;
        for (let i = 1; i <= ndim; i++) {
            dims.push(header.getUint16(40 + i * 2, true));
            totallen *= dims[i - 1];
        }

        let voxelsize = [];
        for (let i = 1; i <= ndim; i++) {
            voxelsize.push(header.getFloat32(76 + i * 4, true));
        }
        let voxeloffset = header.getFloat32(108, true);
        let type = niitype[datatype];

        let typename = type.charAt(0).toUpperCase() + type.slice(1) + "Array";
        let typecast = new Function('d,o,l', `return new ${typename}(d,o,l)`);

        bjd = nj.array(typecast(origdata.buffer, Math.floor(voxeloffset), totallen), niitype[datatype]);
        bjd = { NIFTIHeader: { VoxelSize: voxelsize }, NIFTIData: bjd.reshape(dims.reverse()).transpose() };
    } 
    // ✅ Process BJData
    else {
        console.log("🔄 Processing BJData...");
        try {
            bjd = bjdata.decode(new Uint8Array(arrayBuffer));
            let jd = new jdata(bjd[0], { base64: false });
            bjd = jd.decode().data;
        } catch (error) {
            console.error("❌ Failed to decode BJData:", error);
            return;
        }
    }

    let plotdata = bjd;

    // ✅ Restore `linkpath` processing if required
    let linkpath = url.split(/:*\$\./);
    if (linkpath.length > 1 && !linkpath[1].match(/^Mesh[NSEVT]/)) {
        let objpath = linkpath[1].split(/(?<!\\)\./);
        for (let i = 0; i < objpath.length; i++) {
            if (plotdata.hasOwnProperty(objpath[i])) {
                plotdata = plotdata[objpath[i]];
            }
        }
    }

    // ✅ Handle NIfTI VoxelSize if present
    if (bjd.hasOwnProperty('NIFTIHeader') && bjd['NIFTIHeader'].hasOwnProperty('VoxelSize')) {
        xyzscale = bjd['NIFTIHeader']['VoxelSize'];
        plotdata = bjd.NIFTIData;
    }

    // ✅ Fix MeshNode & MeshSurf conversion
    if (bjd.hasOwnProperty('MeshVertex3') && !bjd.hasOwnProperty('MeshNode'))
        bjd.MeshNode = bjd.MeshVertex3;

    if (bjd.hasOwnProperty('MeshTri3') && !bjd.hasOwnProperty('MeshSurf'))
        bjd.MeshSurf = bjd.MeshTri3;

    // ✅ Fix MeshElem processing
    if (!plotdata.hasOwnProperty('MeshSurf') && plotdata.hasOwnProperty('MeshElem')) {
        if (plotdata.MeshElem instanceof nj.NdArray) {
            const dat = plotdata;
            let f123 = nj.stack([dat.MeshElem.pick(null, 3), dat.MeshElem.pick(null, 0), dat.MeshElem.pick(null, 1)]);
            let f124 = nj.stack([dat.MeshElem.pick(null, 3), dat.MeshElem.pick(null, 1), dat.MeshElem.pick(null, 2)]);
            let f134 = nj.stack([dat.MeshElem.pick(null, 2), dat.MeshElem.pick(null, 0), dat.MeshElem.pick(null, 3)]);
            let f234 = nj.stack([dat.MeshElem.pick(null, 1), dat.MeshElem.pick(null, 0), dat.MeshElem.pick(null, 2)]);
            let tris = nj.concatenate(f123, f124, f134, f234).T;
            let surftri = {};

            for (let i = 0; i < tris.shape[0]; i++) {
                let trikey = tris.pick(i).tolist().sort((a, b) => a - b).toString();
                if (surftri.hasOwnProperty(trikey)) {
                    surftri[trikey] = -1;
                } else {
                    surftri[trikey] = i;
                }
            }

            surftri = Object.values(surftri).filter(num => num >= 0);
            plotdata.MeshSurf = nj.zeros([surftri.length, 3], 'uint32');
            for (let i = 0; i < surftri.length; i++) {
                plotdata.MeshSurf.set(i, 0, tris.pick(surftri[i]).get(0));
                plotdata.MeshSurf.set(i, 1, tris.pick(surftri[i]).get(1));
                plotdata.MeshSurf.set(i, 2, tris.pick(surftri[i]).get(2));
            }
        }
    }

    // ✅ Fix time-series data preview
    if (plotdata.hasOwnProperty('data') && plotdata.data.hasOwnProperty('dataTimeSeries')) {
        let serieslabel = true;
        if (plotdata.data.hasOwnProperty('measurementList')) {
            serieslabel = Array(plotdata.data.measurementList.length);
            for (let i = 0; i < serieslabel.length; i++) {
                serieslabel[i] = 'S' + plotdata.data.measurementList[i].sourceIndex + 'D' + plotdata.data.measurementList[i].detectorIndex;
            }
        }
        previewdata(nj.concatenate(plotdata.data.time.reshape(plotdata.data.time.size, 1), plotdata.data.dataTimeSeries).T, idx, false, serieslabel);
    }

    // ✅ Cache the processed data
    urldata[proxiedURL] = plotdata;

    console.log("✅ Data cached for:", proxiedURL);

    // ✅ Send to preview renderer
    if (plotdata instanceof nj.NdArray || plotdata.hasOwnProperty('MeshNode')) {
        console.log("✅ Sending data to preview renderer.");
        previewdata(plotdata, idx, false);
    } else {
        console.warn("⚠️ No valid preview data found.");
    }
  };


  oReq.onerror = function () {
    console.error("❌ Network error while fetching:", proxiedURL);
  };

  oReq.send();
}


function previewdata(key, idx, isinternal, hastime) {
  console.log("🟢 previewdata() triggered. Key:", key, "Index:", idx);

  if (!window.THREE) {
    console.error("❌ Error: THREE.js is not loaded!");
  } else {
    console.log("✅ THREE.js is available.");
  }

    if(!hasthreejs) {
      $.when(
        $.getScript( "https://mcx.space/cloud/js/OrbitControls.js" ),
        $.Deferred(function( deferred ){
            $( deferred.resolve );
        })
      ).done(function(){
        hasthreejs=true;
        dopreview(key, idx, isinternal, hastime);
        console.log("🟢 IF previewdata() running with key:", key, "Index:", idx, "Internal:", isinternal);

      });
    } else {
      dopreview(key, idx, isinternal, hastime);
      console.log("🟢 else previewdata() running with key:", key, "Index:", idx, "Internal:", isinternal);
    }
  console.log("✅ previewdata() completed successfully. Calling dopreview...");

  }
  

export {
  createStats,
  dopreview,
  previewdata,
  initcanvas,
  drawpreview,
  update,
  previewdataurl, 
  setControlAngles,
  setcrosssectionsizes // Add the new function to the exports
};
