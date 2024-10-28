import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { emissive, normalMap } from 'three/webgpu';
import gsap from 'gsap';

const COUNTER_ROTATE = 120;
const SLIDE_NUMBER = 6;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#bg')
})

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;

scene.background = new THREE.Color( 0xc9c9c9 );
let pc, monitor, paper, monitor_z;
let zoomIn = 1; // use this to specify the direction of zoom
let monitorHit = 0;
let focus = null;
let intersects = [];
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
camera.position.setZ(30)
camera.position.setY(10)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const controls = new OrbitControls(camera, renderer.domElement)
const group = new THREE.Group();
// const axesHelper = new THREE.AxesHelper( 5 );


const ledTextureNormal = new THREE.TextureLoader().load('assets/led.jpg')
const ledTextureReflect = new THREE.TextureLoader().load('./assets/reflection_lcd.jpg')
const glowMaterial = new THREE.MeshStandardMaterial({
    map: ledTextureReflect,
    color: 0xedf0f5,
    emissive: 0xedf0f5,  // Glowing color
    emissiveIntensity: 1.25,
    transparent: true,
    opacity: 0.8

});

const directLight = new THREE.DirectionalLight(0xffffff, 0.5)
directLight.castShadow = true;
directLight.position.set(0, 25, 30)

const ambLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambLight)


var side = 100;
directLight.shadow.camera.top = side;
directLight.shadow.camera.bottom = -side;
directLight.shadow.camera.left = side;
directLight.shadow.camera.right = -side;

// desk lamp
const deskLight = new THREE.PointLight(0xffffff, 0, 0, 0.8);
const deskHelper = new THREE.PointLightHelper(deskLight, 1)
deskLight.position.set(3.9,0,2)


// Loading slides
let slides = [];
for(let i = 1; i <= SLIDE_NUMBER; i++){
    console.log('assets/slides/slide' + (i) + '.jpg')
    const newTexture = new THREE.TextureLoader().load('assets/slides/slide' + i + '.jpg', function(loaded){
        loaded.flipY=false
        loaded.rotation = -Math.PI/2;
        loaded.center.set(0.5, 0.5);
    } )
    const newMaterial = new THREE.MeshStandardMaterial( {
            map:newTexture,
            normalMap: ledTextureNormal,
            emissiveMap: newTexture,
            emissive: new THREE.Color(0xffffff),
            emissiveIntensity: 1
       })        

    slides.push(newMaterial)

}



// Instantiate a loader
const loader = new GLTFLoader();


loader.load(
	// resource URL
	'./assets/led_monitor_chair.glb',
	// called when the resource is loaded
	function ( gltf ) {
        gltf.scene.traverse( function ( object ) {

            if ( object.isMesh ) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        
        } );


        pc = gltf.scene;
        pc.castShadow = true;
        pc.receiveShadow = true;


        monitor = pc.getObjectByName('LED'); 
        console.log(slides[0])
        monitor.material = slides[0];
        monitor.position.x += 0.08;       

        paper = pc.getObjectByName('A4_Lined_Paper_OBJ'); 

        group.add(pc);
        group.add(directLight);
        group.add(deskLight)
        const helper = new THREE.DirectionalLightHelper( directLight, 5 );
        // scene.add( helper );
        monitor.receiveShadow = true;
        applyGlowEffect(monitor);

        // directLight.scale.set(3, 3, 3)
        // directLight.rotation.x = -Math.PI / 2
        // directLight.rotation.y = Math.PI / 10
        // pc.scale.set(6,6,6);
        // pc.position.set(-5,15, 0);
        pc.rotation.set(0, Math.PI*5/4, 0);

        scene.add(group)
        directLight.target = group;

        // Load font adn text
        const fontLoader = new FontLoader();

        fontLoader.load( 'assets/fonts/Bad_Script_Regular.json', function ( font ) {
            console.log(font)
            const textGeometry = new TextGeometry( 
                `
Get in touch with me :)
`, {
                    font: font,
                    size: 0.1,
                    depth: 0.008,
                }
            )

            const paper = pc.getObjectByName("A4_Lined_Paper_OBJ")
            const paperText = new THREE.Mesh( textGeometry, textMaterialPaper );
            const textGroup = new THREE.Group();
            paperText.position.set(paper.position.x + 3.5,paper.position.y, paper.position.z + 4.5);
            paperText.rotation.set(Math.PI/2, Math.PI, Math.PI/2.04)
            // group.add(paperText)
        })         



    }
);



const planeGeometry = new THREE.PlaneGeometry(5, 5);

// Create a material with transparency enabled and opacity set to 50%
const planeMaterial = new THREE.MeshStandardMaterial({
    // color: 0xe9e9e9,  // Green color
    // transparent: true, // Enable transparency
    // opacity: 0.5,      // Set opacity (0.5 means 50% transparent)
    side: THREE.DoubleSide, // Optional: make the plane visible from both sides
    blending: THREE.AdditiveBlending,
});

// Create the plane mesh
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.set(Math.PI/2, 0, 0)
plane.position.set(10, -4, -10)
plane.scale.set(10, 10, 10)
plane.receiveShadow = true;
plane.castShadow = true;
// scene.add(plane)




