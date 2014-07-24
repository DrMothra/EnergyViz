/**
 * Created by atg on 21/07/2014.
 */

//Globals
var GROUND_DEPTH = 10;
var GROUND_WIDTH = 180;
var SCREEN_WIDTH = 90;
var SCREEN_HEIGHT = 40;

function eliminateDuplicates(arr) {
    var r = [];
    start: for(var i = 0; i < arr.length; ++i) {
        for(var x = 0; x < r.length; ++x) {
            if(r[x]==arr[i]) {
                continue start;
            }
        }
        r[r.length] = arr[i];
    }
    return r;
}

var daysMonth = {'Jan':31, 'Feb':28, 'Mar':31, 'Apr':30, 'May':31, 'Jun':30,
    'Jul':31, 'Aug':31, 'Sep':30, 'Oct':31, 'Nov':30, 'Dec':31};

var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu','Fri', 'Sat'];

function daysPerMonth(month) {
    return daysMonth[month];
}

function getNextDay(day) {
    //Get next day of week
    for(var i=0; i<dayNames.length; ++i) {
        if(day == dayNames[i]) {
            ++i;
            return i<dayNames.length ? dayNames[i] : dayNames[0];
        }
    }
}

function getPreviousDay(day) {
    //Get previous day of the week
    for(var i=0; i<dayNames.length; ++i) {
        if (day == dayNames[i]) {
            --i;
            return i < 0 ? dayNames[6] : dayNames[i];
        }
    }
}

function getDayName(date) {
    //Get name of day - always first 3 letters
    return date.substr(0, 3);
}

function getDate(date) {
    //Get day number - could be single or double figures
    var day = date.substr(4, 2);
    if(parseInt(day) < 10) {
        day = date.substr(4, 1);
    }
    return day;
}

function getMonth(date) {
    //Get month string
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for(var i=0; i<months.length; ++i) {
        if(date.indexOf(months[i]) >= 0) return months[i];
    }

    return null;
}

function getHour(date) {
    //Get hour string
    var hour = date.substr(17, 3);
    return parseInt(hour);
}

//Init this app from base
function EnergyApp() {
    BaseApp.call(this);
}

EnergyApp.prototype = new BaseApp();

EnergyApp.prototype.init = function(container) {
    BaseApp.prototype.init.call(this, container);
    this.data = null;
    this.updateRequired = false;
    this.guiControls = null;
    this.dataFile = null;
    this.filename = '';
    this.objectsRendered = 0;
};

EnergyApp.prototype.update = function() {
    //Perform any updates
    var clicked = this.mouse.clicked;

    //Perform mouse hover
    var vector = new THREE.Vector3(( this.mouse.x / window.innerWidth ) * 2 - 1, -( this.mouse.y / window.innerHeight ) * 2 + 1, 0.5);
    this.projector.unprojectVector(vector, this.camera);

    var raycaster = new THREE.Raycaster(this.camera.position, vector.sub(this.camera.position).normalize());

    this.hoverObjects.length = 0;
    this.hoverObjects = raycaster.intersectObjects(this.scene.children, true);

    //Check hover actions
    if(this.hoverObjects.length != 0) {
        for(var i=0; i<this.hoverObjects.length; ++i) {

        }
    }
    BaseApp.prototype.update.call(this);
};

EnergyApp.prototype.createScene = function() {
    //Init base createsScene
    BaseApp.prototype.createScene.call(this);

    //Model loading
    this.occupancyGroup = new THREE.Object3D();
    this.occupancyGroup.name = 'Occupancy';

    var _this = this;
    this.modelLoader = new THREE.JSONLoader();
    //Create ground
    addGround(this.scene, GROUND_WIDTH, GROUND_DEPTH);
    //Create screen
    this.modelLoader.load('models/screen.js', function(geom, materials) {
        var material = new THREE.MeshLambertMaterial(materials);
        var screen = new THREE.Mesh(geom, material);
        screen.position.y = -40;
        screen.scale.x = 1.25;
        _this.scene.add(screen);
    });

    //Load models but don't add to scene yet
    this.modelLoader.load('models/person2.js', function(geom, material) {
        //Save geometry for later
        _this.personGeom = geom;
    });
};

