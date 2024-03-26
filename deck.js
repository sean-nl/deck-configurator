// Example from https://threejs.org/examples/#webgl_geometry_sdf
import * as THREE from 'three';
// import { OrbitControls } from './jsm/controls/OrbitControls.js'; //originally was like this
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; //using this now. why?
import { SDFGeometryGenerator } from 'three/addons/geometries/SDFGeometryGenerator.js';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, stats, meshBox, scene, camera, clock, controls;

const settings = {
    x: 6,
    y: 3,
    z: 6,
    showFrame: false,
    autoRotate: false,
    wireframe: false,
    material: 'normal',
    vertexCount: '0'
};

const frameGeos = [];
const nFrameMeshes = 3;
let meshFrames = []

init();
animate();

function init() {

    const w = window.innerWidth;
    const h = window.innerHeight;

    camera = new THREE.OrthographicCamera( w / - 2, w / 2, h / 2, h / - 2, 0.01, 70000 );
    camera.position.z = 10000;

    //Alternative: could play with the frustrum of the camera.
    camera.zoom = 3.0;
    camera.updateProjectionMatrix();

    scene = new THREE.Scene();

    clock = new THREE.Clock();

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    stats = new Stats();
    document.body.appendChild( stats.dom );

    controls = new OrbitControls( camera, renderer.domElement );
    controls.enableDamping = true;

    window.addEventListener( 'resize', onWindowResize );

    const panel = new GUI( );

    panel.add( settings, 'x', 1, 20, 1 ).name( 'X' ).onFinishChange( compile );
    panel.add( settings, 'y', 1, 20, 1 ).name( 'Y' ).onFinishChange( compile );
    panel.add( settings, 'z', 1, 20, 1 ).name( 'Z' ).onFinishChange( compile );
    panel.add( settings, 'showFrame' ).name( 'Show Frame' ).onChange( compile );
    panel.add( settings, 'material', [ 'depth', 'normal' ] ).name( 'Material' ).onChange( setMaterial );
    panel.add( settings, 'wireframe' ).name( 'Wireframe' ).onChange( setMaterial );
    panel.add( settings, 'vertexCount' ).name( 'Vertex count' ).listen().disable();

    compile();

}

//Proposed:
//Step 2 - make the resultant meshes three equidistant joists
//Step 3 - make the resultant meshes n equidistant joists
function compile() {

    if ( settings.showFrame ) {

        if ( meshBox ) {

            meshBox.geometry.dispose();
            scene.remove(meshBox);

        }

    meshFrames = getFrameMeshes(settings.x * 12 / 2, settings.y * 12 / 2, settings.z * 12 / 2); //Convert to inches

    } else {

        if ( meshFrames.length > 0 ) {
            for (let i = 0; i < nFrameMeshes; i++) {
                meshFrames[i].geometry.dispose();
                scene.remove(meshFrames[i]);
            }
        }

        //Display the box geometry
        const boxGeometry = new THREE.BoxGeometry( settings.x * 12, settings.y * 12, settings.z * 12 ); //This generates a BufferGeometry. Convert to inches.
        boxGeometry.computeVertexNormals();

        if ( meshBox ) { // updates mesh
            meshBox.geometry.dispose();
            meshBox.geometry = boxGeometry;
            if ( !(meshBox.parent === scene) ) { scene.add(meshBox); }
    
        } else { // inits meshBox : THREE.Mesh
            meshBox = new THREE.Mesh( boxGeometry, new THREE.MeshBasicMaterial() );
            scene.add( meshBox );
    
            setMaterial(meshBox);
    
        }
        settings.vertexCount = boxGeometry.attributes.position.count;
    }
}

//Not working... why?
function setMaterial(geometry) {

    console.log(geometry.material)
    geometry.material.dispose();

    if ( settings.material == 'depth' ) {

        geometry.material = new THREE.MeshDepthMaterial();

    } else if ( settings.material == 'normal' ) {

        geometry.material = new THREE.MeshNormalMaterial();

    }

    geometry.material.wireframe = settings.wireframe;

}

function onWindowResize() {

    const w = window.innerWidth;
    const h = window.innerHeight;

    renderer.setSize( w, h );

    camera.left = w / - 2;
    camera.right = w / 2;
    camera.top = h / 2;
    camera.bottom = h / - 2;

    camera.updateProjectionMatrix();

}

function render() {

    renderer.render( scene, camera );

}

function animate() {

    requestAnimationFrame( animate );

    controls.update();

    render();

    stats.update();

}

//Frame code
//Expects Vector 2s v1 and v2; z (the top of the box); d (the depth of the box)
function getBox2Point(v1, v2, z, d) {
    const w = Math.abs(v1.x - v2.x);
    const h = Math.abs(v1.y - v2.y);
    const geometry = new THREE.BoxGeometry( w, h, d ); //This generates a BufferGeometry
    geometry.computeVertexNormals();
    meshBox = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial() );
    scene.add( meshBox );
    meshBox.position = ( v1.x, v1.y, z - (d/2) );
    return meshBox;
}

//TODO: still contains a placement bug...
function getFrameMeshes(x,y,z) {

    const joistWidth = 2;
    const joistDepth = 4; 
    const nJoists = nFrameMeshes;
    const xPositions = divideLengthOffsetEnds(x*2,nJoists,joistWidth-1);
    const joistCentroids = xPositions.map( (xPos) => [xPos - x, y - joistDepth/2, z/2] );
    console.log(xPositions);
    console.log(joistCentroids);
        

    //Get frameGeometry
    for (let i = 0; i < nFrameMeshes; i++) {

        const frameGeometry = new THREE.BoxGeometry( 2, 4, z*2 ); //This generates a BufferGeometry.
        frameGeometry.computeVertexNormals();
        frameGeos.push(frameGeometry);

    }

    //If meshes array exists, dispose all and replace with the new frameGeometry
    if ( meshFrames.length > 0 ) { // updates mesh
        console.log('meshFrames > 0');
        for (let i = 0; i < nFrameMeshes; i++) {
            let meshFrame = meshFrames[i];
            meshFrame.geometry.dispose();
            meshFrame.geometry = frameGeos[i];
            if ( !(meshFrames[i].parent === scene) ) { //if not present in scene already, add to scene
                scene.add(meshFrame);
                // meshFrame.position.x = i*12*4;
                meshFrame.position.x = joistCentroids[i][0];
                meshFrame.position.y = joistCentroids[i][1];
                meshFrame.position.z = joistCentroids[i][2];
            }
        }
    } else { // inits meshFrames : THREE.Mesh
        for (let i = 0; i < nFrameMeshes; i++) {
            let meshFrame;
            meshFrame = new THREE.Mesh( frameGeos[i], new THREE.MeshBasicMaterial() );
            console.log('setting position');
            scene.add( meshFrame );
            // meshFrame.position.x = i*12*4;
            meshFrame.position.x = joistCentroids[i][0];
            meshFrame.position.y = joistCentroids[i][1];
            meshFrame.position.z = joistCentroids[i][2];

            setMaterial(meshFrame);
            meshFrames.push(meshFrame);
        }
    settings.vertexCount = 0; //placeholder as we are not currently counting them all across the various meshes...
    }
    return meshFrames; //to be threes mesh
}

function divideLengthOffsetEnds(length,n,offset) {
    let divPoints = [];
    const interval = length/(n - 1);
    for (let i = 0; i < n; i++) {
        divPoints.push(interval*i);
    }
    divPoints[0] += offset;
    divPoints[n-1] -= offset;
    return divPoints;
}