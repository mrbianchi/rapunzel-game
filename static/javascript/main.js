function init() {
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45,window.innerWidth/window.innerHeight,0.1,2000);

    var ambientLight = new THREE.AmbientLight("white");
    scene.add(ambientLight);  

    var spotLight = new THREE.SpotLight(0xffffff);
    spotLight.position.set(0,100,0);
    scene.add(spotLight);

    var renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(new THREE.Color("black"));
    renderer.setSize(window.innerWidth,window.innerHeight);
    camera.position.set(13,15,15);
    camera.lookAt(2,5,-5);

    var axes = new THREE.AxesHelper(100);
    scene.add(axes);

    var cubes = new THREE.Group();
    for(var i=0;i<10;i++) {
        makeFloor(6,i).forEach((cube)=>{
            cubes.add(cube);
        });
    }
    scene.add(cubes);

    function makeFloor(quantity,floorId) {
        var c = [];
        for(var i=0;i<quantity;i++) {
            var geometry = new THREE.BoxGeometry( 1, 1, 1 );
            var material = new THREE.MeshLambertMaterial( {
                side         : THREE.FrontSide,
                vertexColors : THREE.FaceColors,
                color: "brown"
            } );
            
            var cube = new THREE.Mesh( geometry, material );
            cube.position.set(i,floorId,-floorId);
            c.push(cube);
        }
        return c;
    }

    var geometry = new THREE.BoxGeometry( 0.25, 0.25, 0.5 );
    var material = new THREE.MeshLambertMaterial( {
        side         : THREE.FrontSide,
        vertexColors : THREE.FaceColors,
        wireframe: true
    } );
    var char = new THREE.Mesh( geometry, material );
    char.position.set(0,1,0);
    char.geometry.colorsNeedUpdate = true;
    //char.geometry.faces[8].color.setRGB(0,0,255);
    //char.geometry.faces[9].color.setRGB(0,0,255);

    var face = 8;
    char.geometry.faces[face].color.setRGB(0,255,0);
    char.geometry.faces[face+1].color.setRGB(0,255,0);
    scene.add(char);

    document.getElementById("webgl-output").appendChild(renderer.domElement);


    document.onkeydown = checkKey;
    var taking = false;
    var hanging = false;
    var directionByKeyN = { "38" : new THREE.Vector3(0,0,-1)/*N*/, "40" : new THREE.Vector3(0,0,1)/*S*/, "37" : new THREE.Vector3(-1,0,0)/*W*/, "39" : new THREE.Vector3(1,0,0)/*E*/ };
    var direction = directionByKeyN["38"];char.lookAt(char.position.clone().add(direction));
    ///////////////// CONTROLS ///////////////////
    function checkKey(e) {
        e = e || window.event;
        
        if (typeof directionByKeyN[e.keyCode] != 'undefined') { // arrows
            // hanging
            if(hanging) {
                switch(e.keyCode){
                    case 38:
                        if(canClimb()) {
                            climb();
                        }else{
                            console.log("cannot climb")
                        }
                    break;
                    case 40:
                        var r = thereIsABlockToThrowYourself();
                        if(r) {
                            throwYourself(r);
                        }else{
                            console.log("cant throw yourself");
                        }
                    break;
                    default:
                        glide(directionByKeyN[e.keyCode]);
                    break;
                }
            
            //taking
            }else if(taking) {
                if(direction.equals(directionByKeyN[e.keyCode])
                || direction.clone().negate().equals(directionByKeyN[e.keyCode]))
                {
                    if(direction.equals(directionByKeyN[e.keyCode])) {
                        console.log("pushing");
                        var raycaster = new THREE.Raycaster(char.position,directionByKeyN[e.keyCode],0,1);
                        var oldR = raycaster.intersectObjects(cubes.children);
                        var i = 2;
                        do {
                            var raycaster = new THREE.Raycaster(char.position,directionByKeyN[e.keyCode],0,i);
                            var intersects = raycaster.intersectObjects(cubes.children);
                            if(oldR.length != intersects.length) {
                                oldR = intersects;
                            }
                            i++;
                        }while(oldR == intersects);
                        for(var i=0;i<intersects.length;i++,i++) {
                            oldR[i].object.translateOnAxis(directionByKeyN[e.keyCode],1);
                        }
                        taking = false;
                    }else{
                        console.log("pulling");
                        var raycaster = new THREE.Raycaster(char.position,directionByKeyN[e.keyCode],0,1);
                        var intersects = raycaster.intersectObjects(cubes.children);
                        if(intersects.length > 0) {
                            console.log("cant pull, rear cube is blocking")
                            return;
                        }
                        taking.position.add(directionByKeyN[e.keyCode]);//pulled

                        char.position.copy(taking.position.clone().add(directionByKeyN[e.keyCode]));
                        var raycaster = new THREE.Raycaster(char.position,new THREE.Vector3(0,-1,0),0,1);
                        var intersects = raycaster.intersectObjects(cubes.children);
                        if(!intersects.length) {
                            char.position.y -= 1;
                            hanging = true;
                        }
                    }
                    //var raycaster = new THREE.Raycaster(char.position,rotated,0,1);
                    //var intersects = raycaster.intersectObjects(cubes.children);

                    //taking.position.add(directionByKeyN[e.keyCode]);

                }else{
                    console.log("invalid push/pull");
                }

            //walking
            }else{
                if(!direction.equals(directionByKeyN[e.keyCode])) {
                    char.lookAt(char.position.clone().add(directionByKeyN[e.keyCode]));
                    direction = directionByKeyN[e.keyCode];
                }else{
                    if(thereIsABlockAheadToClimb()) {
                        if(canClimb()) {
                            climb();
                        }else{
                            console.log("cannot climb")
                        }
                    }else{
                        if(thereIsABlockAheadAsFloor()){
                            walk();
                        }else{
                            var r = thereIsABlockToThrowYourself();
                            if(r) {
                                throwYourself(r);
                            }else{
                                hang();
                            }
                        }
                    }
                }
            }
        }
        else if (e.keyCode == 32 && !taking) {// space
            if(taking) {
                return;
            }
            if(hanging) {
                console.log("cannot taking when hanging");
                var r = thereIsABlockToThrowYourself();
                if(r) {
                    throwYourself(r);
                }else{
                    console.log("cant throw yourself");
                }
                return;
            }
            i=0;
            do {
                var rotated = direction.clone().applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI*i).round();
                var raycaster = new THREE.Raycaster(char.position,rotated,0,1);
                var intersects = raycaster.intersectObjects(cubes.children);
                i+=0.5;
            }while(!intersects.length && i<0.5*4);
            if(!intersects.length) {
                console.log("no cube to take");
                return;
            }
            taking = intersects[0].object;
            direction = rotated;
            char.lookAt(taking.position);
        }
    }

    document.onkeyup = releaseCube;
    function releaseCube(e) {
        e = e || window.event;
        if (e.keyCode == '32') {
            taking = false;
            console.log("cube released")
         }
    }

    function glide(side) {
        if(direction.equals(directionByKeyN["39"]) || direction.equals(directionByKeyN["37"]))
            var rotated = side.clone().applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2).round();
        else
            var rotated = side.clone();
        var raycaster = new THREE.Raycaster(char.position,rotated,0,1);
        var intersects = raycaster.intersectObjects(cubes.children);
        if(intersects.length) {
            char.lookAt(char.position.clone().add(rotated));
            direction = rotated;
        } else {
            var raycaster = new THREE.Raycaster(char.position.clone().add(rotated),direction,0,1);
            var intersects = raycaster.intersectObjects(cubes.children);
            if(intersects.length) {
                char.position.add(rotated);
            }else{
                var cube = char.position.clone().add(direction);
                char.position.add(direction).add(rotated);
                char.lookAt(cube);
                direction = rotated.negate();
                // CHECKPOINT: NO DA LA VUELTA COMPLETA
            }
        }
    }

    function thereIsABlockAheadToClimb() {
        var raycaster = new THREE.Raycaster(new THREE.Vector3(char.position.x,char.position.y,char.position.z),direction,0,1);
        var intersects = raycaster.intersectObjects(cubes.children);
        return intersects.length ? true : false;
    }

    function canClimb() {
        var raycaster = new THREE.Raycaster(new THREE.Vector3(char.position.x,char.position.y,char.position.z),new THREE.Vector3(0,1,0),0,1);
        var intersects = raycaster.intersectObjects(cubes.children);
        if(intersects.length)
            return false;
        raycaster = new THREE.Raycaster(char.position.clone().add(direction),new THREE.Vector3(0,1,0),0,1);
        intersects = raycaster.intersectObjects(cubes.children);
        return intersects.length ? false : true;
    }

    function thereIsABlockAheadAsFloor() {
        var raycaster = new THREE.Raycaster(new THREE.Vector3(char.position.x,char.position.y-1,char.position.z),direction,0,1);
        var intersects = raycaster.intersectObjects(cubes.children);
        return intersects.length ? true : false;
    }

    function thereIsABlockToThrowYourself() {
        if(!hanging) {
            var raycaster = new THREE.Raycaster(new THREE.Vector3(char.position.x,char.position.y-2,char.position.z),direction,0,1);
            var intersects = raycaster.intersectObjects(cubes.children);
        }else{
            var raycaster = new THREE.Raycaster(char.position,new THREE.Vector3(0,-1,0));
            var intersects = raycaster.intersectObjects(cubes.children);
        }
        return intersects.length ? intersects : false;
    }

    function walk() {
        char.position.add(direction);
    }

    function throwYourself(intersects) {
        hanging = false;
        char.position.copy(intersects[0].object.position);
        char.position.y += 1;
    }

    function climb() {
        char.position.add(direction);
        char.position.y += 1;
        hanging = false;
    }

    function hang() {
        char.position.add(direction);
        char.position.y -= 1;
        hanging = true;
        direction = new THREE.Vector3(0,0,0).add(direction.clone().negate());
        char.lookAt(char.position.clone().add(direction));
        
    }

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene,camera);
        //camera.lookAt(char.position.x,char.position.y,char.position.z);
    }

    animate();
}
init();