EnergyApp.prototype.createGUI = function() {
    //Create GUI - use dat.GUI for now
    this.guiControls = new function() {
        this.filename = '';

        //Colours
        this.Ground = '#16283c';
        this.Background = '#5c5f64';
    };

    //Create GUI
    var gui = new dat.GUI();
    var _this = this;
    //Create two folders - Appearance and Data
    gui.add(this.guiControls, 'filename', this.filename).listen();
    this.guiAppear = gui.addFolder("Appearance");

    this.guiAppear.addColor(this.guiControls, 'Ground').onChange(function(value) {
        _this.groundColourChanged(value);
    });
    this.guiAppear.addColor(this.guiControls, 'Background').onChange(function(value) {
        _this.renderer.setClearColor(value, 1.0);
    });
    this.guiData = gui.addFolder("Data");
};

EnergyApp.prototype.generateGUIControls = function() {

};

EnergyApp.prototype.groundColourChanged = function(value) {
    var ground = this.scene.getObjectByName('ground');
    if(ground) {
        ground.material.color.setStyle(value);
    }
};

/*
EnergyApp.prototype.generateData = function() {
    //Parse data and rewrite in more suitable format
    var selected = ['hall_name_1', 'event_date_grouping', 'show_count_1', 'total_tkt_count_1', 'total_tkt_count_2'];
    var altered = ['hall_name', 'event_date', 'show_count', 'occupancy', 'admits'];
    var occupancy = [];
    for(var i=0; i<this.data.length; ++i) {
        //Only save selected data
        var newData = {};
        var item = this.data[i];
        for(var key in item) {
            for(var j=0; j<selected.length; ++j) {
                if(key == selected[j]) {
                    newData[altered[j]] = item[selected[j]];
                    break;
                }
            }
        }
        occupancy.push(newData);
    }
    //Save new data structure
    var bb = window.Blob;
    var filename = 'energy.json';
    saveAs(new bb(
            [JSON.stringify(occupancy)]
            , {type: "text/plain;charset=" + document.characterSet}
        )
        , filename);
};
*/

EnergyApp.prototype.generateData = function() {
    //Extract data - do this manually for now
    var item = this.data[0];
    this.currentLocation = 0;
    this.currentLocationName = item['hall_name'];
    var dayName = getDayName(item['event_date']);
    this.dayName = dayName;
    var date = getDate(item['event_date']);
    this.date = parseInt(date);
    var month = getMonth(item['event_date']);
    this.month = month;
    var hour = getHour(item['event_date']);
    console.log('Hour =', hour);
    this.hour = hour;

    this.locationNames = [];
    this.maxOccupancy = [30, 345, 137, 105, 70];
    this.maxDays = 30;

    //Separate location names
    for(var i=0; i<this.data.length; ++i) {
        item = this.data[i];
        this.locationNames.push(item['hall_name']);
    }
    //Remove duplicates
    this.locationNames = eliminateDuplicates(this.locationNames);

    //Generate occupancy visuals
    var item = this.data[0];
    populateInfoPanel(item);
    populateHall(this.occupancyGroup, this.personGeom, item['admits'], this.maxOccupancy[0]);
    this.scene.add(this.occupancyGroup);
};

EnergyApp.prototype.showPreviousLocation = function() {

};

EnergyApp.prototype.showNextLocation = function() {

};

EnergyApp.prototype.showPreviousTime = function() {
    //Go to previous time for selected location
    if(this.currentLocation == 0) return;

    var item = this.data[this.currentLocation-1];
    if(item['hall_name'] != this.currentLocationName) return;
    --this.currentLocation;
    populateInfoPanel(item);
    populateHall(this.occupancyGroup, this.personGeom, item['admits'], 30);
};

EnergyApp.prototype.showNextTime = function() {
    //Go to next time for selected location
    var item = this.data[this.currentLocation+1];
    if(item['hall_name'] != this.currentLocationName) return;
    ++this.currentLocation;
    populateInfoPanel(item);
    populateHall(this.occupancyGroup, this.personGeom, item['admits'], 30);
};