// Post-processing setup
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

function applyGlowEffect(obj) {

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.5,    // Bloom strength
        0.1,    // Bloom radius
        1.5    // Bloom threshold
    );


    const outlinePass = new OutlinePass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        scene,
        camera
    );

    // Configure the outline pass
    outlinePass.edgeStrength = 10.0; // Strength of the outline glow
    outlinePass.edgeGlow = 1.0; // Glow effect
    outlinePass.edgeThickness = 1.0; // Thickness of the outline
    outlinePass.pulsePeriod = 0; // How fast the glow pulses (0 for no pulse)
    outlinePass.visibleEdgeColor.set('#ffeeee'); // Color of the visible edges (set to glowing color)
    outlinePass.hiddenEdgeColor.set('#190a05'); // Color of hidden edges (if you want them to be darker)

    outlinePass.selectedObjects = [obj]; // Make the desk top glow

    // composer.addPass(outlinePass);
    composer.addPass(bloomPass);
}


let counterRotatePC = 0, counterRotatePaper = 0;

const backButton = document.getElementsByClassName("back-button")[0];
const guide = document.getElementById("guide");

function monitorClick(){
    backButton.style.opacity = 100;
    guide.style.opacity = 0;
    counterRotatePC = COUNTER_ROTATE;
    zoomIn = 1; // Zoom-in on the object
    monitor_z = window.innerWidth < 500 ? 23 : window.innerWidth < 800 ? 26 : 30;
    // set fixed light for the monitor
    monitor.material.emissiveIntensity = 1.4;
}


function paperClick(){
    if(focus!=="paper"){
        deskLight.intensity = 8; // Turn on the desk light
        counterRotatePaper = COUNTER_ROTATE;
        zoomIn = 1; // zoom in on the object
        backButton.style.opacity = 100;
        guide.style.opacity = 0;

    }

}

window.addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
    raycaster.setFromCamera(mouse, camera)
    intersects = raycaster.intersectObjects(scene.children, true)
  
  })
  
// Event listener for clicking on obhjects
window.addEventListener('click', (e) => {
    intersects.forEach((hit) => {
      // if the monitor is clicked and this is the first time

      if (hit.object.name === "LED" && focus!="monitor") {
        monitorClick();
        focus = "monitor"
      }
    //if the monitor is clicked and monitor is already focused on
      else if (hit.object.name === "LED" && focus=="monitor"){
        // Go to next slide
        monitorHit++;
        monitorHit %= SLIDE_NUMBER;
        monitor.material = slides[monitorHit]

      }
      else if (hit.object.name == "A4_Lined_Paper_OBJ" && focus!="paper"){
        paperClick();
        focus = "paper";
      }
      else if (hit.object.name == "linkedin"){
        window.open("https://www.linkedin.com/in/reyhaneh-ahamdi-nokabadi-b9a992183/", "_blank")
      }
      else if (hit.object.name == "email"){
        window.location.href = "mailto:reyhaneh_ahmadi_nokabadi@sfu.ca";
      }
      else if (hit.object.name == "github"){
        window.open("https://www.github.com/reyahmadi", "_blank")
      }
    })
  })

  backButton.addEventListener('click', (e) => {
      zoomIn = -1;
      if(focus=="monitor"){
          counterRotatePC = COUNTER_ROTATE;
      }
      else if (focus == "paper"){
          counterRotatePaper = COUNTER_ROTATE;
      }
      backButton.style.opacity = 0;
      guide.style.opacity = 100;
  })


function animate(){
    requestAnimationFrame(animate)
    controls.update()
    // if the camera is not focused on the monitor, flicker the light more intensely
    let flickerIntensity = focus!=="monitor" ? 0.8 : 0.2;
    let newIntensity = Math.random() * flickerIntensity + 0.8;
    monitor.material.emissiveIntensity = newIntensity
    


    if(counterRotatePC > 0){
        counterRotatePC--;
        group.rotation.x -= zoomIn * Math.PI*0.1 / COUNTER_ROTATE;
        group.rotation.y += zoomIn * Math.PI*0.25  / COUNTER_ROTATE;

        group.position.y += zoomIn * 11 / COUNTER_ROTATE;
        group.position.z += zoomIn * monitor_z / COUNTER_ROTATE;
        group.position.x += zoomIn * 3.5 / COUNTER_ROTATE;

        if(!counterRotatePC && zoomIn == -1){
            focus = null;
        }

    }

    if(counterRotatePaper > 0){
        counterRotatePaper--;

        group.rotation.y += zoomIn * 0.5 * Math.PI  / COUNTER_ROTATE;
        group.rotation.z += zoomIn * 0.4 * Math.PI  / COUNTER_ROTATE;
        group.position.y += zoomIn * 0.07;
        group.position.z += zoomIn * 33 / COUNTER_ROTATE;
        group.position.x -= zoomIn * 2 / COUNTER_ROTATE;
        
        // When zooming out of paper is finished
        if(counterRotatePaper==0 && zoomIn == -1){
            focus = null;
            backButton.style.opacity = 0;
            guide.style.opacity = 100;
            deskLight.intensity = 0;
        }

    }
    composer.render();
    // renderer.render(scene, camera)
}

animate()