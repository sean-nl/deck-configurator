// Example from https://threejs.org/examples/#webgl_geometry_sdf
import * as THREE from 'three';
// import { OrbitControls } from './jsm/controls/OrbitControls.js'; //originally was like this
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; //using this now. why?
import { SDFGeometryGenerator } from 'three/addons/geometries/SDFGeometryGenerator.js';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, stats, meshBox, frameMesh, scene, camera, clock, controls;

const settings = {
    x: 2,
    y: 1,
    z: 2,
    showFrame: false,
    autoRotate: true,
    wireframe: false,
    material: 'normal',
    vertexCount: '0'
};

// Example SDF from https://www.shadertoy.com/view/MdXSWn -->

//This doesn't appear to be used...
const shader = /* glsl */`
    float dist(vec3 p) {
        p.xyz = p.xzy;
        p *= 1.2;
        vec3 z = p;
        vec3 dz=vec3(0.0);
        float power = 8.0;
        float r, theta, phi;
        float dr = 1.0;
        
        float t0 = 1.0;
        for(int i = 0; i < 7; ++i) {
            r = length(z);
            if(r > 2.0) continue;
            theta = atan(z.y / z.x);
            #ifdef phase_shift_on
            phi = asin(z.z / r) ;
            #else
            phi = asin(z.z / r);
            #endif
            
            dr = pow(r, power - 1.0) * dr * power + 1.0;
        
            r = pow(r, power);
            theta = theta * power;
            phi = phi * power;
            
            z = r * vec3(cos(theta)*cos(phi), sin(theta)*cos(phi), sin(phi)) + p;
            
            t0 = min(t0, r);
        }

        return 0.5 * log(r) * r / dr;
    }
`;


init();
animate();

function init() {

    const w = window.innerWidth;
    const h = window.innerHeight;

    camera = new THREE.OrthographicCamera( w / - 2, w / 2, h / 2, h / - 2, 0.01, 6000 );
    camera.position.z = 4000;

    //Alternative: could play with the frustrum of the camera.
    camera.zoom = 0.8;
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

    //

    const panel = new GUI( );

    panel.add( settings, 'x', 1, 10, 1 ).name( 'X' ).onFinishChange( compile );
    panel.add( settings, 'y', 1, 10, 1 ).name( 'Y' ).onFinishChange( compile );
    panel.add( settings, 'z', 1, 10, 1 ).name( 'Z' ).onFinishChange( compile );
    panel.add( settings, 'showFrame' ).name( 'Show Frame' ).onChange( drawFrame );
    panel.add( settings, 'material', [ 'depth', 'normal' ] ).name( 'Material' ).onChange( setMaterial );
    panel.add( settings, 'wireframe' ).name( 'Wireframe' ).onChange( setMaterial );
    panel.add( settings, 'autoRotate' ).name( 'Auto Rotate' );
    panel.add( settings, 'vertexCount' ).name( 'Vertex count' ).listen().disable();

    //

    compile();

}

function compile() {

    const generator = new SDFGeometryGenerator( renderer );
    const geometry = new THREE.BoxGeometry( settings.x, settings.y, settings.z ); //This generates a BufferGeometry
    geometry.computeVertexNormals();

    if ( meshBox ) { // updates mesh

        meshBox.geometry.dispose();
        meshBox.geometry = geometry;

    } else { // inits meshBox : THREE.Mesh

        meshBox = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial() );
        scene.add( meshBox );

        const scale = Math.min( window.innerWidth, window.innerHeight ) / 2 * 0.66;
        meshBox.scale.set( scale, scale, scale );

        setMaterial();

    }

    settings.vertexCount = geometry.attributes.position.count;

}

//Incremental goal is to make the meshframe draw and rotate the exact same way as the meshBox.
//This will probably involve making these functions able to be passed objects...
function drawFrame() {
    
    console.log('in drawFrame');
    const boxGeometry = new THREE.BoxGeometry( settings.x, settings.y, settings.z ); //This generates a BufferGeometry
    boxGeometry.computeVertexNormals();

    //Dummy geometry representing the frame
    const frameGeometry = new THREE.BoxGeometry( settings.x / 2, settings.y, settings.z ); //This generates a BufferGeometry
    frameGeometry.computeVertexNormals();

    //Need check that frameMesh exists.
    if ( meshBox && settings.showFrame ) {

        meshBox.geometry.dispose();
        scene.remove(meshBox);
        frameMesh = new THREE.Mesh( frameGeometry, new THREE.MeshBasicMaterial() )

        scene.add( frameMesh );
        const scale = Math.min( window.innerWidth, window.innerHeight ) / 2 * 0.66;
        frameMesh.scale.set( scale, scale, scale );



    } else if ( meshBox ) {

        scene.remove( frameMesh );
        scene.add( meshBox );

    }

    //add handling for no meshBox? probably unneccessary. Check.

}

function setMaterial() {

    meshBox.material.dispose();

    if ( settings.material == 'depth' ) {

        meshBox.material = new THREE.MeshDepthMaterial();

    } else if ( settings.material == 'normal' ) {

        meshBox.material = new THREE.MeshNormalMaterial();

    }

    meshBox.material.wireframe = settings.wireframe;

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

    if ( settings.autoRotate ) {

        meshBox.rotation.y += Math.PI * 0.05 * clock.getDelta();
        
    }

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