EnergyApp.prototype.showPreviousDay = function() {
    //Construct previous day from current day
    var dayName = getPreviousDay(this.dayName);
    this.dayName = dayName;
    if(this.date-1 < 1) return;
    var date = --this.date;
    var hour = this.hour;
    var month = this.month;
    var eventDate = dayName+' '+date+' '+month+' 2014 - '+hour+':00 - '+hour+':59';
    console.log('Event date =', eventDate);
    console.log('Event date =', eventDate);
    for(var i=0; i<this.data.length; ++i) {
        var item = this.data[i];
        if(item['event_date'] == eventDate) {
            populateInfoPanel(item);
            populateHall(this.occupancyGroup, this.personGeom, item['admits'], 30);
        }
    }
    console.log('No event at that time');
};

EnergyApp.prototype.showNextDay = function() {
    //Construct next day from current day
    var dayName = getNextDay(this.dayName);
    this.dayName = dayName;
    var date = ++this.date;
    if(date > daysPerMonth(this.month)) return;
    var hour = this.hour;
    var month = this.month;
    var eventDate = dayName+' '+date+' '+month+' 2014 - '+hour+':00 - '+hour+':59';
    console.log('Event date =', eventDate);
    for(var i=0; i<this.data.length; ++i) {
        var item = this.data[i];
        if(item['event_date'] == eventDate) {
            populateInfoPanel(item);
            populateHall(this.occupancyGroup, this.personGeom, item['admits'], 30);
        }
    }
    console.log('No event at that time');
};

EnergyApp.prototype.onKeyDown = function(event) {
    switch (event.keyCode) {
        case 80: //'P'
            console.log("CamPos=", this.camera.position);
            break;
    }
};

EnergyApp.prototype.parseFile = function() {
    //Attempt to load and parse given json file
    if(!this.filename) return;

    console.log("Reading file...");

    var reader = new FileReader();
    var _this = this;
    reader.onload = function(evt) {
        //File loaded - parse it
        console.log('file read: '+evt.target.result);
        try {
            _this.data = JSON.parse(evt.target.result);
        }
        catch (err) {
            console.log('error parsing JSON file', err);
            alert('Sorry, there was a problem reading that file');
            return;
        }
        //File parsed OK - generate GUI controls and data
        _this.generateGUIControls();
        _this.generateData();
        _this.updateRequired = true;
    };

    // Read in the file
    reader.readAsText(this.dataFile, 'ISO-8859-1');
};

EnergyApp.prototype.onSelectFile = function(evt) {
    //User selected file
    //See if we support filereader API's
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        //File APIs are supported.
        var files = evt.target.files; // FileList object
        if (files.length==0) {
            console.log('no file specified');
            this.filename = "";
            return;
        }
        //Clear old data first
        if(this.dataFile) {
            this.reset();
        }
        this.dataFile = files[0];
        this.filename = this.dataFile.name;
        console.log("File chosen", this.filename);

        //Try and read this file
        this.parseFile();
    }
    else
        alert('sorry, file apis not supported');
};

function addGround(scene, width, height) {
    //Create the ground object
    var groundGeometry = new THREE.CylinderGeometry(width/2, width/2, height, 12, 12, false);
    var texture = THREE.ImageUtils.loadTexture("images/grid.png");
    var planeMaterial = new THREE.MeshLambertMaterial({color : 0x3C2D86});
    var plane = new THREE.Mesh(groundGeometry, planeMaterial);

    //plane.receiveShadow  = true;

    // rotate and position the plane
    //plane.rotation.x=-0.5*Math.PI;
    plane.position.x=0;
    plane.position.y=-65;
    plane.position.z=0;

    scene.add(plane);

    //Second plane
    groundGeometry = new THREE.PlaneGeometry(width, height, 1, 1);
    planeMaterial = new THREE.MeshLambertMaterial({color: 0x16283c});
    plane = new THREE.Mesh(groundGeometry, planeMaterial);
    plane.rotation.x=-0.5*Math.PI;
    plane.position.x=0;
    plane.position.y=-60;
    plane.position.z=0;
    //Give it a name
    plane.name = 'ground';

    // add the plane to the scene
    //scene.add(plane);
}

function populateHall(group, geom, occupancy, maxOccupancy) {
    //Add number of people to location
    if(group.children.length > 0) {
        for (var child = group.children.length - 1; child >= 0; --child) {
            group.remove(group.children[child]);
        }
    }
    var occupyMaterial = new THREE.MeshLambertMaterial({color : 0x000066});
    var surplusMaterial = new THREE.MeshLambertMaterial({color : 0xffffff});

    var startPos = new THREE.Vector3(-22.5, -56, 30);
    var scale = new THREE.Vector3(1, 1, 1);
    var xInc = 5;
    var zInc = 5;
    for(var i=0; i<maxOccupancy; ++i) {
        var person = new THREE.Mesh(geom, i<occupancy ? occupyMaterial : surplusMaterial);
        person.scale.set(scale.x, scale.y, scale.z);
        person.position.x = startPos.x + (i%10 * xInc);
        person.position.y = startPos.y;
        person.position.z = startPos.z + (parseInt(i/10)*zInc);
        group.add(person);
    }
}

function populateInfoPanel(data) {
    //Fill panel with relevant data

    for(var key in data) {
        var item = document.getElementById(key);
        if (item) {
            item.innerHTML = data[key];
        }
    }

    //Remove any unnecessary data in headings
    var title = data['hall_name'];
    var end = title.indexOf('(');
    if(end >= 0) {
        title = title.substr(0, end);
        document.getElementById('hall_name').innerHTML = title;
    }

    //Separate date and time
    var date = data['event_date'];
    var join = date.indexOf('-');
    if(join >= 0) {
        var day = date.substr(0, join-1);
        document.getElementById('event_date').innerHTML = day;
    }
    var time = date.substr(join+1, date.length-join);
    document.getElementById('event_time').innerHTML = time;
}

function createLabel(name, position, scale, colour, fontSize, opacity) {

    var fontface = "Arial";
    var spacing = 10;

    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    var metrics = context.measureText( name );
    var textWidth = metrics.width;

    canvas.width = textWidth + (spacing * 2);
    canvas.width *= 2;
    canvas.height = fontSize;
    context.textAlign = "center";
    context.textBaseline = "middle";

    context.fillStyle = "rgba(255, 255, 255, 0.0)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    var red = Math.round(colour[0]);
    var green = Math.round(colour[1]);
    var blue = Math.round(colour[2]);

    context.fillStyle = "rgba(" + red + "," + green + "," + blue + "," + "1.0)";
    context.font = fontSize + "px " + fontface;

    context.fillText(name, canvas.width/2, canvas.height/2);

    // canvas contents will be used for a texture
    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    //texture.needsUpdate = true;
    var spriteMaterial = new THREE.SpriteMaterial({
            //color: color,
            transparent: false,
            opacity: opacity,
            useScreenCoordinates: false,
            blending: THREE.AdditiveBlending,
            map: texture}
    );

    var sprite = new THREE.Sprite(spriteMaterial);

    sprite.scale.set(scale.x, scale.y, 1);
    sprite.position.set(position.x, position.y, position.z);

    return sprite;
}

$(document).ready(function() {
    //Initialise app
    var container = document.getElementById("WebGL-output");
    var app = new EnergyApp();
    app.init(container);
    app.createScene();
    //app.createGUI();

    //GUI callbacks
    $("#chooseFile").on("change", function(evt) {
        app.onSelectFile(evt);
    });
    $("#locationBackward").on("click", function(evt) {
        app.showPreviousLocation();
    });
    $("#locationForward").on("click", function(evt) {
        app.showNextLocation();
    });
    $("#timeBackward").on("click", function(evt) {
        app.showPreviousTime();
    });
    $("#timeForward").on("click", function(evt) {
        app.showNextTime();
    });
    $("#dateBackward").on("click", function(evt) {
        app.showPreviousDay();
    });
    $("#dateForward").on("click", function(evt) {
        app.showNextDay();
    });
    $(document).keydown(function (event) {
        app.onKeyDown(event);
    });
    app.run();
});
